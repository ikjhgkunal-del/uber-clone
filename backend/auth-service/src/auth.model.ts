import { Pool } from "pg";
export type Role = "customer" | "driver";
export interface Account {
  id: string;
  email: string;
  role: Role;
  display_name: string;
  email_verified: boolean;
  password_hash: string | null;
}
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
});
export const publicUser = (u: Account) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  name: u.display_name,
  emailVerified: u.email_verified,
  hasPassword: Boolean(u.password_hash),
});
