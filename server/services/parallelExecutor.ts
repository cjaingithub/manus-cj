/**
 * Parallel Task Executor
 * Manages concurrent task execution with resource pooling and failure isolation
 */

export interface ExecutionTask {
  id: string;
  taskId: number;
  userId: number;
  priority: "low" | "normal" | "high";
  execute: () => Promise<unknown>;
  timeout?: number;
  retries?: number;
}

export interface ExecutionResult {
  taskId: string;
  status: "success" | "failed" | "timeout" | "cancelled";
  result?: unknown;
  error?: string;
  duration: number;
  retryCount: number;
}

export interface PoolStats {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  totalDuration: number;
  averageDuration: number;
}

/**
 * Resource Pool for managing concurrent executions
 */
class ResourcePool {
  private activeCount = 0;
  private maxConcurrent: number;
  private queue: ExecutionTask[] = [];
  private results: Map<string, ExecutionResult> = new Map();
  private completedCount = 0;
  private failedCount = 0;
  private totalDuration = 0;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute(task: ExecutionTask): Promise<ExecutionResult> {
    // Add to queue
    this.queue.push(task);
    this.queue.sort((a, b) => {
      const priorityMap = { high: 3, normal: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });

    // Process queue
    return this.processQueue();
  }

  private async processQueue(): Promise<ExecutionResult> {
    // Wait for available slot
    while (this.activeCount >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const task = this.queue.shift();
    if (!task) throw new Error("No task in queue");

    this.activeCount++;
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = task.retries || 0;
    let lastError: string | undefined;

    // Execute with retries
    while (retryCount <= maxRetries) {
      try {
        const result = await this.executeWithTimeout(task.execute, task.timeout || 30000);

        const duration = Date.now() - startTime;
        this.totalDuration += duration;
        this.completedCount++;
        this.activeCount--;

        const executionResult: ExecutionResult = {
          taskId: task.id,
          status: "success",
          result,
          duration,
          retryCount,
        };

        this.results.set(task.id, executionResult);
        return executionResult;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (retryCount < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const backoffMs = Math.pow(2, retryCount) * 100;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          retryCount++;
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    this.totalDuration += duration;
    this.failedCount++;
    this.activeCount--;

    const executionResult: ExecutionResult = {
      taskId: task.id,
      status: "failed",
      error: lastError,
      duration,
      retryCount,
    };

    this.results.set(task.id, executionResult);
    return executionResult;
  }

  private executeWithTimeout(fn: () => Promise<unknown>, timeoutMs: number): Promise<unknown> {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  getResult(taskId: string): ExecutionResult | undefined {
    return this.results.get(taskId);
  }

  getStats(): PoolStats {
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      totalDuration: this.totalDuration,
      averageDuration: this.completedCount > 0 ? this.totalDuration / this.completedCount : 0,
    };
  }

  clear(): void {
    this.queue = [];
    this.results.clear();
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalDuration = 0;
  }
}

/**
 * Parallel Executor Service
 * Manages multiple resource pools for different task types
 */
export class ParallelExecutor {
  private pools: Map<string, ResourcePool> = new Map();
  private defaultPoolSize = 5;

  /**
   * Create or get a resource pool for a specific task type
   */
  private getPool(poolName: string, maxConcurrent?: number): ResourcePool {
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, new ResourcePool(maxConcurrent || this.defaultPoolSize));
    }
    return this.pools.get(poolName)!;
  }

  /**
   * Execute a task in parallel
   */
  async executeTask(
    task: ExecutionTask,
    poolName: string = "default",
    maxConcurrent?: number
  ): Promise<ExecutionResult> {
    const pool = this.getPool(poolName, maxConcurrent);
    return pool.execute(task);
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeTasks(
    tasks: ExecutionTask[],
    poolName: string = "default",
    maxConcurrent?: number
  ): Promise<ExecutionResult[]> {
    const pool = this.getPool(poolName, maxConcurrent);
    const promises = tasks.map((task) => pool.execute(task));
    return Promise.all(promises);
  }

  /**
   * Get execution result
   */
  getResult(taskId: string, poolName: string = "default"): ExecutionResult | undefined {
    const pool = this.pools.get(poolName);
    return pool?.getResult(taskId);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolName: string = "default"): PoolStats | undefined {
    const pool = this.pools.get(poolName);
    return pool?.getStats();
  }

  /**
   * Get all pools statistics
   */
  getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });
    return stats;
  }

  /**
   * Clear a pool
   */
  clearPool(poolName: string = "default"): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.clear();
    }
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    this.pools.forEach((pool) => {
      pool.clear();
    });
    this.pools.clear();
  }

  /**
   * Set default pool size
   */
  setDefaultPoolSize(size: number): void {
    this.defaultPoolSize = size;
  }
}

// Export singleton instance
export const parallelExecutor = new ParallelExecutor();
