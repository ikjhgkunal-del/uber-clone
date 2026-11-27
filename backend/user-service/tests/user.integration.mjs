import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
process.env.SERVICE_TEST_MODE = "true";
process.env.AUTH_TEST_MODE = "true";
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "@postgres:",
  "@127.0.0.1:",
);
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Tests require a local database");
process.env.AUTH_SERVICE_URL = "http://127.0.0.1:8080/api/auth";
const { buildApp: authBuilder } =
  await import("../../auth-service/dist/index.js");
const { pool: authPool } =
  await import("../../auth-service/dist/auth.model.js");
const auth = await authBuilder();
const { pool } = await import("../dist/user.model.js");
const { runMigrations } = await import("../../shared/dist/migrate.js");
await runMigrations(pool, "users");
await runMigrations(pool, "users");
const { buildApp } = await import("../dist/index.js");
const app = await buildApp();
const fixtures = [];
async function identity(role) {
  const id = randomUUID(),
    sid = randomUUID(),
    refresh = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO auth.users(id,email,role,display_name,email_verified) VALUES($1,$2,$3,$4,true)",
    [id, "user-test-" + id + "@example.test", role, "Test Passenger"],
  );
  await pool.query(
    "INSERT INTO auth.sessions(id,user_id,refresh_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
    [sid, id, createHash("sha256").update(refresh).digest("hex")],
  );
  const token = auth.jwt.sign({ sub: id, sid, role });
  fixtures.push(id);
  return { id, sid, token };
}
const req = (user, url, body, method = body ? "PUT" : "GET") =>
  app.inject({
    url,
    method,
    headers: {
      "x-requested-with": "uber-clone",
      ...(user ? { authorization: "Bearer " + user.token } : {}),
    },
    ...(body ? { payload: body } : {}),
  });
const place = {
  kind: "home",
  label: "Home",
  address: "Demo street, New Delhi",
  latitude: 28.6139,
  longitude: 77.209,
};
test("passenger profile, places, preferences and ownership", async () => {
  try {
    const a = await identity("customer"),
      b = await identity("customer"),
      driver = await identity("driver");
    assert.equal((await req(null, "/me")).statusCode, 401);
    assert.equal((await req(driver, "/me")).statusCode, 403);
    const initial = await req(a, "/me");
    assert.equal(initial.statusCode, 200, initial.body);
    assert.equal(initial.json().profile.name, "Test Passenger");
    assert.equal((await req(a, "/me")).json().profile.userId, a.id);
    assert.equal(
      Number(
        (
          await pool.query(
            "SELECT count(*) FROM users.customer_profiles WHERE user_id=$1",
            [a.id],
          )
        ).rows[0].count,
      ),
      1,
    );
    const updated = await req(a, "/me", {
      name: "Updated Name",
      phone: "+919876543210",
      version: 1,
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().profile.version, 2);
    assert.equal(
      (await req(a, "/me", { name: "Outdated", phone: "", version: 1 }))
        .statusCode,
      409,
    );
    assert.equal(
      (await req(a, "/me", { name: "   ", phone: "", version: 2 })).statusCode,
      400,
    );
    assert.equal(
      (await req(a, "/me", { name: "Name", phone: "not-a-number", version: 2 }))
        .statusCode,
      400,
    );
    assert.equal(
      (
        await req(a, "/me", {
          name: "Name",
          phone: "",
          version: 2,
          userId: b.id,
        })
      ).statusCode,
      400,
    );
    const created = await req(a, "/me/places", place, "POST");
    assert.equal(created.statusCode, 201, created.body);
    const id = created.json().place.id;
    assert.equal((await req(a, "/me/places")).json().places.length, 1);
    assert.equal((await req(b, "/me/places")).json().places.length, 0);
    assert.equal((await req(b, "/me/places/" + id, place)).statusCode, 404);
    assert.equal(
      (await req(b, "/me/places/" + id, undefined, "DELETE")).statusCode,
      404,
    );
    assert.equal(
      (await req(a, "/me/places", { ...place, label: "Second home" }, "POST"))
        .statusCode,
      409,
    );
    assert.equal(
      (await req(a, "/me/places", { ...place, latitude: 999 }, "POST"))
        .statusCode,
      400,
    );
    assert.equal((await req(a, "/me/places/not-uuid", place)).statusCode, 400);
    const edit = await req(a, "/me/places/" + id, {
      ...place,
      address: "Changed address",
    });
    assert.equal(edit.statusCode, 200);
    assert.equal(edit.json().place.address, "Changed address");
    assert.equal(
      (await req(a, "/me/places/" + id, undefined, "DELETE")).statusCode,
      200,
    );
    assert.equal(
      (await req(a, "/me/places/" + id, undefined, "DELETE")).statusCode,
      404,
    );
    const prefs = await req(a, "/me/preferences");
    assert.equal(prefs.json().preferences.quietRide, false);
    const saved = await req(a, "/me/preferences", {
      quietRide: true,
      coolTemperature: true,
      assistanceNeeded: false,
      version: 1,
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(
      (await req(a, "/me/preferences")).json().preferences.quietRide,
      true,
    );
    assert.equal(
      (
        await req(a, "/me/preferences", {
          quietRide: false,
          coolTemperature: false,
          assistanceNeeded: true,
          version: 1,
        })
      ).statusCode,
      409,
    );
    for (let i = 0; i < 19; i++)
      await pool.query(
        "INSERT INTO users.saved_locations(user_id,kind,label,address_text,latitude,longitude) VALUES($1,'other',$2,'Test address',1,1)",
        [a.id, "Place " + i],
      );
    const concurrent = await Promise.all(
      ["A", "B"].map((label) =>
        req(a, "/me/places", { ...place, kind: "other", label }, "POST"),
      ),
    );
    assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [201, 409]);
    assert.equal((await req(a, "/me/places")).json().places.length, 20);
    const csrf = await app.inject({
      url: "/me",
      method: "PUT",
      headers: { authorization: "Bearer " + a.token },
      payload: { name: "Name", phone: "", version: 2 },
    });
    assert.equal(csrf.statusCode, 403);
    await pool.query("UPDATE auth.sessions SET revoked_at=now() WHERE id=$1", [
      a.sid,
    ]);
    assert.equal((await req(a, "/me")).statusCode, 401);
  } finally {
    await pool.query(
      "DELETE FROM users.customer_profiles WHERE user_id=ANY($1::uuid[])",
      [fixtures],
    );
    await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])", [
      fixtures,
    ]);
    await app.close();
    await auth.close();
    await pool.end();
    await authPool.end();
  }
});
