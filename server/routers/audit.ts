import { z } from "zod";
import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import {
  logAuditEntry,
  getAuditLogs,
  getAuditLogCount,
  getUserActivity,
  getResourceActivity,
  getFailedOperations,
  exportAuditLogs,
} from "../services/auditLogger";

export const auditRouter = router({
  // Get audit logs with filtering
  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        status: z.enum(["success", "failure", "partial"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogs(input);
    }),

  // Get audit log count
  getCount: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        status: z.enum(["success", "failure", "partial"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogCount(input);
    }),

  // Get user's activity
  getUserActivity: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getUserActivity(input.userId, input.limit);
    }),

  // Get resource activity
  getResourceActivity: adminProcedure
    .input(
      z.object({
        resource: z.string(),
        resourceId: z.number(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getResourceActivity(input.resource, input.resourceId, input.limit);
    }),

  // Get failed operations
  getFailedOperations: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getFailedOperations(input.limit);
    }),

  // Export audit logs
  export: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        resource: z.string().optional(),
        status: z.enum(["success", "failure", "partial"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        format: z.enum(["json", "csv"]).default("json"),
      })
    )
    .query(async ({ input }) => {
      const { format, ...filter } = input;
      return await exportAuditLogs(filter, format);
    }),

  // Log an audit entry (internal use)
  log: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        resource: z.string(),
        resourceId: z.number().optional(),
        changes: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["success", "failure", "partial"]).default("success"),
        errorMessage: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await logAuditEntry({
        userId: (ctx.user as any).id,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        changes: input.changes,
        ipAddress: (ctx.req as any).ip,
        userAgent: (ctx.req as any).headers["user-agent"],
        status: input.status,
        errorMessage: input.errorMessage,
        metadata: input.metadata,
      });

      return { success: true };
    }),
});
