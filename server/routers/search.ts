/**
 * Advanced Task Search and Filtering Router
 * Provides full-text search, date range filtering, and status-based queries
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks } from "../../drizzle/schema";
import { like, and, gte, lte, eq, desc, asc } from "drizzle-orm";

export const searchRouter = router({
  /**
   * Full-text search across task titles and descriptions
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const searchPattern = `%${input.query}%`;

      const results = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, ctx.user!.id),
            like(tasks.title, searchPattern)
          )
        )
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Filter tasks by status and date range
   */
  filter: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "planning", "executing", "completed", "failed"])
          .optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [eq(tasks.userId, ctx.user!.id)];

      if (input.status) {
        conditions.push(eq(tasks.status, input.status));
      }

      if (input.startDate) {
        conditions.push(gte(tasks.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(tasks.createdAt, input.endDate));
      }

      const results = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Advanced search with multiple filters
   */
  advancedSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        status: z
          .enum(["pending", "planning", "executing", "completed", "failed"])
          .optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        minDuration: z.number().optional(),
        maxDuration: z.number().optional(),
        sortBy: z
          .enum(["createdAt", "updatedAt", "duration"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [eq(tasks.userId, ctx.user!.id)];

      if (input.query) {
        const searchPattern = `%${input.query}%`;
        conditions.push(like(tasks.title, searchPattern));
      }

      if (input.status) {
        conditions.push(eq(tasks.status, input.status));
      }

      if (input.startDate) {
        conditions.push(gte(tasks.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(tasks.createdAt, input.endDate));
      }

      const baseQuery = db
        .select()
        .from(tasks)
        .where(and(...conditions));

      // Apply sorting and pagination
      const results = await baseQuery
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Get search suggestions based on recent queries
   */
  suggestions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const recentTasks = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.userId, ctx.user!.id))
      .limit(10);

    // Extract unique words from titles for suggestions
    const words = new Set<string>();
    recentTasks.forEach((task) => {
      const titleWords = task.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      titleWords.forEach((w) => words.add(w));
    });

    return Array.from(words).slice(0, 10);
  }),

  /**
   * Get task statistics for dashboard
   */
  statistics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [eq(tasks.userId, ctx.user!.id)];

      if (input.startDate) {
        conditions.push(gte(tasks.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(tasks.createdAt, input.endDate));
      }

      const allTasks = await db
        .select()
        .from(tasks)
        .where(and(...conditions));

      const completed = allTasks.filter((t) => t.status === "completed").length;
      const failed = allTasks.filter((t) => t.status === "failed").length;
      const pending = allTasks.filter((t) => t.status === "pending").length;
      const executing = allTasks.filter((t) => t.status === "executing").length;

      const successRate =
        allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0;

      return {
        total: allTasks.length,
        completed,
        failed,
        pending,
        executing,
        successRate: Math.round(successRate * 100) / 100,
      };
    }),
});
