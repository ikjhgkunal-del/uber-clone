import type { FastifyInstance, FastifyReply } from "fastify";
import {
  login,
  register,
  createSession,
  rotateSession,
  sendAccountEmail,
  consumeEmailToken,
  hashToken,
  passwordMatches,
  hashPassword,
} from "./auth.service.js";
import {
  credentials,
  registration,
  emailBody,
  resetBody,
  tokenBody,
  changeBody,
} from "./auth.validation.js";
import { authenticate, requireRole } from "./auth.middleware.js";
import { pool, publicUser, type Account, type Role } from "./auth.model.js";
export const refreshCookie = "uber_refresh";
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== "false",
  sameSite: "strict" as const,
  path: "/",
});
export function sessionResponse(
  app: FastifyInstance,
  reply: FastifyReply,
  user: Account,
  session: { id: string; refresh: string; seconds: number },
) {
  reply.header("Cache-Control", "no-store");
  reply.setCookie(refreshCookie, session.refresh, {
    ...cookieOptions(),
    maxAge: session.seconds,
  });
  return {
    user: publicUser(user),
    token: app.jwt.sign({ sub: user.id, role: user.role, sid: session.id }),
  };
}
export async function registerAuthEndpoints(app: FastifyInstance) {
  app.get("/config", async () => ({
    googleEnabled: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
    ),
  }));
  app.post<{
    Body: { email: string; password: string; role: Role; name: string };
  }>(
    "/register",
    {
      schema: { body: registration },
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      let user: Account;
      try {
        user = await register(
          request.body.email,
          request.body.password,
          request.body.role,
          request.body.name,
        );
      } catch (error) {
        if ((error as { code?: string }).code === "23505")
          return reply.code(409).send({
            message:
              "An account with this email already exists. Please sign in.",
          });
        throw error;
      }
      let emailSent = true;
      try {
        await sendAccountEmail(user, "verify");
      } catch {
        emailSent = false;
      }
      const session = await createSession(user.id);
      return reply.code(201).send({
        ...sessionResponse(app, reply, user, session),
        verificationEmailSent: emailSent,
      });
    },
  );
  app.post<{ Body: { email: string; password: string; remember?: boolean } }>(
    "/login",
    {
      schema: { body: credentials },
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const user = await login(request.body.email, request.body.password);
      if (!user)
        return reply
          .code(401)
          .send({ message: "The email or password is incorrect." });
      return sessionResponse(
        app,
        reply,
        user,
        await createSession(user.id, request.body.remember, user.password_hash),
      );
    },
  );
  app.post("/refresh", async (request, reply) => {
    const raw = request.cookies[refreshCookie];
    const session = raw ? await rotateSession(raw) : null;
    if (!session) {
      reply.clearCookie(refreshCookie, cookieOptions());
      return reply.code(401).send({ message: "Please sign in again." });
    }
    return sessionResponse(app, reply, session.user, session);
  });
  app.post("/logout", async (request, reply) => {
    const raw = request.cookies[refreshCookie];
    if (raw)
      await pool.query(
        "UPDATE auth.sessions SET revoked_at=now() WHERE refresh_hash=$1",
        [hashToken(raw)],
      );
    reply.clearCookie(refreshCookie, cookieOptions());
    return { message: "You have been signed out." };
  });
  app.get("/me", { preHandler: authenticate, config: { rateLimit: { max: 600, timeWindow: "1 minute" } } }, async (request) => {
    const result = await pool.query<Account>(
      "SELECT * FROM auth.users WHERE id=$1",
      [request.user.sub],
    );
    return { user: publicUser(result.rows[0]) };
  });
  app.post<{ Body: { email: string } }>(
    "/forgot-password",
    {
      schema: { body: emailBody },
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request) => {
      const result = await pool.query<Account>(
        "SELECT * FROM auth.users WHERE email=$1 AND status='active'",
        [request.body.email.toLowerCase()],
      );
      if (result.rows[0]) {
        try {
          await sendAccountEmail(result.rows[0], "reset");
        } catch {
          /* Never expose account existence or provider details. */
        }
      }
      return {
        message:
          "If an account exists, a reset link will be sent to that email.",
      };
    },
  );
  app.post<{ Body: { token: string; password: string } }>(
    "/reset-password",
    {
      schema: { body: resetBody },
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      if (
        !(await consumeEmailToken(
          request.body.token,
          "reset",
          request.body.password,
        ))
      )
        return reply.code(400).send({
          message:
            "This link is invalid or has expired. Please request another.",
        });
      reply.clearCookie(refreshCookie, cookieOptions());
      return {
        message: "Password updated. Please sign in with your new password.",
      };
    },
  );
  app.post<{ Body: { token: string } }>(
    "/verify-email",
    { schema: { body: tokenBody } },
    async (request, reply) => {
      if (!(await consumeEmailToken(request.body.token, "verify")))
        return reply.code(400).send({
          message: "This verification link is invalid or has expired.",
        });
      return { message: "Your email is verified." };
    },
  );
  app.post(
    "/resend-verification",
    {
      preHandler: authenticate,
      config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const result = await pool.query<Account>(
        "SELECT * FROM auth.users WHERE id=$1",
        [request.user.sub],
      );
      if (!result.rows[0].email_verified) {
        try {
          await sendAccountEmail(result.rows[0], "verify");
        } catch {
          return reply.code(503).send({
            message:
              "Email delivery is temporarily unavailable. Please try again later.",
          });
        }
      }
      return { message: "Check your inbox for a verification link." };
    },
  );
  app.post<{ Body: { currentPassword: string; password: string } }>(
    "/change-password",
    {
      preHandler: authenticate,
      schema: { body: changeBody },
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const hash = await hashPassword(request.body.password);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<Account>(
          "SELECT * FROM auth.users WHERE id=$1 FOR UPDATE",
          [request.user.sub],
        );
        if (
          !(await passwordMatches(
            request.body.currentPassword,
            result.rows[0].password_hash,
          ))
        ) {
          await client.query("ROLLBACK");
          return reply
            .code(400)
            .send({ message: "Your current password is incorrect." });
        }
        await client.query(
          "UPDATE auth.users SET password_hash=$1 WHERE id=$2",
          [hash, request.user.sub],
        );
        await client.query(
          "UPDATE auth.sessions SET revoked_at=now() WHERE user_id=$1",
          [request.user.sub],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      reply.clearCookie(refreshCookie, cookieOptions());
      return { message: "Password changed. Please sign in again." };
    },
  );
  for (const role of ["customer", "driver"] as const)
    app.get("/access/" + role, { preHandler: requireRole(role) }, async () => ({
      role,
      allowed: true,
    }));
}
