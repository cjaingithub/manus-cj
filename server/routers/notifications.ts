import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { desc, eq, and, ne } from "drizzle-orm";

export const notificationsRouter = router({
  // Get user notifications with filtering
  getNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        unreadOnly: z.boolean().default(false),
        type: z.enum(["task_started", "task_completed", "task_failed", "task_paused", "system_alert", "info"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(notifications.userId, ctx.user.id), eq(notifications.isDismissed, false)];

      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      if (input.type) {
        conditions.push(eq(notifications.type, input.type));
      }

      const result = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const allResults = await db
        .select()
        .from(notifications)
        .where(and(...conditions));

      return {
        notifications: result,
        total: allResults.length,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < allResults.length,
      };
    }),

  // Get unread notification count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      );

    return {
      unreadCount: result.length,
    };
  }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const notification = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.notificationId))
        .limit(1);

      if (!notification.length || notification[0].userId !== ctx.user.id) {
        throw new Error("Notification not found");
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));

    return { success: true };
  }),

  // Dismiss notification
  dismissNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const notification = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.notificationId))
        .limit(1);

      if (!notification.length || notification[0].userId !== ctx.user.id) {
        throw new Error("Notification not found");
      }

      await db
        .update(notifications)
        .set({ isDismissed: true, dismissedAt: new Date() })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  // Dismiss all notifications
  dismissAllNotifications: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isDismissed: true, dismissedAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isDismissed, false)));

    return { success: true };
  }),

  // Create notification (for internal use)
  createNotification: protectedProcedure
    .input(
      z.object({
        type: z.enum(["task_started", "task_completed", "task_failed", "task_paused", "system_alert", "info"]),
        title: z.string(),
        message: z.string(),
        taskId: z.number().optional(),
        actionUrl: z.string().optional(),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(notifications).values({
        userId: ctx.user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        taskId: input.taskId,
        actionUrl: input.actionUrl,
        priority: input.priority,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });

      return { success: true };
    }),

  // Get notification by ID
  getNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)));
      
      if (!result.length) {
        throw new Error("Notification not found");
      }

      return result[0];
    }),
});
