/**
 * Task Scheduler
 * Handles scheduled task execution, cron jobs, and background processing
 */

import { CronJob } from "cron";

export interface ScheduledTask {
  id: string;
  taskId: number;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ScheduleOptions {
  cronExpression: string;
  timezone?: string;
  runOnInit?: boolean;
  onTick: () => Promise<void>;
  onError?: (error: Error) => void;
}

export class TaskScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private executionHistory: Array<{
    taskId: string;
    timestamp: Date;
    success: boolean;
    duration: number;
    error?: string;
  }> = [];
  private maxHistorySize = 1000;

  /**
   * Schedule a task with cron expression
   */
  scheduleTask(options: ScheduleOptions): string {
    const taskId = this.generateId();

    try {
      const job = new CronJob(
        options.cronExpression,
        async () => {
          const startTime = Date.now();
          try {
            await options.onTick();
            this.recordExecution(taskId, true, Date.now() - startTime);
          } catch (error) {
            const err = error as Error;
            this.recordExecution(taskId, false, Date.now() - startTime, err.message);
            if (options.onError) {
              options.onError(err);
            }
          }
        },
        null,
        true, // Start the job immediately
        options.timezone || "UTC"
      );

      this.jobs.set(taskId, job);

      const scheduledTask: ScheduledTask = {
        id: taskId,
        taskId: parseInt(taskId),
        schedule: options.cronExpression,
        enabled: true,
        createdAt: new Date(),
        nextRun: (job.nextDate() as any).toJSDate?.() || new Date(),
      };

      this.scheduledTasks.set(taskId, scheduledTask);

      console.log(`[Scheduler] Task ${taskId} scheduled: ${options.cronExpression}`);
      return taskId;
    } catch (error) {
      throw new Error(`Failed to schedule task: ${(error as Error).message}`);
    }
  }

  /**
   * Schedule a task to run once at a specific time
   */
  scheduleOnce(delay: number, onTick: () => Promise<void>): string {
    const taskId = this.generateId();

    const timeout = setTimeout(async () => {
      const startTime = Date.now();
      try {
        await onTick();
        this.recordExecution(taskId, true, Date.now() - startTime);
      } catch (error) {
        const err = error as Error;
        this.recordExecution(taskId, false, Date.now() - startTime, err.message);
      }
      this.jobs.delete(taskId);
      this.scheduledTasks.delete(taskId);
    }, delay);

    // Store timeout as a dummy job for tracking
    (timeout as any).stop = () => clearTimeout(timeout);

    this.jobs.set(taskId, timeout as any);

    const scheduledTask: ScheduledTask = {
      id: taskId,
      taskId: parseInt(taskId),
      schedule: `once after ${delay}ms`,
      enabled: true,
      createdAt: new Date(),
      nextRun: new Date(Date.now() + delay),
    };

    this.scheduledTasks.set(taskId, scheduledTask);

    return taskId;
  }

  /**
   * Schedule a recurring task with interval
   */
  scheduleInterval(interval: number, onTick: () => Promise<void>): string {
    const taskId = this.generateId();

    const intervalId = setInterval(async () => {
      const startTime = Date.now();
      try {
        await onTick();
        this.recordExecution(taskId, true, Date.now() - startTime);
      } catch (error) {
        const err = error as Error;
        this.recordExecution(taskId, false, Date.now() - startTime, err.message);
      }
    }, interval);

    // Store interval as a dummy job for tracking
    (intervalId as any).stop = () => clearInterval(intervalId);

    this.jobs.set(taskId, intervalId as any);

    const scheduledTask: ScheduledTask = {
      id: taskId,
      taskId: parseInt(taskId),
      schedule: `every ${interval}ms`,
      enabled: true,
      createdAt: new Date(),
      nextRun: new Date(Date.now() + interval),
    };

    this.scheduledTasks.set(taskId, scheduledTask);

    return taskId;
  }

  /**
   * Pause a scheduled task
   */
  pauseTask(taskId: string): void {
    const job = this.jobs.get(taskId) as any;
    if (job && job instanceof CronJob) {
      job.stop();
    }

    const task = this.scheduledTasks.get(taskId);
    if (task) {
      task.enabled = false;
    }

    console.log(`[Scheduler] Task ${taskId} paused`);
  }

  /**
   * Resume a scheduled task
   */
  resumeTask(taskId: string): void {
    const job = this.jobs.get(taskId) as any;
    if (job && job instanceof CronJob) {
      job.start();
    }

    const task = this.scheduledTasks.get(taskId);
    if (task) {
      task.enabled = true;
      task.nextRun =
        job instanceof CronJob ? ((job.nextDate() as any).toJSDate?.() || new Date()) : undefined;
    }

    console.log(`[Scheduler] Task ${taskId} resumed`);
  }

  /**
   * Cancel a scheduled task
   */
  cancelTask(taskId: string): void {
    const job = this.jobs.get(taskId) as any;

    if (job) {
      if (job instanceof CronJob) {
        job.stop();
      } else if (job.stop) {
        job.stop();
      }
      this.jobs.delete(taskId);
    }

    this.scheduledTasks.delete(taskId);
    console.log(`[Scheduler] Task ${taskId} cancelled`);
  }

  /**
   * Get task details
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }

  /**
   * List all scheduled tasks
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Get execution history for a task
   */
  getExecutionHistory(taskId: string, limit: number = 10) {
    return this.executionHistory
      .filter((h) => h.taskId === taskId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const tasks = Array.from(this.scheduledTasks.values());
    const enabledTasks = tasks.filter((t) => t.enabled).length;
    const disabledTasks = tasks.filter((t) => !t.enabled).length;

    const successfulExecutions = this.executionHistory.filter((h) => h.success).length;
    const failedExecutions = this.executionHistory.filter((h) => !h.success).length;
    const avgDuration =
      this.executionHistory.length > 0
        ? this.executionHistory.reduce((sum, h) => sum + h.duration, 0) / this.executionHistory.length
        : 0;

    return {
      totalTasks: tasks.length,
      enabledTasks,
      disabledTasks,
      totalExecutions: this.executionHistory.length,
      successfulExecutions,
      failedExecutions,
      successRate:
        this.executionHistory.length > 0
          ? ((successfulExecutions / this.executionHistory.length) * 100).toFixed(1)
          : "N/A",
      averageDuration: avgDuration.toFixed(2),
    };
  }

  /**
   * Record task execution
   */
  private recordExecution(taskId: string, success: boolean, duration: number, error?: string): void {
    this.executionHistory.push({
      taskId,
      timestamp: new Date(),
      success,
      duration,
      error,
    });

    // Trim history if exceeds max size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }

    // Update last run
    const task = this.scheduledTasks.get(taskId);
    if (task) {
      task.lastRun = new Date();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    this.jobs.forEach((job: any) => {
      if (job instanceof CronJob) {
        job.stop();
      } else if (job.stop) {
        job.stop();
      }
    });
    this.jobs.clear();
    this.scheduledTasks.clear();
    console.log("[Scheduler] All tasks stopped");
  }
}

// Export singleton instance
export const globalScheduler = new TaskScheduler();
