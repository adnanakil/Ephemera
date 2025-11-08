import { Redis } from '@upstash/redis';

// Create Redis client using Upstash integration environment variables
export function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}
