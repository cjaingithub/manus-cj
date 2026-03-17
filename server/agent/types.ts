/**
 * Agent Loop Type Definitions
 * Defines the core structures for task planning, execution, and state management
 */

export type AgentPhase = "perception" | "planning" | "execution" | "learning" | "completed" | "failed";

export interface TaskPlan {
  id: string;
  title: string;
  description: string;
  phases: PlanPhase[];
  estimatedTokens: number;
  createdAt: Date;
}

export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  dependencies: string[]; // IDs of phases that must complete first
}

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  expectedOutput: string;
  retryStrategy?: "exponential" | "linear" | "none";
  maxRetries?: number;
  timeout?: number; // milliseconds
}

export interface ExecutionContext {
  taskId: number;
  userId: number;
  currentPhase: AgentPhase;
  plan: TaskPlan;
  executionLog: ExecutionEvent[];
  currentStepIndex: number;
  conversationHistory: ConversationMessage[];
  state: Record<string, unknown>;
  startTime: Date;
  lastCheckpoint?: Checkpoint;
}

export interface ExecutionEvent {
  timestamp: Date;
  phase: AgentPhase;
  type: "thought" | "tool_call" | "tool_result" | "error" | "checkpoint" | "phase_complete";
  message: string;
  data?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
}

export interface Checkpoint {
  taskId: number;
  phase: AgentPhase;
  stepIndex: number;
  state: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  timestamp: Date;
}

export interface ToolCall {
  toolName: string;
  params: Record<string, unknown>;
  timeout?: number;
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface AgentThought {
  content: string;
  reasoning: string;
  nextAction?: ToolCall;
  timestamp: Date;
}
