import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool, type Account, type Role } from './auth.model.js';
const scrypt = promisify(derive);
export async function register(email: string, password: string, role: Role) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  const result = await pool.query<Account>('INSERT INTO auth.users (email,password_hash,role) VALUES ($1,$2,$3) RETURNING id,email,role', [email.trim().toLowerCase(), salt + ':' + key.toString('hex'), role]);
  return result.rows[0];
}
export async function login(email: string, password: string) {
  const result = await pool.query<Account>('SELECT id,email,role,password_hash FROM auth.users WHERE email=$1 AND status=$2', [email.trim().toLowerCase(), 'active']);
  const account = result.rows[0];
  const [salt, hash] = account?.password_hash.split(':') ?? ['00000000000000000000000000000000', '00'.repeat(64)];
  const key = await scrypt(password, salt, 64) as Buffer;
  if (!timingSafeEqual(key, Buffer.from(hash, 'hex')) || !account) return null;
  return { id: account.id, email: account.email, role: account.role };
}
