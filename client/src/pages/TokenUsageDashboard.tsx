import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Zap, DollarSign } from "lucide-react";

export default function TokenUsageDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.tokenUsage.getStats.useQuery({
    days: 30,
  });

  const { data: logs, isLoading: logsLoading } = trpc.tokenUsage.getLogs.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: costBreakdown, isLoading: costLoading } = trpc.tokenUsage.getCostBreakdown.useQuery();

  const { data: totalCost, isLoading: totalLoading } = trpc.tokenUsage.getTotalCost.useQuery();

  const isLoading = statsLoading || logsLoading || costLoading || totalLoading;

  // Calculate trends
  const trends = useMemo(() => {
    if (!logs || logs.length < 2) {
      return { dailyAverage: 0, trend: 0, costTrend: 0 };
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const midpoint = Math.floor(sortedLogs.length / 2);
    const firstHalf = sortedLogs.slice(0, midpoint);
    const secondHalf = sortedLogs.slice(midpoint);

    const firstHalfTokens = firstHalf.reduce((sum, log) => sum + log.totalTokens, 0);
    const secondHalfTokens = secondHalf.reduce((sum, log) => sum + log.totalTokens, 0);

    const firstHalfCost = firstHalf.reduce((sum, log) => {
      const cost = log.estimatedCost.replace("$", "");
      return sum + parseFloat(cost);
    }, 0);
    const secondHalfCost = secondHalf.reduce((sum, log) => {
      const cost = log.estimatedCost.replace("$", "");
      return sum + parseFloat(cost);
    }, 0);

    const tokenTrend = firstHalfTokens > 0 ? ((secondHalfTokens - firstHalfTokens) / firstHalfTokens) * 100 : 0;
    const costTrend = firstHalfCost > 0 ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100 : 0;
    const dailyAverage = stats ? stats.totalTokens / 30 : 0;

    return {
      dailyAverage: Math.round(dailyAverage),
      trend: Math.round(tokenTrend),
      costTrend: Math.round(costTrend),
    };
  }, [logs, stats]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Token Usage Dashboard</h1>
        <p className="text-muted-foreground mt-2">Monitor your API token consumption and costs</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (30 days)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCost?.total || "$0"}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalCost?.count || 0} API calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTokens.toLocaleString() || "0"}</div>
            <p className="text-xs text-muted-foreground mt-1">Prompt: {stats?.totalPromptTokens.toLocaleString() || "0"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.dailyAverage.toLocaleString()}</div>
            <p className={`text-xs mt-1 ${trends.trend > 0 ? "text-red-600" : "text-green-600"}`}>
              {trends.trend > 0 ? "↑" : "↓"} {Math.abs(trends.trend)}% vs first half
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageCostPerRequest.toFixed(6) || "0"}</div>
            <p className="text-xs text-muted-foreground mt-1">Per API call</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Cost by Model</TabsTrigger>
          <TabsTrigger value="logs">Recent Activity</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Cost by Model Tab */}
        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Model</CardTitle>
              <CardDescription>Total cost and token usage per model</CardDescription>
            </CardHeader>
            <CardContent>
              {costBreakdown && Object.keys(costBreakdown).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(costBreakdown).map(([model, data]) => (
                    <div key={model} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{model}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.requests} requests • {data.tokens.toLocaleString()} tokens
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{data.cost}</p>
                        <p className="text-xs text-muted-foreground">
                          {((parseFloat(data.cost.replace("$", "")) / (totalCost ? parseFloat(totalCost.total.replace("$", "")) : 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <p>No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent API Calls</CardTitle>
              <CardDescription>Latest token usage logs</CardDescription>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-0 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.model}</Badge>
                          <span className="text-muted-foreground">{log.totalTokens.toLocaleString()} tokens</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{log.estimatedCost}</p>
                        {log.finishReason && (
                          <p className="text-xs text-muted-foreground">{log.finishReason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <p>No API calls yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage Trends</CardTitle>
                <CardDescription>30-day comparison</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Token Trend</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-2xl font-bold ${trends.trend > 0 ? "text-red-600" : "text-green-600"}`}>
                      {trends.trend > 0 ? "+" : ""}{trends.trend}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {trends.trend > 0 ? "increase" : "decrease"} from first to second half
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium">Cost Trend</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-2xl font-bold ${trends.costTrend > 0 ? "text-red-600" : "text-green-600"}`}>
                      {trends.costTrend > 0 ? "+" : ""}{trends.costTrend}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {trends.costTrend > 0 ? "increase" : "decrease"} in costs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Insights</CardTitle>
                <CardDescription>Performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Avg Tokens per Request</p>
                  <p className="text-2xl font-bold mt-2">{stats?.averageTokensPerRequest.toLocaleString() || "0"}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium">Completion Ratio</p>
                  <p className="text-2xl font-bold mt-2">
                    {stats && stats.totalTokens > 0
                      ? ((stats.totalCompletionTokens / stats.totalTokens) * 100).toFixed(1)
                      : "0"}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Completion vs prompt tokens</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
