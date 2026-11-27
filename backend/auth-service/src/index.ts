import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { pool } from "./auth.model.js";
import { authRoutes } from "./auth.routes.js";
import { googleRoutes } from "./google.service.js";
import { migrate } from "./migrate.js";
export async function buildApp() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const app = Fastify({
    trustProxy: (_address, hop) => hop === 0,
    logger:
      process.env.AUTH_TEST_MODE === "true"
        ? false
        : {
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              "res.headers.set-cookie",
              "password",
              "password_hash",
              "token",
            ],
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url?.split("?")[0],
                remoteAddress: req.ip,
              }),
            },
          },
    bodyLimit: 16384,
  });
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(
    ",",
  );
  await app.register(helmet, { referrerPolicy: { policy: "no-referrer" } });
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  await app.register(jwt, {
    secret,
    sign: { expiresIn: "15m", iss: "uber-auth", aud: "uber-api" },
    verify: { allowedIss: "uber-auth", allowedAud: "uber-api" },
  });
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      if (
        request.headers["x-requested-with"] !== "uber-clone" ||
        (request.headers.origin && !origins.includes(request.headers.origin))
      )
        return reply
          .code(403)
          .send({ message: "Request origin could not be verified." });
    }
  });
  app.get("/health", async () => ({ service: "auth-service", status: "ok" }));
  app.get("/ready", async (_, reply) => {
    try {
      await pool.query("SELECT 1 FROM auth.sessions LIMIT 1");
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  await app.register(authRoutes);
  await app.register(googleRoutes);
  app.setErrorHandler((error, request, reply) => {
    const failure = error as FastifyError;
    request.log.error({ code: failure.code }, "Request failed");
    const status =
      failure.statusCode && failure.statusCode < 500 ? failure.statusCode : 500;
    reply.code(status).send({
      message: failure.validation
        ? "Please check the information you entered."
        : status === 429
          ? "Too many attempts. Please wait and try again."
          : "Something went wrong. Please try again.",
    });
  });
  return app;
}
if (process.env.AUTH_TEST_MODE !== "true") {
  await migrate();
  const app = await buildApp();
  app.addHook("onClose", async () => {
    await pool.end();
  });
  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close();
    });
}
