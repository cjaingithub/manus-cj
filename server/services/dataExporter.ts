/**
 * Data Exporter Service
 * Handles exporting data in various formats (JSON, CSV) for reporting and compliance
 */

export interface ExportOptions {
  format?: "json" | "csv";
  includeMetadata?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  fields?: string[];
}

export class DataExporter {
  /**
   * Export data to JSON format
   */
  static exportToJSON<T extends Record<string, any>>(
    data: T[],
    options?: ExportOptions
  ): string {
    const exportData = {
      metadata: options?.includeMetadata
        ? {
            exportedAt: new Date().toISOString(),
            recordCount: data.length,
            format: "json",
          }
        : undefined,
      data: data,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export data to CSV format
   */
  static exportToCSV<T extends Record<string, any>>(
    data: T[],
    options?: ExportOptions
  ): string {
    if (data.length === 0) {
      return "No data to export";
    }

    try {
      const fields = options?.fields || Object.keys(data[0]);
      const headers = fields.join(",");
      const rows = data.map((row) =>
        fields.map((field) => {
          const value = row[field];
          if (value === null || value === undefined) return "";
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(",")
      );
      return [headers, ...rows].join("\n");
    } catch (error) {
      throw new Error(`Failed to export to CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Export audit logs
   */
  static exportAuditLogs(
    logs: any[],
    format: "json" | "csv" = "json"
  ): string {
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: typeof log.details === "string" ? log.details : JSON.stringify(log.details),
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return format === "json"
      ? this.exportToJSON(formattedLogs, { format: "json", includeMetadata: true })
      : this.exportToCSV(formattedLogs, { format: "csv", includeMetadata: true });
  }

  /**
   * Export user data
   */
  static exportUsers(users: any[], format: "json" | "csv" = "json"): string {
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      lastActive: user.lastActive?.toISOString() || null,
    }));

    return format === "json"
      ? this.exportToJSON(formattedUsers, { format: "json", includeMetadata: true })
      : this.exportToCSV(formattedUsers, { format: "csv", includeMetadata: true });
  }

  /**
   * Export task data
   */
  static exportTasks(tasks: any[], format: "json" | "csv" = "json"): string {
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt?.toISOString() || new Date().toISOString(),
      completedAt: task.completedAt?.toISOString() || null,
      executionTime: task.executionTime || 0,
    }));

    return format === "json"
      ? this.exportToJSON(formattedTasks, { format: "json", includeMetadata: true })
      : this.exportToCSV(formattedTasks, { format: "csv", includeMetadata: true });
  }

  /**
   * Export analytics data
   */
  static exportAnalytics(analytics: any, format: "json" | "csv" = "json"): string {
    const formattedData = [
      {
        metric: "Total Tasks",
        value: analytics.totalTasks || 0,
        timestamp: new Date().toISOString(),
      },
      {
        metric: "Completed Tasks",
        value: analytics.completedTasks || 0,
        timestamp: new Date().toISOString(),
      },
      {
        metric: "Failed Tasks",
        value: analytics.failedTasks || 0,
        timestamp: new Date().toISOString(),
      },
      {
        metric: "Success Rate",
        value: analytics.successRate || 0,
        timestamp: new Date().toISOString(),
      },
      {
        metric: "Average Duration",
        value: analytics.averageDuration || 0,
        timestamp: new Date().toISOString(),
      },
    ];

    return format === "json"
      ? this.exportToJSON(formattedData, { format: "json", includeMetadata: true })
      : this.exportToCSV(formattedData, { format: "csv", includeMetadata: true });
  }

  /**
   * Export notifications
   */
  static exportNotifications(
    notifications: any[],
    format: "json" | "csv" = "json"
  ): string {
    const formattedNotifications = notifications.map((notif) => ({
      id: notif.id,
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: notif.read,
      createdAt: notif.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return format === "json"
      ? this.exportToJSON(formattedNotifications, { format: "json", includeMetadata: true })
      : this.exportToCSV(formattedNotifications, { format: "csv", includeMetadata: true });
  }

  /**
   * Generate filename for export
   */
  static generateFilename(
    dataType: string,
    format: "json" | "csv"
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    return `${dataType}-export-${timestamp}.${format}`;
  }

  /**
   * Validate export data
   */
  static validateExportData(data: any[]): boolean {
    return Array.isArray(data) && data.length > 0;
  }

  /**
   * Calculate export size
   */
  static calculateExportSize(data: string): number {
    return Buffer.byteLength(data, "utf8");
  }

  /**
   * Compress export data (placeholder for gzip compression)
   */
  static compressData(data: string): Buffer {
    // In production, use zlib.gzipSync(Buffer.from(data))
    return Buffer.from(data);
  }

  /**
   * Create export report
   */
  static createExportReport(
    dataType: string,
    recordCount: number,
    format: "json" | "csv",
    fileSize: number
  ): {
    dataType: string;
    recordCount: number;
    format: string;
    fileSize: number;
    exportedAt: string;
  } {
    return {
      dataType,
      recordCount,
      format,
      fileSize,
      exportedAt: new Date().toISOString(),
    };
  }
}
