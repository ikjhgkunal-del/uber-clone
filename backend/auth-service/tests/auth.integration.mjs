import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
process.env.AUTH_TEST_MODE = "true";
process.env.COOKIE_SECURE = "false";
process.env.DATABASE_URL = (
  process.env.AUTH_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  ""
).replace("@postgres:", "@127.0.0.1:");
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Auth integration tests require a local database");
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "1025";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_FROM = "Auth Tests <no-reply@example.test>";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";
const { buildApp } = await import("../dist/index.js");
const { migrate } = await import("../dist/migrate.js");
const { pool } = await import("../dist/auth.model.js");
const { hashToken, createSession } = await import("../dist/auth.service.js");
await migrate();
const app = await buildApp();
const users = [];
const cookie = (r) => r.headers["set-cookie"].split(";")[0];
const request = (url, body, token, cookies, extra = {}) =>
  app.inject({
    url,
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-requested-with": "uber-clone",
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(cookies ? { cookie: cookies } : {}),
      ...extra,
    },
    ...(body === undefined ? {} : { payload: body }),
  });
async function emailToken(address, purpose) {
  const listing = await (
    await fetch("http://localhost:8025/api/v1/messages")
  ).json();
  const message = listing.messages.find(
    (m) =>
      m.To?.some((to) => to.Address === address) && m.Subject.includes(purpose),
  );
  assert.ok(message, "Expected captured email");
  const detail = await (
    await fetch("http://localhost:8025/api/v1/message/" + message.ID)
  ).json();
  const token = detail.Text.match(/#token=([a-f0-9]{64})/)?.[1];
  assert.ok(token, "Expected email action token");
  return token;
}
test("complete account lifecycle against PostgreSQL and SMTP", async () => {
  try {
    for (const role of ["customer", "driver"]) {
      const email = "auth-test-" + randomUUID() + "@example.test";
      users.push(email);
      const password = "Initial-test-password-123";
      const registered = await request("/register", {
        name: "Test Rider",
        email,
        password,
        role,
      });
      assert.equal(registered.statusCode, 201, registered.body);
      assert.equal(registered.json().verificationEmailSent, true);
      assert.match(registered.headers["set-cookie"], /HttpOnly/);
      assert.match(registered.headers["set-cookie"], /SameSite=Strict/);
      assert.equal(registered.json().user.hasPassword, true);
      const initialToken = registered.json().token;
      assert.equal(
        (await request("/me", undefined, initialToken)).statusCode,
        200,
      );
      assert.equal(
        (await request("/access/" + role, undefined, initialToken)).statusCode,
        200,
      );
      assert.equal(
        (
          await request(
            "/access/" + (role === "driver" ? "customer" : "driver"),
            undefined,
            initialToken,
          )
        ).statusCode,
        403,
      );
      const row = (
        await pool.query(
          "SELECT password_hash FROM auth.users WHERE email=$1",
          [email],
        )
      ).rows[0];
      assert.notEqual(row.password_hash, password);
      assert.equal(
        (
          await request("/register", {
            name: "Duplicate",
            email,
            password,
            role,
          })
        ).statusCode,
        409,
      );
      const verification = await emailToken(email, "Verify");
      assert.equal(
        (await request("/verify-email", { token: verification })).statusCode,
        200,
      );
      assert.equal(
        (await request("/verify-email", { token: verification })).statusCode,
        400,
      );
      assert.equal(
        (await request("/me", undefined, initialToken)).json().user
          .emailVerified,
        true,
      );
      assert.equal(
        (await request("/login", { email, password: "wrong" })).statusCode,
        401,
      );
      const logged = await request("/login", {
        email,
        password,
        remember: true,
      });
      assert.equal(logged.statusCode, 200);
      const rotated = await request("/refresh", {}, undefined, cookie(logged));
      assert.equal(rotated.statusCode, 200);
      assert.equal(
        (await request("/refresh", {}, undefined, cookie(logged))).statusCode,
        401,
        "Old refresh token must be rejected",
      );
      assert.equal(
        (await request("/logout", {}, undefined, cookie(rotated))).statusCode,
        200,
      );
      assert.equal(
        (await request("/me", undefined, rotated.json().token)).statusCode,
        401,
        "Logout revokes access token",
      );
      assert.equal(
        (await request("/refresh", {}, undefined, cookie(rotated))).statusCode,
        401,
      );
      const forgot = await request("/forgot-password", { email });
      assert.equal(forgot.statusCode, 200);
      const reset = await emailToken(email, "Reset");
      const dbToken = (
        await pool.query(
          "SELECT token_hash FROM auth.email_tokens WHERE token_hash=$1",
          [hashToken(reset)],
        )
      ).rows[0];
      assert.notEqual(dbToken.token_hash, reset);
      assert.equal(
        (
          await request("/reset-password", {
            token: reset,
            password: "Replacement-password-123",
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await request("/reset-password", {
            token: reset,
            password: "Replacement-password-123",
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (await request("/me", undefined, initialToken)).statusCode,
        401,
        "Reset revokes all sessions",
      );
      assert.equal(
        (await request("/login", { email, password })).statusCode,
        401,
      );
      await assert.rejects(
        () =>
          createSession(registered.json().user.id, false, row.password_hash),
        /Credentials changed/,
      );
      const afterReset = await request("/login", {
        email,
        password: "Replacement-password-123",
      });
      assert.equal(afterReset.statusCode, 200);
      assert.equal(
        (
          await request(
            "/change-password",
            { currentPassword: "wrong", password: "Changed-password-123" },
            afterReset.json().token,
          )
        ).statusCode,
        400,
      );
      assert.equal(
        (
          await request(
            "/change-password",
            {
              currentPassword: "Replacement-password-123",
              password: "Changed-password-123",
            },
            afterReset.json().token,
          )
        ).statusCode,
        200,
      );
      assert.equal(
        (await request("/me", undefined, afterReset.json().token)).statusCode,
        401,
      );
      const changed = await request("/login", {
        email,
        password: "Changed-password-123",
      });
      assert.equal(changed.statusCode, 200);
      const expired = app.jwt.sign(
        {
          sub: registered.json().user.id,
          role,
          sid: app.jwt.decode(changed.json().token).sid,
        },
        { expiresIn: -1 },
      );
      assert.equal((await request("/me", undefined, expired)).statusCode, 401);
      await pool.query(
        `UPDATE auth.sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1`,
        [registered.json().user.id],
      );
      assert.equal(
        (await request("/refresh", {}, undefined, cookie(changed))).statusCode,
        401,
        "Expired refresh sessions must fail",
      );
      assert.equal(
        (await request("/me", undefined, changed.json().token)).statusCode,
        401,
      );
    }
    assert.equal((await request("/me")).statusCode, 401);
    assert.equal(
      (
        await request("/register", {
          name: "Test",
          email: "invalid",
          password: "short",
          role: "admin",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await request(
          "/login",
          { email: "none@example.test", password: "anything" },
          undefined,
          undefined,
          { "x-requested-with": "" },
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await request(
          "/login",
          { email: "none@example.test", password: "anything" },
          undefined,
          undefined,
          { origin: "https://untrusted.example" },
        )
      ).statusCode,
      403,
    );
    assert.equal((await request("/config")).json().googleEnabled, false);
    assert.equal((await request("/google/start")).statusCode, 503);
    assert.equal(
      (await request("/google/callback?error=access_denied")).statusCode,
      302,
    );
    process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-only-placeholder";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:8080/api/auth/google/callback";
    const googleApp = await buildApp();
    try {
      const started = await googleApp.inject({
        url: "/google/start?role=driver",
      });
      assert.equal(started.statusCode, 302);
      const target = new URL(started.headers.location);
      assert.equal(target.hostname, "accounts.google.com");
      assert.equal(target.searchParams.get("code_challenge_method"), "S256");
      assert.ok(target.searchParams.get("nonce"));
      const blocked = await googleApp.inject({
        url: "/google/callback?state=wrong&code=test",
        headers: { cookie: cookie(started) },
      });
      assert.match(blocked.headers.location, /error=google/);
    } finally {
      await googleApp.close();
      process.env.GOOGLE_CLIENT_ID = "";
      process.env.GOOGLE_CLIENT_SECRET = "";
    }
    const limited = await buildApp();
    try {
      for (let attempt = 0; attempt < 11; attempt++) {
        const result = await limited.inject({
          method: "POST",
          url: "/login",
          headers: { "x-requested-with": "uber-clone" },
          payload: { email: "nobody@example.test", password: "incorrect" },
        });
        assert.equal(result.statusCode, attempt < 10 ? 401 : 429);
      }
    } finally {
      await limited.close();
    }
  } finally {
    await pool.query("DELETE FROM auth.users WHERE email=ANY($1::text[])", [
      users,
    ]);
    await app.close();
    await pool.end();
  }
});
