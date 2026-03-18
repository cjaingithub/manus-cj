import { getDb } from "../db";
import {
  workingMemory,
  episodicMemory,
  semanticMemory,
  memoryIndex,
  WorkingMemory,
  EpisodicMemory,
  SemanticMemory,
  MemoryIndex,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, like } from "drizzle-orm";

/**
 * Memory Manager Service
 * Handles the three-tier memory hierarchy: working, episodic, and semantic
 */
export class MemoryManager {
  /**
   * WORKING MEMORY - Short-term context for current task
   */

  async createWorkingMemory(
    userId: number,
    taskId: number,
    data: {
      currentGoal?: string;
      currentPhase?: string;
      activeTools?: string[];
      recentResults?: Record<string, unknown>;
      contextWindow?: unknown[];
      expiresAt?: Date;
    }
  ): Promise<WorkingMemory | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(workingMemory).values({
      userId,
      taskId,
      currentGoal: data.currentGoal,
      currentPhase: data.currentPhase,
      activeTools: data.activeTools ? JSON.stringify(data.activeTools) : null,
      recentResults: data.recentResults ? JSON.stringify(data.recentResults) : null,
      contextWindow: data.contextWindow ? JSON.stringify(data.contextWindow) : null,
      expiresAt: data.expiresAt,
    });

    return this.getWorkingMemory(taskId);
  }

  async getWorkingMemory(taskId: number): Promise<WorkingMemory | null> {
    const db = await getDb();
    if (!db) return null;

    const [memory] = await db.select().from(workingMemory).where(eq(workingMemory.taskId, taskId));

    return memory || null;
  }

  async updateWorkingMemory(
    taskId: number,
    data: Partial<{
      currentGoal: string;
      currentPhase: string;
      activeTools: string[];
      recentResults: Record<string, unknown>;
      contextWindow: unknown[];
    }>
  ): Promise<WorkingMemory | null> {
    const db = await getDb();
    if (!db) return null;

    const updateData: Record<string, unknown> = {};
    if (data.currentGoal) updateData.currentGoal = data.currentGoal;
    if (data.currentPhase) updateData.currentPhase = data.currentPhase;
    if (data.activeTools) updateData.activeTools = JSON.stringify(data.activeTools);
    if (data.recentResults) updateData.recentResults = JSON.stringify(data.recentResults);
    if (data.contextWindow) updateData.contextWindow = JSON.stringify(data.contextWindow);

    await db.update(workingMemory).set(updateData).where(eq(workingMemory.taskId, taskId));

    return this.getWorkingMemory(taskId);
  }

  async clearWorkingMemory(taskId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.delete(workingMemory).where(eq(workingMemory.taskId, taskId));
  }

  /**
   * EPISODIC MEMORY - Task-specific events and execution history
   */

  async recordEvent(
    userId: number,
    taskId: number | null,
    event: {
      eventType: string;
      description: string;
      outcome?: string;
      details?: Record<string, unknown>;
      duration?: number;
      relatedTaskIds?: number[];
      tags?: string[];
      importance?: "low" | "normal" | "high" | "critical";
    }
  ): Promise<EpisodicMemory | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(episodicMemory).values({
      userId,
      taskId,
      eventType: event.eventType,
      description: event.description,
      outcome: event.outcome,
      details: event.details ? JSON.stringify(event.details) : null,
      duration: event.duration,
      relatedTaskIds: event.relatedTaskIds ? JSON.stringify(event.relatedTaskIds) : null,
      tags: event.tags ? JSON.stringify(event.tags) : null,
      importance: event.importance || "normal",
    });

    // Get the inserted event
    const [inserted] = await db
      .select()
      .from(episodicMemory)
      .where(and(eq(episodicMemory.userId, userId), eq(episodicMemory.eventType, event.eventType)))
      .orderBy(desc(episodicMemory.createdAt))
      .limit(1);

    if (inserted) {
      // Index the event for faster retrieval
      await this.indexMemory(userId, "episodic", inserted.id, event.description, event.eventType);
    }

    return inserted || null;
  }

  async getTaskEvents(taskId: number, limit = 50): Promise<EpisodicMemory[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(episodicMemory)
      .where(eq(episodicMemory.taskId, taskId))
      .orderBy(desc(episodicMemory.createdAt))
      .limit(limit);
  }

  async getUserEvents(userId: number, limit = 100): Promise<EpisodicMemory[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(episodicMemory)
      .where(eq(episodicMemory.userId, userId))
      .orderBy(desc(episodicMemory.createdAt))
      .limit(limit);
  }

  /**
   * SEMANTIC MEMORY - General knowledge and learned patterns
   */

  async storeKnowledge(
    userId: number,
    knowledge: {
      category: string;
      key: string;
      content: string;
      description?: string;
      confidence?: number;
      tags?: string[];
      relatedKeys?: string[];
    }
  ): Promise<SemanticMemory | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(semanticMemory).values({
      userId,
      category: knowledge.category,
      key: knowledge.key,
      content: knowledge.content,
      description: knowledge.description,
      confidence: knowledge.confidence || 50,
      tags: knowledge.tags ? JSON.stringify(knowledge.tags) : null,
      relatedKeys: knowledge.relatedKeys ? JSON.stringify(knowledge.relatedKeys) : null,
    });

    // Get the inserted knowledge
    const [inserted] = await db
      .select()
      .from(semanticMemory)
      .where(and(eq(semanticMemory.userId, userId), eq(semanticMemory.key, knowledge.key)))
      .orderBy(desc(semanticMemory.createdAt))
      .limit(1);

    if (inserted) {
      // Index the knowledge for faster retrieval
      await this.indexMemory(userId, "semantic", inserted.id, knowledge.content, knowledge.category);
    }

    return inserted || null;
  }

  async getKnowledge(userId: number, category: string): Promise<SemanticMemory[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(semanticMemory)
      .where(and(eq(semanticMemory.userId, userId), eq(semanticMemory.category, category)))
      .orderBy(desc(semanticMemory.confidence));
  }

  async updateKnowledgeUsage(memoryId: number, success: boolean): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const [memory] = await db.select().from(semanticMemory).where(eq(semanticMemory.id, memoryId));

    if (memory) {
      const newUsageCount = memory.usageCount + 1;
      const newSuccessRate = success
        ? Math.round(((memory.successRate * memory.usageCount + 100) / newUsageCount) * 100) / 100
        : Math.round(((memory.successRate * memory.usageCount) / newUsageCount) * 100) / 100;

      await db
        .update(semanticMemory)
        .set({
          usageCount: newUsageCount,
          successRate: newSuccessRate,
          lastUsedAt: new Date(),
        })
        .where(eq(semanticMemory.id, memoryId));
    }
  }

  /**
   * MEMORY RETRIEVAL - Fast lookup and search
   */

  async indexMemory(
    userId: number,
    memoryType: "working" | "episodic" | "semantic",
    memoryId: number,
    searchText: string,
    category: string
  ): Promise<MemoryIndex | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(memoryIndex).values({
      userId,
      memoryType,
      memoryId,
      searchText,
      category,
      relevanceScore: 50,
    });

    // Get the inserted index
    const [inserted] = await db
      .select()
      .from(memoryIndex)
      .where(and(eq(memoryIndex.userId, userId), eq(memoryIndex.memoryId, memoryId)))
      .orderBy(desc(memoryIndex.createdAt))
      .limit(1);

    return inserted || null;
  }

  async searchMemory(
    userId: number,
    query: string,
    memoryType?: "working" | "episodic" | "semantic",
    category?: string
  ): Promise<MemoryIndex[]> {
    const db = await getDb();
    if (!db) return [];

    const conditions = [eq(memoryIndex.userId, userId), like(memoryIndex.searchText, `%${query}%`)];

    if (memoryType) {
      conditions.push(eq(memoryIndex.memoryType, memoryType));
    }

    if (category) {
      conditions.push(eq(memoryIndex.category, category));
    }

    return db
      .select()
      .from(memoryIndex)
      .where(and(...conditions))
      .orderBy(desc(memoryIndex.relevanceScore))
      .limit(50);
  }

  /**
   * MEMORY CONSOLIDATION - Move from working to episodic to semantic
   */

  async consolidateMemory(userId: number, taskId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Get working memory for this task
    const [working] = await db
      .select()
      .from(workingMemory)
      .where(eq(workingMemory.taskId, taskId));

    if (working) {
      // Convert working memory to episodic event
      await this.recordEvent(userId, taskId, {
        eventType: "memory_consolidation",
        description: `Consolidated working memory from task ${taskId}`,
        details: {
          goal: working.currentGoal,
          phase: working.currentPhase,
          tools: working.activeTools,
        },
        importance: "normal",
      });

      // Clear working memory
      await this.clearWorkingMemory(taskId);
    }

    // Get recent episodic events and extract patterns for semantic memory
    const events = await this.getTaskEvents(taskId, 10);

    if (events.length > 0) {
      // Extract common patterns
      const successfulEvents = events.filter((e) => e.outcome === "success");

      if (successfulEvents.length > 2) {
        // Store pattern as semantic knowledge
        const pattern = {
          category: "task_pattern",
          key: `pattern_task_${taskId}`,
          content: `Successfully completed task type with ${successfulEvents.length} successful events`,
          description: `Pattern learned from task ${taskId}`,
          confidence: Math.min(100, 50 + successfulEvents.length * 10),
          tags: ["learned", "task_pattern"],
        };

        await this.storeKnowledge(userId, pattern);
      }
    }
  }

  /**
   * MEMORY CLEANUP - Remove expired working memory
   */

  async cleanupExpiredMemory(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    await db.delete(workingMemory).where(lte(workingMemory.expiresAt, new Date()));

    return 0;
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
