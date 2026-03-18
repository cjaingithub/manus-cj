import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { budgetAlertService } from "../services/budgetAlertService";

export const budgetAlertsRouter = router({
  /**
   * Get or create budget configuration
   */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await budgetAlertService.getOrCreateBudgetConfig(ctx.user.id);

    if (!config) return null;

    return {
      id: config.id,
      monthlyBudgetUSD: typeof config.monthlyBudgetUSD === "string" 
        ? parseFloat(config.monthlyBudgetUSD) 
        : config.monthlyBudgetUSD,
      alertThresholdPercent: config.alertThresholdPercent,
      hardLimitPercent: config.hardLimitPercent,
      emailAlertEnabled: config.emailAlertEnabled,
      slackAlertEnabled: config.slackAlertEnabled,
      slackWebhookUrl: config.slackWebhookUrl,
    };
  }),

  /**
   * Update budget configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        monthlyBudgetUSD: z.number().optional(),
        alertThresholdPercent: z.number().min(1).max(99).optional(),
        hardLimitPercent: z.number().min(1).max(200).optional(),
        emailAlertEnabled: z.boolean().optional(),
        slackAlertEnabled: z.boolean().optional(),
        slackWebhookUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = await budgetAlertService.updateBudgetConfig(ctx.user.id, {
        monthlyBudgetUSD: input.monthlyBudgetUSD,
        alertThresholdPercent: input.alertThresholdPercent,
        hardLimitPercent: input.hardLimitPercent,
        emailAlertEnabled: input.emailAlertEnabled,
        slackAlertEnabled: input.slackAlertEnabled,
        slackWebhookUrl: input.slackWebhookUrl,
      });

      if (!config) return null;

      return {
        id: config.id,
        monthlyBudgetUSD: typeof config.monthlyBudgetUSD === "string" 
          ? parseFloat(config.monthlyBudgetUSD) 
          : config.monthlyBudgetUSD,
        alertThresholdPercent: config.alertThresholdPercent,
        hardLimitPercent: config.hardLimitPercent,
        emailAlertEnabled: config.emailAlertEnabled,
        slackAlertEnabled: config.slackAlertEnabled,
      };
    }),

  /**
   * Get budget status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return budgetAlertService.getBudgetStatus(ctx.user.id);
  }),

  /**
   * Get budget alerts
   */
  getAlerts: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const alerts = await budgetAlertService.getAlerts(ctx.user.id, input.limit);

      return alerts.map((a) => ({
        id: a.id,
        alertType: a.alertType,
        spentAmount: typeof a.spentAmount === "string" ? parseFloat(a.spentAmount) : a.spentAmount,
        budgetLimit: typeof a.budgetLimit === "string" ? parseFloat(a.budgetLimit) : a.budgetLimit,
        percentageUsed: a.percentageUsed,
        emailSent: a.emailSent,
        slackSent: a.slackSent,
        message: a.message,
        createdAt: a.createdAt,
      }));
    }),

  /**
   * Update monthly spending
   */
  updateSpending: protectedProcedure
    .input(z.object({ amount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await budgetAlertService.updateMonthlySpending(ctx.user.id, input.amount);
      return { success: true };
    }),

  /**
   * Reset monthly spending
   */
  resetMonthly: protectedProcedure.mutation(async ({ ctx }) => {
    await budgetAlertService.resetMonthlySpending(ctx.user.id);
    return { success: true };
  }),
});
