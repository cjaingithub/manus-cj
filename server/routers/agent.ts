/**
 * Agent Router - tRPC procedures for task management
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, conversationHistory } from "../../drizzle/schema";
import { AgentLoop } from "../agent/agentLoop";
import { eq } from "drizzle-orm";

const agentInstances = new Map<number, AgentLoop>();

export const agentRouter = router({
  /**
   * Create a new task
   */
  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(tasks).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        status: "pending",
      });

      return {
        taskId: result[0].insertId,
        message: "Task created successfully",
      };
    }),

  /**
   * Get task details
   */
  getTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!result.length) throw new Error("Task not found");

      const task = result[0];
      if (task.userId !== ctx.user.id) throw new Error("Unauthorized");

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        currentPhase: task.currentPhase,
        plan: task.plan ? JSON.parse(task.plan) : null,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
      };
    }),

  /**
   * List user's tasks
   */
  listTasks: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "planning", "executing", "completed", "failed", "paused"]).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = input.status
        ? await db
            .select()
            .from(tasks)
            .where(eq(tasks.userId, ctx.user.id))
            .limit(input.limit)
            .offset(input.offset)
            .then((rows) => rows.filter((t) => t.status === input.status))
        : await db
            .select()
            .from(tasks)
            .where(eq(tasks.userId, ctx.user.id))
            .limit(input.limit)
            .offset(input.offset);

      return result.map((task: typeof tasks.$inferSelect) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        currentPhase: task.currentPhase,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      }));
    }),

  /**
   * Start task execution
   */
  startTask: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        userPrompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify task ownership
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!taskResult.length) throw new Error("Task not found");
      const task = taskResult[0];
      if (task.userId !== ctx.user.id) throw new Error("Unauthorized");

      // Initialize agent
      const agent = new AgentLoop();
      await agent.initialize(input.taskId, ctx.user.id, input.userPrompt);
      agentInstances.set(input.taskId, agent);

      // Update task status
      await db
        .update(tasks)
        .set({
          status: "planning",
          startedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId));

      // Add user message to conversation
      await db.insert(conversationHistory).values({
        taskId: input.taskId,
        role: "user",
        content: input.userPrompt,
      });

      return {
        taskId: input.taskId,
        status: "planning",
        message: "Task execution started",
      };
    }),

  /**
   * Execute next phase of task
   */
  executeNextPhase: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agent = agentInstances.get(input.taskId);
      if (!agent) throw new Error("Agent not initialized for this task");

      const context = agent.getContext();
      if (!context || context.userId !== ctx.user.id) throw new Error("Unauthorized");

      const success = await agent.executePhase();

      const updatedContext = agent.getContext();
      return {
        taskId: input.taskId,
        success,
        currentPhase: updatedContext?.currentPhase,
        executionLog: updatedContext?.executionLog,
      };
    }),

  /**
   * Get task conversation history
   */
  getConversation: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify task ownership
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!taskResult.length) throw new Error("Task not found");
      if (taskResult[0].userId !== ctx.user.id) throw new Error("Unauthorized");

      const result = await db
        .select()
        .from(conversationHistory)
        .where(eq(conversationHistory.taskId, input.taskId));

      return result.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      }));
    }),

  /**
   * Pause task execution
   */
  pauseTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify task ownership
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!taskResult.length) throw new Error("Task not found");
      if (taskResult[0].userId !== ctx.user.id) throw new Error("Unauthorized");

      await db
        .update(tasks)
        .set({ status: "paused" })
        .where(eq(tasks.id, input.taskId));

      return { taskId: input.taskId, status: "paused" };
    }),

  /**
   * Resume task execution
   */
  resumeTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify task ownership
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!taskResult.length) throw new Error("Task not found");
      if (taskResult[0].userId !== ctx.user.id) throw new Error("Unauthorized");

      // Reinitialize agent from checkpoint
      const task = taskResult[0];
      const agent = new AgentLoop();
      await agent.initialize(input.taskId, ctx.user.id, "");
      agentInstances.set(input.taskId, agent);

      await db
        .update(tasks)
        .set({ status: "executing" })
        .where(eq(tasks.id, input.taskId));

      return { taskId: input.taskId, status: "executing" };
    }),

  /**
   * Cancel task execution
   */
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify task ownership
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!taskResult.length) throw new Error("Task not found");
      if (taskResult[0].userId !== ctx.user.id) throw new Error("Unauthorized");

      agentInstances.delete(input.taskId);

      await db
        .update(tasks)
        .set({ status: "failed", error: "Task cancelled by user" })
        .where(eq(tasks.id, input.taskId));

      return { taskId: input.taskId, status: "failed" };
    }),
});
