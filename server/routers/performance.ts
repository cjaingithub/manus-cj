import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { performanceBenchmark } from "../services/performanceBenchmark";

export const performanceRouter = router({
  /**
   * Record performance metrics for a task
   */
  recordMetrics: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        startTime: z.date(),
        endTime: z.date().optional(),
        duration: z.number(),
        cpuUsagePercent: z.number().optional(),
        memoryUsageMB: z.number().optional(),
        peakMemoryMB: z.number().optional(),
        itemsProcessed: z.number().optional(),
        itemsPerSecond: z.number().optional(),
        successRate: z.number().optional(),
        errorCount: z.number().optional(),
        retryCount: z.number().optional(),
        executionPhase: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const metric = await performanceBenchmark.recordMetrics(ctx.user.id, input.taskId, {
        startTime: input.startTime,
        endTime: input.endTime,
        duration: input.duration,
        cpuUsagePercent: input.cpuUsagePercent,
        memoryUsageMB: input.memoryUsageMB,
        peakMemoryMB: input.peakMemoryMB,
        itemsProcessed: input.itemsProcessed,
        itemsPerSecond: input.itemsPerSecond,
        successRate: input.successRate,
        errorCount: input.errorCount,
        retryCount: input.retryCount,
        executionPhase: input.executionPhase,
        metadata: input.metadata,
      });

      return {
        id: metric?.id,
        taskId: metric?.taskId,
        duration: metric?.duration,
        successRate: metric?.successRate,
      };
    }),

  /**
   * Get performance metrics for a task
   */
  getTaskMetrics: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const metrics = await performanceBenchmark.getTaskMetrics(input.taskId);

      return metrics.map((m) => ({
        id: m.id,
        duration: m.duration,
        cpuUsagePercent: m.cpuUsagePercent ? parseFloat(m.cpuUsagePercent) : null,
        memoryUsageMB: m.memoryUsageMB,
        peakMemoryMB: m.peakMemoryMB,
        itemsProcessed: m.itemsProcessed,
        itemsPerSecond: m.itemsPerSecond ? parseFloat(m.itemsPerSecond) : null,
        successRate: m.successRate,
        errorCount: m.errorCount,
        retryCount: m.retryCount,
        executionPhase: m.executionPhase,
        createdAt: m.createdAt,
      }));
    }),

  /**
   * Get user performance statistics
   */
  getUserStats: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return performanceBenchmark.getUserStats(ctx.user.id, input.days);
    }),

  /**
   * Get performance trends
   */
  getTrends: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return performanceBenchmark.getTrends(ctx.user.id, input.days);
    }),

  /**
   * Get performance comparison by phase
   */
  getPhaseComparison: protectedProcedure.query(async ({ ctx }) => {
    return performanceBenchmark.getPhaseComparison(ctx.user.id);
  }),

  /**
   * Get slowest tasks
   */
  getSlowestTasks: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const metrics = await performanceBenchmark.getSlowestTasks(ctx.user.id, input.limit);

      return metrics.map((m) => ({
        id: m.id,
        taskId: m.taskId,
        duration: m.duration,
        cpuUsagePercent: m.cpuUsagePercent ? parseFloat(m.cpuUsagePercent) : null,
        memoryUsageMB: m.memoryUsageMB,
        successRate: m.successRate,
        createdAt: m.createdAt,
      }));
    }),

  /**
   * Get most resource-intensive tasks
   */
  getMostResourceIntensive: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const metrics = await performanceBenchmark.getMostResourceIntensive(ctx.user.id, input.limit);

      return metrics.map((m) => ({
        id: m.id,
        taskId: m.taskId,
        cpuUsagePercent: m.cpuUsagePercent ? parseFloat(m.cpuUsagePercent) : null,
        peakMemoryMB: m.peakMemoryMB,
        duration: m.duration,
        successRate: m.successRate,
        createdAt: m.createdAt,
      }));
    }),
});
