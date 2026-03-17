/**
 * Task Result Export Router
 * Provides CSV and JSON export functionality for task results and analytics
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, toolExecutions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const exportRouter = router({
  /**
   * Export tasks to JSON format
   */
  exportTasksJSON: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()).optional(),
        includeExecutions: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, ctx.user!.id));

      let filtered = allTasks;
      if (input.taskIds && input.taskIds.length > 0) {
        filtered = allTasks.filter((t) => input.taskIds!.includes(t.id));
      }

      if (input.includeExecutions) {
        const tasksWithExecutions = await Promise.all(
          filtered.map(async (task) => {
            const executions = await db
              .select()
              .from(toolExecutions)
              .where(eq(toolExecutions.taskId, task.id));
            return { ...task, executions };
          })
        );
        return tasksWithExecutions;
      }

      return filtered;
    }),

  /**
   * Export tasks to CSV format
   */
  exportTasksCSV: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, ctx.user!.id));

      if (input.taskIds && input.taskIds.length > 0) {
        allTasks = allTasks.filter((t) => input.taskIds!.includes(t.id));
      }

      // Build CSV header
      const headers = [
        "ID",
        "Title",
        "Description",
        "Status",
        "Created At",
        "Updated At",
        "Duration (ms)",
        "Result",
      ];
      const csvHeader = headers.map((h) => `"${h}"`).join(",");

      // Build CSV rows
      const csvRows = allTasks.map((task) => {
        const duration =
          task.startedAt && task.completedAt
            ? task.completedAt.getTime() - task.startedAt.getTime()
            : 0;
        const row = [
          task.id,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${(task.description || "").replace(/"/g, '""')}"`,
          task.status,
          task.createdAt.toISOString(),
          task.updatedAt.toISOString(),
          duration,
          `"${(task.result || "").replace(/"/g, '""')}"`,
        ];
        return row.join(",");
      });

      const csv = [csvHeader, ...csvRows].join("\n");

      return {
        filename: `tasks_export_${new Date().toISOString().split("T")[0]}.csv`,
        content: csv,
        mimeType: "text/csv",
      };
    }),

  /**
   * Export analytics summary to JSON
   */
  exportAnalyticsJSON: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, ctx.user!.id));

      if (input.startDate) {
        allTasks = allTasks.filter((t) => t.createdAt >= input.startDate!);
      }

      if (input.endDate) {
        allTasks = allTasks.filter((t) => t.createdAt <= input.endDate!);
      }

      const completed = allTasks.filter((t) => t.status === "completed").length;
      const failed = allTasks.filter((t) => t.status === "failed").length;
      const pending = allTasks.filter((t) => t.status === "pending").length;
      const executing = allTasks.filter((t) => t.status === "executing").length;

      const totalDuration = allTasks.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt.getTime() - t.startedAt.getTime());
        }
        return sum;
      }, 0);
      const avgDuration =
        allTasks.length > 0 ? totalDuration / allTasks.length : 0;

      const durations = allTasks
        .filter((t) => t.startedAt && t.completedAt)
        .map((t) => t.completedAt!.getTime() - t.startedAt!.getTime());

      const successRate =
        allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0;

      return {
        exportDate: new Date().toISOString(),
        period: {
          startDate: input.startDate?.toISOString(),
          endDate: input.endDate?.toISOString(),
        },
        summary: {
          totalTasks: allTasks.length,
          completed,
          failed,
          pending,
          executing,
          successRate: Math.round(successRate * 100) / 100,
        },
        performance: {
          totalDurationMs: totalDuration,
          averageDurationMs: Math.round(avgDuration),
          minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
          maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
        },
        tasks: allTasks,
      };
    }),

  /**
   * Export analytics summary to CSV
   */
  exportAnalyticsCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, ctx.user!.id));

      if (input.startDate) {
        allTasks = allTasks.filter((t) => t.createdAt >= input.startDate!);
      }

      if (input.endDate) {
        allTasks = allTasks.filter((t) => t.createdAt <= input.endDate!);
      }

      const completed = allTasks.filter((t) => t.status === "completed").length;
      const failed = allTasks.filter((t) => t.status === "failed").length;
      const pending = allTasks.filter((t) => t.status === "pending").length;
      const executing = allTasks.filter((t) => t.status === "executing").length;

      const totalDuration = allTasks.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (t.completedAt.getTime() - t.startedAt.getTime());
        }
        return sum;
      }, 0);
      const avgDuration =
        allTasks.length > 0 ? totalDuration / allTasks.length : 0;

      const durations = allTasks
        .filter((t) => t.startedAt && t.completedAt)
        .map((t) => t.completedAt!.getTime() - t.startedAt!.getTime());

      const successRate =
        allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0;

      const csv = `Hunter Agent Platform - Analytics Export
Export Date,${new Date().toISOString()}
Period Start,${input.startDate?.toISOString() || "N/A"}
Period End,${input.endDate?.toISOString() || "N/A"}

SUMMARY
Total Tasks,${allTasks.length}
Completed,${completed}
Failed,${failed}
Pending,${pending}
Executing,${executing}
Success Rate (%),${Math.round(successRate * 100) / 100}

PERFORMANCE
Total Duration (ms),${totalDuration}
Average Duration (ms),${Math.round(avgDuration)}
Min Duration (ms),${durations.length > 0 ? Math.min(...durations) : 0}
Max Duration (ms),${durations.length > 0 ? Math.max(...durations) : 0}`;

      return {
        filename: `analytics_export_${new Date().toISOString().split("T")[0]}.csv`,
        content: csv,
        mimeType: "text/csv",
      };
    }),
});
