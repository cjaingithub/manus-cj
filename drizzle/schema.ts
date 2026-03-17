import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tasks table - Represents agent execution tasks
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "planning", "executing", "completed", "failed", "paused"]).default("pending").notNull(),
  currentPhase: varchar("currentPhase", { length: 64 }),
  plan: text("plan"), // JSON string containing task plan
  executionLog: text("executionLog"), // JSON array of execution events
  result: text("result"), // Final result/output
  error: text("error"), // Error message if failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Checkpoints table - Stores task state snapshots for recovery
 */
export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id),
  phase: varchar("phase", { length: 64 }).notNull(),
  state: text("state").notNull(), // JSON string of complete state
  stepIndex: int("stepIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;

/**
 * Tool executions table - Logs all tool invocations
 */
export const toolExecutions = mysqlTable("toolExecutions", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id),
  toolName: varchar("toolName", { length: 64 }).notNull(),
  params: text("params"), // JSON string of parameters
  result: text("result"), // JSON string of result
  error: text("error"),
  duration: int("duration"), // milliseconds
  status: mysqlEnum("status", ["pending", "running", "success", "failed", "timeout"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = typeof toolExecutions.$inferInsert;

/**
 * Conversation history table - Stores agent-user interactions
 */
export const conversationHistory = mysqlTable("conversationHistory", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id),
  role: mysqlEnum("role", ["user", "assistant", "system", "tool"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversationMessage = typeof conversationHistory.$inferSelect;
export type InsertConversationMessage = typeof conversationHistory.$inferInsert;