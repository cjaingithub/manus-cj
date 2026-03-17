/**
 * Error Recovery System
 * Handles automatic retry, fallback strategies, and graceful degradation
 */

export interface RecoveryStrategy {
  name: string;
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry: (error: Error, attempt: number) => boolean;
}

export const DEFAULT_RECOVERY_STRATEGIES = {
  aggressive: {
    name: "aggressive",
    maxRetries: 5,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => true,
  } as RecoveryStrategy,

  moderate: {
    name: "moderate",
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 3000,
    backoffMultiplier: 1.5,
    shouldRetry: (error: Error) => {
      // Don't retry on validation or auth errors
      return !error.message.includes("not allowed") && !error.message.includes("Unauthorized");
    },
  } as RecoveryStrategy,

  conservative: {
    name: "conservative",
    maxRetries: 1,
    initialDelay: 1000,
    maxDelay: 2000,
    backoffMultiplier: 1,
    shouldRetry: (error: Error) => {
      // Only retry on network errors
      return error.message.includes("timeout") || error.message.includes("ECONNREFUSED");
    },
  } as RecoveryStrategy,
};

export class ErrorRecoveryManager {
  private strategy: RecoveryStrategy;
  private executionLog: Array<{
    timestamp: Date;
    error: string;
    attempt: number;
    strategy: string;
  }> = [];

  constructor(strategy: RecoveryStrategy = DEFAULT_RECOVERY_STRATEGIES.moderate) {
    this.strategy = strategy;
  }

  /**
   * Execute function with automatic retry
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string = "operation"
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.strategy.maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        this.logError(lastError, attempt, context);

        // Check if we should retry
        if (attempt <= this.strategy.maxRetries && this.strategy.shouldRetry(lastError, attempt)) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
          continue;
        }

        // No more retries
        break;
      }
    }

    throw lastError;
  }

  /**
   * Execute with fallback chain
   */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFns: Array<() => Promise<T>>,
    context: string = "operation"
  ): Promise<T> {
    const allFns = [primaryFn, ...fallbackFns];

    for (let i = 0; i < allFns.length; i++) {
      try {
        return await this.executeWithRetry(allFns[i], `${context} (attempt ${i + 1})`);
      } catch (error) {
        if (i === allFns.length - 1) {
          // Last fallback failed
          throw error;
        }
        // Try next fallback
        this.logFallback(error as Error, i + 1);
      }
    }

    throw new Error("All fallback strategies exhausted");
  }

  /**
   * Graceful degradation - return partial result on failure
   */
  async executeWithDegradation<T>(
    fn: () => Promise<T>,
    degradedValue: T,
    context: string = "operation"
  ): Promise<T> {
    try {
      return await this.executeWithRetry(fn, context);
    } catch (error) {
      console.warn(`[Degradation] ${context} failed, returning degraded value:`, error);
      this.logDegradation(error as Error, context);
      return degradedValue;
    }
  }

  /**
   * Circuit breaker pattern - fail fast after threshold
   */
  createCircuitBreaker(
    fn: () => Promise<void>,
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async () => {
      // Check if circuit should reset
      if (isOpen && Date.now() - lastFailureTime > resetTimeout) {
        isOpen = false;
        failureCount = 0;
      }

      if (isOpen) {
        throw new Error("Circuit breaker is open - service temporarily unavailable");
      }

      try {
        await fn();
        failureCount = 0; // Reset on success
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= failureThreshold) {
          isOpen = true;
        }

        throw error;
      }
    };
  }

  /**
   * Get execution log
   */
  getExecutionLog() {
    return this.executionLog;
  }

  /**
   * Clear execution log
   */
  clearExecutionLog() {
    this.executionLog = [];
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.strategy.initialDelay * Math.pow(this.strategy.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.strategy.maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * cappedDelay;
    return cappedDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log error
   */
  private logError(error: Error, attempt: number, context: string) {
    this.executionLog.push({
      timestamp: new Date(),
      error: `${context}: ${error.message}`,
      attempt,
      strategy: this.strategy.name,
    });

    console.warn(`[Retry ${attempt}/${this.strategy.maxRetries + 1}] ${context}:`, error.message);
  }

  /**
   * Log fallback attempt
   */
  private logFallback(error: Error, fallbackIndex: number) {
    console.warn(`[Fallback ${fallbackIndex}] Attempting next strategy:`, error.message);
  }

  /**
   * Log degradation
   */
  private logDegradation(error: Error, context: string) {
    this.executionLog.push({
      timestamp: new Date(),
      error: `Degradation: ${context} - ${error.message}`,
      attempt: 1,
      strategy: "degradation",
    });
  }
}

/**
 * Utility function for timeout handling
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Utility function for batch execution with error handling
 */
export async function executeBatchWithRecovery<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  options: {
    concurrency?: number;
    strategy?: RecoveryStrategy;
    continueOnError?: boolean;
  } = {}
) {
  const { concurrency = 3, strategy = DEFAULT_RECOVERY_STRATEGIES.moderate, continueOnError = true } = options;

  const manager = new ErrorRecoveryManager(strategy);
  const results: Array<{ item: T; success: boolean; error?: Error }> = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const promises = batch.map(async (item) => {
      try {
        await manager.executeWithRetry(() => fn(item), `Batch item ${i}`);
        results.push({ item, success: true });
      } catch (error) {
        if (continueOnError) {
          results.push({ item, success: false, error: error as Error });
        } else {
          throw error;
        }
      }
    });

    await Promise.all(promises);
  }

  return results;
}
