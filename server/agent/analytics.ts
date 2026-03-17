/**
 * Task Analytics & Monitoring
 * Tracks metrics and provides insights into agent performance
 */

export interface TaskMetrics {
  taskId: number;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // milliseconds
  status: "pending" | "planning" | "executing" | "completed" | "failed" | "paused";
  phasesCompleted: number;
  totalPhases: number;
  toolExecutions: number;
  successfulToolExecutions: number;
  failedToolExecutions: number;
  retries: number;
  errors: Array<{
    timestamp: Date;
    tool: string;
    message: string;
    recovered: boolean;
  }>;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

export interface PerformanceMetrics {
  averagePhaseTime: number;
  averageToolExecutionTime: number;
  toolSuccessRate: number;
  errorRecoveryRate: number;
  estimatedCost: number;
}

export class TaskAnalytics {
  private metrics: TaskMetrics;
  private phaseTimings: Array<{ phase: string; duration: number }> = [];
  private toolExecutionTimings: Array<{ tool: string; duration: number }> = [];

  constructor(taskId: number) {
    this.metrics = {
      taskId,
      startTime: new Date(),
      status: "pending",
      phasesCompleted: 0,
      totalPhases: 0,
      toolExecutions: 0,
      successfulToolExecutions: 0,
      failedToolExecutions: 0,
      retries: 0,
      errors: [],
      tokenUsage: {
        input: 0,
        output: 0,
        total: 0,
      },
    };
  }

  /**
   * Record phase completion
   */
  recordPhaseCompletion(phaseName: string, duration: number): void {
    this.metrics.phasesCompleted++;
    this.phaseTimings.push({ phase: phaseName, duration });
  }

  /**
   * Record tool execution
   */
  recordToolExecution(
    toolName: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    this.metrics.toolExecutions++;
    this.toolExecutionTimings.push({ tool: toolName, duration });

    if (success) {
      this.metrics.successfulToolExecutions++;
    } else {
      this.metrics.failedToolExecutions++;
      if (error) {
        this.metrics.errors.push({
          timestamp: new Date(),
          tool: toolName,
          message: error.message,
          recovered: false, // Will be updated if recovered
        });
      }
    }
  }

  /**
   * Record error recovery
   */
  recordErrorRecovery(toolName: string): void {
    this.metrics.retries++;
    // Mark last error as recovered
    const lastError = this.metrics.errors.find((e) => e.tool === toolName);
    if (lastError) {
      lastError.recovered = true;
    }
  }

  /**
   * Update token usage
   */
  updateTokenUsage(input: number, output: number): void {
    this.metrics.tokenUsage.input += input;
    this.metrics.tokenUsage.output += output;
    this.metrics.tokenUsage.total = this.metrics.tokenUsage.input + this.metrics.tokenUsage.output;
  }

  /**
   * Mark task as completed
   */
  markCompleted(): void {
    this.metrics.status = "completed";
    this.metrics.endTime = new Date();
    this.metrics.totalDuration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
  }

  /**
   * Mark task as failed
   */
  markFailed(error: Error): void {
    this.metrics.status = "failed";
    this.metrics.endTime = new Date();
    this.metrics.totalDuration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    this.metrics.errors.push({
      timestamp: new Date(),
      tool: "system",
      message: error.message,
      recovered: false,
    });
  }

  /**
   * Update task status
   */
  updateStatus(status: TaskMetrics["status"]): void {
    this.metrics.status = status;
  }

  /**
   * Set total phases
   */
  setTotalPhases(total: number): void {
    this.metrics.totalPhases = total;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TaskMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgPhaseTime =
      this.phaseTimings.length > 0
        ? this.phaseTimings.reduce((sum, p) => sum + p.duration, 0) / this.phaseTimings.length
        : 0;

    const avgToolTime =
      this.toolExecutionTimings.length > 0
        ? this.toolExecutionTimings.reduce((sum, t) => sum + t.duration, 0) / this.toolExecutionTimings.length
        : 0;

    const toolSuccessRate =
      this.metrics.toolExecutions > 0
        ? (this.metrics.successfulToolExecutions / this.metrics.toolExecutions) * 100
        : 0;

    const recoveredErrors = this.metrics.errors.filter((e) => e.recovered).length;
    const errorRecoveryRate =
      this.metrics.errors.length > 0 ? (recoveredErrors / this.metrics.errors.length) * 100 : 0;

    // Estimate cost: $0.01 per 1M input tokens, $0.03 per 1M output tokens
    const estimatedCost =
      (this.metrics.tokenUsage.input / 1000000) * 0.01 +
      (this.metrics.tokenUsage.output / 1000000) * 0.03;

    return {
      averagePhaseTime: avgPhaseTime,
      averageToolExecutionTime: avgToolTime,
      toolSuccessRate,
      errorRecoveryRate,
      estimatedCost,
    };
  }

  /**
   * Get summary report
   */
  getSummaryReport(): string {
    const metrics = this.metrics;
    const performance = this.getPerformanceMetrics();

    const duration = metrics.totalDuration
      ? `${(metrics.totalDuration / 1000).toFixed(2)}s`
      : "In progress";

    const report = `
## Task Analytics Report

**Task ID:** ${metrics.taskId}
**Status:** ${metrics.status}
**Duration:** ${duration}
**Start Time:** ${metrics.startTime.toISOString()}
${metrics.endTime ? `**End Time:** ${metrics.endTime.toISOString()}` : ""}

### Execution Summary
- **Phases Completed:** ${metrics.phasesCompleted}/${metrics.totalPhases}
- **Tool Executions:** ${metrics.toolExecutions}
- **Successful:** ${metrics.successfulToolExecutions}
- **Failed:** ${metrics.failedToolExecutions}
- **Retries:** ${metrics.retries}

### Performance Metrics
- **Avg Phase Time:** ${performance.averagePhaseTime.toFixed(2)}ms
- **Avg Tool Execution Time:** ${performance.averageToolExecutionTime.toFixed(2)}ms
- **Tool Success Rate:** ${performance.toolSuccessRate.toFixed(1)}%
- **Error Recovery Rate:** ${performance.errorRecoveryRate.toFixed(1)}%

### Token Usage
- **Input Tokens:** ${metrics.tokenUsage.input.toLocaleString()}
- **Output Tokens:** ${metrics.tokenUsage.output.toLocaleString()}
- **Total Tokens:** ${metrics.tokenUsage.total.toLocaleString()}
- **Estimated Cost:** $${performance.estimatedCost.toFixed(4)}

${
  metrics.errors.length > 0
    ? `### Errors (${metrics.errors.length})
${metrics.errors
  .map(
    (e) =>
      `- **${e.tool}** (${e.timestamp.toISOString()}): ${e.message}${e.recovered ? " [RECOVERED]" : ""}`
  )
  .join("\n")}`
    : ""
}
    `.trim();

    return report;
  }

  /**
   * Export metrics as JSON
   */
  exportJSON() {
    return {
      metrics: this.metrics,
      performance: this.getPerformanceMetrics(),
      phaseTimings: this.phaseTimings,
      toolTimings: this.toolExecutionTimings,
    };
  }
}

/**
 * Global analytics aggregator
 */
export class AnalyticsAggregator {
  private taskAnalytics: Map<number, TaskAnalytics> = new Map();

  /**
   * Get or create analytics for task
   */
  getTaskAnalytics(taskId: number): TaskAnalytics {
    if (!this.taskAnalytics.has(taskId)) {
      this.taskAnalytics.set(taskId, new TaskAnalytics(taskId));
    }
    return this.taskAnalytics.get(taskId)!;
  }

  /**
   * Get aggregate statistics
   */
  getAggregateStats() {
    const allMetrics = Array.from(this.taskAnalytics.values()).map((a) => a.getMetrics());

    const completedTasks = allMetrics.filter((m) => m.status === "completed").length;
    const failedTasks = allMetrics.filter((m) => m.status === "failed").length;
    const totalDuration = allMetrics.reduce((sum, m) => sum + (m.totalDuration || 0), 0);
    const totalTokens = allMetrics.reduce((sum, m) => sum + m.tokenUsage.total, 0);
    const totalCost = allMetrics.reduce((sum, m) => {
      const perf = this.taskAnalytics.get(m.taskId)?.getPerformanceMetrics();
      return sum + (perf?.estimatedCost || 0);
    }, 0);

    return {
      totalTasks: this.taskAnalytics.size,
      completedTasks,
      failedTasks,
      successRate: ((completedTasks / this.taskAnalytics.size) * 100).toFixed(1),
      totalDuration,
      averageDuration: totalDuration / this.taskAnalytics.size,
      totalTokens,
      totalCost: totalCost.toFixed(4),
    };
  }

  /**
   * Clear analytics
   */
  clear(): void {
    this.taskAnalytics.clear();
  }
}
