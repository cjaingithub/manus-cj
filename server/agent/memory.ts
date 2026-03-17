/**
 * Memory Hierarchy System
 * Manages agent context with working memory, episodic memory, and semantic memory
 */

export interface MemoryEntry {
  id: string;
  type: "working" | "episodic" | "semantic";
  content: string;
  timestamp: Date;
  relevance: number; // 0-1, higher = more relevant
  metadata?: Record<string, unknown>;
}

export interface MemorySummary {
  workingMemory: MemoryEntry[];
  episodicMemory: MemoryEntry[];
  semanticMemory: MemoryEntry[];
  totalTokens: number;
}

export class MemoryHierarchy {
  private workingMemory: MemoryEntry[] = [];
  private episodicMemory: MemoryEntry[] = [];
  private semanticMemory: MemoryEntry[] = [];

  private maxWorkingMemory = 10; // Keep last 10 working memory items
  private maxEpisodicMemory = 50; // Keep last 50 episodic items
  private maxSemanticMemory = 100; // Keep last 100 semantic items
  private maxTokens = 50000; // Max tokens for context window

  /**
   * Add to working memory (current focus)
   */
  addToWorkingMemory(content: string, metadata?: Record<string, unknown>): string {
    const id = this.generateId();
    const entry: MemoryEntry = {
      id,
      type: "working",
      content,
      timestamp: new Date(),
      relevance: 1.0, // Working memory is always relevant
      metadata,
    };

    this.workingMemory.unshift(entry);

    // Trim if exceeds limit
    if (this.workingMemory.length > this.maxWorkingMemory) {
      const removed = this.workingMemory.pop();
      if (removed) {
        this.promoteToEpisodic(removed);
      }
    }

    return id;
  }

  /**
   * Add to episodic memory (events and experiences)
   */
  addToEpisodicMemory(content: string, metadata?: Record<string, unknown>): string {
    const id = this.generateId();
    const entry: MemoryEntry = {
      id,
      type: "episodic",
      content,
      timestamp: new Date(),
      relevance: 0.8,
      metadata,
    };

    this.episodicMemory.unshift(entry);

    // Trim if exceeds limit
    if (this.episodicMemory.length > this.maxEpisodicMemory) {
      const removed = this.episodicMemory.pop();
      if (removed) {
        this.promoteToSemantic(removed);
      }
    }

    return id;
  }

  /**
   * Add to semantic memory (facts and knowledge)
   */
  addToSemanticMemory(content: string, metadata?: Record<string, unknown>): string {
    const id = this.generateId();
    const entry: MemoryEntry = {
      id,
      type: "semantic",
      content,
      timestamp: new Date(),
      relevance: 0.6,
      metadata,
    };

    this.semanticMemory.unshift(entry);

    // Trim if exceeds limit
    if (this.semanticMemory.length > this.maxSemanticMemory) {
      this.semanticMemory.pop();
    }

    return id;
  }

  /**
   * Retrieve relevant memories based on query
   */
  retrieveRelevantMemories(query: string, limit: number = 10): MemoryEntry[] {
    const allMemories = [
      ...this.workingMemory.map((m) => ({ ...m, boost: 3 })),
      ...this.episodicMemory.map((m) => ({ ...m, boost: 2 })),
      ...this.semanticMemory.map((m) => ({ ...m, boost: 1 })),
    ];

    // Simple relevance scoring based on keyword matching
    const scored = allMemories.map((m) => ({
      ...m,
      score: this.calculateRelevance(m.content, query) * m.boost,
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ boost, score, ...m }) => m);
  }

  /**
   * Get memory summary for context window
   */
  getSummary(maxTokens?: number): MemorySummary {
    const tokenLimit = maxTokens || this.maxTokens;
    let totalTokens = 0;

    const summary: MemorySummary = {
      workingMemory: [],
      episodicMemory: [],
      semanticMemory: [],
      totalTokens: 0,
    };

    // Add working memory first (highest priority)
    for (const entry of this.workingMemory) {
      const tokens = this.estimateTokens(entry.content);
      if (totalTokens + tokens <= tokenLimit) {
        summary.workingMemory.push(entry);
        totalTokens += tokens;
      }
    }

    // Add episodic memory
    for (const entry of this.episodicMemory) {
      const tokens = this.estimateTokens(entry.content);
      if (totalTokens + tokens <= tokenLimit) {
        summary.episodicMemory.push(entry);
        totalTokens += tokens;
      }
    }

    // Add semantic memory
    for (const entry of this.semanticMemory) {
      const tokens = this.estimateTokens(entry.content);
      if (totalTokens + tokens <= tokenLimit) {
        summary.semanticMemory.push(entry);
        totalTokens += tokens;
      }
    }

    summary.totalTokens = totalTokens;
    return summary;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.workingMemory = [];
    this.episodicMemory = [];
    this.semanticMemory = [];
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      workingMemorySize: this.workingMemory.length,
      episodicMemorySize: this.episodicMemory.length,
      semanticMemorySize: this.semanticMemory.length,
      totalMemories: this.workingMemory.length + this.episodicMemory.length + this.semanticMemory.length,
      estimatedTokens: this.estimateTotalTokens(),
    };
  }

  /**
   * Promote working memory to episodic
   */
  private promoteToEpisodic(entry: MemoryEntry): void {
    const promoted: MemoryEntry = {
      ...entry,
      type: "episodic",
      relevance: Math.max(0.5, entry.relevance * 0.8), // Decay relevance
    };
    this.episodicMemory.unshift(promoted);
  }

  /**
   * Promote episodic memory to semantic
   */
  private promoteToSemantic(entry: MemoryEntry): void {
    const promoted: MemoryEntry = {
      ...entry,
      type: "semantic",
      relevance: Math.max(0.3, entry.relevance * 0.7), // Decay relevance
    };
    this.semanticMemory.unshift(promoted);
  }

  /**
   * Calculate relevance score (simple keyword matching)
   */
  private calculateRelevance(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);

    const matches = words.filter((word) => contentLower.includes(word)).length;
    return Math.min(1.0, matches / words.length);
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate total tokens across all memories
   */
  private estimateTotalTokens(): number {
    const allMemories = [...this.workingMemory, ...this.episodicMemory, ...this.semanticMemory];
    return allMemories.reduce((total, m) => total + this.estimateTokens(m.content), 0);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Task-specific memory context
 */
export class TaskMemoryContext {
  private memory: MemoryHierarchy;
  private taskId: number;

  constructor(taskId: number) {
    this.taskId = taskId;
    this.memory = new MemoryHierarchy();
  }

  /**
   * Add execution result to memory
   */
  recordExecution(toolName: string, params: Record<string, unknown>, result: unknown): void {
    const content = `Executed ${toolName}: ${JSON.stringify(params)} -> ${JSON.stringify(result)}`;
    this.memory.addToEpisodicMemory(content, { toolName, timestamp: new Date() });
  }

  /**
   * Add error to memory
   */
  recordError(toolName: string, error: Error): void {
    const content = `Error in ${toolName}: ${error.message}`;
    this.memory.addToEpisodicMemory(content, { toolName, error: error.message, timestamp: new Date() });
  }

  /**
   * Add thought/reasoning to memory
   */
  recordThought(thought: string): void {
    this.memory.addToWorkingMemory(thought);
  }

  /**
   * Add learned fact to memory
   */
  recordFact(fact: string): void {
    this.memory.addToSemanticMemory(fact);
  }

  /**
   * Get context for LLM
   */
  getContextForLLM(maxTokens?: number): string {
    const summary = this.memory.getSummary(maxTokens);

    let context = `## Task Memory Context (Task #${this.taskId})\n\n`;

    if (summary.workingMemory.length > 0) {
      context += `### Current Focus\n${summary.workingMemory.map((m) => `- ${m.content}`).join("\n")}\n\n`;
    }

    if (summary.episodicMemory.length > 0) {
      context += `### Recent Events\n${summary.episodicMemory.slice(0, 5)
        .map((m) => `- ${m.content}`)
        .join("\n")}\n\n`;
    }

    if (summary.semanticMemory.length > 0) {
      context += `### Known Facts\n${summary.semanticMemory.slice(0, 5)
        .map((m) => `- ${m.content}`)
        .join("\n")}\n\n`;
    }

    context += `\n*Total context tokens: ${summary.totalTokens}*`;

    return context;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return this.memory.getStats();
  }

  /**
   * Clear memory
   */
  clear(): void {
    this.memory.clear();
  }
}
