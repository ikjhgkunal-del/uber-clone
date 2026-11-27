import type { Principal } from "@uber-clone/shared/http";
import { ServiceError } from "@uber-clone/shared/errors";
import {
  pool,
  profileColumns,
  locationColumns,
  preferenceColumns,
  type ProfileUpdate,
  type LocationInput,
  type Preferences,
} from "./user.model.js";
export async function ensureProfile(user: Principal) {
  await pool.query(
    "INSERT INTO users.customer_profiles(user_id,display_name) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",
    [user.id, user.name.trim() || "Passenger"],
  );
  await pool.query(
    "INSERT INTO users.customer_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",
    [user.id],
  );
}
export async function getProfile(user: Principal) {
  const result = await pool.query(
    `SELECT ${profileColumns} FROM users.customer_profiles WHERE user_id=$1`,
    [user.id],
  );
  return {
    ...result.rows[0],
    email: user.email,
    emailVerified: user.emailVerified,
  };
}
export async function updateProfile(userId: string, data: ProfileUpdate) {
  const result = await pool.query(
    `UPDATE users.customer_profiles SET display_name=$1,phone_number=$2,version=version+1,updated_at=now() WHERE user_id=$3 AND version=$4 RETURNING ${profileColumns}`,
    [data.name.trim(), data.phone.trim(), userId, data.version],
  );
  if (!result.rowCount)
    throw new ServiceError(
      "Your profile changed in another tab. Reload before saving again.",
      409,
    );
  return result.rows[0];
}
export async function listPlaces(userId: string) {
  return (
    await pool.query(
      `SELECT ${locationColumns} FROM users.saved_locations WHERE user_id=$1 ORDER BY CASE kind WHEN 'home' THEN 0 WHEN 'work' THEN 1 ELSE 2 END,created_at`,
      [userId],
    )
  ).rows;
}
export async function savePlace(
  userId: string,
  data: LocationInput,
  id?: string,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT user_id FROM users.customer_profiles WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    if (
      !id &&
      Number(
        (
          await client.query(
            "SELECT count(*) FROM users.saved_locations WHERE user_id=$1",
            [userId],
          )
        ).rows[0].count,
      ) >= 20
    )
      throw new ServiceError(
        "You can save up to 20 places. Remove one before adding another.",
        409,
      );
    const values = [
      data.kind,
      data.label.trim(),
      data.address.trim(),
      data.latitude,
      data.longitude,
      userId,
    ];
    const result = id
      ? await client.query(
          `UPDATE users.saved_locations SET kind=$1,label=$2,address_text=$3,latitude=$4,longitude=$5,updated_at=now() WHERE user_id=$6 AND id=$7 RETURNING ${locationColumns}`,
          [...values, id],
        )
      : await client.query(
          `INSERT INTO users.saved_locations(kind,label,address_text,latitude,longitude,user_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${locationColumns}`,
          values,
        );
    if (!result.rowCount) throw new ServiceError("Saved place not found.", 404);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505")
      throw new ServiceError(
        "A place with this label or category already exists.",
        409,
      );
    throw error;
  } finally {
    client.release();
  }
}
export async function deletePlace(userId: string, id: string) {
  const result = await pool.query(
    "DELETE FROM users.saved_locations WHERE user_id=$1 AND id=$2",
    [userId, id],
  );
  if (!result.rowCount) throw new ServiceError("Saved place not found.", 404);
}
export async function getPreferences(userId: string) {
  return (
    await pool.query(
      `SELECT ${preferenceColumns} FROM users.customer_preferences WHERE user_id=$1`,
      [userId],
    )
  ).rows[0];
}
export async function updatePreferences(userId: string, data: Preferences) {
  const result = await pool.query(
    `UPDATE users.customer_preferences SET quiet_ride=$1,cool_temperature=$2,assistance_needed=$3,version=version+1,updated_at=now() WHERE user_id=$4 AND version=$5 RETURNING ${preferenceColumns}`,
    [
      data.quietRide,
      data.coolTemperature,
      data.assistanceNeeded,
      userId,
      data.version,
    ],
  );
  if (!result.rowCount)
    throw new ServiceError(
      "Preferences changed in another tab. Reload before saving again.",
      409,
    );
  return result.rows[0];
}
