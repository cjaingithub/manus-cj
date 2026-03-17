# Hunter Agent Platform - Architecture Guide

## Overview

The Hunter Agent Platform is a sophisticated AI agent orchestration system designed to execute complex, multi-step tasks autonomously with full observability and error recovery. It leverages Hunter Alpha's 1 trillion parameter model for intelligent planning and decision-making.

## Core Components

### 1. Agent Loop Engine

The agent loop implements a four-phase execution model:

```
┌─────────────┐
│ Perception  │ Gather context, analyze current state
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Planning   │ Use Hunter Alpha to create execution plan
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Execution   │ Execute tools according to plan
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Learning   │ Update memory and learn from results
└─────────────┘
```

**Key Files:**
- `server/agent/agentLoop.ts` - Main loop implementation
- `server/agent/types.ts` - Type definitions

**Flow:**
1. **Perception Phase**: Gather task context, previous checkpoints, and memory
2. **Planning Phase**: Call Hunter Alpha to create a detailed execution plan
3. **Execution Phase**: Execute planned tools with error recovery
4. **Learning Phase**: Update memory hierarchy and save checkpoint

### 2. Tool Registry System

The tool registry provides a unified interface for executing different types of tools with automatic selection and fallback chains.

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  timeout?: number;
  retryable?: boolean;
}
```

**Available Tools:**
- **Shell Tool**: Execute shell commands with timeout and security constraints
- **File System Tool**: Read/write/delete files with path validation
- **Browser Tool**: Web scraping, metadata extraction, navigation

**Key Files:**
- `server/agent/toolRegistry.ts` - Registry implementation
- `server/agent/tools/shellTool.ts` - Shell execution
- `server/agent/tools/fileSystemTool.ts` - File operations
- `server/agent/tools/browserTool.ts` - Browser automation

**Extension Points:**
```typescript
// Add custom tool
const customTool: Tool = {
  name: "custom",
  description: "Custom tool for specific operations",
  parameters: { /* ... */ },
  execute: async (params) => {
    // Implementation
  }
};

registry.registerTool(customTool);
```

### 3. Error Recovery System

Multi-layered error handling with automatic recovery:

```
┌─────────────────────────────────────┐
│  Tool Execution                     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Retry with Exponential Backoff     │
│  (1-5 attempts based on strategy)   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Fallback Chain                     │
│  (Try alternative tools/approaches) │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Graceful Degradation               │
│  (Return partial result)            │
└─────────────────────────────────────┘
```

**Recovery Strategies:**

| Strategy | Max Retries | Initial Delay | Max Delay | Use Case |
|----------|-------------|---------------|-----------|----------|
| Aggressive | 5 | 100ms | 5s | Network errors |
| Moderate | 3 | 500ms | 3s | General operations (default) |
| Conservative | 1 | 1s | 2s | Critical operations |

**Key Files:**
- `server/agent/errorRecovery.ts` - Recovery implementation
- Circuit breaker pattern for cascading failure prevention
- Graceful degradation for partial failures

### 4. Memory Hierarchy

Three-tier memory system for intelligent context management:

```
┌──────────────────────────────────────┐
│  Working Memory                      │
│  (Current focus, 10 items max)       │
│  Relevance: 1.0 (always relevant)    │
└──────────────────────────────────────┘
                  │
                  │ (Promoted when full)
                  ▼
┌──────────────────────────────────────┐
│  Episodic Memory                     │
│  (Recent events, 50 items max)       │
│  Relevance: 0.8 (decays over time)   │
└──────────────────────────────────────┘
                  │
                  │ (Promoted when full)
                  ▼
┌──────────────────────────────────────┐
│  Semantic Memory                     │
│  (Facts & knowledge, 100 items max)  │
│  Relevance: 0.6 (long-term)          │
└──────────────────────────────────────┘
```

**Key Features:**
- Automatic promotion between tiers
- Relevance-based retrieval for LLM context
- Token estimation to stay within 1M context window
- Task-specific memory contexts

**Key Files:**
- `server/agent/memory.ts` - Memory hierarchy
- `TaskMemoryContext` for task-specific contexts
- Integration with LLM prompts for context injection

### 5. Task Scheduler

Flexible scheduling system for autonomous task execution:

```typescript
// Cron-based scheduling
globalScheduler.scheduleTask({
  cronExpression: "0 0 * * *", // Daily at midnight
  onTick: async () => { /* task logic */ }
});

// One-time execution
globalScheduler.scheduleOnce(5000, async () => {
  // Execute after 5 seconds
});

// Interval-based
globalScheduler.scheduleInterval(3600000, async () => {
  // Execute every hour
});
```

**Key Files:**
- `server/agent/scheduler.ts` - Scheduler implementation
- `globalScheduler` singleton for app-wide access
- Execution history and statistics tracking

### 6. Analytics & Monitoring

Comprehensive metrics collection for task execution:

```typescript
interface TaskMetrics {
  taskId: number;
  status: "pending" | "planning" | "executing" | "completed" | "failed";
  phasesCompleted: number;
  toolExecutions: number;
  successfulToolExecutions: number;
  failedToolExecutions: number;
  retries: number;
  tokenUsage: { input: number; output: number; total: number };
  errors: Array<{ timestamp: Date; tool: string; message: string; recovered: boolean }>;
}
```

**Metrics Tracked:**
- Phase timing and duration
- Tool execution success rates
- Error recovery rates
- Token usage and cost estimation
- Execution history per task

**Key Files:**
- `server/agent/analytics.ts` - Analytics implementation
- `TaskAnalytics` for per-task metrics
- `AnalyticsAggregator` for platform-wide insights

### 7. WebSocket Real-Time Communication

Streaming updates for real-time task monitoring:

```typescript
interface WebSocketMessage {
  type: "agent_thought" | "tool_execution" | "phase_update" | "error" | "completion";
  taskId: number;
  data: unknown;
  timestamp: Date;
}
```

**Message Types:**
- `agent_thought`: LLM reasoning and planning
- `tool_execution`: Tool start/progress/completion
- `phase_update`: Phase transitions and progress
- `error`: Error notifications
- `completion`: Task completion results

**Key Files:**
- `server/websocket/agentSocket.ts` - WebSocket server
- `client/src/hooks/useAgentSocket.ts` - Client hook
- Message queuing for offline clients
- Auto-reconnection with exponential backoff

### 8. Database Schema

```sql
-- Tasks
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pending', 'planning', 'executing', 'completed', 'failed', 'paused'),
  plan JSON,
  execution_log JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Checkpoints
CREATE TABLE checkpoints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  phase VARCHAR(50),
  state JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Tool Executions
CREATE TABLE tool_executions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  tool_name VARCHAR(100),
  params JSON,
  result JSON,
  error TEXT,
  duration INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Conversation History
CREATE TABLE conversation_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  role ENUM('user', 'assistant', 'system'),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**Key Files:**
- `drizzle/schema.ts` - Schema definitions
- `server/db.ts` - Query helpers

## Data Flow

### Task Creation & Execution

```
1. User creates task via UI
   ↓
2. tRPC procedure stores task in database
   ↓
3. User starts task execution
   ↓
4. Agent loop begins (perception → planning → execution → learning)
   ↓
5. Each phase broadcasts WebSocket updates
   ↓
6. Client receives real-time updates via WebSocket
   ↓
7. On completion, checkpoint is saved
   ↓
8. Analytics are recorded
```

### Error Recovery Flow

```
1. Tool execution fails
   ↓
2. Error recovery manager catches exception
   ↓
3. Check if error is retryable
   ↓
4. If yes: Wait (exponential backoff) → Retry
   ↓
5. If no: Try fallback tool
   ↓
6. If fallback succeeds: Continue
   ↓
7. If fallback fails: Graceful degradation
   ↓
8. Log error and update metrics
```

## Integration Points

### Hunter Alpha Integration

```typescript
import { invokeLLM } from "./server/_core/llm";

const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are an intelligent agent..." },
    { role: "user", content: taskDescription },
    { role: "assistant", content: previousPlan },
    { role: "user", content: executionResults }
  ]
});
```

**Context Window Management:**
- Memory hierarchy keeps context within 1M token limit
- Automatic context pruning based on relevance
- Token usage tracking for cost estimation

### Manus OAuth Integration

```typescript
// Authentication handled by Manus OAuth
// User context available in tRPC procedures
ctx.user = {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: "user" | "admin";
}
```

## Deployment Considerations

### Scalability
- Stateless agent loop (can run on multiple servers)
- Database-backed persistence
- WebSocket message queuing for offline clients
- Task scheduler runs on single server (or implement distributed scheduling)

### Performance
- Tool execution timeout: 30 seconds (configurable)
- Memory hierarchy limits context to 50K tokens
- Database indexes on task_id, user_id, created_at
- WebSocket message batching for high-frequency updates

### Monitoring
- Task metrics stored in database
- Analytics aggregator for platform insights
- Error logging with stack traces
- WebSocket connection statistics

## Security Considerations

### Tool Execution
- Shell commands run in sandboxed environment
- File system operations restricted to safe paths
- Browser tool uses timeout and resource limits
- All tool inputs validated before execution

### Data Protection
- User data isolated by user_id
- Sensitive information (API keys) stored in environment
- Database connections use SSL/TLS
- WebSocket connections use WSS (WebSocket Secure)

### Access Control
- tRPC procedures use `protectedProcedure` for auth
- Admin-only operations require `role === "admin"`
- Task access restricted to task owner

## Future Enhancements

1. **Multi-Agent Collaboration**: Multiple agents working on same task
2. **Distributed Scheduling**: Task scheduler across multiple servers
3. **Custom Tool Marketplace**: Community-contributed tools
4. **Advanced Analytics Dashboard**: Real-time metrics visualization
5. **Webhook Notifications**: Task completion webhooks
6. **Rate Limiting**: Per-user and per-tool rate limits
7. **Team Collaboration**: Shared tasks and workspaces
8. **API Key Management**: User-managed API keys for tools
