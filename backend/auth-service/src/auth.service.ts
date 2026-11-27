import {
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import nodemailer from "nodemailer";
import { pool, type Account, type Role } from "./auth.model.js";
const scrypt = promisify(derive);
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await scrypt(password, salt, 64)) as Buffer).toString("hex")
  );
}
export async function passwordMatches(password: string, hash?: string | null) {
  const [salt, stored] = hash?.split(":") ?? ["0".repeat(32), "0".repeat(128)];
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const decoded = Buffer.from(stored, "hex");
  return (
    decoded.length === key.length &&
    timingSafeEqual(key, decoded) &&
    Boolean(hash)
  );
}
export async function register(
  email: string,
  password: string,
  role: Role,
  name: string,
) {
  const result = await pool.query<Account>(
    "INSERT INTO auth.users(email,password_hash,role,display_name) VALUES($1,$2,$3,$4) RETURNING *",
    [
      email.trim().toLowerCase(),
      await hashPassword(password),
      role,
      name.trim(),
    ],
  );
  return result.rows[0];
}
export async function login(email: string, password: string) {
  const result = await pool.query<Account>(
    "SELECT * FROM auth.users WHERE email=$1 AND status='active'",
    [email.trim().toLowerCase()],
  );
  const user = result.rows[0];
  return (await passwordMatches(password, user?.password_hash)) ? user : null;
}
export async function createSession(
  userId: string,
  remember = false,
  expectedPasswordHash?: string | null,
) {
  const token = randomToken();
  const seconds = remember ? 30 * 86400 : 86400;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query<Account>(
      "SELECT * FROM auth.users WHERE id=$1 AND status='active' FOR UPDATE",
      [userId],
    );
    if (
      !account.rows[0] ||
      (expectedPasswordHash !== undefined &&
        account.rows[0].password_hash !== expectedPasswordHash)
    ) {
      const failure = new Error(
        "Credentials changed; sign in again",
      ) as Error & { statusCode: number };
      failure.statusCode = 401;
      throw failure;
    }
    const result = await client.query<{ id: string }>(
      `INSERT INTO auth.sessions(user_id,refresh_hash,expires_at) VALUES($1,$2,now()+$3 * interval '1 second') RETURNING id`,
      [userId, hashToken(token), seconds],
    );
    await client.query("COMMIT");
    return { id: result.rows[0].id, refresh: token, seconds };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function rotateSession(token: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<
      Account & { session_id: string; expires_at: Date }
    >(
      `SELECT u.*, s.id AS session_id, s.expires_at FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.refresh_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active' FOR UPDATE OF s`,
      [hashToken(token)],
    );
    const user = result.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }
    const refresh = randomToken();
    await client.query("UPDATE auth.sessions SET refresh_hash=$1 WHERE id=$2", [
      hashToken(refresh),
      user.session_id,
    ]);
    await client.query("COMMIT");
    return {
      user,
      id: user.session_id,
      refresh,
      seconds: Math.max(
        1,
        Math.floor((user.expires_at.getTime() - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function sendAccountEmail(
  user: Account,
  purpose: "verify" | "reset",
) {
  if (!process.env.SMTP_HOST)
    throw new Error("Email delivery is not configured");
  const raw = randomToken();
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 5000,
    socketTimeout: 5000,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM auth.users WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    await client.query(
      "UPDATE auth.email_tokens SET used_at=now() WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL",
      [user.id, purpose],
    );
    await client.query(
      `INSERT INTO auth.email_tokens(user_id,token_hash,purpose,expires_at) VALUES($1,$2,$3,now()+interval '15 minutes')`,
      [user.id, hashToken(raw), purpose],
    );
    const link = new URL(
      purpose === "verify" ? "/verify-email" : "/reset-password",
      process.env.APP_URL ?? "http://localhost:5173",
    );
    link.hash = "token=" + raw;
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "Uber Clone <no-reply@example.test>",
      to: user.email,
      subject:
        purpose === "verify"
          ? "Verify your email — Uber Clone"
          : "Reset your password — Uber Clone",
      text: `Use this link within 15 minutes: ${link.toString()}\nIf you did not request this, ignore this email. This is an independent ride simulator.`,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    transport.close();
  }
}
export async function consumeEmailToken(
  raw: string,
  purpose: "verify" | "reset",
  password?: string,
) {
  const passwordHash = password ? await hashPassword(password) : null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ user_id: string }>(
      `UPDATE auth.email_tokens SET used_at=now() WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>now() RETURNING user_id`,
      [hashToken(raw), purpose],
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    const userId = result.rows[0].user_id;
    if (purpose === "reset") {
      await client.query("UPDATE auth.users SET password_hash=$1 WHERE id=$2", [
        passwordHash,
        userId,
      ]);
      await client.query(
        "UPDATE auth.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [userId],
      );
    } else
      await client.query(
        "UPDATE auth.users SET email_verified=true WHERE id=$1",
        [userId],
      );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
