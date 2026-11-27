import { createDatabasePool } from "@uber-clone/shared/database";
export const pool = createDatabasePool();
export const profileColumns = `user_id AS "userId",display_name AS name,phone_number AS phone,license_number AS "licenseNumber",to_char(license_expires,'YYYY-MM-DD') AS "licenseExpires",version,created_at AS "createdAt",updated_at AS "updatedAt"`;
export const vehicleColumns =
  'id,make,model,color,plate,year,seats,is_active AS "isActive",version,created_at AS "createdAt",updated_at AS "updatedAt"';
export interface ProfileInput {
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpires: string | null;
  version: number;
}
export interface VehicleInput {
  make: string;
  model: string;
  color: string;
  plate: string;
  year: number;
  seats: number;
  version?: number;
}
export interface Coordinates {
  latitude: number;
  longitude: number;
}
