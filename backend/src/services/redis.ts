import Redis from 'ioredis';

let redis: Redis | null = null;

const DEFAULT_TTL = 300;

function getClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    redis.on('error', () => {});
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttl = DEFAULT_TTL): Promise<void> {
  try {
    const client = getClient();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch {
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const client = getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch {
  }
}

export async function cacheIncr(key: string): Promise<number> {
  try {
    const client = getClient();
    return await client.incr(key);
  } catch {
    return 0;
  }
}

export async function cacheExpire(key: string, ttl: number): Promise<void> {
  try {
    const client = getClient();
    await client.expire(key, ttl);
  } catch {
  }
}

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  await cacheSet(key, data, ttl);
  return data;
}
