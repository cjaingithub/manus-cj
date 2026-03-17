import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { taskTemplates, templateUsageLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const templatesRouter = router({
  // List all public templates
  listPublic: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.isPublic, true))
        .limit(input.limit)
        .offset(input.offset)
        .then((rows) => 
          input.category 
            ? rows.filter((t) => t.category === input.category)
            : rows
        );

      return results;
    }),

  // List user's templates (private + public)
  listMine: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.userId, ctx.user.id))
        .limit(input.limit)
        .offset(input.offset)
        .then((rows) =>
          input.category
            ? rows.filter((t) => t.category === input.category)
            : rows
        );

      return results;
    }),

  // Get single template by ID
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const template = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, input.id))
        .limit(1);

      if (!template.length) return null;

      const t = template[0];

      // Check access: public or owner
      if (!t.isPublic && ctx.user?.id !== t.userId) {
        return null;
      }

      return t;
    }),

  // Create new template (protected)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().min(1).max(64),
        icon: z.string().optional(),
        taskTemplate: z.object({
          title: z.string(),
          description: z.string().optional(),
          plan: z.any(),
        }),
        parameters: z.record(z.string(), z.any()).optional(),
        exampleOutput: z.any().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(taskTemplates).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        category: input.category,
        icon: input.icon,
        taskTemplate: JSON.stringify(input.taskTemplate),
        parameters: input.parameters ? JSON.stringify(input.parameters) : null,
        exampleOutput: input.exampleOutput ? JSON.stringify(input.exampleOutput) : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        isPublic: input.isPublic,
      });

      return { success: true };
    }),

  // Update template (protected, owner only)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().optional(),
        taskTemplate: z.any().optional(),
        parameters: z.any().optional(),
        exampleOutput: z.any().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const existing = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, input.id))
        .limit(1);

      if (!existing.length || existing[0].userId !== ctx.user.id) {
        throw new Error("Not authorized");
      }

      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.category !== undefined) updates.category = input.category;
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.taskTemplate !== undefined) updates.taskTemplate = JSON.stringify(input.taskTemplate);
      if (input.parameters !== undefined) updates.parameters = JSON.stringify(input.parameters);
      if (input.exampleOutput !== undefined) updates.exampleOutput = JSON.stringify(input.exampleOutput);
      if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags);
      if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

      await db.update(taskTemplates).set(updates).where(eq(taskTemplates.id, input.id));

      return { success: true };
    }),

  // Delete template (protected, owner only)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const existing = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, input.id))
        .limit(1);

      if (!existing.length || existing[0].userId !== ctx.user.id) {
        throw new Error("Not authorized");
      }

      await db.delete(taskTemplates).where(eq(taskTemplates.id, input.id));

      return { success: true };
    }),

  // Log template usage
  logUsage: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        taskId: z.number(),
        executionTime: z.number().optional(),
        success: z.boolean(),
        feedback: z.any().optional(),
        rating: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(templateUsageLogs).values({
        templateId: input.templateId,
        taskId: input.taskId,
        userId: ctx.user.id,
        executionTime: input.executionTime,
        success: input.success,
        feedback: input.feedback ? JSON.stringify(input.feedback) : null,
        rating: input.rating,
      });

      return { success: true };
    }),

  // Get template categories
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const results = await db
      .select({ category: taskTemplates.category })
      .from(taskTemplates)
      .where(eq(taskTemplates.isPublic, true));

    return results.map((r) => r.category);
  }),
});
