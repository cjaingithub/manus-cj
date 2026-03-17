import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface Task {
  id: number;
  title: string;
  status: string;
  currentPhase: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface TaskExecutionViewProps {
  taskId: number;
  task?: Task;
  onBack: () => void;
}

export default function TaskExecutionView({ taskId, task, onBack }: TaskExecutionViewProps) {
  const [userPrompt, setUserPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch task details
  const { data: taskData, isLoading: taskLoading } = trpc.agent.getTask.useQuery(
    { taskId },
    { refetchInterval: 2000 } // Poll every 2 seconds
  );

  // Fetch conversation history
  const { data: conversation, isLoading: conversationLoading } = trpc.agent.getConversation.useQuery(
    { taskId },
    { refetchInterval: 2000 }
  );

  // Mutations
  const startTaskMutation = trpc.agent.startTask.useMutation({
    onSuccess: () => {
      setUserPrompt("");
      setIsExecuting(true);
    },
  });

  const executeNextPhaseMutation = trpc.agent.executeNextPhase.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        setIsExecuting(false);
      }
    },
  });

  // Auto-execute next phase when task is executing
  useEffect(() => {
    if (taskData?.status === "executing" && isExecuting) {
      const timer = setTimeout(() => {
        executeNextPhaseMutation.mutate({ taskId });
      }, 1000);
      return () => clearTimeout(timer);
    } else if (taskData?.status !== "executing") {
      setIsExecuting(false);
    }
  }, [taskData?.status, isExecuting, taskId, executeNextPhaseMutation]);

  const handleStartTask = () => {
    if (!userPrompt.trim()) return;
    startTaskMutation.mutate({
      taskId,
      userPrompt,
    });
  };

  const currentTask = taskData || task;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{currentTask?.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{currentTask?.status}</Badge>
              {currentTask?.currentPhase && (
                <Badge variant="secondary" className="text-xs">
                  {currentTask.currentPhase}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation History */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
                <CardDescription>Agent thoughts and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversationLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin w-6 h-6" />
                    </div>
                  ) : conversation && conversation.length > 0 ? (
                    conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary/10 ml-8"
                            : msg.role === "assistant"
                            ? "bg-muted mr-8"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          {msg.role.toUpperCase()}
                        </div>
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No conversation yet. Start the task below.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Input Area */}
            {currentTask?.status === "pending" && (
              <Card>
                <CardHeader>
                  <CardTitle>Start Task</CardTitle>
                  <CardDescription>Provide instructions for the agent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="What would you like the agent to do?"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleStartTask}
                    disabled={startTaskMutation.isPending || !userPrompt.trim()}
                    className="w-full"
                  >
                    {startTaskMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Start Task
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status Panel */}
          <div className="space-y-6">
            {/* Task Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Current Phase</div>
                  <div className="flex items-center gap-2">
                    {currentTask?.status === "executing" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : currentTask?.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : currentTask?.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="font-semibold capitalize">{currentTask?.currentPhase || "—"}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground mb-2">Overall Status</div>
                  <Badge className="w-full justify-center py-2 text-center">
                    {currentTask?.status}
                  </Badge>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground mb-2">Created</div>
                  <div className="text-sm">
                    {currentTask?.createdAt
                      ? new Date(currentTask.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>

                {currentTask?.completedAt && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-2">Completed</div>
                    <div className="text-sm">
                      {new Date(currentTask.completedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Execution Log */}
            {currentTask?.status !== "pending" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Execution Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {isExecuting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Executing...
                      </div>
                    ) : currentTask?.status === "completed" ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Task completed
                      </div>
                    ) : currentTask?.status === "failed" ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Task failed
                      </div>
                    ) : (
                      "Waiting to start..."
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
