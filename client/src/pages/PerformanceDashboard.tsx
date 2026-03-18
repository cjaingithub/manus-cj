import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, Zap, Activity } from "lucide-react";

interface PerformanceStats {
  totalTasks: number;
  averageDuration: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  totalItemsProcessed: number;
  averageSuccessRate: number;
  totalErrors: number;
}

interface TrendData {
  date: string;
  averageDuration: number;
  taskCount: number;
  successRate: number;
  errorCount: number;
}

interface PhaseComparison {
  [phase: string]: {
    taskCount: number;
    averageDuration: number;
    averageSuccessRate: number;
    totalErrors: number;
  };
}

interface PerformanceMetric {
  id: number;
  taskId: number;
  duration: number;
  cpuUsagePercent: number | null;
  memoryUsageMB?: number | null;
  peakMemoryMB?: number | null;
  itemsProcessed?: number;
  itemsPerSecond?: number | null;
  successRate: number;
  errorCount?: number;
  retryCount?: number;
  executionPhase?: string | null;
  createdAt: Date;
}

export function PerformanceDashboard() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [phaseComparison, setPhaseComparison] = useState<PhaseComparison>({});
  const [slowestTasks, setSlowestTasks] = useState<PerformanceMetric[]>([]);
  const [resourceIntensive, setResourceIntensive] = useState<PerformanceMetric[]>([]);

  // Fetch user stats
  const statsQuery = trpc.performance.getUserStats.useQuery({ days });
  const trendsQuery = trpc.performance.getTrends.useQuery({ days });
  const phaseQuery = trpc.performance.getPhaseComparison.useQuery();
  const slowestQuery = trpc.performance.getSlowestTasks.useQuery({ limit: 10 });
  const resourceQuery = trpc.performance.getMostResourceIntensive.useQuery({ limit: 10 });

  useEffect(() => {
    if (statsQuery.data) setStats(statsQuery.data);
    if (trendsQuery.data) setTrends(trendsQuery.data);
    if (phaseQuery.data) setPhaseComparison(phaseQuery.data as PhaseComparison);
    if (slowestQuery.data) setSlowestTasks(slowestQuery.data as PerformanceMetric[]);
    if (resourceQuery.data) setResourceIntensive(resourceQuery.data as PerformanceMetric[]);
  }, [statsQuery.data, trendsQuery.data, phaseQuery.data, slowestQuery.data, resourceQuery.data]);

  const isLoading = statsQuery.isLoading || trendsQuery.isLoading || phaseQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor execution performance and resource utilization</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">tasks executed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageDuration}ms</div>
              <p className="text-xs text-muted-foreground">average execution time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPU Usage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageCpuUsage}%</div>
              <p className="text-xs text-muted-foreground">average CPU utilization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageSuccessRate}%</div>
              <p className="text-xs text-muted-foreground">task success rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="phases">Phase Comparison</TabsTrigger>
          <TabsTrigger value="slowest">Slowest Tasks</TabsTrigger>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
        </TabsList>

        {/* Trends Chart */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Duration Trend</CardTitle>
              <CardDescription>Average task execution time over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="averageDuration"
                      stroke="#3b82f6"
                      name="Avg Duration (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Rate Trend</CardTitle>
              <CardDescription>Task success rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="#10b981"
                      name="Success Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase Comparison */}
        <TabsContent value="phases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Execution Phase</CardTitle>
              <CardDescription>Compare metrics across different execution phases</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(phaseComparison).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(phaseComparison).map(([phase, data]) => (
                    <div key={phase} className="border rounded-lg p-4">
                      <h3 className="font-semibold capitalize mb-3">{phase}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Task Count</p>
                          <p className="text-lg font-bold">{data.taskCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Duration</p>
                          <p className="text-lg font-bold">{data.averageDuration}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-lg font-bold">{data.averageSuccessRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Errors</p>
                          <p className="text-lg font-bold text-red-600">{data.totalErrors}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No phase data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slowest Tasks */}
        <TabsContent value="slowest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slowest Tasks</CardTitle>
              <CardDescription>Top 10 tasks with longest execution time</CardDescription>
            </CardHeader>
            <CardContent>
              {slowestTasks.length > 0 ? (
                <div className="space-y-3">
                  {slowestTasks.map((task, idx) => (
                    <div key={task.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-muted-foreground w-6">#{idx + 1}</div>
                        <div>
                          <p className="font-medium">Task {task.taskId}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{task.duration}ms</p>
                        <p className="text-sm text-muted-foreground">{task.successRate}% success</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No task data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Usage */}
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Resource-Intensive Tasks</CardTitle>
              <CardDescription>Top 10 tasks with highest CPU and memory usage</CardDescription>
            </CardHeader>
            <CardContent>
              {resourceIntensive.length > 0 ? (
                <div className="space-y-3">
                  {resourceIntensive.map((task, idx) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Task {task.taskId}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-semibold bg-muted px-2 py-1 rounded">#{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">CPU Usage</p>
                          <p className="font-bold">{task.cpuUsagePercent?.toFixed(1) || "N/A"}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Peak Memory</p>
                          <p className="font-bold">{task.peakMemoryMB || "N/A"} MB</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-bold">{task.duration}ms</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No resource data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
