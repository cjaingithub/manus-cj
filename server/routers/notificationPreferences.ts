import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notificationPreferences } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const notificationPreferencesRouter = router({
  // Get user's notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    // Create default preferences if they don't exist
    if (!prefs.length) {
      await db.insert(notificationPreferences).values({
        userId: ctx.user.id,
        taskStartedEnabled: true,
        taskCompletedEnabled: true,
        taskFailedEnabled: true,
        taskPausedEnabled: true,
        systemAlertEnabled: true,
        quietHoursEnabled: false,
        emailDigestEnabled: false,
        emailDigestFrequency: "never",
        pushNotificationsEnabled: true,
        doNotDisturbEnabled: false,
      });

      prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);
    }

    return prefs[0];
  }),

  // Update notification type preferences
  updateNotificationTypes: protectedProcedure
    .input(
      z.object({
        taskStartedEnabled: z.boolean().optional(),
        taskCompletedEnabled: z.boolean().optional(),
        taskFailedEnabled: z.boolean().optional(),
        taskPausedEnabled: z.boolean().optional(),
        systemAlertEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificationPreferences)
        .set(input)
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Update quiet hours
  updateQuietHours: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificationPreferences)
        .set({
          quietHoursEnabled: input.enabled,
          quietHoursStart: input.start,
          quietHoursEnd: input.end,
        })
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Update email digest preferences
  updateEmailDigest: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        frequency: z.enum(["daily", "weekly", "never"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificationPreferences)
        .set({
          emailDigestEnabled: input.enabled,
          emailDigestFrequency: input.frequency,
        })
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Update push notification preferences
  updatePushNotifications: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificationPreferences)
        .set({ pushNotificationsEnabled: input.enabled })
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Update do not disturb mode
  updateDoNotDisturb: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notificationPreferences)
        .set({ doNotDisturbEnabled: input.enabled })
        .where(eq(notificationPreferences.userId, ctx.user.id));

      return { success: true };
    }),

  // Check if user is in quiet hours
  isInQuietHours: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    if (!prefs.length || !prefs[0].quietHoursEnabled) {
      return { inQuietHours: false };
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const start = prefs[0].quietHoursStart;
    const end = prefs[0].quietHoursEnd;

    if (!start || !end) {
      return { inQuietHours: false };
    }

    // Handle case where quiet hours span midnight
    if (start < end) {
      const inQuietHours = currentTime >= start && currentTime < end;
      return { inQuietHours };
    } else {
      const inQuietHours = currentTime >= start || currentTime < end;
      return { inQuietHours };
    }
  }),

  // Check if notification type is enabled
  isNotificationTypeEnabled: protectedProcedure
    .input(
      z.object({
        type: z.enum(["task_started", "task_completed", "task_failed", "task_paused", "system_alert"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (!prefs.length) {
        return { enabled: true }; // Default to enabled
      }

      const pref = prefs[0];
      const typeMap: Record<string, boolean> = {
        task_started: pref.taskStartedEnabled,
        task_completed: pref.taskCompletedEnabled,
        task_failed: pref.taskFailedEnabled,
        task_paused: pref.taskPausedEnabled,
        system_alert: pref.systemAlertEnabled,
      };

      return { enabled: typeMap[input.type] ?? true };
    }),
});
