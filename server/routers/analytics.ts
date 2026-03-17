import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, taskRetryHistory, notifications } from "../../drizzle/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";

export const analyticsRouter = router({
  // Get overall platform statistics
  getPlatformStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get task statistics
    const taskStats = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(eq(tasks.userId, ctx.user.id))
      .groupBy(tasks.status);

    // Calculate totals
    const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedTasks = taskStats.find((s) => s.status === "completed")?.count || 0;
    const failedTasks = taskStats.find((s) => s.status === "failed")?.count || 0;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get average execution time
    const executionTimes = await db
      .select({
        duration: sql`EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.startedAt})) * 1000`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, ctx.user.id),
          eq(tasks.status, "completed")
        )
      );

    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, t) => sum + ((t.duration as any) || 0), 0) / executionTimes.length
        : 0;

    // Get retry statistics
    const retryStats = await db
      .select({
        totalRetries: count(),
        successfulRetries: count(sql`CASE WHEN ${taskRetryHistory.success} = true THEN 1 END`),
      })
      .from(taskRetryHistory)
      .innerJoin(tasks, eq(taskRetryHistory.taskId, tasks.id))
      .where(eq(tasks.userId, ctx.user.id));

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      pendingTasks: taskStats.find((s) => s.status === "pending")?.count || 0,
      successRate,
      avgExecutionTimeMs: Math.round(avgExecutionTime),
      totalRetries: retryStats[0]?.totalRetries || 0,
      successfulRetries: retryStats[0]?.successfulRetries || 0,
    };
  }),

  // Get task execution timeline (last 30 days)
  getExecutionTimeline: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const timeline = await db
        .select({
          date: sql`DATE(${tasks.createdAt})`,
          completed: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
          failed: count(sql`CASE WHEN ${tasks.status} = 'failed' THEN 1 END`),
          total: count(),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, ctx.user.id),
            gte(tasks.createdAt, startDate)
          )
        )
        .groupBy(sql`DATE(${tasks.createdAt})`)
        .orderBy(sql`DATE(${tasks.createdAt})`);

      return timeline;
    }),

  // Get task status distribution
  getStatusDistribution: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const distribution = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(eq(tasks.userId, ctx.user.id))
      .groupBy(tasks.status);

    return distribution.map((item) => ({
      status: item.status,
      count: item.count,
      percentage: 0, // Will be calculated on frontend
    }));
  }),

  // Get retry success rate over time
  getRetrySuccessRate: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const retryData = await db
        .select({
          date: sql`DATE(${taskRetryHistory.attemptedAt})`,
          totalAttempts: count(),
          successfulAttempts: count(
            sql`CASE WHEN ${taskRetryHistory.success} = true THEN 1 END`
          ),
        })
        .from(taskRetryHistory)
        .innerJoin(tasks, eq(taskRetryHistory.taskId, tasks.id))
        .where(
          and(
            eq(tasks.userId, ctx.user.id),
            gte(taskRetryHistory.attemptedAt, startDate)
          )
        )
        .groupBy(sql`DATE(${taskRetryHistory.attemptedAt})`)
        .orderBy(sql`DATE(${taskRetryHistory.attemptedAt})`);

      return retryData.map((item) => ({
        date: item.date,
        successRate:
          item.totalAttempts > 0
            ? (item.successfulAttempts / item.totalAttempts) * 100
            : 0,
        totalAttempts: item.totalAttempts,
        successfulAttempts: item.successfulAttempts,
      }));
    }),

  // Get top failing tasks
  getTopFailingTasks: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const failingTasks = await db
        .select({
          taskId: tasks.id,
          title: tasks.title,
          failureCount: count(),
          lastFailedAt: sql`MAX(${tasks.updatedAt})`,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, ctx.user.id),
            eq(tasks.status, "failed")
          )
        )
        .groupBy(tasks.id)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(input.limit);

      return failingTasks;
    }),

  // Get notification statistics
  getNotificationStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const notificationStats = await db
      .select({
        type: notifications.type,
        priority: notifications.priority,
        count: count(),
        unreadCount: count(sql`CASE WHEN ${notifications.isRead} = false THEN 1 END`),
      })
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .groupBy(notifications.type, notifications.priority);

    return notificationStats;
  }),

  // Get performance metrics
  getPerformanceMetrics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get average task duration by status
    const durationByStatus = await db
      .select({
        status: tasks.status,
        avgDuration: sql`AVG(EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.startedAt})) * 1000)`,
        minDuration: sql`MIN(EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.startedAt})) * 1000)`,
        maxDuration: sql`MAX(EXTRACT(EPOCH FROM (${tasks.completedAt} - ${tasks.startedAt})) * 1000)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, ctx.user.id),
          eq(tasks.status, "completed")
        )
      );

    // Get retry statistics
    const retryMetrics = await db
      .select({
        avgRetriesPerTask: sql`AVG(attempt_count)`,
        maxRetriesPerTask: sql`MAX(attempt_count)`,
      })
      .from(
        db
          .select({
            taskId: taskRetryHistory.taskId,
            attempt_count: count(),
          })
          .from(taskRetryHistory)
          .innerJoin(tasks, eq(taskRetryHistory.taskId, tasks.id))
          .where(eq(tasks.userId, ctx.user.id))
          .groupBy(taskRetryHistory.taskId)
          .as("retry_counts")
      );

    return {
      durationMetrics: durationByStatus[0] || {},
      retryMetrics: retryMetrics[0] || {},
    };
  }),

  // Get system health score (0-100)
  getHealthScore: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stats = await db
      .select({
        totalTasks: count(),
        completedTasks: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
        failedTasks: count(sql`CASE WHEN ${tasks.status} = 'failed' THEN 1 END`),
      })
      .from(tasks)
      .where(eq(tasks.userId, ctx.user.id));

    const total = stats[0]?.totalTasks || 0;
    const completed = stats[0]?.completedTasks || 0;
    const failed = stats[0]?.failedTasks || 0;

    // Health score calculation:
    // - Success rate: 60% weight
    // - Low failure rate: 40% weight
    const successRate = total > 0 ? (completed / total) * 100 : 50;
    const failureRate = total > 0 ? (failed / total) * 100 : 50;

    const healthScore = Math.round(successRate * 0.6 + (100 - failureRate) * 0.4);

    return {
      score: Math.min(100, Math.max(0, healthScore)),
      successRate: Math.round(successRate),
      failureRate: Math.round(failureRate),
      status:
        healthScore >= 80
          ? "excellent"
          : healthScore >= 60
            ? "good"
            : healthScore >= 40
              ? "fair"
              : "poor",
    };
  }),
});
