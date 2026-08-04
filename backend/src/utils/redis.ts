import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient: Redis | null = null;
let isConnected = false;
const inMemoryFallback = new Map<string, { value: string; expiresAt: number }>();

try {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('Redis connection failed after 3 retries, switching to fallback memory store.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isConnected = true;
    console.log(`✅ Redis connected at ${REDIS_HOST}:${REDIS_PORT}`);
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    // Suppress spammy log
  });

  redisClient.connect().catch(() => {
    isConnected = false;
  });
} catch (error) {
  console.warn('Redis initialization skipped, using memory fallback.');
}

export const getCache = async (key: string): Promise<string | null> => {
  if (redisClient && isConnected) {
    try {
      return await redisClient.get(key);
    } catch {
      // Fall through to memory fallback
    }
  }

  const cached = inMemoryFallback.get(key);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.value;
    }
    inMemoryFallback.delete(key);
  }
  return null;
};

export const setCache = async (key: string, value: string, ttlSeconds: number = 300): Promise<void> => {
  if (redisClient && isConnected) {
    try {
      await redisClient.set(key, value, 'EX', ttlSeconds);
      return;
    } catch {
      // Fall through to memory fallback
    }
  }

  inMemoryFallback.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const deleteCache = async (key: string): Promise<void> => {
  if (redisClient && isConnected) {
    try {
      await redisClient.del(key);
      return;
    } catch {
      // Fall through
    }
  }
  inMemoryFallback.delete(key);
};

export const isRedisReady = (): boolean => isConnected;
