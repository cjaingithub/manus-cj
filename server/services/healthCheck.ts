/**
 * Health Check Service
 * Monitors system health and service availability
 */

import { getDb } from "../db";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  uptime: number;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    api: ServiceStatus;
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  version: string;
}

export interface ServiceStatus {
  status: "up" | "down" | "degraded";
  responseTime: number;
  lastChecked: number;
  error?: string;
}

const startTime = Date.now();
let lastHealthCheck: HealthCheckResult | null = null;
let lastHealthCheckTime = 0;

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return {
        status: "down",
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        error: "Database connection not available",
      };
    }

    // Try a simple query to verify connectivity
    const result = await db.execute("SELECT 1");
    if (!result) {
      return {
        status: "down",
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        error: "Database query failed",
      };
    }

    return {
      status: "up",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
    };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check cache availability (placeholder for future cache implementation)
 */
async function checkCache(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    // Placeholder for cache health check
    // In production, this would check Redis or similar
    return {
      status: "up",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
    };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check API availability
 */
async function checkApi(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    // API is available if this function is executing
    return {
      status: "up",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
    };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get system metrics
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  return {
    memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    cpuUsage: Math.round((process.cpuUsage().user / 1000000) * 100),
    activeConnections: 0, // Placeholder
  };
}

/**
 * Perform full health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const now = Date.now();

  // Return cached result if checked within last 5 seconds
  if (lastHealthCheck && now - lastHealthCheckTime < 5000) {
    return lastHealthCheck;
  }

  const [database, cache, api] = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkApi(),
  ]);

  const metrics = getSystemMetrics();
  const uptime = now - startTime;

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (database.status === "down" || api.status === "down") {
    status = "unhealthy";
  } else if (database.status === "degraded" || api.status === "degraded") {
    status = "degraded";
  }

  const result: HealthCheckResult = {
    status,
    timestamp: now,
    uptime,
    services: {
      database,
      cache,
      api,
    },
    metrics,
    version: "1.0.0",
  };

  lastHealthCheck = result;
  lastHealthCheckTime = now;

  return result;
}

/**
 * Get quick health status (cached)
 */
export async function getQuickHealthStatus(): Promise<"healthy" | "degraded" | "unhealthy"> {
  const check = await performHealthCheck();
  return check.status;
}

/**
 * Check if system is healthy
 */
export async function isSystemHealthy(): Promise<boolean> {
  const status = await getQuickHealthStatus();
  return status === "healthy";
}

/**
 * Get service-specific status
 */
export async function getServiceStatus(
  service: "database" | "cache" | "api"
): Promise<ServiceStatus> {
  const check = await performHealthCheck();
  return check.services[service];
}

/**
 * Reset health check cache (for testing)
 */
export function resetHealthCheckCache(): void {
  lastHealthCheck = null;
  lastHealthCheckTime = 0;
}
