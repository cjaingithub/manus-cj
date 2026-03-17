import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Clock, Loader2, Zap } from "lucide-react";
import { Streamdown } from "streamdown";

interface ExecutionPhase {
  name: string;
  status: "pending" | "executing" | "completed" | "failed";
  duration: number;
  logs: string[];
}

interface ToolExecution {
  name: string;
  status: "pending" | "executing" | "completed" | "failed";
  params: Record<string, unknown>;
  result?: string | Record<string, unknown>;
  error?: string;
  duration: number;
}

interface TaskExecutionLiveProps {
  taskId: number;
  title: string;
  isExecuting: boolean;
  phases: ExecutionPhase[];
  currentPhase: string;
  toolExecutions: ToolExecution[];
  agentThoughts: string[];
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export function TaskExecutionLive({
  taskId,
  title,
  isExecuting,
  phases,
  currentPhase,
  toolExecutions,
  agentThoughts,
  tokenUsage,
}: TaskExecutionLiveProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isExecuting) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isExecuting]);

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "executing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPhaseProgress = () => {
    const phaseOrder = ["perception", "planning", "execution", "learning"];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return ((currentIndex + 1) / phaseOrder.length) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isExecuting && <Loader2 className="w-5 h-5 animate-spin" />}
                {title}
              </CardTitle>
              <CardDescription>Task ID: {taskId}</CardDescription>
            </div>
            <div className="text-right">
              <Badge variant={isExecuting ? "default" : "secondary"}>
                {isExecuting ? "Executing" : "Completed"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Elapsed: {formatTime(elapsedTime)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={getPhaseProgress()} className="h-2" />

          <div className="grid grid-cols-4 gap-2">
            {phases.map((phase) => (
              <div
                key={phase.name}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  phase.status === "completed"
                    ? "border-green-500 bg-green-50"
                    : phase.status === "executing"
                      ? "border-blue-500 bg-blue-50"
                      : phase.status === "failed"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getPhaseIcon(phase.status)}
                  <span className="text-sm font-semibold capitalize">
                    {phase.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {phase.duration}ms
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed view */}
      <Tabs defaultValue="thoughts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="thoughts">
            Agent Thoughts ({agentThoughts.length})
          </TabsTrigger>
          <TabsTrigger value="tools">
            Tools ({toolExecutions.length})
          </TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Agent Thoughts Tab */}
        <TabsContent value="thoughts" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Thoughts</CardTitle>
              <CardDescription>
                Real-time agent reasoning and decision making
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {agentThoughts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Waiting for agent thoughts...
                </p>
              ) : (
                agentThoughts.map((thought, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <Streamdown>{thought}</Streamdown>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tool Executions</CardTitle>
              <CardDescription>
                Tools executed during task processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {toolExecutions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tools executed yet...
                </p>
              ) : (
                toolExecutions.map((tool, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span className="font-semibold text-sm">
                          {tool.name}
                        </span>
                      </div>
                      <Badge
                        variant={
                          tool.status === "completed"
                            ? "default"
                            : tool.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {tool.status}
                      </Badge>
                    </div>

                    {tool.params && Object.keys(tool.params).length > 0 && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <p className="font-semibold mb-1">Parameters:</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(tool.params, null, 2)}
                        </pre>
                      </div>
                    )}

                    {tool.result && tool.result !== undefined && (
                      <div className="text-xs bg-green-50 p-2 rounded">
                        <p className="font-semibold mb-1">Result:</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(tool.result as unknown, null, 2)}
                        </pre>
                      </div>
                    )}

                    {tool.error && (
                      <div className="text-xs bg-red-50 p-2 rounded">
                        <p className="font-semibold mb-1 text-red-700">
                          Error:
                        </p>
                        <p className="text-red-600">{tool.error}</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Duration: {tool.duration}ms
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Execution Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Elapsed Time</p>
                  <p className="text-lg font-semibold">
                    {formatTime(elapsedTime)}
                  </p>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Phases Completed
                  </p>
                  <p className="text-lg font-semibold">
                    {phases.filter((p) => p.status === "completed").length}/
                    {phases.length}
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Tools Executed
                  </p>
                  <p className="text-lg font-semibold">
                    {toolExecutions.filter((t) => t.status === "completed")
                      .length}/{toolExecutions.length}
                  </p>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Agent Thoughts
                  </p>
                  <p className="text-lg font-semibold">{agentThoughts.length}</p>
                </div>
              </div>

              {tokenUsage && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Token Usage</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Input Tokens</p>
                      <p className="font-semibold">
                        {tokenUsage.inputTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Output Tokens</p>
                      <p className="font-semibold">
                        {tokenUsage.outputTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Tokens</p>
                      <p className="font-semibold">
                        {tokenUsage.totalTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Cost</p>
                      <p className="font-semibold">
                        ${tokenUsage.estimatedCost.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
