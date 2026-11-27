import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import type { FastifyInstance } from "fastify";
import { randomToken } from "./auth.service.js";
import { pool, type Account, type Role } from "./auth.model.js";
import { createSession } from "./auth.service.js";
import { sessionResponse, cookieOptions } from "./auth.controller.js";
export async function googleRoutes(app: FastifyInstance) {
  const enabled = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI,
  );
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  const options = () => ({
    ...cookieOptions(),
    sameSite: "lax" as const,
    maxAge: 600,
  });
  app.get<{ Querystring: { role?: Role } }>(
    "/google/start",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["customer", "driver"] },
          },
        },
      },
    },
    async (request, reply) => {
      if (!enabled)
        return reply
          .code(503)
          .send({ message: "Google sign-in has not been configured yet." });
      const state = randomToken(),
        nonce = randomToken();
      const pkce = await client.generateCodeVerifierAsync();
      const flow = app.jwt.sign(
        {
          sub: "oauth",
          role: request.query.role ?? "customer",
          sid: state,
          nonce,
          verifier: pkce.codeVerifier,
        } as never,
        { expiresIn: "10m" },
      );
      reply.setCookie("uber_google", flow, options());
      return reply.redirect(
        client.generateAuthUrl({
          scope: ["openid", "email", "profile"],
          state,
          nonce,
          prompt: "select_account",
          code_challenge: pkce.codeChallenge,
          code_challenge_method: CodeChallengeMethod.S256,
        }),
      );
    },
  );
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/google/callback",
    async (request, reply) => {
      reply.clearCookie("uber_google", options());
      const destination = new URL(
        "/login",
        process.env.APP_URL ?? "http://localhost:5173",
      );
      try {
        if (
          !enabled ||
          request.query.error ||
          !request.query.code ||
          !request.cookies.uber_google
        )
          throw new Error("cancelled");
        const flow = app.jwt.verify<{
          sid: string;
          nonce: string;
          verifier: string;
          role: Role;
        }>(request.cookies.uber_google);
        if (flow.sid !== request.query.state) throw new Error("state");
        const { tokens } = await client.getToken({
          code: request.query.code,
          codeVerifier: flow.verifier,
        });
        if (!tokens.id_token) throw new Error("missing token");
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const profile = ticket.getPayload();
        if (
          !profile?.sub ||
          !profile.email_verified ||
          !profile.email ||
          (profile as { nonce?: string }).nonce !== flow.nonce
        )
          throw new Error("identity");
        const db = await pool.connect();
        let user: Account;
        try {
          await db.query("BEGIN");
          const existing = await db.query<Account>(
            `SELECT u.* FROM auth.oauth_accounts o JOIN auth.users u ON u.id=o.user_id WHERE o.provider='google' AND o.subject=$1 AND u.status='active'`,
            [profile.sub],
          );
          if (existing.rows[0]) user = existing.rows[0];
          else {
            const collision = await db.query(
              "SELECT id FROM auth.users WHERE email=$1",
              [profile.email.toLowerCase()],
            );
            if (collision.rowCount) {
              await db.query("ROLLBACK");
              destination.searchParams.set("error", "existing-account");
              return reply.redirect(destination.toString());
            }
            const created = await db.query<Account>(
              "INSERT INTO auth.users(email,display_name,role,email_verified) VALUES($1,$2,$3,true) RETURNING *",
              [profile.email.toLowerCase(), profile.name ?? "", flow.role],
            );
            user = created.rows[0];
            await db.query(
              "INSERT INTO auth.oauth_accounts(provider,subject,user_id) VALUES('google',$1,$2)",
              [profile.sub, user.id],
            );
          }
          await db.query("COMMIT");
        } catch (error) {
          await db.query("ROLLBACK");
          throw error;
        } finally {
          db.release();
        }
        sessionResponse(app, reply, user, await createSession(user.id, true));
        return reply.redirect(
          new URL(
            "/auth/callback",
            process.env.APP_URL ?? "http://localhost:5173",
          ).toString(),
        );
      } catch {
        destination.searchParams.set("error", "google");
        return reply.redirect(destination.toString());
      }
    },
  );
}
