import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Webhooks table - Stores webhook configurations
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  url: varchar("url", { length: 2048 }).notNull(),
  secret: text("secret"), // HMAC secret for signing
  events: text("events").notNull(), // JSON array of event types
  filters: text("filters"), // JSON object for filtering
  retryPolicy: text("retryPolicy"), // JSON object with retry config
  isActive: boolean("isActive").default(true).notNull(),
  lastDeliveryAt: timestamp("lastDeliveryAt"),
  successCount: int("successCount").default(0).notNull(),
  failureCount: int("failureCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook deliveries table - Logs webhook delivery attempts
 */
export const webhookDeliveries = mysqlTable("webhookDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull().references(() => webhooks.id),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  eventData: text("eventData").notNull(), // JSON payload
  status: mysqlEnum("status", ["pending", "success", "failed", "retrying"]).default("pending").notNull(),
  httpStatus: int("httpStatus"),
  responseBody: text("responseBody"),
  error: text("error"),
  attemptCount: int("attemptCount").default(0).notNull(),
  nextRetryAt: timestamp("nextRetryAt"),
  duration: int("duration"), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

/**
 * Task templates table - Pre-built task patterns for common use cases
 */
export const taskTemplates = mysqlTable("taskTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id), // null = system template
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(), // e.g., "web-scraping", "data-analysis", "report-generation"
  icon: varchar("icon", { length: 64 }), // icon name for UI
  taskTemplate: text("taskTemplate").notNull(), // JSON with title, description, plan template
  parameters: text("parameters"), // JSON schema for template parameters
  exampleOutput: text("exampleOutput"), // JSON example of expected output
  usageCount: int("usageCount").default(0).notNull(),
  rating: int("rating").default(0).notNull(), // average rating 0-5
  tags: text("tags"), // JSON array of tags
  isPublic: boolean("isPublic").default(false).notNull(), // system templates are public
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = typeof taskTemplates.$inferInsert;

/**
 * Template usage logs - Track which templates are used
 */
export const templateUsageLogs = mysqlTable("templateUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull().references(() => taskTemplates.id),
  taskId: int("taskId").notNull().references(() => tasks.id),
  userId: int("userId").notNull().references(() => users.id),
  executionTime: int("executionTime"), // milliseconds
  success: boolean("success").notNull(),
  feedback: text("feedback"), // JSON with user feedback
  rating: int("rating"), // 1-5 star rating
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateUsageLog = typeof templateUsageLogs.$inferSelect;
export type InsertTemplateUsageLog = typeof templateUsageLogs.$inferInsert;

/**
 * Token usage tracking table - Monitor LLM token consumption and costs
 */
export const tokenUsageLogs = mysqlTable("tokenUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").references(() => tasks.id),
  userId: int("userId").notNull().references(() => users.id),
  model: varchar("model", { length: 128 }).notNull(), // e.g., "openrouter/hunter-alpha", "gpt-4"
  promptTokens: int("promptTokens").notNull(),
  completionTokens: int("completionTokens").notNull(),
  totalTokens: int("totalTokens").notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 8 }).notNull(), // USD cost
  finishReason: varchar("finishReason", { length: 64 }), // "stop", "length", "content_filter", etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TokenUsageLog = typeof tokenUsageLogs.$inferSelect;
export type InsertTokenUsageLog = typeof tokenUsageLogs.$inferInsert;

/**
 * Notifications table - Stores user notifications for task events and system alerts
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  taskId: int("taskId").references(() => tasks.id), // null for system notifications
  type: mysqlEnum("type", ["task_started", "task_completed", "task_failed", "task_paused", "system_alert", "info"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("actionUrl", { length: 2048 }), // URL to navigate to when clicked
  isRead: boolean("isRead").default(false).notNull(),
  isDismissed: boolean("isDismissed").default(false).notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
  dismissedAt: timestamp("dismissedAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification Preferences table - User notification settings
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Notification type toggles
  taskStartedEnabled: boolean("taskStartedEnabled").default(true).notNull(),
  taskCompletedEnabled: boolean("taskCompletedEnabled").default(true).notNull(),
  taskFailedEnabled: boolean("taskFailedEnabled").default(true).notNull(),
  taskPausedEnabled: boolean("taskPausedEnabled").default(true).notNull(),
  systemAlertEnabled: boolean("systemAlertEnabled").default(true).notNull(),
  // Quiet hours (in 24-hour format, e.g., "22:00" to "08:00")
  quietHoursEnabled: boolean("quietHoursEnabled").default(false).notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }), // HH:MM format
  // Email digest preferences
  emailDigestEnabled: boolean("emailDigestEnabled").default(false).notNull(),
  emailDigestFrequency: mysqlEnum("emailDigestFrequency", ["daily", "weekly", "never"]).default("never").notNull(),
  // Push notification preferences
  pushNotificationsEnabled: boolean("pushNotificationsEnabled").default(true).notNull(),
  // Do not disturb mode
  doNotDisturbEnabled: boolean("doNotDisturbEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Task Retry History table - Tracks retry attempts for tasks
 */
export const taskRetryHistory = mysqlTable("taskRetryHistory", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id),
  attemptNumber: int("attemptNumber").notNull(),
  success: boolean("success").notNull(),
  error: text("error"), // Error message if attempt failed
  delayMs: int("delayMs"), // Delay before this attempt
  metadata: text("metadata"), // JSON metadata about the attempt
  attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskRetryHistory = typeof taskRetryHistory.$inferSelect;
export type InsertTaskRetryHistory = typeof taskRetryHistory.$inferInsert;
