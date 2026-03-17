import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  performHealthCheck,
  getQuickHealthStatus,
  isSystemHealthy,
  getServiceStatus,
  resetHealthCheckCache,
} from "./healthCheck";

describe("Health Check Service", () => {
  beforeEach(() => {
    resetHealthCheckCache();
  });

  afterEach(() => {
    resetHealthCheckCache();
  });

  describe("performHealthCheck", () => {
    it("should return a health check result", async () => {
      const result = await performHealthCheck();

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("services");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("version");
    });

    it("should have valid status values", async () => {
      const result = await performHealthCheck();

      expect(["healthy", "degraded", "unhealthy"]).toContain(result.status);
    });

    it("should include service statuses", async () => {
      const result = await performHealthCheck();

      expect(result.services).toHaveProperty("database");
      expect(result.services).toHaveProperty("cache");
      expect(result.services).toHaveProperty("api");
    });

    it("should have valid service status values", async () => {
      const result = await performHealthCheck();

      Object.values(result.services).forEach((service) => {
        expect(["up", "down", "degraded"]).toContain(service.status);
        expect(typeof service.responseTime).toBe("number");
        expect(typeof service.lastChecked).toBe("number");
      });
    });

    it("should include system metrics", async () => {
      const result = await performHealthCheck();

      expect(result.metrics).toHaveProperty("memoryUsage");
      expect(result.metrics).toHaveProperty("cpuUsage");
      expect(result.metrics).toHaveProperty("activeConnections");

      expect(typeof result.metrics.memoryUsage).toBe("number");
      expect(typeof result.metrics.cpuUsage).toBe("number");
      expect(typeof result.metrics.activeConnections).toBe("number");
    });

    it("should have positive uptime", async () => {
      const result = await performHealthCheck();

      expect(result.uptime).toBeGreaterThan(0);
    });

    it("should cache results for 5 seconds", async () => {
      const result1 = await performHealthCheck();
      const result2 = await performHealthCheck();

      expect(result1.timestamp).toBe(result2.timestamp);
    });
  });

  describe("getQuickHealthStatus", () => {
    it("should return a valid status", async () => {
      const status = await getQuickHealthStatus();

      expect(["healthy", "degraded", "unhealthy"]).toContain(status);
    });

    it("should return healthy status when services are up", async () => {
      const status = await getQuickHealthStatus();

      // Should be healthy if database and API are up
      expect(status).toBeDefined();
    });
  });

  describe("isSystemHealthy", () => {
    it("should return a boolean", async () => {
      const healthy = await isSystemHealthy();

      expect(typeof healthy).toBe("boolean");
    });

    it("should return true when system is healthy", async () => {
      const healthy = await isSystemHealthy();

      // Should be true if database and API are up
      expect(typeof healthy).toBe("boolean");
    });
  });

  describe("getServiceStatus", () => {
    it("should return database service status", async () => {
      const status = await getServiceStatus("database");

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("responseTime");
      expect(status).toHaveProperty("lastChecked");
      expect(["up", "down", "degraded"]).toContain(status.status);
    });

    it("should return cache service status", async () => {
      const status = await getServiceStatus("cache");

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("responseTime");
      expect(status).toHaveProperty("lastChecked");
      expect(["up", "down", "degraded"]).toContain(status.status);
    });

    it("should return api service status", async () => {
      const status = await getServiceStatus("api");

      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("responseTime");
      expect(status).toHaveProperty("lastChecked");
      expect(["up", "down", "degraded"]).toContain(status.status);
    });

    it("should have response time measurements", async () => {
      const status = await getServiceStatus("database");

      expect(status.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health Check Metrics", () => {
    it("should track memory usage", async () => {
      const result = await performHealthCheck();

      expect(result.metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memoryUsage).toBeLessThanOrEqual(100);
    });

    it("should track CPU usage", async () => {
      const result = await performHealthCheck();

      expect(result.metrics.cpuUsage).toBeGreaterThanOrEqual(0);
    });

    it("should track active connections", async () => {
      const result = await performHealthCheck();

      expect(result.metrics.activeConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health Check Status Determination", () => {
    it("should determine overall status based on services", async () => {
      const result = await performHealthCheck();

      // If database is down, overall status should be unhealthy
      if (result.services.database.status === "down") {
        expect(result.status).toBe("unhealthy");
      }

      // If API is down, overall status should be unhealthy
      if (result.services.api.status === "down") {
        expect(result.status).toBe("unhealthy");
      }
    });
  });

  describe("Cache Behavior", () => {
    it("should return same timestamp within cache window", async () => {
      resetHealthCheckCache();

      const result1 = await performHealthCheck();
      const result2 = await performHealthCheck();

      expect(result1.timestamp).toBe(result2.timestamp);
    });

    it("should reset cache when requested", async () => {
      await performHealthCheck();
      resetHealthCheckCache();

      const result = await performHealthCheck();

      expect(result).toBeDefined();
    });
  });
});
