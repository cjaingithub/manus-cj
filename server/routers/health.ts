import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  performHealthCheck,
  getQuickHealthStatus,
  isSystemHealthy,
  getServiceStatus,
} from "../services/healthCheck";

export const healthRouter = router({
  // Get full health check
  check: publicProcedure.query(async () => {
    return await performHealthCheck();
  }),

  // Get quick health status
  status: publicProcedure.query(async () => {
    return await getQuickHealthStatus();
  }),

  // Check if system is healthy
  isHealthy: publicProcedure.query(async () => {
    return await isSystemHealthy();
  }),

  // Get specific service status
  serviceStatus: publicProcedure
    .input(
      z.object({
        service: z.enum(["database", "cache", "api"]),
      })
    )
    .query(async ({ input }) => {
      return await getServiceStatus(input.service);
    }),

  // Get all service statuses
  allServices: publicProcedure.query(async () => {
    const check = await performHealthCheck();
    return check.services;
  }),

  // Get system metrics
  metrics: publicProcedure.query(async () => {
    const check = await performHealthCheck();
    return {
      uptime: check.uptime,
      metrics: check.metrics,
      timestamp: check.timestamp,
    };
  }),

  // Get readiness status (for Kubernetes/Docker)
  ready: publicProcedure.query(async () => {
    const healthy = await isSystemHealthy();
    return {
      ready: healthy,
      timestamp: Date.now(),
    };
  }),

  // Get liveness status (for Kubernetes/Docker)
  live: publicProcedure.query(async () => {
    return {
      alive: true,
      timestamp: Date.now(),
    };
  }),
});
