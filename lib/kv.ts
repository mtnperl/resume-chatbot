import Redis from "ioredis";

// Supports both Vercel KV (KV_REST_API_URL) and standard Redis (REDIS_URL)
const url = process.env.KV_REST_API_URL ?? process.env.REDIS_URL;

if (!url) {
  throw new Error("Missing Redis environment variable: set KV_REST_API_URL or REDIS_URL");
}

const redis = new Redis(url, { lazyConnect: true });

// Thin wrapper matching the @vercel/kv API used in the codebase
export const kv = {
  get: <T = unknown>(key: string): Promise<T | null> =>
    redis.get(key).then((v) => (v ? (JSON.parse(v) as T) : null)),

  set: (key: string, value: unknown, opts?: { ex?: number }): Promise<unknown> => {
    const serialized = JSON.stringify(value);
    if (opts?.ex) return redis.set(key, serialized, "EX", opts.ex);
    return redis.set(key, serialized);
  },

  lpush: (key: string, ...values: unknown[]): Promise<number> =>
    redis.lpush(key, ...values.map((v) => JSON.stringify(v))),

  ltrim: (key: string, start: number, stop: number): Promise<string> =>
    redis.ltrim(key, start, stop),

  lrange: <T = unknown>(key: string, start: number, stop: number): Promise<T[]> =>
    redis.lrange(key, start, stop).then((items) =>
      items.map((item) => JSON.parse(item) as T)
    ),

  incr: (key: string): Promise<number> => redis.incr(key),

  expire: (key: string, seconds: number): Promise<number> =>
    redis.expire(key, seconds),
};
