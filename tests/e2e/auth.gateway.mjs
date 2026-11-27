import assert from "node:assert/strict";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";
const base = "http://localhost:8080";
const email = "gateway-test-" + randomUUID() + "@example.test";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL.replace(
    "@postgres:",
    "@127.0.0.1:",
  ),
});
if (!["localhost", "127.0.0.1"].includes(new URL(pool.options.connectionString).hostname)) throw new Error("Gateway tests require a local database");
const password = randomUUID() + randomUUID();
const salt = randomBytes(16).toString("hex");
try {
  // Seed locally so a gateway smoke test cannot send mail through a real provider.
  await pool.query("INSERT INTO auth.users(email,password_hash,role,display_name,email_verified) VALUES($1,$2,'driver','Gateway Test',true)", [email,salt+":"+scryptSync(password,salt,64).toString("hex")]);
  for (const route of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/driver",
  ]) {
    const page = await fetch(base + route);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="root"/);
  }
  const registered = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "uber-clone",
      origin: base,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  assert.equal(registered.status, 200);
  const session = await registered.json();
  const cookie = registered.headers.get("set-cookie").split(";")[0];
  const me = await fetch(base + "/api/auth/me", {
    headers: { authorization: "Bearer " + session.token },
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.role, "driver");
  const refreshed = await fetch(base + "/api/auth/refresh", {
    method: "POST",
    headers: { cookie, "x-requested-with": "uber-clone", origin: base },
  });
  assert.equal(refreshed.status, 200);
  const nextCookie = refreshed.headers.get("set-cookie").split(";")[0];
  const nextSession = await refreshed.json();
  const loggedOut = await fetch(base + "/api/auth/logout", {
    method: "POST",
    headers: {
      cookie: nextCookie,
      "x-requested-with": "uber-clone",
      origin: base,
    },
  });
  assert.equal(loggedOut.status, 200);
  const revoked = await fetch(base + "/api/auth/me", {
    headers: { authorization: "Bearer " + nextSession.token },
  });
  assert.equal(revoked.status, 401);
  console.log(
    "PASS: frontend deep links and login, refresh, account lookup and logout through Nginx",
  );
} finally {
  await pool.query("DELETE FROM auth.users WHERE email=$1", [email]);
  await pool.end();
}
