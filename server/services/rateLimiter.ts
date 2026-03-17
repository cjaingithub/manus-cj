/**
 * Rate Limiter Service
 * Implements token bucket and sliding window rate limiting algorithms
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for cache keys
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitStore {
  get(key: string): Promise<number>;
  set(key: string, value: number, expiresIn: number): Promise<void>;
  increment(key: string, expiresIn: number): Promise<number>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store (suitable for single-instance deployments)
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();

  async get(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return 0;
    }
    return entry.count;
  }

  async set(key: string, value: number, expiresIn: number): Promise<void> {
    this.store.set(key, {
      count: value,
      expiresAt: Date.now() + expiresIn,
    });
  }

  async increment(key: string, expiresIn: number): Promise<number> {
    const current = await this.get(key);
    const newValue = current + 1;
    await this.set(key, newValue, expiresIn);
    return newValue;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Cleanup expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Token Bucket Rate Limiter
 * Allows burst traffic up to the bucket capacity
 */
export class TokenBucketLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      keyPrefix: "rate-limit:",
      ...config,
    };
    this.store = store || new InMemoryRateLimitStore();
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<boolean> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const current = await this.store.get(key);

    if (current < this.config.maxRequests) {
      await this.store.increment(key, this.config.windowMs);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  async getRemaining(identifier: string): Promise<number> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const current = await this.store.get(key);
    return Math.max(0, this.config.maxRequests - current);
  }

  /**
   * Get reset time for identifier
   */
  async getResetTime(identifier: string): Promise<number> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const store = this.store as InMemoryRateLimitStore;
    const entry = (store as any).store?.get(key);
    if (!entry) return Date.now() + this.config.windowMs;
    return entry.expiresAt;
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}${identifier}`;
    await this.store.reset(key);
  }
}

/**
 * Sliding Window Rate Limiter
 * More accurate but slightly more complex than token bucket
 */
export class SlidingWindowLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      keyPrefix: "sliding-window:",
      ...config,
    };
    this.store = store || new InMemoryRateLimitStore();
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<boolean> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get current count
    const current = await this.store.get(key);

    if (current < this.config.maxRequests) {
      await this.store.increment(key, this.config.windowMs);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests
   */
  async getRemaining(identifier: string): Promise<number> {
    const key = `${this.config.keyPrefix}${identifier}`;
    const current = await this.store.get(key);
    return Math.max(0, this.config.maxRequests - current);
  }

  /**
   * Reset rate limit
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}${identifier}`;
    await this.store.reset(key);
  }
}

/**
 * Rate limit response headers
 */
export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
}

/**
 * Get rate limit headers
 */
export async function getRateLimitHeaders(
  limiter: TokenBucketLimiter | SlidingWindowLimiter,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitHeaders> {
  const remaining = await limiter.getRemaining(identifier);
  const resetTime =
    limiter instanceof TokenBucketLimiter
      ? await limiter.getResetTime(identifier)
      : Date.now() + config.windowMs;

  return {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
  };
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_CONFIGS = {
  // Strict: 10 requests per minute
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Normal: 100 requests per minute
  normal: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Relaxed: 1000 requests per minute
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  // Per-user: 50 requests per minute
  perUser: {
    windowMs: 60 * 1000,
    maxRequests: 50,
  },
  // Per-IP: 100 requests per minute
  perIp: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // API endpoint: 500 requests per hour
  apiEndpoint: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 500,
  },
};

/**
 * Rate limiter factory
 */
export function createRateLimiter(
  config: RateLimitConfig,
  algorithm: "token-bucket" | "sliding-window" = "token-bucket"
): TokenBucketLimiter | SlidingWindowLimiter {
  const store = new InMemoryRateLimitStore();

  if (algorithm === "sliding-window") {
    return new SlidingWindowLimiter(config, store);
  }

  return new TokenBucketLimiter(config, store);
}

/**
 * Global rate limiters for different endpoints
 */
export const globalLimiters = {
  api: createRateLimiter(DEFAULT_CONFIGS.apiEndpoint),
  perUser: createRateLimiter(DEFAULT_CONFIGS.perUser),
  perIp: createRateLimiter(DEFAULT_CONFIGS.perIp),
};
