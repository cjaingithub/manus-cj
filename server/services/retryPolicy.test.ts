import { describe, it, expect, beforeEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerState,
  retryWithBackoff,
  executeWithCircuitBreaker,
  executeWithRetryAndCircuitBreaker,
  SelectiveRetryPolicy,
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
} from "./retryPolicy";

describe("Retry Policy Service", () => {
  describe("calculateBackoffDelay", () => {
    it("should calculate exponential backoff delay", () => {
      const delay0 = calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG);
      const delay1 = calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG);
      const delay2 = calculateBackoffDelay(2, DEFAULT_RETRY_CONFIG);

      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(110); // 100 + 10% jitter
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it("should cap delay at maxDelayMs", () => {
      const delay = calculateBackoffDelay(10, DEFAULT_RETRY_CONFIG);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs + DEFAULT_RETRY_CONFIG.maxDelayMs * 0.1);
    });
  });

  describe("CircuitBreaker", () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker();
    });

    it("should start in CLOSED state", () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.canExecute()).toBe(true);
    });

    it("should open after failure threshold", () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(breaker.canExecute()).toBe(false);
    });

    it("should transition to HALF_OPEN after timeout", async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for timeout (mocked with small timeout)
      const fastBreaker = new CircuitBreaker({ timeout: 10 });
      for (let i = 0; i < 5; i++) {
        fastBreaker.recordFailure();
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(fastBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it("should close after success threshold in HALF_OPEN", () => {
      const fastBreaker = new CircuitBreaker({ timeout: 10, successThreshold: 2 });
      for (let i = 0; i < 5; i++) {
        fastBreaker.recordFailure();
      }
      expect(fastBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Simulate timeout passing
      fastBreaker["lastFailureTime"] = Date.now() - 20;
      expect(fastBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      // Record successes
      fastBreaker.recordSuccess();
      expect(fastBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
      fastBreaker.recordSuccess();
      expect(fastBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it("should reset to CLOSED state", () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      breaker.reset();
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.canExecute()).toBe(true);
    });

    it("should get status", () => {
      breaker.recordFailure();
      breaker.recordFailure();
      const status = breaker.getStatus();

      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(2);
      expect(status.successCount).toBe(0);
    });
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first attempt", async () => {
      const fn = async () => "success";
      const result = await retryWithBackoff(fn);

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(1);
    });

    it("should retry on failure", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error("Failed");
        return "success";
      };

      const result = await retryWithBackoff(fn);
      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(3);
    });

    it("should fail after max retries", async () => {
      const fn = async () => {
        throw new Error("Always fails");
      };

      const result = await retryWithBackoff(fn, { maxRetries: 2 });
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Always fails");
      expect(result.attempts).toBe(3);
    });

    it("should accumulate delay time", async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error("Failed");
        return "success";
      };

      const result = await retryWithBackoff(fn, { initialDelayMs: 50 });
      expect(result.totalDelayMs).toBeGreaterThan(0);
    });
  });

  describe("executeWithCircuitBreaker", () => {
    it("should execute when circuit is closed", async () => {
      const breaker = new CircuitBreaker();
      const fn = async () => "success";

      const result = await executeWithCircuitBreaker(fn, breaker);
      expect(result).toBe("success");
    });

    it("should fail when circuit is open", async () => {
      const breaker = new CircuitBreaker();
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      const fn = async () => "success";
      await expect(executeWithCircuitBreaker(fn, breaker)).rejects.toThrow("Circuit breaker is OPEN");
    });

    it("should record failures", async () => {
      const breaker = new CircuitBreaker();
      const fn = async () => {
        throw new Error("Failed");
      };

      try {
        await executeWithCircuitBreaker(fn, breaker);
      } catch (e) {
        // Expected
      }

      expect(breaker.getStatus().failureCount).toBe(1);
    });
  });

  describe("executeWithRetryAndCircuitBreaker", () => {
    it("should retry and succeed", async () => {
      const breaker = new CircuitBreaker();
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error("Failed");
        return "success";
      };

      const result = await executeWithRetryAndCircuitBreaker(fn, breaker);
      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(2);
    });

    it("should fail when circuit is open", async () => {
      const breaker = new CircuitBreaker();
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      const fn = async () => "success";
      const result = await executeWithRetryAndCircuitBreaker(fn, breaker);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Circuit breaker is OPEN");
    });
  });

  describe("SelectiveRetryPolicy", () => {
    it("should retry on retryable errors", async () => {
      const policy = new SelectiveRetryPolicy();
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error("Connection refused");
          (error as any).code = "ECONNREFUSED";
          throw error;
        }
        return "success";
      };

      const result = await policy.execute(fn);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const policy = new SelectiveRetryPolicy();
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error("Invalid input");
      };

      const result = await policy.execute(fn);
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should not retry
    });

    it("should identify retryable errors", () => {
      const policy = new SelectiveRetryPolicy();
      const retryableError = new Error("Connection refused");
      (retryableError as any).code = "ECONNREFUSED";
      const nonRetryableError = new Error("Invalid input");

      expect(policy.isRetryable(retryableError)).toBe(true);
      expect(policy.isRetryable(nonRetryableError)).toBe(false);
    });

    it("should support custom retryable error types", async () => {
      const policy = new SelectiveRetryPolicy(["CUSTOM_ERROR"]);
      const error = new Error("Custom error");
      (error as any).code = "CUSTOM_ERROR";

      expect(policy.isRetryable(error)).toBe(true);
    });
  });
});
