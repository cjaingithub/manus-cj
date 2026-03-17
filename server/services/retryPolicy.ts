/**
 * Retry Policy Service
 * Implements exponential backoff, circuit breaker, and retry strategies
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes before closing circuit
  timeout: number; // Time in ms before attempting to half-open
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
};

/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Rejecting requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    if (this.state === CircuitBreakerState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.config.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      }
    }
    return this.state;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Check if circuit breaker allows execution
   */
  canExecute(): boolean {
    const state = this.getState();
    return state !== CircuitBreakerState.OPEN;
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return cappedDelay + jitter;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < finalConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, finalConfig);
        totalDelayMs += delay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: finalConfig.maxRetries + 1,
    totalDelayMs,
  };
}

/**
 * Execute function with circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker
): Promise<T> {
  if (!circuitBreaker.canExecute()) {
    throw new Error("Circuit breaker is OPEN");
  }

  try {
    const result = await fn();
    circuitBreaker.recordSuccess();
    return result;
  } catch (error) {
    circuitBreaker.recordFailure();
    throw error;
  }
}

/**
 * Execute with both retry and circuit breaker
 */
export async function executeWithRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker,
  retryConfig: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  if (!circuitBreaker.canExecute()) {
    return {
      success: false,
      error: new Error("Circuit breaker is OPEN"),
      attempts: 0,
      totalDelayMs: 0,
    };
  }

  const result = await retryWithBackoff(
    async () => {
      try {
        const data = await fn();
        circuitBreaker.recordSuccess();
        return data;
      } catch (error) {
        circuitBreaker.recordFailure();
        throw error;
      }
    },
    retryConfig
  );

  return result;
}

/**
 * Retry policy for specific error types
 */
export class SelectiveRetryPolicy {
  private retryableErrors: Set<string>;

  constructor(retryableErrorTypes: string[] = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"]) {
    this.retryableErrors = new Set(retryableErrorTypes);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: Error): boolean {
    if (error instanceof Error) {
      return this.retryableErrors.has((error as any).code);
    }
    return false;
  }

  /**
   * Retry only on specific errors
   */
  async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attempt + 1,
          totalDelayMs,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryable(lastError)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt + 1,
            totalDelayMs,
          };
        }

        if (attempt < finalConfig.maxRetries) {
          const delay = calculateBackoffDelay(attempt, finalConfig);
          totalDelayMs += delay;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxRetries + 1,
      totalDelayMs,
    };
  }
}
