/**
 * Audit Logger Service
 * Tracks all user actions and API calls for compliance and debugging
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

export interface AuditLogEntry {
  userId: number;
  action: string; // e.g., "task.create", "task.update", "task.delete"
  resource: string; // e.g., "task", "notification", "user"
  resourceId?: number;
  changes?: Record<string, any>; // Before/after values
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "failure" | "partial";
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  userId?: number;
  action?: string;
  resource?: string;
  status?: "success" | "failure" | "partial";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Log an audit entry
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available for audit logging");
      return;
    }

    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      status: entry.status || "success",
      errorMessage: entry.errorMessage,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Build query with filters
    let conditions: any[] = [];

    if (filter.userId) {
      conditions.push(`userId = ${filter.userId}`);
    }

    if (filter.action) {
      conditions.push(`action = '${filter.action}'`);
    }

    if (filter.resource) {
      conditions.push(`resource = '${filter.resource}'`);
    }

    if (filter.status) {
      conditions.push(`status = '${filter.status}'`);
    }

    if (filter.startDate) {
      conditions.push(`createdAt >= '${filter.startDate.toISOString()}'`);
    }

    if (filter.endDate) {
      conditions.push(`createdAt <= '${filter.endDate.toISOString()}'`);
    }

    // Apply pagination
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT * FROM auditLogs ${whereClause} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`;

    const results = await db.execute(query);

    return results || [];
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return [];
  }
}

/**
 * Get audit log count with filtering
 */
export async function getAuditLogCount(filter: AuditLogFilter): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Build query with filters
    let conditions: any[] = [];

    if (filter.userId) {
      conditions.push(`userId = ${filter.userId}`);
    }

    if (filter.action) {
      conditions.push(`action = '${filter.action}'`);
    }

    if (filter.resource) {
      conditions.push(`resource = '${filter.resource}'`);
    }

    if (filter.status) {
      conditions.push(`status = '${filter.status}'`);
    }

    if (filter.startDate) {
      conditions.push(`createdAt >= '${filter.startDate.toISOString()}'`);
    }

    if (filter.endDate) {
      conditions.push(`createdAt <= '${filter.endDate.toISOString()}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT COUNT(*) as count FROM auditLogs ${whereClause}`;

    const results = (await db.execute(query)) as any[];

    return (results?.[0]?.count as number) || 0;
  } catch (error) {
    console.error("Failed to get audit log count:", error);
    return 0;
  }
}

/**
 * Get user's recent activity
 */
export async function getUserActivity(userId: number, limit: number = 50) {
  return getAuditLogs({
    userId,
    limit,
    offset: 0,
  });
}

/**
 * Get activity by resource
 */
export async function getResourceActivity(resource: string, resourceId: number, limit: number = 50) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const query = `SELECT * FROM auditLogs WHERE resource = '${resource}' AND resourceId = ${resourceId} ORDER BY createdAt DESC LIMIT ${limit}`;
    const results = await db.execute(query);

    return results || [];
  } catch (error) {
    console.error("Failed to get resource activity:", error);
    return [];
  }
}

/**
 * Get failed operations
 */
export async function getFailedOperations(limit: number = 50) {
  return getAuditLogs({
    status: "failure",
    limit,
    offset: 0,
  });
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(filter: AuditLogFilter, format: "json" | "csv" = "json") {
  const logs = await getAuditLogs({ ...filter, limit: 10000 });

  if (format === "csv") {
    return convertToCSV(logs);
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Convert logs to CSV format
 */
function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return "";

  const headers = [
    "id",
    "userId",
    "action",
    "resource",
    "resourceId",
    "status",
    "errorMessage",
    "ipAddress",
    "createdAt",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.userId,
    log.action,
    log.resource,
    log.resourceId || "",
    log.status,
    (log.errorMessage || "").replace(/"/g, '""'),
    log.ipAddress || "",
    log.createdAt,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Note: This is a simplified version - actual implementation would depend on Drizzle ORM capabilities
    console.log(`Cleanup would remove logs older than ${cutoffDate.toISOString()}`);

    return 0;
  } catch (error) {
    console.error("Failed to cleanup old audit logs:", error);
    return 0;
  }
}
