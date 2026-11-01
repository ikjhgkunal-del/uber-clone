import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

const serviceName = process.env.SERVICE_NAME ?? "user-service";
const port = Number(process.env.PORT ?? 3002);
const app = Fastify({ logger: true, trustProxy: true });

await app.register(helmet);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") ?? false,
  credentials: true,
});

app.get("/", async () => ({ service: serviceName, status: "running" }));
app.get("/health", async () => ({ service: serviceName, status: "ok" }));
app.get("/ready", async () => ({ service: serviceName, status: "ready" }));

await app.listen({ host: "0.0.0.0", port });
app.log.info({ service: serviceName, port }, "service started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
