/**
 * Token pricing configuration for different models
 * Prices in USD per 1K tokens
 */
export const TOKEN_PRICING = {
  "openrouter/hunter-alpha": {
    inputPrice: 0, // Free model
    outputPrice: 0,
  },
  "gpt-4": {
    inputPrice: 0.03,
    outputPrice: 0.06,
  },
  "gpt-4-turbo": {
    inputPrice: 0.01,
    outputPrice: 0.03,
  },
  "gpt-3.5-turbo": {
    inputPrice: 0.0005,
    outputPrice: 0.0015,
  },
  default: {
    inputPrice: 0.001,
    outputPrice: 0.002,
  },
};

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateTokenCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING] || TOKEN_PRICING.default;

  const inputCost = (promptTokens / 1000) * pricing.inputPrice;
  const outputCost = (completionTokens / 1000) * pricing.outputPrice;

  return inputCost + outputCost;
}

/**
 * Format token usage for display
 */
export function formatTokenUsage(usage: TokenUsage): string {
  return `Tokens: ${usage.totalTokens.toLocaleString()} (prompt: ${usage.promptTokens.toLocaleString()}, completion: ${usage.completionTokens.toLocaleString()}) | Cost: $${usage.estimatedCost.toFixed(6)}`;
}

/**
 * Aggregate token usage across multiple requests
 */
export function aggregateTokenUsage(usages: TokenUsage[]): {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
} {
  if (usages.length === 0) {
    return {
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCost: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0,
    };
  }

  const totalPromptTokens = usages.reduce((sum, u) => sum + u.promptTokens, 0);
  const totalCompletionTokens = usages.reduce((sum, u) => sum + u.completionTokens, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = usages.reduce((sum, u) => sum + u.estimatedCost, 0);

  return {
    totalTokens,
    totalPromptTokens,
    totalCompletionTokens,
    totalCost,
    averageTokensPerRequest: totalTokens / usages.length,
    averageCostPerRequest: totalCost / usages.length,
  };
}

/**
 * Get token usage statistics by model
 */
export function getTokenUsageByModel(usages: TokenUsage[]): Record<string, TokenUsage[]> {
  const byModel: Record<string, TokenUsage[]> = {};

  for (const usage of usages) {
    if (!byModel[usage.model]) {
      byModel[usage.model] = [];
    }
    byModel[usage.model].push(usage);
  }

  return byModel;
}

/**
 * Estimate remaining budget based on usage
 */
export function estimateRemainingBudget(
  budget: number,
  usages: TokenUsage[],
  projectedRequestsRemaining: number = 0
): {
  spent: number;
  remaining: number;
  projectedTotal: number;
  canContinue: boolean;
} {
  const spent = usages.reduce((sum, u) => sum + u.estimatedCost, 0);
  const remaining = budget - spent;

  const avgCost = usages.length > 0 ? spent / usages.length : 0;
  const projectedTotal = spent + avgCost * projectedRequestsRemaining;

  return {
    spent,
    remaining,
    projectedTotal,
    canContinue: remaining > 0,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return "< $0.0001";
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Get cost breakdown by model
 */
export function getCostBreakdown(usages: TokenUsage[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const usage of usages) {
    if (!breakdown[usage.model]) {
      breakdown[usage.model] = 0;
    }
    breakdown[usage.model] += usage.estimatedCost;
  }

  return breakdown;
}
