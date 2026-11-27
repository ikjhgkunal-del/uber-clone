import { createClient } from "redis";
import { ServiceError } from "@uber-clone/shared/errors";
import type { Coordinates } from "./driver.model.js";
export const ONLINE_TTL = 90;
export const onlineKey = (id: string) => "drivers:online:" + id;
export const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://redis:6379",
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: (retries) => Math.min(250 * retries, 3000),
  },
});
redis.on("error", () => {
  if (process.env.SERVICE_TEST_MODE !== "true")
    console.error("Driver availability store unavailable");
});
export async function storeReady() {
  if (!redis.isReady)
    throw new ServiceError(
      "Availability is temporarily unavailable. Please try again.",
      503,
    );
  await command(() => redis.ping());
}
async function command<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch {
    throw new ServiceError(
      "Availability is temporarily unavailable. Please try again.",
      503,
    );
  }
}
export interface Presence extends Coordinates {
  vehicleId: string;
  updatedAt: string;
}
export async function presence(id: string): Promise<Presence | null> {
  await storeReady();
  const raw = await command(() => redis.get(onlineKey(id)));
  return raw ? JSON.parse(raw) : null;
}
export async function writePresence(id: string, data: Presence, renew = false) {
  await storeReady();
  const saved = await command(() =>
    redis.set(onlineKey(id), JSON.stringify(data), {
      EX: ONLINE_TTL,
      ...(renew ? { XX: true } : {}),
    }),
  );
  if (!saved)
    throw new ServiceError(
      "Your online session expired. Go online again.",
      409,
    );
}
export async function clearPresence(id: string) {
  await storeReady();
  await command(() => redis.del(onlineKey(id)));
}
