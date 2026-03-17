import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks } from "../../drizzle/schema";
import { desc, eq, gte, lte, like, and } from "drizzle-orm";

export const historyRouter = router({
  // Get task execution history with filtering
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z.enum(["pending", "planning", "executing", "completed", "failed"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Build where conditions
      const conditions = [eq(tasks.userId, ctx.user.id)];

      if (input.status) {
        conditions.push(eq(tasks.status, input.status));
      }

      if (input.startDate) {
        conditions.push(gte(tasks.createdAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(tasks.createdAt, input.endDate));
      }

      if (input.search) {
        conditions.push(like(tasks.title, `%${input.search}%`));
      }

      // Build sort column
      const sortColumn = input.sortBy === "updatedAt" ? tasks.updatedAt : tasks.createdAt;
      const orderFn = input.order === "asc" ? (col: any) => col : desc;

      // Execute query
      const result = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(orderFn(sortColumn))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const allResults = await db
        .select()
        .from(tasks)
        .where(and(...conditions));

      return {
        tasks: result,
        total: allResults.length,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < allResults.length,
      };
    }),

  // Get task statistics
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, ctx.user.id));

    const completed = userTasks.filter((t) => t.status === "completed").length;
    const failed = userTasks.filter((t) => t.status === "failed").length;
    const executing = userTasks.filter((t) => t.status === "executing").length;
    const pending = userTasks.filter((t) => t.status === "pending").length;

    const successRate = userTasks.length > 0 ? (completed / userTasks.length) * 100 : 0;
    const avgDuration =
      completed > 0
        ? userTasks
            .filter((t) => t.status === "completed" && t.completedAt)
            .reduce((sum, t) => {
              const duration = t.completedAt
                ? (t.completedAt.getTime() - t.createdAt.getTime()) / 1000
                : 0;
              return sum + duration;
            }, 0) / completed
        : 0;

    return {
      total: userTasks.length,
      completed,
      failed,
      executing,
      pending,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
    };
  }),

  // Get task details
  getTaskDetails: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, ctx.user.id)))
        .limit(1);

      if (!task.length) {
        throw new Error("Task not found");
      }

      return task[0];
    }),

  // Get execution timeline
  getExecutionTimeline: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, ctx.user.id)))
        .limit(1);

      if (!task.length) {
        throw new Error("Task not found");
      }

      const t = task[0];
      const timeline = [];

      timeline.push({
        phase: "created",
        timestamp: t.createdAt,
        duration: 0,
      });

      if (t.startedAt) {
        timeline.push({
          phase: "started",
          timestamp: t.startedAt,
          duration: (t.startedAt.getTime() - t.createdAt.getTime()) / 1000,
        });
      }

      if (t.completedAt) {
        timeline.push({
          phase: "completed",
          timestamp: t.completedAt,
          duration: (t.completedAt.getTime() - t.createdAt.getTime()) / 1000,
        });
      }

      return timeline;
    }),
});
