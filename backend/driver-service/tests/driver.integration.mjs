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
process.env.REDIS_URL = (process.env.REDIS_URL ?? "redis://redis:6379").replace(
  "://redis:",
  "://127.0.0.1:",
);
if (
  !["localhost", "127.0.0.1"].includes(new URL(process.env.REDIS_URL).hostname)
)
  throw new Error("Tests require local Redis");
const { buildApp: authBuilder } =
  await import("../../auth-service/dist/index.js");
const { pool: authPool } =
  await import("../../auth-service/dist/auth.model.js");
const auth = await authBuilder();
const { pool } = await import("../dist/driver.model.js");
const { redis, onlineKey } = await import("../dist/location.service.js");
const { runMigrations } = await import("../../shared/dist/migrate.js");
await runMigrations(pool, "drivers");
await runMigrations(pool, "drivers");
await redis.connect();
const { buildApp } = await import("../dist/index.js");
const app = await buildApp();
const fixtures = [];
async function identity(role = "driver", verified = true) {
  const id = randomUUID(),
    sid = randomUUID();
  await pool.query(
    "INSERT INTO auth.users(id,email,role,display_name,email_verified) VALUES($1,$2,$3,$4,$5)",
    [id, "driver-test-" + id + "@example.test", role, "Test Driver", verified],
  );
  await pool.query(
    "INSERT INTO auth.sessions(id,user_id,refresh_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
    [sid, id, createHash("sha256").update(randomBytes(32)).digest("hex")],
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
const profile = {
  name: "Demo Driver",
  phone: "+919876543210",
  licenseNumber: "DEMO12345",
  licenseExpires: "2099-12-31",
  version: 1,
};
const point = { latitude: 28.6139, longitude: 77.209 };
const makeVehicle = () => ({
  make: "Toyota",
  model: "Camry",
  color: "White",
  plate: randomBytes(6).toString("hex"),
  year: 2024,
  seats: 4,
});
test("driver onboarding, owned vehicles, availability leases and location through PostgreSQL/Redis", async () => {
  try {
    const a = await identity(),
      b = await identity(),
      customer = await identity("customer"),
      unverified = await identity("driver", false);
    assert.equal((await req(null, "/me")).statusCode, 401);
    assert.equal((await req(customer, "/me")).statusCode, 403);
    assert.equal((await req(a, "/me")).json().profile.name, "Test Driver");
    let status = await req(a, "/me/availability");
    assert.equal(status.statusCode, 200, status.body);
    assert.equal(status.json().availability.eligible, false);
    assert.equal(
      (await req(a, "/me/availability", { online: true, ...point })).statusCode,
      403,
    );
    assert.equal(
      (await req(a, "/me", { ...profile, licenseExpires: "2027-02-30" }))
        .statusCode,
      400,
    );
    assert.equal(
      (await req(a, "/me", { ...profile, phone: "bad" })).statusCode,
      400,
    );
    assert.equal(
      (await req(a, "/me", { ...profile, userId: b.id })).statusCode,
      400,
    );
    let saved = await req(a, "/me", profile);
    assert.equal(saved.statusCode, 200, saved.body);
    assert.equal(saved.json().profile.version, 2);
    assert.equal((await req(a, "/me", profile)).statusCode, 409);
    assert.equal(
      (await req(a, "/me/vehicles", { ...makeVehicle(), seats: 0 }, "POST"))
        .statusCode,
      400,
    );
    assert.equal(
      (await req(a, "/me/vehicles", { ...makeVehicle(), year: 2200 }, "POST"))
        .statusCode,
      400,
    );
    assert.equal(
      (await req(a, "/me/vehicles", { ...makeVehicle(), plate: "---" }, "POST"))
        .statusCode,
      400,
    );
    const vehicle = makeVehicle();
    const added = await req(a, "/me/vehicles", vehicle, "POST");
    assert.equal(added.statusCode, 201, added.body);
    const v = added.json().vehicle;
    assert.equal(v.isActive, true);
    assert.equal(
      (await req(b, "/me/vehicles/" + v.id, { ...vehicle, version: 1 }))
        .statusCode,
      404,
    );
    assert.equal(
      (await req(b, "/me/vehicles/" + v.id, undefined, "DELETE")).statusCode,
      404,
    );
    assert.equal(
      (await req(b, "/me/vehicles/" + v.id + "/activate", undefined, "POST"))
        .statusCode,
      404,
    );
    assert.equal(
      (await req(b, "/me/vehicles", vehicle, "POST")).statusCode,
      409,
    );
    const edited = await req(a, "/me/vehicles/" + v.id, {
      ...vehicle,
      color: "Black",
      version: 1,
    });
    assert.equal(edited.statusCode, 200);
    assert.equal(edited.json().vehicle.version, 2);
    assert.equal(
      (await req(a, "/me/vehicles/" + v.id, { ...vehicle, version: 1 }))
        .statusCode,
      409,
    );
    const other = await req(a, "/me/vehicles", makeVehicle(), "POST");
    const otherId = other.json().vehicle.id;
    await Promise.all(
      [v.id, otherId].map((id) =>
        req(a, "/me/vehicles/" + id + "/activate", undefined, "POST"),
      ),
    );
    assert.equal(
      (await req(a, "/me/vehicles")).json().vehicles.filter((v) => v.isActive)
        .length,
      1,
    );
    assert.equal(
      (await req(a, "/me/availability")).json().availability.eligible,
      true,
    );
    assert.equal(
      (
        await req(a, "/me/availability", {
          online: true,
          latitude: 999,
          longitude: 1,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await req(a, "/me/availability", {
          online: true,
          latitude: null,
          longitude: 1,
        })
      ).statusCode,
      400,
    );
    const on = await req(a, "/me/availability", { online: true, ...point });
    assert.equal(on.statusCode, 200, on.body);
    assert.equal(on.json().availability.online, true);
    assert.ok((await redis.ttl(onlineKey(a.id))) > 0);
    assert.equal(
      (await req(a, "/me", { ...profile, version: 2 })).statusCode,
      409,
    );
    assert.equal(
      (await req(a, "/me/vehicles/" + v.id, undefined, "DELETE")).statusCode,
      409,
    );
    assert.equal(
      (await req(a, "/me/vehicles/" + v.id + "/activate", undefined, "POST"))
        .statusCode,
      409,
    );
    const bursts = await Promise.all(
      Array.from({ length: 12 }, () =>
        req(a, "/me/heartbeat", undefined, "POST"),
      ),
    );
    assert.ok(bursts.every((r) => r.statusCode === 200));
    const moved = await req(a, "/me/location", {
      latitude: 28.63,
      longitude: 77.22,
    });
    assert.equal(moved.statusCode, 200);
    assert.equal(moved.json().availability.location.latitude, 28.63);
    assert.equal(
      (await req(a, "/me/heartbeat", undefined, "POST")).statusCode,
      200,
    );
    await redis.expire(onlineKey(a.id), -1);
    assert.equal(
      (await req(a, "/me/availability")).json().availability.online,
      false,
    );
    assert.equal(
      (await req(a, "/me/heartbeat", undefined, "POST")).statusCode,
      409,
    );
    assert.equal(
      (await req(a, "/me/availability", { online: false })).statusCode,
      200,
    );
    assert.equal((await req(a, "/me/location", point)).statusCode, 409);
    await req(unverified, "/me", profile);
    await req(unverified, "/me/vehicles", makeVehicle(), "POST");
    assert.equal(
      (await req(unverified, "/me/availability", { online: true, ...point }))
        .statusCode,
      403,
    );
    await req(a, "/me", {
      ...profile,
      licenseExpires: "2000-01-01",
      version: 2,
    });
    assert.equal(
      (await req(a, "/me/availability")).json().availability.eligible,
      false,
    );
    await req(a, "/me", { ...profile, version: 3 });
    // Concurrent creation cannot exceed the 3-vehicle limit.
    const race = await Promise.all(
      [makeVehicle(), makeVehicle()].map((v) =>
        req(a, "/me/vehicles", v, "POST"),
      ),
    );
    assert.deepEqual(race.map((r) => r.statusCode).sort(), [201, 409]);
    const owned = (await req(a, "/me/vehicles")).json().vehicles;
    for (const vehicle of owned)
      assert.equal(
        (await req(a, "/me/vehicles/" + vehicle.id, undefined, "DELETE"))
          .statusCode,
        200,
      );
    assert.equal(
      (await req(a, "/me/availability")).json().availability.activeVehicle,
      null,
    );
    assert.equal(
      (
        await app.inject({
          url: "/me/availability",
          method: "PUT",
          headers: { authorization: "Bearer " + a.token },
          payload: { online: false },
        })
      ).statusCode,
      403,
    );
    // Exercise the deployed gateway, not just Fastify injection.
    const via = await fetch("http://127.0.0.1:8080/api/drivers/me", {
      headers: { authorization: "Bearer " + a.token },
    });
    assert.equal(via.status, 200);
    assert.equal((await via.json()).profile.name, "Demo Driver");
    await pool.query("UPDATE auth.sessions SET revoked_at=now() WHERE id=$1", [
      a.sid,
    ]);
    assert.equal((await req(a, "/me")).statusCode, 401);
    await redis.quit();
    assert.equal((await req(b, "/me/availability")).statusCode, 503);
  } finally {
    if (!redis.isOpen) await redis.connect();
    for (const id of fixtures) await redis.del(onlineKey(id));
    await pool.query(
      "DELETE FROM drivers.driver_profiles WHERE user_id=ANY($1::uuid[])",
      [fixtures],
    );
    await pool.query("DELETE FROM auth.users WHERE id=ANY($1::uuid[])", [
      fixtures,
    ]);
    await app.close();
    await auth.close();
    await redis.quit();
    await pool.end();
    await authPool.end();
  }
});
