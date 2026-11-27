import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Pool } from "pg";
export async function runMigrations(pool: Pool, schema: string) {
  if (!/^[a-z_]+$/.test(schema)) throw new Error("Invalid migration schema");
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      "uber-migrations-" + schema,
    ]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
    );
    const folder = resolve(
      process.env.MIGRATIONS_ROOT ?? "database/migrations",
      schema,
    );
    for (const name of (await readdir(folder))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query(
            `SELECT 1 FROM ${schema}.schema_migrations WHERE name=$1`,
            [name],
          )
        ).rowCount
      )
        continue;
      await client.query("BEGIN");
      try {
        await client.query(await readFile(resolve(folder, name), "utf8"));
        await client.query(
          `INSERT INTO ${schema}.schema_migrations(name) VALUES($1)`,
          [name],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      "uber-migrations-" + schema,
    ]);
    client.release();
  }
}
