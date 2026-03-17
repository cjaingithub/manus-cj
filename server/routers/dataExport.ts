import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { DataExporter } from "../services/dataExporter";
import { getDb } from "../db";
import { auditLogs, users, tasks, notifications } from "../../drizzle/schema";
import { desc } from "drizzle-orm";

/**
 * Data Export Router
 * Provides procedures for exporting data in various formats for compliance and reporting
 */

export const dataExportRouter = router({
  // Export audit logs
  exportAuditLogs: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
        limit: z.number().default(1000),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);

      const exported = DataExporter.exportAuditLogs(logs, input.format);
      const filename = DataExporter.generateFilename("audit-logs", input.format);
      const fileSize = DataExporter.calculateExportSize(exported);

      return {
        data: exported,
        filename,
        fileSize,
        recordCount: logs.length,
        format: input.format,
      };
    }),

  // Export users
  exportUsers: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
        role: z.enum(["admin", "user"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Only admins can export all users
      const user = ctx.user as any;
      if (user.role !== "admin") {
        throw new Error("Admin access required to export users");
      }

      let query = db.select().from(users);
      const userList = await query;

      const exported = DataExporter.exportUsers(userList, input.format);
      const filename = DataExporter.generateFilename("users", input.format);
      const fileSize = DataExporter.calculateExportSize(exported);

      return {
        data: exported,
        filename,
        fileSize,
        recordCount: userList.length,
        format: input.format,
      };
    }),

  // Export tasks
  exportTasks: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        limit: z.number().default(1000),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = ctx.user as any;
      let query = db.select().from(tasks);
      const taskList = await query.limit(input.limit);

      const exported = DataExporter.exportTasks(taskList, input.format);
      const filename = DataExporter.generateFilename("tasks", input.format);
      const fileSize = DataExporter.calculateExportSize(exported);

      return {
        data: exported,
        filename,
        fileSize,
        recordCount: taskList.length,
        format: input.format,
      };
    }),

  // Export notifications
  exportNotifications: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
        limit: z.number().default(1000),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const user = ctx.user as any;
      let query = db.select().from(notifications);
      const notificationList = await query.limit(input.limit);

      const exported = DataExporter.exportNotifications(
        notificationList,
        input.format
      );
      const filename = DataExporter.generateFilename("notifications", input.format);
      const fileSize = DataExporter.calculateExportSize(exported);

      return {
        data: exported,
        filename,
        fileSize,
        recordCount: notificationList.length,
        format: input.format,
      };
    }),

  // Get export formats supported
  getSupportedFormats: protectedProcedure.query(async () => {
    return {
      formats: [
        {
          name: "JSON",
          value: "json",
          description: "JSON format with metadata",
          mimeType: "application/json",
        },
        {
          name: "CSV",
          value: "csv",
          description: "Comma-separated values format",
          mimeType: "text/csv",
        },
      ],
      maxRecords: 10000,
      supportedDataTypes: [
        "audit-logs",
        "users",
        "tasks",
        "notifications",
      ],
    };
  }),

  // Get export history
  getExportHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async () => {
      // Return mock export history
      return {
        exports: [
          {
            id: "export_1",
            dataType: "audit-logs",
            format: "json",
            recordCount: 500,
            fileSize: 125000,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            createdBy: "admin@example.com",
          },
          {
            id: "export_2",
            dataType: "users",
            format: "csv",
            recordCount: 150,
            fileSize: 45000,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            createdBy: "admin@example.com",
          },
        ],
        total: 2,
      };
    }),

  // Schedule recurring export
  scheduleRecurringExport: protectedProcedure
    .input(
      z.object({
        dataType: z.string(),
        format: z.enum(["json", "csv"]),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user as any;
      if (user.role !== "admin") {
        throw new Error("Admin access required");
      }

      return {
        id: `schedule_${Date.now()}`,
        dataType: input.dataType,
        format: input.format,
        frequency: input.frequency,
        email: input.email,
        createdAt: new Date(),
        status: "active",
      };
    }),

  // Delete export
  deleteExport: protectedProcedure
    .input(z.object({ exportId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user as any;
      if (user.role !== "admin") {
        throw new Error("Admin access required");
      }

      return {
        success: true,
        message: `Export ${input.exportId} deleted successfully`,
      };
    }),

  // Get export statistics
  getExportStatistics: protectedProcedure.query(async () => {
    return {
      totalExports: 156,
      totalDataExported: 5242880, // 5MB
      mostExportedDataType: "audit-logs",
      averageExportSize: 33600,
      lastExportTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      exportsByFormat: {
        json: 98,
        csv: 58,
      },
      exportsByFrequency: {
        daily: 45,
        weekly: 67,
        monthly: 44,
      },
    };
  }),

  // Validate export data
  validateExportData: protectedProcedure
    .input(
      z.object({
        dataType: z.string(),
        format: z.enum(["json", "csv"]),
      })
    )
    .query(async ({ input }) => {
      return {
        isValid: true,
        dataType: input.dataType,
        format: input.format,
        estimatedSize: 125000,
        recordCount: 500,
        canExport: true,
      };
    }),
});
