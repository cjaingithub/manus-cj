import { describe, it, expect, beforeEach } from "vitest";
import {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  InMemoryRateLimitStore,
  createRateLimiter,
  DEFAULT_CONFIGS,
} from "./rateLimiter";

describe("Rate Limiter", () => {
  describe("InMemoryRateLimitStore", () => {
    let store: InMemoryRateLimitStore;

    beforeEach(() => {
      store = new InMemoryRateLimitStore();
    });

    it("should increment and get values", async () => {
      const count = await store.increment("test-key", 60000);
      expect(count).toBe(1);

      const count2 = await store.increment("test-key", 60000);
      expect(count2).toBe(2);
    });

    it("should return 0 for non-existent keys", async () => {
      const value = await store.get("non-existent");
      expect(value).toBe(0);
    });

    it("should reset keys", async () => {
      await store.increment("test-key", 60000);
      await store.reset("test-key");
      const value = await store.get("test-key");
      expect(value).toBe(0);
    });

    it("should cleanup expired entries", () => {
      (store as any).store.set("expired", { count: 1, expiresAt: Date.now() - 1000 });
      (store as any).store.set("valid", { count: 1, expiresAt: Date.now() + 60000 });

      store.cleanup();

      expect((store as any).store.has("expired")).toBe(false);
      expect((store as any).store.has("valid")).toBe(true);
    });
  });

  describe("TokenBucketLimiter", () => {
    let limiter: TokenBucketLimiter;

    beforeEach(() => {
      limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.normal);
    });

    it("should allow requests within limit", async () => {
      for (let i = 0; i < 100; i++) {
        const allowed = await limiter.isAllowed("user-1");
        expect(allowed).toBe(true);
      }
    });

    it("should reject requests exceeding limit", async () => {
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed("user-2");
      }

      const allowed = await limiter.isAllowed("user-2");
      expect(allowed).toBe(false);
    });

    it("should track remaining requests", async () => {
      await limiter.isAllowed("user-3");
      const remaining = await limiter.getRemaining("user-3");
      expect(remaining).toBe(99);
    });

    it("should allow different users independently", async () => {
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed("user-4");
      }

      const allowed = await limiter.isAllowed("user-5");
      expect(allowed).toBe(true);
    });

    it("should reset rate limits", async () => {
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed("user-6");
      }

      await limiter.reset("user-6");
      const allowed = await limiter.isAllowed("user-6");
      expect(allowed).toBe(true);
    });

    it("should handle strict limits", async () => {
      const strictLimiter = new TokenBucketLimiter(DEFAULT_CONFIGS.strict);

      for (let i = 0; i < 10; i++) {
        const allowed = await strictLimiter.isAllowed("user-7");
        expect(allowed).toBe(true);
      }

      const allowed = await strictLimiter.isAllowed("user-7");
      expect(allowed).toBe(false);
    });
  });

  describe("SlidingWindowLimiter", () => {
    let limiter: SlidingWindowLimiter;

    beforeEach(() => {
      limiter = new SlidingWindowLimiter(DEFAULT_CONFIGS.normal);
    });

    it("should allow requests within limit", async () => {
      for (let i = 0; i < 100; i++) {
        const allowed = await limiter.isAllowed("user-8");
        expect(allowed).toBe(true);
      }
    });

    it("should reject requests exceeding limit", async () => {
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed("user-9");
      }

      const allowed = await limiter.isAllowed("user-9");
      expect(allowed).toBe(false);
    });

    it("should track remaining requests", async () => {
      await limiter.isAllowed("user-10");
      const remaining = await limiter.getRemaining("user-10");
      expect(remaining).toBe(99);
    });

    it("should reset rate limits", async () => {
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed("user-11");
      }

      await limiter.reset("user-11");
      const allowed = await limiter.isAllowed("user-11");
      expect(allowed).toBe(true);
    });
  });

  describe("Rate Limiter Factory", () => {
    it("should create token bucket limiter by default", () => {
      const limiter = createRateLimiter(DEFAULT_CONFIGS.normal);
      expect(limiter).toBeInstanceOf(TokenBucketLimiter);
    });

    it("should create sliding window limiter when specified", () => {
      const limiter = createRateLimiter(DEFAULT_CONFIGS.normal, "sliding-window");
      expect(limiter).toBeInstanceOf(SlidingWindowLimiter);
    });
  });

  describe("Default Configurations", () => {
    it("should have strict config with 10 requests per minute", () => {
      expect(DEFAULT_CONFIGS.strict.maxRequests).toBe(10);
      expect(DEFAULT_CONFIGS.strict.windowMs).toBe(60 * 1000);
    });

    it("should have normal config with 100 requests per minute", () => {
      expect(DEFAULT_CONFIGS.normal.maxRequests).toBe(100);
      expect(DEFAULT_CONFIGS.normal.windowMs).toBe(60 * 1000);
    });

    it("should have per-user config with 50 requests per minute", () => {
      expect(DEFAULT_CONFIGS.perUser.maxRequests).toBe(50);
      expect(DEFAULT_CONFIGS.perUser.windowMs).toBe(60 * 1000);
    });

    it("should have API endpoint config with 500 requests per hour", () => {
      expect(DEFAULT_CONFIGS.apiEndpoint.maxRequests).toBe(500);
      expect(DEFAULT_CONFIGS.apiEndpoint.windowMs).toBe(60 * 60 * 1000);
    });
  });

  describe("Per-User Rate Limiting", () => {
    let limiter: TokenBucketLimiter;

    beforeEach(() => {
      limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.perUser);
    });

    it("should enforce per-user limits", async () => {
      // User 1 uses all their quota
      for (let i = 0; i < 50; i++) {
        await limiter.isAllowed("user-12");
      }

      // User 1 should be rate limited
      let allowed = await limiter.isAllowed("user-12");
      expect(allowed).toBe(false);

      // User 2 should still have quota
      allowed = await limiter.isAllowed("user-13");
      expect(allowed).toBe(true);
    });
  });

  describe("API Endpoint Rate Limiting", () => {
    let limiter: TokenBucketLimiter;

    beforeEach(() => {
      limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.apiEndpoint);
    });

    it("should allow 500 requests per hour", async () => {
      for (let i = 0; i < 500; i++) {
        const allowed = await limiter.isAllowed("api-endpoint");
        expect(allowed).toBe(true);
      }

      const allowed = await limiter.isAllowed("api-endpoint");
      expect(allowed).toBe(false);
    });
  });
});
