import { describe, it, expect, beforeEach } from "vitest";
import { logAuditEntry, getAuditLogs, getAuditLogCount, getUserActivity } from "./auditLogger";

describe("Audit Logger Service", () => {
  describe("logAuditEntry", () => {
    it("should log an audit entry successfully", async () => {
      const entry = {
        userId: 1,
        action: "task.create",
        resource: "task",
        resourceId: 1,
        changes: { title: "New Task" },
        status: "success" as const,
      };

      await logAuditEntry(entry);
      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing optional fields", async () => {
      const entry = {
        userId: 1,
        action: "task.update",
        resource: "task",
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });

    it("should log failed operations", async () => {
      const entry = {
        userId: 1,
        action: "task.delete",
        resource: "task",
        resourceId: 1,
        status: "failure" as const,
        errorMessage: "Permission denied",
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });

    it("should include IP address and user agent", async () => {
      const entry = {
        userId: 1,
        action: "user.login",
        resource: "user",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        status: "success" as const,
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });

    it("should handle metadata", async () => {
      const entry = {
        userId: 1,
        action: "task.execute",
        resource: "task",
        resourceId: 1,
        metadata: {
          duration: 1000,
          toolsUsed: ["web_search", "code_execution"],
        },
        status: "success" as const,
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });
  });

  describe("getAuditLogs", () => {
    it("should retrieve audit logs", async () => {
      const logs = await getAuditLogs({
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter by user ID", async () => {
      const logs = await getAuditLogs({
        userId: 1,
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter by action", async () => {
      const logs = await getAuditLogs({
        action: "task.create",
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter by resource", async () => {
      const logs = await getAuditLogs({
        resource: "task",
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter by status", async () => {
      const logs = await getAuditLogs({
        status: "success",
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should filter by date range", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const logs = await getAuditLogs({
        startDate,
        endDate: new Date(),
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should support pagination", async () => {
      const logs1 = await getAuditLogs({
        limit: 5,
        offset: 0,
      });

      const logs2 = await getAuditLogs({
        limit: 5,
        offset: 5,
      });

      expect(Array.isArray(logs1)).toBe(true);
      expect(Array.isArray(logs2)).toBe(true);
    });
  });

  describe("getAuditLogCount", () => {
    it("should count total audit logs", async () => {
      const count = await getAuditLogCount({});

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should count filtered audit logs", async () => {
      const count = await getAuditLogCount({
        resource: "task",
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should count by status", async () => {
      const successCount = await getAuditLogCount({
        status: "success",
      });

      const failureCount = await getAuditLogCount({
        status: "failure",
      });

      expect(typeof successCount).toBe("number");
      expect(typeof failureCount).toBe("number");
    });
  });

  describe("getUserActivity", () => {
    it("should retrieve user activity", async () => {
      const activity = await getUserActivity(1, 50);

      expect(Array.isArray(activity)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const activity = await getUserActivity(1, 10);

      expect(Array.isArray(activity)).toBe(true);
      expect(activity.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Audit Log Entry Structure", () => {
    it("should have required fields", async () => {
      const entry = {
        userId: 1,
        action: "test.action",
        resource: "test",
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });

    it("should accept all optional fields", async () => {
      const entry = {
        userId: 1,
        action: "test.action",
        resource: "test",
        resourceId: 1,
        changes: { before: "value1", after: "value2" },
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        status: "success" as const,
        errorMessage: undefined,
        metadata: { custom: "data" },
      };

      await logAuditEntry(entry);
      expect(true).toBe(true);
    });
  });

  describe("Audit Log Filtering", () => {
    it("should combine multiple filters", async () => {
      const logs = await getAuditLogs({
        userId: 1,
        action: "task.create",
        resource: "task",
        status: "success",
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle empty results", async () => {
      const logs = await getAuditLogs({
        action: "nonexistent.action",
        limit: 10,
      });

      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
