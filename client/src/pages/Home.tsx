import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, RotateCcw, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import TaskExecutionView from "@/components/TaskExecutionView";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState("");

  // tRPC queries and mutations
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.agent.listTasks.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  const createTaskMutation = trpc.agent.createTask.useMutation({
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskDescription("");
      refetchTasks();
    },
  });

  const startTaskMutation = trpc.agent.startTask.useMutation({
    onSuccess: (data) => {
      setSelectedTaskId(data.taskId);
      setUserPrompt("");
      refetchTasks();
    },
  });

  const pauseTaskMutation = trpc.agent.pauseTask.useMutation({
    onSuccess: () => refetchTasks(),
  });

  const resumeTaskMutation = trpc.agent.resumeTask.useMutation({
    onSuccess: () => refetchTasks(),
  });

  const cancelTaskMutation = trpc.agent.cancelTask.useMutation({
    onSuccess: () => {
      setSelectedTaskId(null);
      refetchTasks();
    },
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription,
    });
  };

  const handleStartTask = (taskId: number) => {
    if (!userPrompt.trim()) return;
    startTaskMutation.mutate({
      taskId,
      userPrompt,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Hunter Agent Platform</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Autonomous task execution with full observability and recovery
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/login")}
          >
            Sign In to Get Started
          </Button>
        </div>
      </div>
    );
  }

  if (selectedTaskId) {
    const selectedTask = tasks?.find((t) => t.id === selectedTaskId);
    return (
      <TaskExecutionView
        taskId={selectedTaskId}
        task={selectedTask}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Hunter Agent Platform</h1>
          <p className="text-lg text-muted-foreground">
            Create and execute autonomous tasks with real-time observability
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Task Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>Define a new task for the agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Task Title</label>
                <Input
                  placeholder="e.g., Analyze website performance"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                <Textarea
                  placeholder="Provide additional context..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
                className="w-full"
              >
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Tasks</CardTitle>
                <CardDescription>
                  {tasks?.length === 0 ? "No tasks yet" : `${tasks?.length} task(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin w-6 h-6" />
                  </div>
                ) : tasks && tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{task.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{task.status}</Badge>
                            {task.currentPhase && (
                              <Badge variant="secondary" className="text-xs">
                                {task.currentPhase}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {task.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {task.status === "executing" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseTaskMutation.mutate({ taskId: task.id })}
                              disabled={pauseTaskMutation.isPending}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {task.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resumeTaskMutation.mutate({ taskId: task.id })}
                              disabled={resumeTaskMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {["pending", "paused", "executing"].includes(task.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelTaskMutation.mutate({ taskId: task.id })}
                              disabled={cancelTaskMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks yet. Create one to get started!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
