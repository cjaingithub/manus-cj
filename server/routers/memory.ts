import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { memoryManager } from "../services/memoryManager";

export const memoryRouter = router({
  // WORKING MEMORY

  /**
   * Create working memory for a task
   */
  createWorking: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        currentGoal: z.string().optional(),
        currentPhase: z.string().optional(),
        activeTools: z.array(z.string()).optional(),
        recentResults: z.record(z.string(), z.unknown()).optional(),
        contextWindow: z.array(z.unknown()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const memory = await memoryManager.createWorkingMemory(ctx.user.id, input.taskId, {
        currentGoal: input.currentGoal,
        currentPhase: input.currentPhase,
        activeTools: input.activeTools,
        recentResults: input.recentResults,
        contextWindow: input.contextWindow,
        expiresAt: input.expiresAt,
      });

      return {
        id: memory?.id,
        taskId: memory?.taskId,
        currentGoal: memory?.currentGoal,
        currentPhase: memory?.currentPhase,
      };
    }),

  /**
   * Get working memory for a task
   */
  getWorking: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const memory = await memoryManager.getWorkingMemory(input.taskId);

      if (!memory) return null;

      return {
        id: memory.id,
        taskId: memory.taskId,
        currentGoal: memory.currentGoal,
        currentPhase: memory.currentPhase,
        activeTools: memory.activeTools ? JSON.parse(memory.activeTools) : [],
        recentResults: memory.recentResults ? JSON.parse(memory.recentResults) : {},
        contextWindow: memory.contextWindow ? JSON.parse(memory.contextWindow) : [],
        updatedAt: memory.updatedAt,
      };
    }),

  /**
   * Update working memory
   */
  updateWorking: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        currentGoal: z.string().optional(),
        currentPhase: z.string().optional(),
        activeTools: z.array(z.string()).optional(),
        recentResults: z.record(z.string(), z.unknown()).optional(),
        contextWindow: z.array(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const memory = await memoryManager.updateWorkingMemory(input.taskId, {
        currentGoal: input.currentGoal,
        currentPhase: input.currentPhase,
        activeTools: input.activeTools,
        recentResults: input.recentResults,
        contextWindow: input.contextWindow,
      });

      return {
        id: memory?.id,
        taskId: memory?.taskId,
        currentGoal: memory?.currentGoal,
        currentPhase: memory?.currentPhase,
      };
    }),

  // EPISODIC MEMORY

  /**
   * Record an event in episodic memory
   */
  recordEvent: protectedProcedure
    .input(
      z.object({
        taskId: z.number().optional(),
        eventType: z.string(),
        description: z.string(),
        outcome: z.enum(["success", "failure", "partial"]).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
        duration: z.number().optional(),
        relatedTaskIds: z.array(z.number()).optional(),
        tags: z.array(z.string()).optional(),
        importance: z.enum(["low", "normal", "high", "critical"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await memoryManager.recordEvent(ctx.user.id, input.taskId || null, {
        eventType: input.eventType,
        description: input.description,
        outcome: input.outcome,
        details: input.details,
        duration: input.duration,
        relatedTaskIds: input.relatedTaskIds,
        tags: input.tags,
        importance: input.importance,
      });

      return {
        id: event?.id,
        eventType: event?.eventType,
        description: event?.description,
        importance: event?.importance,
        createdAt: event?.createdAt,
      };
    }),

  /**
   * Get task events
   */
  getTaskEvents: protectedProcedure
    .input(z.object({ taskId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const events = await memoryManager.getTaskEvents(input.taskId, input.limit);

      return events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description,
        outcome: e.outcome,
        importance: e.importance,
        duration: e.duration,
        createdAt: e.createdAt,
      }));
    }),

  /**
   * Get user events
   */
  getUserEvents: protectedProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ ctx, input }) => {
      const events = await memoryManager.getUserEvents(ctx.user.id, input.limit);

      return events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description,
        outcome: e.outcome,
        importance: e.importance,
        createdAt: e.createdAt,
      }));
    }),

  // SEMANTIC MEMORY

  /**
   * Store knowledge
   */
  storeKnowledge: protectedProcedure
    .input(
      z.object({
        category: z.string(),
        key: z.string(),
        content: z.string(),
        description: z.string().optional(),
        confidence: z.number().min(0).max(100).optional(),
        tags: z.array(z.string()).optional(),
        relatedKeys: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const knowledge = await memoryManager.storeKnowledge(ctx.user.id, {
        category: input.category,
        key: input.key,
        content: input.content,
        description: input.description,
        confidence: input.confidence,
        tags: input.tags,
        relatedKeys: input.relatedKeys,
      });

      return {
        id: knowledge?.id,
        key: knowledge?.key,
        category: knowledge?.category,
        confidence: knowledge?.confidence,
      };
    }),

  /**
   * Get knowledge by category
   */
  getKnowledge: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      const knowledge = await memoryManager.getKnowledge(ctx.user.id, input.category);

      return knowledge.map((k) => ({
        id: k.id,
        key: k.key,
        content: k.content,
        description: k.description,
        confidence: k.confidence,
        usageCount: k.usageCount,
        successRate: k.successRate,
        tags: k.tags ? JSON.parse(k.tags) : [],
      }));
    }),

  /**
   * Update knowledge usage
   */
  updateKnowledgeUsage: protectedProcedure
    .input(z.object({ memoryId: z.number(), success: z.boolean() }))
    .mutation(async ({ input }) => {
      await memoryManager.updateKnowledgeUsage(input.memoryId, input.success);

      return { success: true };
    }),

  // MEMORY SEARCH

  /**
   * Search memory
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        memoryType: z.enum(["working", "episodic", "semantic"]).optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await memoryManager.searchMemory(
        ctx.user.id,
        input.query,
        input.memoryType,
        input.category
      );

      return results.map((r) => ({
        id: r.id,
        memoryType: r.memoryType,
        memoryId: r.memoryId,
        searchText: r.searchText,
        category: r.category,
        relevanceScore: r.relevanceScore,
      }));
    }),

  // MEMORY CONSOLIDATION

  /**
   * Consolidate memory from working to episodic to semantic
   */
  consolidate: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await memoryManager.consolidateMemory(ctx.user.id, input.taskId);

      return { success: true };
    }),

  /**
   * Cleanup expired working memory
   */
  cleanup: protectedProcedure.mutation(async () => {
    const count = await memoryManager.cleanupExpiredMemory();

    return { cleanedCount: count };
  }),
});
