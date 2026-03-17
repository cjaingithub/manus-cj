import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tokenUsageLogs } from "../../drizzle/schema";
import { eq, gte, lte } from "drizzle-orm";
import {
  aggregateTokenUsage,
  calculateTokenCost,
  formatCost,
  getCostBreakdown,
  getTokenUsageByModel,
} from "../agent/tokenTracking";

export const tokenUsageRouter = router({
  // Log token usage
  log: protectedProcedure
    .input(
      z.object({
        taskId: z.number().optional(),
        model: z.string(),
        promptTokens: z.number(),
        completionTokens: z.number(),
        finishReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalTokens = input.promptTokens + input.completionTokens;
      const estimatedCost = calculateTokenCost(input.promptTokens, input.completionTokens, input.model);

      await db.insert(tokenUsageLogs).values({
        taskId: input.taskId,
        userId: ctx.user.id,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens,
        estimatedCost: estimatedCost.toString(),
        finishReason: input.finishReason,
      });

      return {
        estimatedCost,
      };
    }),

  // Get user's token usage statistics
  getStats: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const logs = await db
        .select()
        .from(tokenUsageLogs)
        .where(
          eq(tokenUsageLogs.userId, ctx.user.id)
        );

      if (logs.length === 0) {
        return {
          totalTokens: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalCost: 0,
          averageTokensPerRequest: 0,
          averageCostPerRequest: 0,
          costByModel: {},
          usageByModel: {},
        };
      }

      const usages = logs.map((log) => ({
        promptTokens: log.promptTokens,
        completionTokens: log.completionTokens,
        totalTokens: log.totalTokens,
        estimatedCost: parseFloat(log.estimatedCost),
        model: log.model,
        timestamp: log.createdAt,
      }));

      const stats = aggregateTokenUsage(usages);
      const costByModel = getCostBreakdown(usages);
      const usageByModel = getTokenUsageByModel(usages);

      return {
        ...stats,
        costByModel: Object.fromEntries(
          Object.entries(costByModel).map(([model, cost]) => [model, formatCost(cost)])
        ),
        usageByModel: Object.fromEntries(
          Object.entries(usageByModel).map(([model, logs]) => [
            model,
            {
              count: logs.length,
              totalTokens: logs.reduce((sum, l) => sum + l.totalTokens, 0),
              totalCost: formatCost(logs.reduce((sum, l) => sum + l.estimatedCost, 0)),
            },
          ])
        ),
      };
    }),

  // Get detailed token usage logs
  getLogs: protectedProcedure
    .input(
      z.object({
        taskId: z.number().optional(),
        model: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const logs = await db
        .select()
        .from(tokenUsageLogs)
        .where(eq(tokenUsageLogs.userId, ctx.user.id))
        .limit(input.limit)
        .offset(input.offset);

      return logs.map((log) => ({
        id: log.id,
        taskId: log.taskId,
        model: log.model,
        promptTokens: log.promptTokens,
        completionTokens: log.completionTokens,
        totalTokens: log.totalTokens,
        estimatedCost: formatCost(parseFloat(log.estimatedCost)),
        finishReason: log.finishReason,
        createdAt: log.createdAt,
      }));
    }),

  // Get cost breakdown by model
  getCostBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {};

    const logs = await db.select().from(tokenUsageLogs).where(eq(tokenUsageLogs.userId, ctx.user.id));

    const breakdown: Record<string, { cost: string; tokens: number; requests: number }> = {};

    for (const log of logs) {
      if (!breakdown[log.model]) {
        breakdown[log.model] = {
          cost: "$0",
          tokens: 0,
          requests: 0,
        };
      }

      const cost = parseFloat(log.estimatedCost);
      const currentCost = parseFloat(breakdown[log.model].cost.replace("$", ""));

      breakdown[log.model] = {
        cost: formatCost(currentCost + cost),
        tokens: breakdown[log.model].tokens + log.totalTokens,
        requests: breakdown[log.model].requests + 1,
      };
    }

    return breakdown;
  }),

  // Get total cost
  getTotalCost: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: "$0", count: 0 };

    const logs = await db.select().from(tokenUsageLogs).where(eq(tokenUsageLogs.userId, ctx.user.id));

    const total = logs.reduce((sum, log) => sum + parseFloat(log.estimatedCost), 0);

    return {
      total: formatCost(total),
      count: logs.length,
    };
  }),
});
