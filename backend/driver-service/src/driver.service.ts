import type { PoolClient } from "pg";
import type { Principal } from "@uber-clone/shared/http";
import { ServiceError } from "@uber-clone/shared/errors";
import {
  pool,
  profileColumns,
  vehicleColumns,
  type ProfileInput,
  type VehicleInput,
  type Coordinates,
} from "./driver.model.js";
import {
  presence,
  writePresence,
  clearPresence,
  ONLINE_TTL,
} from "./location.service.js";
export async function ensureProfile(user: Principal) {
  await pool.query(
    "INSERT INTO drivers.driver_profiles(user_id,display_name) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",
    [user.id, user.name.trim() || "Driver"],
  );
}
export async function getProfile(user: Principal, client?: PoolClient) {
  return {
    ...(
      await (client ?? pool).query(
        `SELECT ${profileColumns} FROM drivers.driver_profiles WHERE user_id=$1`,
        [user.id],
      )
    ).rows[0],
    email: user.email,
    emailVerified: user.emailVerified,
  };
}
async function locked<T>(
  id: string,
  action: (client: PoolClient) => Promise<T>,
) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      "SELECT user_id FROM drivers.driver_profiles WHERE user_id=$1 FOR UPDATE",
      [id],
    );
    const result = await action(c);
    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
async function requireOffline(id: string) {
  if (await presence(id))
    throw new ServiceError(
      "Go offline before changing your driver details or vehicles.",
      409,
    );
}
function dateValid(value: string | null) {
  if (!value) return true;
  if (Number(value.slice(0, 4)) < 1900 || Number(value.slice(0, 4)) > 2100)
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export async function updateProfile(id: string, data: ProfileInput) {
  if (!dateValid(data.licenseExpires))
    throw new ServiceError("Enter a valid license expiry date.", 400);
  if (Boolean(data.licenseNumber.trim()) !== Boolean(data.licenseExpires))
    throw new ServiceError(
      "Provide both a license number and its expiry date, or leave both empty.",
      400,
    );
  if (
    data.licenseNumber.trim() &&
    !/^[A-Z0-9][A-Z0-9 -]{4,31}$/.test(data.licenseNumber.trim().toUpperCase())
  )
    throw new ServiceError("Enter a valid simulated license number.", 400);
  return locked(id, async (c) => {
    await requireOffline(id);
    const r = await c.query(
      `UPDATE drivers.driver_profiles SET display_name=$1,phone_number=$2,license_number=$3,license_expires=$4,version=version+1,updated_at=now() WHERE user_id=$5 AND version=$6 RETURNING ${profileColumns}`,
      [
        data.name.trim(),
        data.phone,
        data.licenseNumber.trim().toUpperCase(),
        data.licenseExpires,
        id,
        data.version,
      ],
    );
    if (!r.rowCount)
      throw new ServiceError(
        "Your profile changed in another tab. Reload before saving again.",
        409,
      );
    return r.rows[0];
  });
}
export async function listVehicles(id: string, client?: PoolClient) {
  return (
    await (client ?? pool).query(
      `SELECT ${vehicleColumns} FROM drivers.vehicles WHERE user_id=$1 ORDER BY is_active DESC,created_at`,
      [id],
    )
  ).rows;
}
export async function saveVehicle(
  userId: string,
  data: VehicleInput,
  id?: string,
) {
  const plate = data.plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (plate.length < 3)
    throw new ServiceError("Enter a valid vehicle plate.", 400);
  try {
    return await locked(userId, async (c) => {
      await requireOffline(userId);
      const count = Number(
        (
          await c.query(
            "SELECT count(*) FROM drivers.vehicles WHERE user_id=$1",
            [userId],
          )
        ).rows[0].count,
      );
      if (!id && count >= 3)
        throw new ServiceError(
          "You can add up to 3 vehicles. Remove one before adding another.",
          409,
        );
      const values = [
        data.make.trim(),
        data.model.trim(),
        data.color.trim(),
        plate,
        data.year,
        data.seats,
        userId,
      ];
      if (id) {
        const owned = await c.query(
          "SELECT version FROM drivers.vehicles WHERE id=$1 AND user_id=$2",
          [id, userId],
        );
        if (!owned.rowCount) throw new ServiceError("Vehicle not found.", 404);
        if (owned.rows[0].version !== data.version)
          throw new ServiceError(
            "This vehicle changed in another tab. Reload before saving again.",
            409,
          );
      }
      const r = id
        ? await c.query(
            `UPDATE drivers.vehicles SET make=$1,model=$2,color=$3,plate=$4,year=$5,seats=$6,version=version+1,updated_at=now() WHERE user_id=$7 AND id=$8 RETURNING ${vehicleColumns}`,
            [...values, id],
          )
        : await c.query(
            `INSERT INTO drivers.vehicles(make,model,color,plate,year,seats,user_id,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${vehicleColumns}`,
            [...values, count === 0],
          );
      return r.rows[0];
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      throw new ServiceError("That vehicle plate is already registered.", 409);
    throw error;
  }
}
export async function activateVehicle(userId: string, id: string) {
  return locked(userId, async (c) => {
    await requireOffline(userId);
    if (
      !(
        await c.query(
          "SELECT id FROM drivers.vehicles WHERE id=$1 AND user_id=$2",
          [id, userId],
        )
      ).rowCount
    )
      throw new ServiceError("Vehicle not found.", 404);
    await c.query(
      "UPDATE drivers.vehicles SET is_active=false,version=version+1,updated_at=now() WHERE user_id=$1 AND is_active=true AND id<>$2",
      [userId, id],
    );
    const r = await c.query(
      `UPDATE drivers.vehicles SET is_active=true,version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${vehicleColumns}`,
      [id, userId],
    );
    return r.rows[0];
  });
}
export async function deleteVehicle(userId: string, id: string) {
  await locked(userId, async (c) => {
    await requireOffline(userId);
    const r = await c.query(
      "DELETE FROM drivers.vehicles WHERE user_id=$1 AND id=$2",
      [userId, id],
    );
    if (!r.rowCount) throw new ServiceError("Vehicle not found.", 404);
  });
}
export async function eligibility(user: Principal, client?: PoolClient) {
  const profile = await getProfile(user, client),
    vehicles = await listVehicles(user.id, client),
    active = vehicles.find((v) => v.isActive);
  const reasons: string[] = [];
  if (!user.emailVerified)
    reasons.push("Verify your email in Sign-in & security.");
  if (!profile.phone) reasons.push("Add an international phone number.");
  if (!profile.licenseNumber || !profile.licenseExpires)
    reasons.push("Add your simulated license details.");
  else if (profile.licenseExpires < new Date().toISOString().slice(0, 10))
    reasons.push("Update your expired license.");
  if (!active) reasons.push("Add and select an active vehicle.");
  return {
    eligible: reasons.length === 0,
    reasons,
    activeVehicle: active ?? null,
  };
}
export async function availability(user: Principal) {
  const state = await presence(user.id);
  return {
    online: Boolean(state),
    location: state
      ? { latitude: state.latitude, longitude: state.longitude }
      : null,
    updatedAt: state?.updatedAt ?? null,
    expiresAt: state
      ? new Date(
          new Date(state.updatedAt).getTime() + ONLINE_TTL * 1000,
        ).toISOString()
      : null,
    ttlSeconds: ONLINE_TTL,
    ...(await eligibility(user)),
  };
}
export async function changeAvailability(
  user: Principal,
  online: boolean,
  coords?: Coordinates,
) {
  await locked(user.id, async (client) => {
    if (!online) {
      await clearPresence(user.id);
      return;
    }
    const ready = await eligibility(user, client);
    if (!ready.eligible) throw new ServiceError(ready.reasons.join(" "), 403);
    await writePresence(user.id, {
      ...coords!,
      vehicleId: ready.activeVehicle.id,
      updatedAt: new Date().toISOString(),
    });
  });
  return availability(user);
}
export async function heartbeat(user: Principal, coords?: Coordinates) {
  await locked(user.id, async (client) => {
    const current = await presence(user.id);
    if (!current)
      throw new ServiceError(
        "You are offline. Go online before updating your location.",
        409,
      );
    const ready = await eligibility(user, client);
    if (!ready.eligible) {
      await clearPresence(user.id);
      throw new ServiceError(ready.reasons.join(" "), 403);
    }
    await writePresence(
      user.id,
      { ...current, ...coords, updatedAt: new Date().toISOString() },
      true,
    );
  });
  return availability(user);
}
