import Fastify, {
  type FastifyError,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import { ServiceError } from "./errors.js";
export interface Principal {
  id: string;
  name: string;
  email: string;
  role: "customer" | "driver";
  emailVerified: boolean;
  hasPassword: boolean;
}
declare module "fastify" {
  interface FastifyRequest {
    principal: Principal;
  }
}
export async function createServiceApp(
  name: string,
  pool: Pool,
  readiness: () => Promise<unknown>,
) {
  const app = Fastify({
    trustProxy: (_address, hop) => hop === 0,
    bodyLimit: 32768,
    ajv: { customOptions: { removeAdditional: false } },
    logger:
      process.env.SERVICE_TEST_MODE === "true"
        ? false
        : {
            serializers: {
              req: (r) => ({ method: r.method, url: r.url?.split("?")[0] }),
            },
            redact: ["req.headers.authorization", "req.headers.cookie"],
          },
  });
  const origins = (
    process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:5173"
  ).split(",");
  await app.register(helmet);
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.decorateRequest("principal");
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      (request.headers["x-requested-with"] !== "uber-clone" ||
        (request.headers.origin && !origins.includes(request.headers.origin)))
    )
      return reply
        .code(403)
        .send({ message: "Request origin could not be verified." });
  });
  app.get("/health", async () => ({ service: name, status: "ok" }));
  app.get("/ready", async (_, reply) => {
    try {
      await readiness();
      return { service: name, status: "ready" };
    } catch {
      return reply.code(503).send({ service: name, status: "unavailable" });
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const failure = error as FastifyError;
    const status =
      failure.statusCode &&
      failure.statusCode >= 400 &&
      failure.statusCode < 600
        ? failure.statusCode
        : failure.code === "23505"
          ? 409
          : 500;
    if (status >= 500)
      request.log.error({ code: failure.code }, "Service request failed");
    const details = failure.validation?.map((v) => ({
      field: v.instancePath || v.params.missingProperty || "request",
      message: v.message,
    }));
    reply
      .code(status)
      .send({
        message: failure.validation
          ? "Please check the fields and try again."
          : error instanceof ServiceError
            ? error.message
            : status === 409
              ? "That record already exists."
              : status === 429
                ? "Too many requests. Please try again shortly."
                : "Unable to complete the request. Please try again.",
        ...(details ? { fields: details } : {}),
      });
  });
  return app;
}
export function requireIdentity(role: "customer" | "driver") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ") || authorization.length > 8192)
      return reply.code(401).send({ message: "Please sign in to continue." });
    let response: Response;
    try {
      response = await fetch(
        (process.env.AUTH_SERVICE_URL ?? "http://auth-service:3001").replace(
          /\/$/,
          "",
        ) + "/me",
        { headers: { authorization }, signal: AbortSignal.timeout(4000) },
      );
    } catch {
      throw new ServiceError(
        "Sign-in verification is temporarily unavailable.",
        503,
      );
    }
    if (response.status === 401)
      return reply
        .code(401)
        .send({ message: "Your session has expired. Please sign in again." });
    if (!response.ok)
      throw new ServiceError(
        "Sign-in verification is temporarily unavailable.",
        503,
      );
    const data = (await response.json()) as { user?: Principal };
    if (
      !data.user ||
      !/^[0-9a-f-]{36}$/i.test(data.user.id) ||
      !["customer", "driver"].includes(data.user.role)
    )
      throw new ServiceError("Invalid identity response.", 503);
    if (data.user.role !== role)
      return reply
        .code(403)
        .send({
          message: "This feature is not available for your account role.",
        });
    request.principal = data.user;
  };
}
