import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { taskRetryHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { CircuitBreaker, retryWithBackoff, DEFAULT_RETRY_CONFIG } from "../services/retryPolicy";

// Global circuit breakers per task
const taskCircuitBreakers = new Map<number, CircuitBreaker>();

export const taskRetryRouter = router({
  // Get retry history for a task
  getRetryHistory: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(taskRetryHistory)
        .where(eq(taskRetryHistory.taskId, input.taskId))
        .orderBy(desc(taskRetryHistory.attemptNumber));

      return history;
    }),

  // Get retry statistics for a task
  getRetryStats: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(taskRetryHistory)
        .where(eq(taskRetryHistory.taskId, input.taskId));

      const totalAttempts = history.length;
      const successfulAttempts = history.filter((h) => h.success).length;
      const failedAttempts = totalAttempts - successfulAttempts;
      const avgDelayMs = history.length > 0 ? history.reduce((sum, h) => sum + (h.delayMs || 0), 0) / history.length : 0;

      return {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
        avgDelayMs,
        lastAttemptAt: history[0]?.attemptedAt || null,
      };
    }),

  // Get circuit breaker status for a task
  getCircuitBreakerStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const breaker = taskCircuitBreakers.get(input.taskId);
      if (!breaker) {
        return {
          state: "CLOSED",
          failureCount: 0,
          successCount: 0,
          lastFailureTime: null,
        };
      }

      const status = breaker.getStatus();
      return {
        state: status.state,
        failureCount: status.failureCount,
        successCount: status.successCount,
        lastFailureTime: status.lastFailureTime > 0 ? new Date(status.lastFailureTime) : null,
      };
    }),

  // Reset circuit breaker for a task
  resetCircuitBreaker: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const breaker = taskCircuitBreakers.get(input.taskId);
      if (breaker) {
        breaker.reset();
      }
      return { success: true };
    }),

  // Record a retry attempt
  recordRetryAttempt: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        attemptNumber: z.number(),
        success: z.boolean(),
        error: z.string().optional(),
        delayMs: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(taskRetryHistory).values({
        taskId: input.taskId,
        attemptNumber: input.attemptNumber,
        success: input.success,
        error: input.error,
        delayMs: input.delayMs,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });

      return { success: true };
    }),

  // Get retry policy recommendations
  getRetryRecommendations: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(taskRetryHistory)
        .where(eq(taskRetryHistory.taskId, input.taskId))
        .orderBy(desc(taskRetryHistory.attemptNumber))
        .limit(10);

      const recentFailures = history.filter((h) => !h.success).length;
      const totalRecent = history.length;
      const failureRate = totalRecent > 0 ? (recentFailures / totalRecent) * 100 : 0;

      const recommendations = [];

      if (failureRate > 80) {
        recommendations.push({
          level: "critical",
          message: "Task has very high failure rate (>80%). Consider investigating root cause or disabling task.",
          action: "investigate_root_cause",
        });
      } else if (failureRate > 50) {
        recommendations.push({
          level: "warning",
          message: "Task has elevated failure rate (>50%). Consider increasing retry delays or max retries.",
          action: "increase_retry_config",
        });
      }

      if (recentFailures >= 5) {
        recommendations.push({
          level: "warning",
          message: "Multiple consecutive failures detected. Circuit breaker may be triggered soon.",
          action: "check_circuit_breaker",
        });
      }

      if (recommendations.length === 0) {
        recommendations.push({
          level: "info",
          message: "Task retry performance is healthy.",
          action: "no_action",
        });
      }

      return {
        failureRate,
        recentAttempts: totalRecent,
        recommendations,
      };
    }),
});

/**
 * Get or create circuit breaker for a task
 */
export function getTaskCircuitBreaker(taskId: number): CircuitBreaker {
  if (!taskCircuitBreakers.has(taskId)) {
    taskCircuitBreakers.set(taskId, new CircuitBreaker());
  }
  return taskCircuitBreakers.get(taskId)!;
}

/**
 * Execute task with retry and circuit breaker
 */
export async function executeTaskWithRetry(
  taskId: number,
  taskFn: () => Promise<any>,
  retryConfig = DEFAULT_RETRY_CONFIG
) {
  const breaker = getTaskCircuitBreaker(taskId);

  if (!breaker.canExecute()) {
    throw new Error(`Circuit breaker is open for task ${taskId}`);
  }

  const result = await retryWithBackoff(
    async () => {
      try {
        const data = await taskFn();
        breaker.recordSuccess();
        return data;
      } catch (error) {
        breaker.recordFailure();
        throw error;
      }
    },
    retryConfig
  );

  return result;
}
