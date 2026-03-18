import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { parallelExecutor, ExecutionTask } from "../services/parallelExecutor";
import { getDb } from "../db";
import { tasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const parallelExecutionRouter = router({
  /**
   * Execute a single task
   */
  executeTask: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        poolName: z.string().default("default"),
        maxConcurrent: z.number().optional(),
        timeout: z.number().optional(),
        retries: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get task from database
      const [task] = await db.select().from(tasks).where(eq(tasks.id, input.taskId));

      if (!task) throw new Error("Task not found");
      if (task.userId !== ctx.user.id) throw new Error("Unauthorized");

      // Create execution task
      const executionTask: ExecutionTask = {
        id: `task_${input.taskId}_${Date.now()}`,
        taskId: input.taskId,
        userId: ctx.user.id,
        priority: "normal",
        execute: async () => {
          // Simulate task execution (in real implementation, this would run the actual task)
          return {
            taskId: input.taskId,
            status: "completed",
            message: `Task ${input.taskId} executed successfully`,
          };
        },
        timeout: input.timeout,
        retries: input.retries,
      };

      // Execute in parallel pool
      const result = await parallelExecutor.executeTask(
        executionTask,
        input.poolName,
        input.maxConcurrent
      );

      return {
        taskId: result.taskId,
        status: result.status,
        result: result.result,
        error: result.error,
        duration: result.duration,
        retryCount: result.retryCount,
      };
    }),

  /**
   * Execute multiple tasks in parallel
   */
  executeTasks: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        poolName: z.string().default("default"),
        maxConcurrent: z.number().optional(),
        timeout: z.number().optional(),
        retries: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all tasks from database
      const dbTasks = await db.select().from(tasks).where(eq(tasks.userId, ctx.user.id));

      // Filter to requested task IDs
      const tasksToExecute = dbTasks.filter((t) => input.taskIds.includes(t.id));

      if (tasksToExecute.length === 0) throw new Error("No valid tasks found");

      // Create execution tasks
      const executionTasks: ExecutionTask[] = tasksToExecute.map((task) => ({
        id: `task_${task.id}_${Date.now()}`,
        taskId: task.id,
        userId: ctx.user.id,
        priority: "normal",
        execute: async () => {
          // Simulate task execution
          return {
            taskId: task.id,
            status: "completed",
            message: `Task ${task.id} executed successfully`,
          };
        },
        timeout: input.timeout,
        retries: input.retries,
      }));

      // Execute all tasks in parallel
      const results = await parallelExecutor.executeTasks(
        executionTasks,
        input.poolName,
        input.maxConcurrent
      );

      return results.map((r) => ({
        taskId: r.taskId,
        status: r.status,
        result: r.result,
        error: r.error,
        duration: r.duration,
        retryCount: r.retryCount,
      }));
    }),

  /**
   * Get execution result
   */
  getResult: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
        poolName: z.string().default("default"),
      })
    )
    .query(({ input }) => {
      const result = parallelExecutor.getResult(input.executionId, input.poolName);

      if (!result) return null;

      return {
        taskId: result.taskId,
        status: result.status,
        result: result.result,
        error: result.error,
        duration: result.duration,
        retryCount: result.retryCount,
      };
    }),

  /**
   * Get pool statistics
   */
  getPoolStats: protectedProcedure
    .input(z.object({ poolName: z.string().default("default") }))
    .query(({ input }) => {
      const stats = parallelExecutor.getPoolStats(input.poolName);

      if (!stats) return null;

      return {
        activeCount: stats.activeCount,
        queuedCount: stats.queuedCount,
        completedCount: stats.completedCount,
        failedCount: stats.failedCount,
        totalDuration: stats.totalDuration,
        averageDuration: stats.averageDuration,
      };
    }),

  /**
   * Get all pools statistics
   */
  getAllStats: protectedProcedure.query(() => {
    const allStats = parallelExecutor.getAllStats();

    const result: Record<string, unknown> = {};
    for (const poolName in allStats) {
      const stats = allStats[poolName];
      result[poolName] = {
        activeCount: stats.activeCount,
        queuedCount: stats.queuedCount,
        completedCount: stats.completedCount,
        failedCount: stats.failedCount,
        totalDuration: stats.totalDuration,
        averageDuration: stats.averageDuration,
      };
    }

    return result;
  }),

  /**
   * Clear a pool
   */
  clearPool: protectedProcedure
    .input(z.object({ poolName: z.string().default("default") }))
    .mutation(({ input }) => {
      parallelExecutor.clearPool(input.poolName);
      return { success: true };
    }),

  /**
   * Set default pool size
   */
  setPoolSize: protectedProcedure
    .input(z.object({ size: z.number().min(1).max(100) }))
    .mutation(({ input }) => {
      parallelExecutor.setDefaultPoolSize(input.size);
      return { success: true, poolSize: input.size };
    }),
});
