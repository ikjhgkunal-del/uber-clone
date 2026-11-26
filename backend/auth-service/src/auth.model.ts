import { Pool } from "pg";
export type Role = 'customer' | 'driver';
export interface Account { id: string; email: string; role: Role; password_hash: string }
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
