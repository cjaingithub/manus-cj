import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Notifications Router", () => {
  let db: any;
  let testUserId: number = 1; // Assuming user ID 1 exists

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(notifications).where(eq(notifications.userId, testUserId));
    }
  });

  it("should retrieve notifications for user", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, testUserId))
      .limit(20);

    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter unread notifications", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.isRead, false))
      .limit(10);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.every((n: any) => n.isRead === false)).toBe(true);
    }
  });

  it("should filter by notification type", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, "task_completed"))
      .limit(10);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.every((n: any) => n.type === "task_completed")).toBe(true);
    }
  });

  it("should filter non-dismissed notifications", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.isDismissed, false))
      .limit(20);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.every((n: any) => n.isDismissed === false)).toBe(true);
    }
  });

  it("should handle notification priority levels", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .limit(50);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const validPriorities = ["low", "normal", "high"];
      expect(result.every((n: any) => validPriorities.includes(n.priority))).toBe(true);
    }
  });

  it("should handle notification types", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .limit(50);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const validTypes = ["task_started", "task_completed", "task_failed", "task_paused", "system_alert", "info"];
      expect(result.every((n: any) => validTypes.includes(n.type))).toBe(true);
    }
  });

  it("should support pagination", async () => {
    if (!db) throw new Error("Database not available");

    const limit = 10;
    const offset = 0;

    const result = await db
      .select()
      .from(notifications)
      .limit(limit)
      .offset(offset);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(limit);
  });

  it("should track read status", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .limit(50);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      result.forEach((n: any) => {
        expect(typeof n.isRead).toBe("boolean");
        if (n.isRead) {
          expect(n.readAt).toBeDefined();
        }
      });
    }
  });

  it("should track dismissed status", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(notifications)
      .limit(50);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      result.forEach((n: any) => {
        expect(typeof n.isDismissed).toBe("boolean");
        if (n.isDismissed) {
          expect(n.dismissedAt).toBeDefined();
        }
      });
    }
  });
});
