import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error', { error });
    });
  }

  async checkRateLimit(address: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${address.toLowerCase()}`;
    const now = Date.now();

    try {
      const data = await this.client.get(key);

      if (!data) {
        const resetAt = now + config.rateLimit.windowMs;
        await this.client.set(
          key,
          JSON.stringify({ count: 1, resetAt }),
          'PX',
          config.rateLimit.windowMs
        );

        return {
          allowed: true,
          remaining: config.rateLimit.maxRequests - 1,
          resetAt,
        };
      }

      const { count, resetAt } = JSON.parse(data);

      if (count >= config.rateLimit.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      const newCount = count + 1;
      const ttl = resetAt - now;

      await this.client.set(
        key,
        JSON.stringify({ count: newCount, resetAt }),
        'PX',
        ttl
      );

      return {
        allowed: true,
        remaining: config.rateLimit.maxRequests - newCount,
        resetAt,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { address, error });
      throw error;
    }
  }

  async getRateLimitInfo(address: string): Promise<{ count: number; remaining: number; resetAt: number | null }> {
    const key = `ratelimit:${address.toLowerCase()}`;

    try {
      const data = await this.client.get(key);

      if (!data) {
        return {
          count: 0,
          remaining: config.rateLimit.maxRequests,
          resetAt: null,
        };
      }

      const { count, resetAt } = JSON.parse(data);

      return {
        count,
        remaining: Math.max(0, config.rateLimit.maxRequests - count),
        resetAt,
      };
    } catch (error) {
      logger.error('Failed to get rate limit info', { address, error });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
