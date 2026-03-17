/**
 * Tool Registry System
 * Manages available tools and their execution with error handling and retry logic
 */

import { ToolCall, ToolResult } from "./types";

export interface ToolMetadata {
  name: string;
  description: string;
  capabilities: string[];
  maxRetries: number;
  defaultTimeout: number; // milliseconds
  fallbackTools?: string[];
}

export interface Tool {
  metadata: ToolMetadata;
  execute(params: Record<string, unknown>): Promise<unknown>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private executionHistory: Map<string, ToolResult[]> = new Map();

  /**
   * Register a new tool in the registry
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.metadata.name, tool);
    this.executionHistory.set(tool.metadata.name, []);
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(toolName: string): ToolMetadata | undefined {
    return this.tools.get(toolName)?.metadata;
  }

  /**
   * List all available tools
   */
  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  /**
   * Execute a tool with retry logic and error handling
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolCall.toolName}`,
        duration: 0,
        timestamp: new Date(),
      };
    }

    const maxRetries = toolCall.timeout || tool.metadata.maxRetries;
    const timeout = toolCall.timeout || tool.metadata.defaultTimeout;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Execute with timeout
        const output = await Promise.race([
          tool.execute(toolCall.params),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tool execution timeout")), timeout)
          ),
        ]);

        const duration = Date.now() - startTime;
        const result: ToolResult = {
          success: true,
          output,
          duration,
          timestamp: new Date(),
        };

        this.recordExecution(toolCall.toolName, result);
        return result;
      } catch (error) {
        const duration = Date.now() - Date.now();
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If this is the last attempt, try fallback tools
        if (attempt === maxRetries) {
          const fallbackResult = await this.tryFallbackTools(toolCall, tool.metadata);
          if (fallbackResult) {
            return fallbackResult;
          }

          const result: ToolResult = {
            success: false,
            error: errorMessage,
            duration,
            timestamp: new Date(),
          };
          this.recordExecution(toolCall.toolName, result);
          return result;
        }

        // Exponential backoff before retry
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return {
      success: false,
      error: "Tool execution failed after all retries",
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Try fallback tools if primary tool fails
   */
  private async tryFallbackTools(
    toolCall: ToolCall,
    metadata: ToolMetadata
  ): Promise<ToolResult | null> {
    if (!metadata.fallbackTools || metadata.fallbackTools.length === 0) {
      return null;
    }

    for (const fallbackName of metadata.fallbackTools) {
      const fallbackTool = this.tools.get(fallbackName);
      if (!fallbackTool) continue;

      try {
        const output = await fallbackTool.execute(toolCall.params);
        const result: ToolResult = {
          success: true,
          output,
          duration: 0,
          timestamp: new Date(),
        };
        this.recordExecution(fallbackName, result);
        return result;
      } catch {
        // Continue to next fallback
        continue;
      }
    }

    return null;
  }

  /**
   * Record tool execution for analytics
   */
  private recordExecution(toolName: string, result: ToolResult): void {
    const history = this.executionHistory.get(toolName) || [];
    history.push(result);
    this.executionHistory.set(toolName, history);
  }

  /**
   * Get execution history for a tool
   */
  getExecutionHistory(toolName: string): ToolResult[] {
    return this.executionHistory.get(toolName) || [];
  }

  /**
   * Get statistics for a tool
   */
  getToolStats(toolName: string) {
    const history = this.getExecutionHistory(toolName);
    if (history.length === 0) {
      return {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDuration: 0,
      };
    }

    const successCount = history.filter((r) => r.success).length;
    const avgDuration = history.reduce((sum, r) => sum + r.duration, 0) / history.length;

    return {
      totalExecutions: history.length,
      successCount,
      failureCount: history.length - successCount,
      successRate: (successCount / history.length) * 100,
      avgDuration,
    };
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
