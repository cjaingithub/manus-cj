import { getDb } from "../db";
import {
  budgetConfigurations,
  budgetAlerts,
  BudgetConfiguration,
  BudgetAlert,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Budget Alert Service
 * Manages user spending limits and alerts
 */
export class BudgetAlertService {
  /**
   * Create or get budget configuration for a user
   */
  async getOrCreateBudgetConfig(userId: number): Promise<BudgetConfiguration | null> {
    const db = await getDb();
    if (!db) return null;

    // Try to get existing config
    const [existing] = await db
      .select()
      .from(budgetConfigurations)
      .where(eq(budgetConfigurations.userId, userId));

    if (existing) return existing;

    // Create default config
    await db.insert(budgetConfigurations).values({
      userId,
      monthlyBudgetUSD: "100", // Default $100/month
      alertThresholdPercent: 80,
      hardLimitPercent: 100,
      emailAlertEnabled: true,
      slackAlertEnabled: false,
      currentMonthSpent: "0",
    });

    const [created] = await db
      .select()
      .from(budgetConfigurations)
      .where(eq(budgetConfigurations.userId, userId));

    return created || null;
  }

  /**
   * Update budget configuration
   */
  async updateBudgetConfig(
    userId: number,
    config: {
      monthlyBudgetUSD?: number;
      alertThresholdPercent?: number;
      hardLimitPercent?: number;
      emailAlertEnabled?: boolean;
      slackAlertEnabled?: boolean;
      slackWebhookUrl?: string;
    }
  ): Promise<BudgetConfiguration | null> {
    const db = await getDb();
    if (!db) return null;

    const updateData: Record<string, unknown> = {};
    if (config.monthlyBudgetUSD !== undefined) updateData.monthlyBudgetUSD = config.monthlyBudgetUSD.toString();
    if (config.alertThresholdPercent !== undefined)
      updateData.alertThresholdPercent = config.alertThresholdPercent;
    if (config.hardLimitPercent !== undefined) updateData.hardLimitPercent = config.hardLimitPercent;
    if (config.emailAlertEnabled !== undefined) updateData.emailAlertEnabled = config.emailAlertEnabled;
    if (config.slackAlertEnabled !== undefined) updateData.slackAlertEnabled = config.slackAlertEnabled;
    if (config.slackWebhookUrl !== undefined) updateData.slackWebhookUrl = config.slackWebhookUrl;

    await db.update(budgetConfigurations).set(updateData).where(eq(budgetConfigurations.userId, userId));

    const [updated] = await db
      .select()
      .from(budgetConfigurations)
      .where(eq(budgetConfigurations.userId, userId));

    return updated || null;
  }

  /**
   * Check if spending exceeds threshold and create alert if needed
   */
  async checkAndCreateAlert(userId: number, currentSpent: number): Promise<BudgetAlert | null> {
    const db = await getDb();
    if (!db) return null;

    const config = await this.getOrCreateBudgetConfig(userId);
    if (!config) return null;

    const budgetLimit = parseFloat(config.monthlyBudgetUSD);
    const percentageUsed = Math.round((currentSpent / budgetLimit) * 100);

    // Determine alert type
    let alertType: "warning" | "critical" | "limit_exceeded" = "warning";
    if (percentageUsed >= 100) {
      alertType = "limit_exceeded";
    } else if (percentageUsed >= 90) {
      alertType = "critical";
    }

    // Check if we should create an alert
    const shouldAlert =
      percentageUsed >= config.alertThresholdPercent &&
      (!config.lastAlertSentAt || this.shouldSendNewAlert(config.lastAlertSentAt));

    if (!shouldAlert) return null;

    // Create alert
    await db.insert(budgetAlerts).values({
      userId,
      alertType,
      spentAmount: currentSpent.toString(),
      budgetLimit: config.monthlyBudgetUSD.toString(),
      percentageUsed,
      emailSent: config.emailAlertEnabled,
      slackSent: config.slackAlertEnabled,
      message: `You have spent $${currentSpent.toFixed(2)} of your $${budgetLimit.toFixed(2)} monthly budget (${percentageUsed}%)`,
    });

    // Update last alert sent time
    await db
      .update(budgetConfigurations)
      .set({ lastAlertSentAt: new Date() })
      .where(eq(budgetConfigurations.userId, userId));

    const [alert] = await db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.userId, userId))
      .orderBy(desc(budgetAlerts.createdAt))
      .limit(1);

    return alert || null;
  }

  /**
   * Update current month spending
   */
  async updateMonthlySpending(userId: number, amount: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const config = await this.getOrCreateBudgetConfig(userId);
    if (!config) return;

    const newSpent = parseFloat(config.currentMonthSpent) + amount;

    await db
      .update(budgetConfigurations)
      .set({ currentMonthSpent: newSpent.toString() })
      .where(eq(budgetConfigurations.userId, userId));

    // Check if alert should be sent
    await this.checkAndCreateAlert(userId, newSpent);
  }

  /**
   * Reset monthly spending (called on first day of month)
   */
  async resetMonthlySpending(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(budgetConfigurations)
      .set({ currentMonthSpent: "0", lastAlertSentAt: null })
      .where(eq(budgetConfigurations.userId, userId));
  }

  /**
   * Get budget alerts for user
   */
  async getAlerts(userId: number, limit = 50): Promise<BudgetAlert[]> {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.userId, userId))
      .orderBy(desc(budgetAlerts.createdAt))
      .limit(limit);
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(userId: number): Promise<{
    monthlyBudget: number;
    currentSpent: number;
    percentageUsed: number;
    remaining: number;
    alertThreshold: number;
    isExceeded: boolean;
    daysUntilReset: number;
  } | null> {
    const config = await this.getOrCreateBudgetConfig(userId);
    if (!config) return null;

    const budget = typeof config.monthlyBudgetUSD === "string" ? parseFloat(config.monthlyBudgetUSD) : config.monthlyBudgetUSD;
    const spent = typeof config.currentMonthSpent === "string" ? parseFloat(config.currentMonthSpent) : config.currentMonthSpent;
    const percentageUsed = Math.round((spent / budget) * 100);
    const remaining = Math.max(0, budget - spent);

    // Calculate days until reset (next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      monthlyBudget: budget,
      currentSpent: spent,
      percentageUsed,
      remaining,
      alertThreshold: config.alertThresholdPercent,
      isExceeded: spent >= budget,
      daysUntilReset,
    };
  }

  /**
   * Check if enough time has passed to send a new alert
   */
  private shouldSendNewAlert(lastAlertTime: Date): boolean {
    // Send new alert only if 24 hours have passed
    const now = new Date();
    const hoursSinceLastAlert = (now.getTime() - lastAlertTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastAlert >= 24;
  }
}

// Export singleton instance
export const budgetAlertService = new BudgetAlertService();
