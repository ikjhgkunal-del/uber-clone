import { createServiceApp } from "@uber-clone/shared/http";
import { runMigrations } from "@uber-clone/shared/migrate";
import { pool } from "./driver.model.js";
import { redis, storeReady } from "./location.service.js";
import { driverRoutes } from "./driver.routes.js";
export async function buildApp() {
  const app = await createServiceApp("driver-service", pool, async () => {
    await pool.query("SELECT 1 FROM drivers.driver_profiles LIMIT 1");
    await storeReady();
  });
  await app.register(driverRoutes);
  return app;
}
if (process.env.SERVICE_TEST_MODE !== "true") {
  await runMigrations(pool, "drivers");
  await redis.connect();
  const app = await buildApp();
  app.addHook("onClose", async () => {
    await pool.end();
    if (redis.isOpen) await redis.quit();
  });
  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3003) });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close();
    });
}
