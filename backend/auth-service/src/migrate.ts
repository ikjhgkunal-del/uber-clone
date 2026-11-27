import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "./auth.model.js";
export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(721934)");
    await client.query("CREATE SCHEMA IF NOT EXISTS auth");
    await client.query(
      "CREATE TABLE IF NOT EXISTS auth.schema_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const folder = resolve(
      process.env.MIGRATIONS_DIR ?? "database/migrations/auth",
    );
    for (const name of (await readdir(folder))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query(
            "SELECT 1 FROM auth.schema_migrations WHERE name=$1",
            [name],
          )
        ).rowCount
      )
        continue;
      await client.query("BEGIN");
      try {
        const sql = (await readFile(resolve(folder, name), "utf8")).replace(
          /^BEGIN;|^COMMIT;/gm,
          "",
        );
        await client.query(sql);
        await client.query(
          "INSERT INTO auth.schema_migrations(name) VALUES($1)",
          [name],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(721934)");
    client.release();
  }
}
