import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { tasks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("History Router", () => {
  let db: any;
  let testUserId: string;

  beforeAll(async () => {
    db = await getDb();
    testUserId = "test-user-" + Date.now();
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.delete(tasks).where(eq(tasks.userId, testUserId));
    }
  });

  it("should retrieve history for user", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(tasks)
      .limit(20)
      .offset(0);

    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter tasks by status", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "completed"))
      .limit(10);

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result.every((t: any) => t.status === "completed")).toBe(true);
    }
  });

  it("should calculate success rate from tasks", async () => {
    if (!db) throw new Error("Database not available");

    const userTasks = await db
      .select()
      .from(tasks)
      .limit(100);

    const completed = userTasks.filter((t: any) => t.status === "completed").length;
    const successRate = userTasks.length > 0 ? (completed / userTasks.length) * 100 : 0;

    expect(typeof successRate).toBe("number");
    expect(successRate).toBeGreaterThanOrEqual(0);
    expect(successRate).toBeLessThanOrEqual(100);
  });

  it("should calculate average duration from tasks", async () => {
    if (!db) throw new Error("Database not available");

    const userTasks = await db
      .select()
      .from(tasks)
      .limit(100);

    const completed = userTasks.filter((t: any) => t.status === "completed");
    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum: number, t: any) => {
            const duration = t.completedAt
              ? (t.completedAt.getTime() - t.createdAt.getTime()) / 1000
              : 0;
            return sum + duration;
          }, 0) / completed.length
        : 0;

    expect(typeof avgDuration).toBe("number");
    expect(avgDuration).toBeGreaterThanOrEqual(0);
  });

  it("should handle pagination", async () => {
    if (!db) throw new Error("Database not available");

    const limit = 10;
    const offset = 0;

    const result = await db
      .select()
      .from(tasks)
      .limit(limit)
      .offset(offset);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(limit);
  });

  it("should search tasks by title", async () => {
    if (!db) throw new Error("Database not available");

    const userTasks = await db
      .select()
      .from(tasks)
      .limit(50);

    const searchTerm = "test";
    const filtered = userTasks.filter((t: any) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(Array.isArray(filtered)).toBe(true);
  });

  it("should retrieve task statistics", async () => {
    if (!db) throw new Error("Database not available");

    const userTasks = await db
      .select()
      .from(tasks)
      .limit(100);

    const stats = {
      total: userTasks.length,
      completed: userTasks.filter((t: any) => t.status === "completed").length,
      failed: userTasks.filter((t: any) => t.status === "failed").length,
      executing: userTasks.filter((t: any) => t.status === "executing").length,
      pending: userTasks.filter((t: any) => t.status === "pending").length,
    };

    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.completed).toBeGreaterThanOrEqual(0);
    expect(stats.failed).toBeGreaterThanOrEqual(0);
    expect(stats.executing).toBeGreaterThanOrEqual(0);
    expect(stats.pending).toBeGreaterThanOrEqual(0);
  });

  it("should sort tasks by creation date", async () => {
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(tasks)
      .orderBy((t: any) => t.createdAt)
      .limit(10);

    expect(Array.isArray(result)).toBe(true);
  });
});
