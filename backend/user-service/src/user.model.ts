import { createDatabasePool } from "@uber-clone/shared/database";
export const pool = createDatabasePool();
export const profileColumns =
  'user_id AS "userId", display_name AS name, phone_number AS phone, version, created_at AS "createdAt", updated_at AS "updatedAt"';
export const locationColumns =
  'id, kind, label, address_text AS address, latitude, longitude, created_at AS "createdAt", updated_at AS "updatedAt"';
export const preferenceColumns =
  'quiet_ride AS "quietRide", cool_temperature AS "coolTemperature", assistance_needed AS "assistanceNeeded", version';
export interface ProfileUpdate {
  name: string;
  phone: string;
  version: number;
}
export interface LocationInput {
  kind: "home" | "work" | "other";
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}
export interface Preferences {
  quietRide: boolean;
  coolTemperature: boolean;
  assistanceNeeded: boolean;
  version: number;
}
