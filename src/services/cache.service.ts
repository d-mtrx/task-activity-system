import { redis, CACHE_TTL } from '../config/redis';

export const CacheService = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttl = CACHE_TTL): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await redis.del(...keys);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  },
};
