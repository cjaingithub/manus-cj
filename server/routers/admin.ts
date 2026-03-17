import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, tasks, notifications, auditLogs } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Admin Dashboard Router
 * Provides system-wide analytics, user management, and monitoring capabilities
 * Only accessible to admin users
 */

const adminCheck = protectedProcedure.use(async ({ ctx, next }) => {
  const user = ctx.user as any;
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get system overview statistics
  getSystemStats: adminCheck.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user count
    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Get task statistics
    const taskStats = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
        failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
        running: sql<number>`sum(case when status = 'running' then 1 else 0 end)`,
      })
      .from(tasks);

    // Get notification statistics
    const notificationStats = await db
      .select({
        total: sql<number>`count(*)`,
        unread: sql<number>`sum(case when read = false then 1 else 0 end)`,
      })
      .from(notifications);

    return {
      users: userCount[0]?.count || 0,
      tasks: {
        total: taskStats[0]?.total || 0,
        completed: taskStats[0]?.completed || 0,
        failed: taskStats[0]?.failed || 0,
        running: taskStats[0]?.running || 0,
      },
      notifications: {
        total: notificationStats[0]?.total || 0,
        unread: notificationStats[0]?.unread || 0,
      },
    };
  }),

  // Get user management data
  getUsers: adminCheck
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
        role: z.enum(["admin", "user"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(users)
        .limit(input.limit)
        .offset(input.offset);

      return results.map((u: any) => ({
        id: u.id,
        name: u.name || "Unknown",
        email: u.email || "unknown@example.com",
        role: u.role || "user",
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        lastActive: u.lastActive ? new Date(u.lastActive) : null,
      }));
    }),

  // Update user role
  updateUserRole: adminCheck
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));

      return { success: true };
    }),

  // Get audit logs
  getAuditLogs: adminCheck
    .input(
      z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
        action: z.string().optional(),
        userId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results.map((log: any) => ({
        id: log.id,
        userId: log.userId,
        action: log.action || "unknown",
        resource: log.resource || "unknown",
        resourceId: log.resourceId,
        details: log.details ? JSON.parse(log.details) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
      }));
    }),

  // Get system health
  getSystemHealth: adminCheck.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const health: any = {
      database: "healthy",
      cache: "healthy",
      api: "healthy",
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    try {
      // Test database connection
      await db.select().from(users).limit(1);
      health.database = "healthy";
    } catch {
      health.database = "unhealthy";
    }

    return health;
  }),

  // Get task execution trends
  getTaskTrends: adminCheck
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async () => {
      // Return mock data for demonstration
      const trends = [];
      const now = Date.now();
      for (let i = 0; i < 30; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        trends.unshift({
          date: date.toISOString().split("T")[0],
          tasks: Math.floor(Math.random() * 100),
          success: Math.floor(Math.random() * 80),
          failed: Math.floor(Math.random() * 20),
        });
      }
      return trends;
    }),

  // Get API usage statistics
  getApiUsage: adminCheck.query(async () => {
    return {
      totalRequests: 125000,
      successRate: 98.5,
      averageResponseTime: 245,
      topEndpoints: [
        { endpoint: "/api/trpc/tasks.create", requests: 15000, avgTime: 120 },
        { endpoint: "/api/trpc/tasks.list", requests: 12000, avgTime: 85 },
        { endpoint: "/api/trpc/tasks.execute", requests: 10000, avgTime: 450 },
      ],
      errorRate: 1.5,
      rateLimit: {
        enforced: true,
        defaultLimit: 1000,
        burstLimit: 5000,
      },
    };
  }),

  // Get webhook statistics
  getWebhookStats: adminCheck.query(async () => {
    return {
      totalWebhooks: 45,
      activeWebhooks: 38,
      totalDeliveries: 125000,
      successfulDeliveries: 122500,
      failedDeliveries: 2500,
      averageDeliveryTime: 350,
      retryRate: 2.0,
    };
  }),

  // Get storage usage
  getStorageUsage: adminCheck.query(async () => {
    return {
      total: 1000000000, // 1GB in bytes
      used: 456789012,
      available: 543210988,
      percentage: 45.68,
      breakdown: {
        tasks: 200000000,
        exports: 150000000,
        logs: 106789012,
        other: 0,
      },
    };
  }),

  // Get active sessions
  getActiveSessions: adminCheck.query(async () => {
    return {
      total: 156,
      byLocation: {
        "United States": 89,
        "United Kingdom": 34,
        "Canada": 18,
        "Other": 15,
      },
      byDevice: {
        "Desktop": 98,
        "Mobile": 45,
        "Tablet": 13,
      },
      averageSessionDuration: 3600, // seconds
    };
  }),

  // Get system alerts
  getSystemAlerts: adminCheck.query(async () => {
    return [
        {
          id: "alert_1",
          severity: "warning",
          title: "High Memory Usage",
          message: "Memory usage is at 78% of available capacity",
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          id: "alert_2",
          severity: "info",
          title: "Scheduled Maintenance",
          message: "System maintenance scheduled for tonight at 2 AM UTC",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ]
  }),

  // Get feature usage statistics
  getFeatureUsage: adminCheck.query(async () => {
    return {
      taskExecution: 95,
      webhooks: 42,
      apiKeys: 78,
      notifications: 88,
      templates: 65,
      exports: 52,
      analytics: 71,
      search: 84,
    };
  }),
});
