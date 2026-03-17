import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import crypto from "crypto";

/**
 * API Key Management Router
 * Handles creation, rotation, and management of API keys for programmatic access
 */

// In-memory store for API keys (in production, use database)
const apiKeyStore = new Map<string, {
  id: string;
  userId: number;
  keyHash: string;
  name: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: number;
  expiresAt?: number;
  createdAt: number;
}>();

/**
 * Hash API key for secure storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key
 */
function generateApiKey(): string {
  return `hap_${crypto.randomBytes(32).toString("hex")}`;
}

export const apiKeysRouter = router({
  // Create a new API key
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        scopes: z.array(z.string()).default(["read:tasks", "write:tasks"]),
        rateLimit: z.number().default(1000), // requests per hour
        expiresInDays: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const id = crypto.randomBytes(16).toString("hex");

      const keyData = {
        id,
        userId,
        keyHash,
        name: input.name,
        scopes: input.scopes,
        rateLimit: input.rateLimit,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: input.expiresInDays ? Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000 : undefined,
      };

      apiKeyStore.set(id, keyData);

      return {
        id,
        apiKey, // Only returned once at creation
        name: input.name,
        scopes: input.scopes,
        rateLimit: input.rateLimit,
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : null,
      };
    }),

  // List all API keys for current user
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const userKeys = Array.from(apiKeyStore.values())
        .filter((key) => key.userId === userId)
        .slice(input.offset, input.offset + input.limit)
        .map((key) => ({
          id: key.id,
          name: key.name,
          scopes: key.scopes,
          rateLimit: key.rateLimit,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
          expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
          createdAt: new Date(key.createdAt),
        }));

      return userKeys;
    }),

  // Get API key details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const key = apiKeyStore.get(input.id);

      if (!key || key.userId !== userId) {
        throw new Error("API key not found");
      }

      return {
        id: key.id,
        name: key.name,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
        expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
        createdAt: new Date(key.createdAt),
      };
    }),

  // Update API key
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        rateLimit: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const key = apiKeyStore.get(input.id);

      if (!key || key.userId !== userId) {
        throw new Error("API key not found");
      }

      if (input.name) key.name = input.name;
      if (input.scopes) key.scopes = input.scopes;
      if (input.rateLimit !== undefined) key.rateLimit = input.rateLimit;
      if (input.isActive !== undefined) key.isActive = input.isActive;

      apiKeyStore.set(input.id, key);

      return { success: true };
    }),

  // Rotate API key (generate new key, invalidate old one)
  rotate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const oldKey = apiKeyStore.get(input.id);

      if (!oldKey || oldKey.userId !== userId) {
        throw new Error("API key not found");
      }

      // Generate new key
      const newApiKey = generateApiKey();
      const newKeyHash = hashApiKey(newApiKey);
      const newId = crypto.randomBytes(16).toString("hex");

      const newKeyData = {
        id: newId,
        userId,
        keyHash: newKeyHash,
        name: oldKey.name,
        scopes: oldKey.scopes,
        rateLimit: oldKey.rateLimit,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: oldKey.expiresAt,
      };

      // Deactivate old key
      oldKey.isActive = false;
      apiKeyStore.set(input.id, oldKey);

      // Store new key
      apiKeyStore.set(newId, newKeyData);

      return {
        id: newId,
        apiKey: newApiKey,
        name: newKeyData.name,
        scopes: newKeyData.scopes,
        createdAt: new Date(newKeyData.createdAt),
      };
    }),

  // Delete API key
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const key = apiKeyStore.get(input.id);

      if (!key || key.userId !== userId) {
        throw new Error("API key not found");
      }

      apiKeyStore.delete(input.id);

      return { success: true };
    }),

  // Validate API key
  validate: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .query(async ({ input }) => {
      const keyHash = hashApiKey(input.apiKey);
      const key = Array.from(apiKeyStore.values()).find((k) => k.keyHash === keyHash);

      if (!key || !key.isActive) {
        return { valid: false, reason: "Invalid or inactive API key" };
      }

      if (key.expiresAt && key.expiresAt < Date.now()) {
        return { valid: false, reason: "API key has expired" };
      }

      return {
        valid: true,
        userId: key.userId,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
      };
    }),

  // Get API key usage statistics
  getUsage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = (ctx.user as any).id;
      const key = apiKeyStore.get(input.id);

      if (!key || key.userId !== userId) {
        throw new Error("API key not found");
      }

      return {
        id: key.id,
        name: key.name,
        lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
        isActive: key.isActive,
        expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
        createdAt: new Date(key.createdAt),
      };
    }),

  // Get API key count
  count: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user as any).id;
    return Array.from(apiKeyStore.values()).filter((key) => key.userId === userId).length;
  }),
});
