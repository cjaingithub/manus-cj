import { describe, it, expect } from "vitest";
import { DataExporter } from "./dataExporter";

describe("DataExporter Service", () => {
  describe("JSON Export", () => {
    it("should export data to JSON format", () => {
      const data = [
        { id: 1, name: "Test 1", value: 100 },
        { id: 2, name: "Test 2", value: 200 },
      ];

      const result = DataExporter.exportToJSON(data);
      expect(result).toContain('"data"');
      expect(result).toContain('"id": 1');
    });

    it("should include metadata when requested", () => {
      const data = [{ id: 1 }];
      const result = DataExporter.exportToJSON(data, {
        includeMetadata: true,
      });

      expect(result).toContain("metadata");
      expect(result).toContain("exportedAt");
      expect(result).toContain("recordCount");
    });

    it("should handle empty arrays", () => {
      const result = DataExporter.exportToJSON([]);
      expect(result).toContain("data");
      expect(result).toContain("[]");
    });
  });

  describe("CSV Export", () => {
    it("should export data to CSV format", () => {
      const data = [
        { id: 1, name: "Test 1", value: 100 },
        { id: 2, name: "Test 2", value: 200 },
      ];

      const result = DataExporter.exportToCSV(data);
      expect(result).toContain("id,name,value");
      expect(result).toContain("1,Test 1,100");
    });

    it("should handle CSV special characters", () => {
      const data = [{ id: 1, name: "Test, with comma", value: 100 }];
      const result = DataExporter.exportToCSV(data);
      expect(result).toContain('"Test, with comma"');
    });

    it("should handle null and undefined values", () => {
      const data = [{ id: 1, name: null, value: undefined }];
      const result = DataExporter.exportToCSV(data);
      expect(result).toContain("1,,");
    });

    it("should return message for empty data", () => {
      const result = DataExporter.exportToCSV([]);
      expect(result).toBe("No data to export");
    });
  });

  describe("Audit Logs Export", () => {
    it("should export audit logs", () => {
      const logs = [
        {
          id: 1,
          userId: 1,
          action: "create_task",
          resource: "task",
          resourceId: 123,
          details: { title: "Test Task" },
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date(),
        },
      ];

      const result = DataExporter.exportAuditLogs(logs, "json");
      expect(result).toContain("create_task");
      expect(result).toContain("metadata");
    });

    it("should export audit logs to CSV", () => {
      const logs = [
        {
          id: 1,
          userId: 1,
          action: "create_task",
          resource: "task",
          resourceId: 123,
          details: null,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date(),
        },
      ];

      const result = DataExporter.exportAuditLogs(logs, "csv");
      expect(result).toContain("id,userId,action");
      expect(result).toContain("1,1,create_task");
    });
  });

  describe("Users Export", () => {
    it("should export users to JSON", () => {
      const users = [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
          createdAt: new Date(),
          lastActive: new Date(),
        },
      ];

      const result = DataExporter.exportUsers(users, "json");
      expect(result).toContain("John Doe");
      expect(result).toContain("admin");
    });

    it("should export users to CSV", () => {
      const users = [
        {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          role: "admin",
          createdAt: new Date(),
          lastActive: null,
        },
      ];

      const result = DataExporter.exportUsers(users, "csv");
      expect(result).toContain("John Doe");
      expect(result).toContain("john@example.com");
    });
  });

  describe("Tasks Export", () => {
    it("should export tasks to JSON", () => {
      const tasks = [
        {
          id: 1,
          title: "Test Task",
          description: "Test Description",
          status: "completed",
          priority: "high",
          createdAt: new Date(),
          completedAt: new Date(),
          executionTime: 3600,
        },
      ];

      const result = DataExporter.exportTasks(tasks, "json");
      expect(result).toContain("Test Task");
      expect(result).toContain("completed");
    });

    it("should export tasks to CSV", () => {
      const tasks = [
        {
          id: 1,
          title: "Test Task",
          description: "Test Description",
          status: "running",
          priority: "high",
          createdAt: new Date(),
          completedAt: null,
          executionTime: 0,
        },
      ];

      const result = DataExporter.exportTasks(tasks, "csv");
      expect(result).toContain("Test Task");
      expect(result).toContain("running");
    });
  });

  describe("Analytics Export", () => {
    it("should export analytics data", () => {
      const analytics = {
        totalTasks: 100,
        completedTasks: 85,
        failedTasks: 15,
        successRate: 85,
        averageDuration: 3600,
      };

      const result = DataExporter.exportAnalytics(analytics, "json");
      expect(result).toContain("Total Tasks");
      expect(result).toContain("100");
    });

    it("should export analytics to CSV", () => {
      const analytics = {
        totalTasks: 100,
        completedTasks: 85,
        failedTasks: 15,
        successRate: 85,
        averageDuration: 3600,
      };

      const result = DataExporter.exportAnalytics(analytics, "csv");
      expect(result).toContain("metric,value");
      expect(result).toContain("Total Tasks");
    });
  });

  describe("Notifications Export", () => {
    it("should export notifications to JSON", () => {
      const notifications = [
        {
          id: 1,
          userId: 1,
          type: "task_completed",
          title: "Task Completed",
          message: "Your task has been completed",
          read: true,
          createdAt: new Date(),
        },
      ];

      const result = DataExporter.exportNotifications(notifications, "json");
      expect(result).toContain("task_completed");
      expect(result).toContain("Task Completed");
    });

    it("should export notifications to CSV", () => {
      const notifications = [
        {
          id: 1,
          userId: 1,
          type: "task_failed",
          title: "Task Failed",
          message: "Your task has failed",
          read: false,
          createdAt: new Date(),
        },
      ];

      const result = DataExporter.exportNotifications(notifications, "csv");
      expect(result).toContain("task_failed");
      expect(result).toContain("Task Failed");
    });
  });

  describe("Filename Generation", () => {
    it("should generate valid filename for JSON", () => {
      const filename = DataExporter.generateFilename("audit-logs", "json");
      expect(filename).toContain("audit-logs-export");
      expect(filename).toContain(".json");
    });

    it("should generate valid filename for CSV", () => {
      const filename = DataExporter.generateFilename("users", "csv");
      expect(filename).toContain("users-export");
      expect(filename).toContain(".csv");
    });

    it("should include date in filename", () => {
      const filename = DataExporter.generateFilename("tasks", "json");
      const today = new Date().toISOString().split("T")[0];
      expect(filename).toContain(today);
    });
  });

  describe("Data Validation", () => {
    it("should validate export data", () => {
      const data = [{ id: 1 }, { id: 2 }];
      expect(DataExporter.validateExportData(data)).toBe(true);
    });

    it("should reject empty arrays", () => {
      expect(DataExporter.validateExportData([])).toBe(false);
    });

    it("should reject non-array data", () => {
      expect(DataExporter.validateExportData({} as any)).toBe(false);
    });
  });

  describe("Export Size Calculation", () => {
    it("should calculate export size", () => {
      const data = "test data";
      const size = DataExporter.calculateExportSize(data);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(Buffer.byteLength(data, "utf8"));
    });

    it("should handle large exports", () => {
      const largeData = "x".repeat(1000000);
      const size = DataExporter.calculateExportSize(largeData);
      expect(size).toBe(1000000);
    });
  });

  describe("Export Report Generation", () => {
    it("should create export report", () => {
      const report = DataExporter.createExportReport(
        "audit-logs",
        500,
        "json",
        125000
      );

      expect(report.dataType).toBe("audit-logs");
      expect(report.recordCount).toBe(500);
      expect(report.format).toBe("json");
      expect(report.fileSize).toBe(125000);
      expect(report.exportedAt).toBeDefined();
    });

    it("should include timestamp in report", () => {
      const report = DataExporter.createExportReport("users", 100, "csv", 50000);
      const exportDate = new Date(report.exportedAt);
      expect(exportDate).toBeInstanceOf(Date);
    });
  });

  describe("Data Compression", () => {
    it("should compress data", () => {
      const data = "test data to compress";
      const compressed = DataExporter.compressData(data);
      expect(compressed).toBeInstanceOf(Buffer);
    });

    it("should handle empty data compression", () => {
      const compressed = DataExporter.compressData("");
      expect(compressed).toBeInstanceOf(Buffer);
    });
  });
});
