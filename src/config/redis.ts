import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const sharedOptions: Partial<RedisOptions> = {
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

function makeClient(): Redis {
  // Railway injects REDIS_URL; Docker uses individual vars
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, sharedOptions as RedisOptions);
  }
  return new Redis({
    ...sharedOptions,
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

// Main client for cache operations
export const redis = makeClient();

// Dedicated pub/sub publisher (separate connection required)
export const redisPub = makeClient();

// Dedicated pub/sub subscriber (separate connection required)
export const redisSub = makeClient();

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redisPub.connect();
  await redisSub.connect();
  console.log('✅ Redis connected (cache + pub/sub)');
}

export const REDIS_CHANNELS = {
  TASK_EVENTS: 'task:events',
} as const;

export const CACHE_KEYS = {
  ALL_TASKS: 'tasks:all',
  TASK: (id: string) => `tasks:${id}`,
} as const;

export const CACHE_TTL = Number(process.env.CACHE_TTL) || 300;
