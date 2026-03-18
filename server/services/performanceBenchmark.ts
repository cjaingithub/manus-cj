import { getDb } from "../db";
import { performanceMetrics, PerformanceMetric } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, avg, sum } from "drizzle-orm";

/**
 * Performance Benchmark Service
 * Tracks and analyzes execution performance metrics
 */
export class PerformanceBenchmark {
  /**
   * Record performance metrics for a task execution
   */
  async recordMetrics(
    userId: number,
    taskId: number,
    metrics: {
      startTime: Date;
      endTime?: Date;
      duration: number;
      cpuUsagePercent?: number;
      memoryUsageMB?: number;
      peakMemoryMB?: number;
      itemsProcessed?: number;
      itemsPerSecond?: number;
      successRate?: number;
      errorCount?: number;
      retryCount?: number;
      executionPhase?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<PerformanceMetric | null> {
    const db = await getDb();
    if (!db) return null;

    await db.insert(performanceMetrics).values({
      userId,
      taskId,
      startTime: metrics.startTime,
      endTime: metrics.endTime,
      duration: metrics.duration,
      cpuUsagePercent: metrics.cpuUsagePercent ? metrics.cpuUsagePercent.toString() : null,
      memoryUsageMB: metrics.memoryUsageMB,
      peakMemoryMB: metrics.peakMemoryMB,
      itemsProcessed: metrics.itemsProcessed || 0,
      itemsPerSecond: metrics.itemsPerSecond ? metrics.itemsPerSecond.toString() : null,
      successRate: metrics.successRate || 100,
      errorCount: metrics.errorCount || 0,
      retryCount: metrics.retryCount || 0,
      executionPhase: metrics.executionPhase,
      metadata: metrics.metadata ? JSON.stringify(metrics.metadata) : null,
    });

    // Get the inserted record
    const [inserted] = await db
      .select()
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.userId, userId), eq(performanceMetrics.taskId, taskId)))
      .orderBy(desc(performanceMetrics.createdAt))
      .limit(1);

    return inserted || null;
  }

  /**
   * Get performance metrics for a task
   */
  async getTaskMetrics(taskId: number): Promise<PerformanceMetric[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.taskId, taskId))
      .orderBy(desc(performanceMetrics.createdAt));
  }

  /**
   * Get performance statistics for a user
   */
  async getUserStats(userId: number, days = 30): Promise<{
    totalTasks: number;
    averageDuration: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
    totalItemsProcessed: number;
    averageSuccessRate: number;
    totalErrors: number;
  }> {
    const db = await getDb();
    if (!db) {
      return {
        totalTasks: 0,
        averageDuration: 0,
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        totalItemsProcessed: 0,
        averageSuccessRate: 0,
        totalErrors: 0,
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.userId, userId), gte(performanceMetrics.createdAt, startDate)));

    if (metrics.length === 0) {
      return {
        totalTasks: 0,
        averageDuration: 0,
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        totalItemsProcessed: 0,
        averageSuccessRate: 0,
        totalErrors: 0,
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalCpu = metrics.reduce((sum, m) => sum + (m.cpuUsagePercent ? parseFloat(m.cpuUsagePercent) : 0), 0);
    const totalMemory = metrics.reduce((sum, m) => sum + (m.memoryUsageMB || 0), 0);
    const totalItems = metrics.reduce((sum, m) => sum + m.itemsProcessed, 0);
    const totalSuccess = metrics.reduce((sum, m) => sum + m.successRate, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      totalTasks: metrics.length,
      averageDuration: Math.round(totalDuration / metrics.length),
      averageCpuUsage: Math.round((totalCpu / metrics.length) * 100) / 100,
      averageMemoryUsage: Math.round(totalMemory / metrics.length),
      totalItemsProcessed: totalItems,
      averageSuccessRate: Math.round(totalSuccess / metrics.length),
      totalErrors,
    };
  }

  /**
   * Get performance trends over time
   */
  async getTrends(userId: number, days = 30): Promise<{
    date: string;
    averageDuration: number;
    taskCount: number;
    successRate: number;
    errorCount: number;
  }[]> {
    const db = await getDb();
    if (!db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.userId, userId), gte(performanceMetrics.createdAt, startDate)))
      .orderBy(performanceMetrics.createdAt);

    // Group by date
    const grouped: Record<string, PerformanceMetric[]> = {};

    for (const metric of metrics) {
      const date = metric.createdAt.toISOString().split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(metric);
    }

    // Calculate daily stats
    return Object.entries(grouped).map(([date, dayMetrics]) => {
      const totalDuration = dayMetrics.reduce((sum, m) => sum + m.duration, 0);
      const totalSuccess = dayMetrics.reduce((sum, m) => sum + m.successRate, 0);
      const totalErrors = dayMetrics.reduce((sum, m) => sum + m.errorCount, 0);

      return {
        date,
        averageDuration: Math.round(totalDuration / dayMetrics.length),
        taskCount: dayMetrics.length,
        successRate: Math.round(totalSuccess / dayMetrics.length),
        errorCount: totalErrors,
      };
    });
  }

  /**
   * Get performance comparison between phases
   */
  async getPhaseComparison(userId: number): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return {};

    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.userId, userId));

    const phases: Record<string, PerformanceMetric[]> = {};

    for (const metric of metrics) {
      const phase = metric.executionPhase || "unknown";
      if (!phases[phase]) {
        phases[phase] = [];
      }
      phases[phase].push(metric);
    }

    const result: Record<string, unknown> = {};

    for (const [phase, phaseMetrics] of Object.entries(phases)) {
      const totalDuration = phaseMetrics.reduce((sum, m) => sum + m.duration, 0);
      const totalSuccess = phaseMetrics.reduce((sum, m) => sum + m.successRate, 0);
      const totalErrors = phaseMetrics.reduce((sum, m) => sum + m.errorCount, 0);

      result[phase] = {
        taskCount: phaseMetrics.length,
        averageDuration: Math.round(totalDuration / phaseMetrics.length),
        averageSuccessRate: Math.round(totalSuccess / phaseMetrics.length),
        totalErrors,
      };
    }

    return result;
  }

  /**
   * Get slowest tasks
   */
  async getSlowestTasks(userId: number, limit = 10): Promise<PerformanceMetric[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.userId, userId))
      .orderBy(desc(performanceMetrics.duration))
      .limit(limit);
  }

  /**
   * Get most resource-intensive tasks
   */
  async getMostResourceIntensive(userId: number, limit = 10): Promise<PerformanceMetric[]> {
    const db = await getDb();
    if (!db) return [];

    const metrics = await db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.userId, userId));

    // Sort by combined CPU and memory usage
    return metrics
      .map((m) => ({
        ...m,
        resourceScore:
          (m.cpuUsagePercent ? parseFloat(m.cpuUsagePercent) : 0) * 0.5 + (m.peakMemoryMB || 0) * 0.5,
      }))
      .sort((a, b) => b.resourceScore - a.resourceScore)
      .slice(0, limit)
      .map(({ resourceScore, ...m }) => m);
  }
}

// Export singleton instance
export const performanceBenchmark = new PerformanceBenchmark();
