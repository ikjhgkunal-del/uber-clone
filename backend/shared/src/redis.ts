import { createClient } from "redis";

export function createRedisClient(url = process.env.REDIS_URL) {
  if (!url) {
    throw new Error("REDIS_URL must be configured");
  }

  const client = createClient({ url });
  client.on("error", (error) => console.error("Redis client error", error));
  return client;
}
