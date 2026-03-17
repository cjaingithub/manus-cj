# Hunter Agent Platform

A comprehensive AI agent orchestration platform powered by **Hunter Alpha** (1 trillion parameter frontier intelligence model) that enables autonomous task execution with full observability, error recovery, and real-time monitoring.

## Features

### 🤖 Core Agent Loop
- **Four-phase execution**: Perception → Planning → Execution → Learning
- **Context-aware planning** using Hunter Alpha's 1M token context window
- **Checkpoint-based state management** for long-running task resumption
- **Memory hierarchy** (working, episodic, semantic) for intelligent context management

### 🛠️ Tool Registry System
- **Shell execution** with timeout and security constraints
- **File system operations** (read, write, delete with safety checks)
- **Browser automation** for web scraping and metadata extraction
- **Tool registry** with automatic selection and fallback chains
- **Extensible architecture** for adding custom tools

### 🔄 Error Recovery & Resilience
- **Automatic retry** with exponential backoff
- **Fallback execution chains** for graceful degradation
- **Circuit breaker pattern** to prevent cascading failures
- **Error logging and analysis** for debugging
- **Recovery strategies** (aggressive, moderate, conservative)

### 📊 Real-Time Communication
- **WebSocket server** for streaming agent thoughts and tool execution
- **Client-side auto-reconnection** with configurable retry logic
- **Message queuing** for offline clients
- **Real-time phase updates** and progress tracking

### ⏰ Task Scheduling
- **Cron-based scheduling** for recurring tasks
- **One-time task execution** with delay support
- **Interval-based tasks** for periodic operations
- **Execution history** and statistics tracking
- **Pause/resume/cancel** operations

### 📈 Analytics & Monitoring
- **Task metrics** (duration, success rate, token usage)
- **Performance analytics** with cost estimation
- **Tool execution statistics** and timing analysis
- **Error recovery rates** and trend analysis
- **Global analytics aggregator** for platform insights

### 💾 Persistence & Checkpointing
- **Database-backed task storage** with full execution history
- **Checkpoint system** for task state snapshots
- **Conversation history** tracking for context
- **Tool execution logs** with parameters and results

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                       │
│  - Task creation and management UI                           │
│  - Real-time execution visualization                         │
│  - WebSocket integration for live updates                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ tRPC + WebSocket
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend (Express + tRPC)                    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Agent Loop Engine                          │ │
│  │  - Perception (context gathering)                      │ │
│  │  - Planning (Hunter Alpha LLM)                         │ │
│  │  - Execution (tool invocation)                         │ │
│  │  - Learning (memory updates)                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Tool Registry                             │ │
│  │  - Shell Tool                                          │ │
│  │  - File System Tool                                    │ │
│  │  - Browser Tool                                        │ │
│  │  - Custom Tool Extensions                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Error Recovery                            │ │
│  │  - Retry Manager                                       │ │
│  │  - Fallback Chains                                     │ │
│  │  - Circuit Breaker                                     │ │
│  │  - Graceful Degradation                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Memory & Analytics                        │ │
│  │  - Task Memory Context                                 │ │
│  │  - Performance Metrics                                 │ │
│  │  - Execution History                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Task Scheduler                            │ │
│  │  - Cron Job Management                                 │ │
│  │  - Interval Scheduling                                 │ │
│  │  - Execution History                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Database
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  MySQL Database                              │
│  - Tasks table (id, user_id, status, plan, execution_log)   │
│  - Checkpoints table (task_id, phase, state, timestamp)     │
│  - Tool Executions table (task_id, tool_name, params, result)│
│  - Conversation History table (task_id, role, content)      │
│  - Users table (id, openId, name, email, role)              │
└──────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 10+
- MySQL database
- OpenRouter API key for Hunter Alpha access

### Installation

```bash
# Clone the repository
git clone https://github.com/cjaingithub/manus-cj.git
cd manus-cj

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start development server
pnpm dev
```

### Configuration

Key environment variables:
```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/hunter_agent

# OpenRouter (Hunter Alpha)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=openrouter/hunter-alpha

# Manus OAuth
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# JWT
JWT_SECRET=your-secret-key
```

## API Documentation

### tRPC Procedures

#### Task Management
```typescript
// Create a new task
trpc.agent.createTask.useMutation({
  title: "Analyze website performance",
  description: "Check load times and SEO metrics"
})

// Start task execution
trpc.agent.startTask.useMutation({
  taskId: 1
})

// Pause task
trpc.agent.pauseTask.useMutation({
  taskId: 1
})

// Resume task
trpc.agent.resumeTask.useMutation({
  taskId: 1
})

// Get task details
trpc.agent.getTask.useQuery({
  taskId: 1
})

// List user's tasks
trpc.agent.listTasks.useQuery()
```

### WebSocket Events

```typescript
// Subscribe to task updates
socket.send(JSON.stringify({
  type: "subscribe",
  taskId: 1
}))

// Receive agent thoughts
{
  type: "agent_thought",
  taskId: 1,
  data: {
    phase: "planning",
    content: "I need to analyze the website structure...",
    reasoning: "...",
    confidence: 0.95
  }
}

// Receive tool execution updates
{
  type: "tool_execution",
  taskId: 1,
  data: {
    toolName: "browser",
    status: "executing",
    params: { url: "https://example.com" }
  }
}

// Receive phase updates
{
  type: "phase_update",
  taskId: 1,
  data: {
    phase: "execution",
    status: "executing",
    progress: 45,
    message: "Executing 3 of 7 tools..."
  }
}
```

## Usage Examples

### Basic Task Creation

```typescript
import { trpc } from "@/lib/trpc";

export function TaskCreationExample() {
  const createTask = trpc.agent.createTask.useMutation();
  const startTask = trpc.agent.startTask.useMutation();

  const handleCreateAndStart = async () => {
    const task = await createTask.mutateAsync({
      title: "Analyze YouTube video",
      description: "Extract key points and sentiment from video transcript"
    });

    await startTask.mutateAsync({ taskId: task.id });
  };

  return <button onClick={handleCreateAndStart}>Create & Start Task</button>;
}
```

### Real-Time Monitoring

```typescript
import { useAgentSocket } from "@/hooks/useAgentSocket";

export function TaskMonitor({ taskId }: { taskId: number }) {
  const { isConnected, messages, getLatestMessage } = useAgentSocket({
    taskId,
    autoConnect: true
  });

  const latestThought = getLatestMessage("agent_thought");
  const latestExecution = getLatestMessage("tool_execution");

  return (
    <div>
      <p>Connected: {isConnected ? "✓" : "✗"}</p>
      <p>Latest thought: {latestThought?.data.content}</p>
      <p>Latest tool: {latestExecution?.data.toolName}</p>
    </div>
  );
}
```

### Scheduled Task Execution

```typescript
import { globalScheduler } from "@/server/agent/scheduler";

// Schedule a task to run every hour
const taskId = globalScheduler.scheduleInterval(3600000, async () => {
  console.log("Running hourly analysis...");
  // Your task logic here
});

// Get scheduler statistics
const stats = globalScheduler.getStats();
console.log(`Total tasks: ${stats.totalTasks}`);
console.log(`Success rate: ${stats.successRate}%`);
```

## Project Structure

```
hunter-agent-platform/
├── client/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom hooks (useAgentSocket)
│   │   ├── lib/             # Utilities (tRPC client)
│   │   ├── App.tsx          # Main app component
│   │   └── index.css        # Global styles
│   ├── public/              # Static assets
│   └── index.html
├── server/
│   ├── agent/
│   │   ├── agentLoop.ts     # Core agent execution
│   │   ├── toolRegistry.ts  # Tool management
│   │   ├── errorRecovery.ts # Error handling
│   │   ├── memory.ts        # Memory hierarchy
│   │   ├── analytics.ts     # Performance metrics
│   │   ├── scheduler.ts     # Task scheduling
│   │   └── tools/           # Tool implementations
│   ├── websocket/
│   │   └── agentSocket.ts   # WebSocket server
│   ├── routers/
│   │   └── agent.ts         # tRPC procedures
│   ├── db.ts                # Database queries
│   └── routers.ts           # Main router
├── drizzle/
│   └── schema.ts            # Database schema
├── shared/                  # Shared types
└── package.json
```

## Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Performance Considerations

### Token Usage
- Hunter Alpha has a 1M token context window
- Memory hierarchy automatically manages context to stay within limits
- Token usage is tracked per task for cost estimation

### Concurrency
- Tool execution supports configurable concurrency limits
- Error recovery uses exponential backoff to prevent overwhelming systems
- Circuit breaker pattern prevents cascading failures

### Scalability
- Database-backed task storage for persistence
- WebSocket message queuing for offline clients
- Scheduler supports thousands of concurrent tasks

## Error Handling

The platform includes three recovery strategies:

1. **Aggressive**: Retry up to 5 times with 100ms-5s backoff
2. **Moderate**: Retry up to 3 times with 500ms-3s backoff (default)
3. **Conservative**: Retry once with 1-2s backoff

Each tool execution is wrapped with automatic retry logic and fallback chains.

## Contributing

1. Create a feature branch
2. Implement changes with tests
3. Ensure TypeScript compilation passes
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review example code in `/examples`

## Roadmap

- [ ] Advanced task scheduling with dependencies
- [ ] Multi-agent collaboration
- [ ] Custom tool marketplace
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications
- [ ] Rate limiting and quotas
- [ ] Team collaboration features
- [ ] API key management

## Acknowledgments

- Built with [Hunter Alpha](https://openrouter.ai/openrouter/hunter-alpha) - 1 trillion parameter frontier intelligence model
- Powered by [Manus](https://manus.im) - AI agent platform
- Uses [tRPC](https://trpc.io) for type-safe APIs
- Database with [Drizzle ORM](https://orm.drizzle.team)
