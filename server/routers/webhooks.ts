import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { webhooks, webhookDeliveries } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(z.string()).min(1, "At least one event must be selected"),
  filters: z.record(z.string(), z.any()).optional(),
  retryPolicy: z.object({
    maxAttempts: z.number().int().min(1).max(10).default(3),
    backoff: z.enum(["linear", "exponential"]).default("exponential"),
  }).optional(),
  secret: z.string().optional(),
});

const updateWebhookSchema = createWebhookSchema.partial();

export const webhookRouter = router({
  /**
   * Create a new webhook
   */
  create: protectedProcedure
    .input(createWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(webhooks).values({
        userId: ctx.user.id,
        url: input.url,
        events: JSON.stringify(input.events),
        filters: input.filters ? JSON.stringify(input.filters) : null,
        retryPolicy: input.retryPolicy ? JSON.stringify(input.retryPolicy) : null,
        secret: input.secret ? crypto.randomBytes(32).toString("hex") : null,
        isActive: true,
      });

      // Return a success response (insertId not available in this context)
      return { id: 0, success: true };
    }),

  /**
   * List all webhooks for the current user
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input = {} }) => {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.userId, ctx.user.id))
        .limit(input.limit || 20)
        .offset(input.offset || 0);

      return result.map(w => ({
        ...w,
        events: JSON.parse(w.events || "[]"),
        filters: w.filters ? JSON.parse(w.filters) : null,
        retryPolicy: w.retryPolicy ? JSON.parse(w.retryPolicy) : null,
      }));
    }),

  /**
   * Get a specific webhook
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (result.length === 0) return null;

      const w = result[0];
      return {
        ...w,
        events: JSON.parse(w.events || "[]"),
        filters: w.filters ? JSON.parse(w.filters) : null,
        retryPolicy: w.retryPolicy ? JSON.parse(w.retryPolicy) : null,
      };
    }),

  /**
   * Update a webhook
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      data: updateWebhookSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (existing.length === 0) throw new Error("Webhook not found");

      const updateData: any = {};
      if (input.data.url) updateData.url = input.data.url;
      if (input.data.events) updateData.events = JSON.stringify(input.data.events);
      if (input.data.filters) updateData.filters = JSON.stringify(input.data.filters);
      if (input.data.retryPolicy) updateData.retryPolicy = JSON.stringify(input.data.retryPolicy);
      if (input.data.secret !== undefined) updateData.secret = input.data.secret;

      await db
        .update(webhooks)
        .set(updateData)
        .where(eq(webhooks.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a webhook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (existing.length === 0) throw new Error("Webhook not found");

      await db.delete(webhooks).where(eq(webhooks.id, input.id));
      return { success: true };
    }),

  /**
   * Toggle webhook active status
   */
  toggle: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (existing.length === 0) throw new Error("Webhook not found");

      const newStatus = !existing[0].isActive;
      await db
        .update(webhooks)
        .set({ isActive: newStatus })
        .where(eq(webhooks.id, input.id));

      return { success: true, isActive: newStatus };
    }),

  /**
   * Get delivery history for a webhook
   */
  deliveries: protectedProcedure
    .input(z.object({
      webhookId: z.number().int(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Verify webhook belongs to user
      const webhook = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.webhookId),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (webhook.length === 0) throw new Error("Webhook not found");

      const result = await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, input.webhookId))
        .limit(input.limit || 20)
        .offset(input.offset || 0);

      return result.map(d => ({
        ...d,
        eventData: JSON.parse(d.eventData || "{}"),
      }));
    }),

  /**
   * Test webhook with sample payload
   */
  test: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const webhook = await db
        .select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, input.id),
          eq(webhooks.userId, ctx.user.id)
        ))
        .limit(1);

      if (webhook.length === 0) throw new Error("Webhook not found");

      const w = webhook[0];
      const samplePayload = {
        id: `evt_test_${Date.now()}`,
        type: "test.event",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook payload",
        },
        metadata: {
          platform: "hunter-agent",
          version: "1.0.0",
        },
      };

      try {
        // Sign payload if secret exists
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (w.secret) {
          const signature = crypto
            .createHmac("sha256", w.secret)
            .update(JSON.stringify(samplePayload))
            .digest("hex");
          headers["X-Webhook-Signature"] = `sha256=${signature}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(w.url, {
          method: "POST",
          headers,
          body: JSON.stringify(samplePayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        return {
          success: response.ok,
          status: response.status,
          message: `Test webhook sent. Status: ${response.status}`,
          response: responseText.substring(0, 500),
        };
      } catch (error) {
        return {
          success: false,
          status: 0,
          message: `Failed to send test webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});
