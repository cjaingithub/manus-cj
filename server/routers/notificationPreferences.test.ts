import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { notificationPreferences, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Notification Preferences Router", () => {
  let db: any;
  let testUserId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Use a fixed test user ID (assumes at least one user exists)
    testUserId = 1;
  });

  afterAll(async () => {
    if (!db) return;
    // Cleanup test data
    try {
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, testUserId));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should create default preferences for new user", async () => {
    if (!db) throw new Error("Database not available");

    const prefs = await db
      .insert(notificationPreferences)
      .values({
        userId: testUserId,
        taskStartedEnabled: true,
        taskCompletedEnabled: true,
        taskFailedEnabled: true,
        taskPausedEnabled: true,
        systemAlertEnabled: true,
      });

    expect(prefs).toBeDefined();
  });

  it("should retrieve notification preferences", async () => {
    if (!db) throw new Error("Database not available");

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs.length).toBeGreaterThan(0);
    expect(prefs[0].taskStartedEnabled).toBe(true);
  });

  it("should update notification type preferences", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({ taskStartedEnabled: false })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].taskStartedEnabled).toBe(false);
  });

  it("should update quiet hours", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].quietHoursEnabled).toBe(true);
    expect(prefs[0].quietHoursStart).toBe("22:00");
  });

  it("should update email digest preferences", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({
        emailDigestEnabled: true,
        emailDigestFrequency: "daily",
      })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].emailDigestEnabled).toBe(true);
    expect(prefs[0].emailDigestFrequency).toBe("daily");
  });

  it("should update push notification preferences", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({ pushNotificationsEnabled: false })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].pushNotificationsEnabled).toBe(false);
  });

  it("should update do not disturb mode", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({ doNotDisturbEnabled: true })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].doNotDisturbEnabled).toBe(true);
  });

  it("should handle multiple preference updates", async () => {
    if (!db) throw new Error("Database not available");

    await db
      .update(notificationPreferences)
      .set({
        taskFailedEnabled: false,
        systemAlertEnabled: false,
        emailDigestFrequency: "weekly",
      })
      .where(eq(notificationPreferences.userId, testUserId));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].taskFailedEnabled).toBe(false);
    expect(prefs[0].systemAlertEnabled).toBe(false);
    expect(prefs[0].emailDigestFrequency).toBe("weekly");
  });

  it("should maintain default values for unspecified fields", async () => {
    if (!db) throw new Error("Database not available");

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId))
      .limit(1);

    expect(prefs[0].createdAt).toBeDefined();
    expect(prefs[0].updatedAt).toBeDefined();
  });
});
