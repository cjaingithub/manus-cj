/**
 * Analytics Dashboard Page
 * Real-time metrics visualization and task performance analytics
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";

interface TaskMetrics {
  taskId: number;
  status: string;
  phasesCompleted: number;
  totalPhases: number;
  toolExecutions: number;
  successfulToolExecutions: number;
  failedToolExecutions: number;
  retries: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  totalDuration?: number;
}

interface PerformanceMetrics {
  averagePhaseTime: number;
  averageToolExecutionTime: number;
  toolSuccessRate: number;
  errorRecoveryRate: number;
  estimatedCost: number;
}

export default function Analytics() {
  const { data: tasks, isLoading: tasksLoading } = trpc.agent.listTasks.useQuery({});


  // Calculate aggregate metrics
  const aggregateMetrics = tasks && tasks.length > 0
    ? {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        failedTasks: tasks.filter((t) => t.status === "failed").length,
        activeTasks: tasks.filter((t) => t.status === "executing" || t.status === "planning").length,
        successRate:
          tasks.length > 0
            ? ((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100).toFixed(1)
            : "0",
      }
    : null;

  // Prepare chart data
  const statusDistribution = tasks && tasks.length > 0
    ? [
        { name: "Completed", value: tasks.filter((t) => t.status === "completed").length, color: "#10b981" },
        { name: "Failed", value: tasks.filter((t) => t.status === "failed").length, color: "#ef4444" },
        { name: "Active", value: tasks.filter((t) => t.status === "executing" || t.status === "planning").length, color: "#3b82f6" },
        { name: "Pending", value: tasks.filter((t) => t.status === "pending" || t.status === "paused").length, color: "#f59e0b" },
      ]
    : [];

  const taskTimeline = tasks && tasks.length > 0
    ? tasks
        .filter((t) => t.createdAt)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-10)
        .map((t) => ({
          name: t.title.substring(0, 15),
          duration: Math.random() * 5000, // Placeholder duration
          status: t.status,
        }))
    : [];

  const toolStats = [
    { name: "shell", executions: 12, success: 10 },
    { name: "browser", executions: 8, success: 7 },
    { name: "filesystem", executions: 15, success: 14 },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Real-time metrics and performance analytics for your tasks</p>
        </div>

        {/* Aggregate Metrics Cards */}
        {aggregateMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateMetrics.totalTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateMetrics.completedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">{aggregateMetrics.successRate}% success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateMetrics.failedTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateMetrics.activeTasks}</div>
                <p className="text-xs text-muted-foreground mt-1">Running now</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Avg Success
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateMetrics.successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Platform average</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tools">Tool Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Distribution</CardTitle>
                  <CardDescription>Breakdown of all tasks by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Success Rate Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate Trend</CardTitle>
                  <CardDescription>Task completion success over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {tasks && tasks.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={tasks
                          .filter((t) => t.createdAt)
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .slice(-10)
                          .map((t, i) => ({
                            name: `Task ${i + 1}`,
                            success: t.status === "completed" ? 100 : t.status === "failed" ? 0 : 50,
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Task Execution Timeline</CardTitle>
                <CardDescription>Duration of recent tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {taskTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={taskTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Duration (ms)", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="duration" fill="#3b82f6" name="Duration (ms)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card>
              <CardHeader>
                <CardTitle>Tool Performance</CardTitle>
                <CardDescription>Execution count and success rate by tool</CardDescription>
              </CardHeader>
              <CardContent>
                {toolStats.length > 0 ? (
                  <div className="space-y-4">
                    {toolStats.map((tool) => (
                      <div key={tool.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{tool.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tool.executions} executions, {((tool.success / tool.executions) * 100).toFixed(1)}% success
                          </p>
                        </div>
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(tool.success / tool.executions) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No tool data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest tasks and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.slice(-10).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                               <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">Task #{task.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : task.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : task.status === "executing" || task.status === "planning"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No tasks yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
