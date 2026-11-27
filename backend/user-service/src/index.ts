import { createServiceApp } from "@uber-clone/shared/http";
import { runMigrations } from "@uber-clone/shared/migrate";
import { pool } from "./user.model.js";
import { userRoutes } from "./user.routes.js";
export async function buildApp() {
  const app = await createServiceApp("user-service", pool, () =>
    pool.query("SELECT 1 FROM users.customer_profiles LIMIT 1"),
  );
  await app.register(userRoutes);
  return app;
}
if (process.env.SERVICE_TEST_MODE !== "true") {
  await runMigrations(pool, "users");
  const app = await buildApp();
  app.addHook("onClose", async () => {
    await pool.end();
  });
  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3002) });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close();
    });
}
