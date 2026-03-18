# Hunter Agent Platform - Developer Guide

## Project Overview

Hunter Agent Platform is a production-ready task execution and automation system built with React 19, Express 4, tRPC 11, and MySQL. It provides real-time task execution, webhooks, analytics, and enterprise-grade features like audit logging, rate limiting, and API key management.

**Tech Stack:**
- **Frontend:** React 19 + Tailwind CSS 4 + TypeScript
- **Backend:** Express 4 + tRPC 11 + Drizzle ORM
- **Database:** MySQL with Drizzle migrations
- **Authentication:** Custom JWT-based (Argon2 password hashing)
- **Real-time:** WebSocket for live task execution
- **Testing:** Vitest for unit tests

---

## Project Structure

```
hunter-agent-platform/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                   # Page components (Home, Login, Register, etc.)
│   │   ├── components/              # Reusable UI components
│   │   │   ├── DashboardLayout.tsx  # Main dashboard layout
│   │   │   ├── Login.tsx            # Login form
│   │   │   ├── Register.tsx         # Registration form
│   │   │   ├── ProtectedRoute.tsx   # Route protection wrapper
│   │   │   └── ...
│   │   ├── contexts/                # React contexts
│   │   │   └── AuthContext.tsx      # Global auth state
│   │   ├── lib/
│   │   │   └── trpc.ts              # tRPC client configuration
│   │   ├── App.tsx                  # Main app routes
│   │   └── main.tsx                 # Entry point
│   ├── public/                      # Static assets (favicon, robots.txt)
│   └── index.html
│
├── server/                          # Express backend
│   ├── routers/                     # tRPC route definitions
│   │   ├── customAuthRouter.ts      # Authentication endpoints
│   │   ├── tasks.ts                 # Task management
│   │   ├── history.ts               # Task history and filtering
│   │   ├── notifications.ts         # Notification management
│   │   ├── webhooks.ts              # Webhook management
│   │   ├── apiKeys.ts               # API key management
│   │   ├── admin.ts                 # Admin dashboard
│   │   ├── analytics.ts             # Analytics and metrics
│   │   ├── health.ts                # Health check endpoints
│   │   ├── audit.ts                 # Audit logging
│   │   ├── dataExport.ts            # Data export functionality
│   │   ├── apiDocs.ts               # API documentation
│   │   └── routers.ts               # Main router aggregation
│   │
│   ├── services/                    # Business logic services
│   │   ├── customAuth.ts            # JWT auth service
│   │   ├── retryPolicy.ts           # Retry logic with circuit breaker
│   │   ├── rateLimiter.ts           # Rate limiting service
│   │   ├── healthCheck.ts           # Health monitoring
│   │   ├── auditLogger.ts           # Audit trail logging
│   │   ├── dataExporter.ts          # CSV/JSON export
│   │   ├── notificationBroadcaster.ts # WebSocket notifications
│   │   ├── openApiGenerator.ts      # OpenAPI spec generation
│   │   └── ...
│   │
│   ├── middleware/                  # Express middleware
│   │   ├── rateLimitMiddleware.ts   # Rate limiting middleware
│   │   ├── securityHeaders.ts       # Security headers (CSP, HSTS)
│   │   ├── cors.ts                  # CORS configuration
│   │   ├── inputValidation.ts       # Request validation
│   │   └── security.test.ts         # Security tests
│   │
│   ├── websocket/                   # WebSocket handlers
│   │   └── agentSocket.ts           # Real-time task execution
│   │
│   ├── db.ts                        # Database connection & helpers
│   ├── storage.ts                   # S3 storage helpers
│   └── _core/                       # Framework-level code
│       ├── index.ts                 # Server initialization
│       ├── context.ts               # tRPC context
│       ├── env.ts                   # Environment variables
│       ├── llm.ts                   # LLM integration
│       ├── map.ts                   # Maps integration
│       └── ...
│
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                    # Table definitions
│   ├── 0001_*.sql                   # Migration files
│   └── config.ts
│
├── shared/                          # Shared types & constants
│   └── constants.ts
│
├── .env.local                       # Local development config
├── .env.example                     # Environment variables template
├── drizzle.config.ts                # Drizzle ORM config
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite bundler config
├── vitest.config.ts                 # Test runner config
├── package.json                     # Dependencies
└── DEVELOPER_GUIDE.md               # This file

```

---

## Core Features & Implementation Status

### ✅ Authentication System (Production Ready)
**Files:** `server/services/customAuth.ts`, `server/routers/customAuthRouter.ts`, `client/src/contexts/AuthContext.tsx`

**Features:**
- JWT-based authentication with Argon2 password hashing
- Email/password login and registration
- Token refresh mechanism
- Protected routes with automatic redirects
- Browser-compatible token storage

**API Endpoints:**
```typescript
// tRPC procedures
trpc.customAuth.register.useMutation()    // POST /api/trpc/customAuth.register
trpc.customAuth.login.useMutation()       // POST /api/trpc/customAuth.login
trpc.customAuth.refreshToken.useMutation() // POST /api/trpc/customAuth.refreshToken
trpc.customAuth.logout.useMutation()      // POST /api/trpc/customAuth.logout
```

**Example Usage:**
```typescript
// Frontend
const { mutate: login } = trpc.customAuth.login.useMutation();
login({ email: "user@example.com", password: "password123" }, {
  onSuccess: (data) => {
    localStorage.setItem('authToken', data.accessToken);
    router.push('/dashboard');
  }
});

// Backend
export const customAuthRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      // Implementation
    }),
});
```

---

### ✅ Task Execution System (Production Ready)
**Files:** `server/routers/tasks.ts`, `server/websocket/agentSocket.ts`

**Features:**
- Real-time task execution with WebSocket streaming
- Task status tracking (pending, running, completed, failed)
- Tool execution with streaming thoughts and results
- Error handling and recovery

**API Endpoints:**
```typescript
trpc.tasks.create.useMutation()           // Create new task
trpc.tasks.execute.useMutation()          // Execute task
trpc.tasks.getStatus.useQuery()           // Get task status
trpc.tasks.cancel.useMutation()           // Cancel running task
```

**WebSocket Example:**
```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/api/ws/agent');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle streaming updates
};
```

---

### ✅ Task Scheduling (Production Ready)
**Files:** `server/routers/tasks.ts` (scheduleTask procedure)

**Features:**
- Cron-based task scheduling
- Background job processing
- Task result persistence
- Recurring task support

**API Endpoints:**
```typescript
trpc.tasks.scheduleTask.useMutation({
  taskId: 123,
  cronExpression: "0 9 * * MON-FRI",  // 9 AM weekdays
  enabled: true
})
```

**Cron Format:** Standard Unix cron (5 fields: minute hour day month weekday)

---

### ✅ Webhook System (Production Ready)
**Files:** `server/routers/webhooks.ts`, `drizzle/schema.ts`

**Features:**
- Event-driven webhooks
- Automatic retry with exponential backoff
- Webhook signature verification
- Delivery tracking and history

**API Endpoints:**
```typescript
trpc.webhooks.create.useMutation()        // Create webhook
trpc.webhooks.list.useQuery()             // List webhooks
trpc.webhooks.test.useMutation()          // Test webhook
trpc.webhooks.getDeliveries.useQuery()    // View delivery history
```

**Example Webhook Payload:**
```json
{
  "event": "task.completed",
  "taskId": 123,
  "status": "success",
  "result": { "output": "..." },
  "timestamp": "2026-03-18T12:00:00Z",
  "signature": "sha256=..."
}
```

---

### ✅ Analytics & Dashboard (Production Ready)
**Files:** `server/routers/analytics.ts`, `client/src/pages/Analytics.tsx`

**Features:**
- Real-time task metrics
- Success rate tracking
- Execution time analysis
- System health scoring

**API Endpoints:**
```typescript
trpc.analytics.getPlatformStats.useQuery()
trpc.analytics.getExecutionTimeline.useQuery({ days: 30 })
trpc.analytics.getRetryStats.useQuery()
trpc.analytics.getSystemHealth.useQuery()
```

---

### ✅ Task Templates System (Production Ready)
**Files:** `server/routers/templates.ts`, `drizzle/schema.ts`

**Features:**
- Create reusable task templates
- Template versioning
- Usage tracking and analytics
- Quick task creation from templates

**API Endpoints:**
```typescript
trpc.templates.create.useMutation()
trpc.templates.list.useQuery()
trpc.templates.getById.useQuery()
trpc.templates.createFromTemplate.useMutation()
```

---

### ✅ Background Job Processing (Production Ready)
**Files:** `server/websocket/agentSocket.ts`, `server/routers/tasks.ts`

**Features:**
- Asynchronous task processing
- Job queue management
- Progress tracking
- Error recovery

---

### ✅ Task Result Persistence (Production Ready)
**Files:** `drizzle/schema.ts` (tasks table), `server/routers/tasks.ts`

**Features:**
- Store task results in database
- Result export in JSON/CSV
- Result history and versioning
- Metadata and context preservation

---

### ✅ Enterprise Features (Production Ready)

#### Audit Logging
**Files:** `server/services/auditLogger.ts`, `server/routers/audit.ts`
- Track all user actions
- Export audit trails
- Compliance reporting

#### Rate Limiting
**Files:** `server/services/rateLimiter.ts`, `server/middleware/rateLimitMiddleware.ts`
- Per-user rate limiting
- Per-endpoint limits
- Token bucket algorithm

#### API Key Management
**Files:** `server/routers/apiKeys.ts`
- Generate and rotate API keys
- Scope-based access control
- Usage tracking

#### Security Headers
**Files:** `server/middleware/securityHeaders.ts`
- HSTS, CSP, X-Frame-Options
- CORS configuration
- Input sanitization

#### Health Checks
**Files:** `server/services/healthCheck.ts`, `server/routers/health.ts`
- Database connectivity
- Service availability
- System metrics

#### Data Export
**Files:** `server/services/dataExporter.ts`, `server/routers/dataExport.ts`
- Export to JSON/CSV
- Scheduled exports
- Compliance support

---

## Implementation Guidelines for Engineers

### 1. Adding New Features

#### Step 1: Update Database Schema
```typescript
// drizzle/schema.ts
export const newFeature = mysqlTable("newFeature", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

#### Step 2: Generate Migration
```bash
pnpm drizzle-kit generate
# Review generated SQL file
```

#### Step 3: Apply Migration
```bash
# Use webdev_execute_sql tool or run locally
mysql -u user -p database < drizzle/XXXX_migration.sql
```

#### Step 4: Create Database Helpers
```typescript
// server/db.ts
export async function getNewFeatures(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newFeature).where(eq(newFeature.userId, userId));
}
```

#### Step 5: Create tRPC Router
```typescript
// server/routers/newFeature.ts
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";

export const newFeatureRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return getNewFeatures(ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      
      return db.insert(newFeature).values({
        userId: ctx.user.id,
        name: input.name,
      });
    }),
});
```

#### Step 6: Register Router
```typescript
// server/routers.ts
import { newFeatureRouter } from "./newFeature";

export const appRouter = router({
  newFeature: newFeatureRouter,
  // ... other routers
});
```

#### Step 7: Create Frontend Component
```typescript
// client/src/pages/NewFeature.tsx
import { trpc } from "../lib/trpc";

export function NewFeaturePage() {
  const { data, isLoading } = trpc.newFeature.list.useQuery();
  const { mutate: create } = trpc.newFeature.create.useMutation();

  return (
    <div>
      {/* UI implementation */}
    </div>
  );
}
```

#### Step 8: Write Tests
```typescript
// server/routers/newFeature.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestContext } from "../_core/test-utils";

describe("newFeatureRouter", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("should list features", async () => {
    const result = await ctx.caller.newFeature.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

#### Step 9: Commit to GitHub
```bash
git add -A
git commit -m "feat: Add new feature with database, router, and UI

- Created newFeature table with schema
- Implemented tRPC router with CRUD operations
- Built React component with tRPC hooks
- Added comprehensive unit tests
- All 150+ tests passing"
git push
```

---

### 2. Code Style & Best Practices

#### TypeScript
- Always use strict mode
- Define explicit return types
- Use `z.object()` for input validation
- Avoid `any` type (use `unknown` instead)

#### Database Queries
```typescript
// ✅ Good: Type-safe with Drizzle
const result = await db
  .select()
  .from(users)
  .where(eq(users.id, userId));

// ❌ Bad: Raw SQL
const result = await db.execute(`SELECT * FROM users WHERE id = ${userId}`);
```

#### Error Handling
```typescript
// ✅ Good: Explicit error handling
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error("Operation failed", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Operation failed",
  });
}

// ❌ Bad: Silent failures
try {
  return await operation();
} catch (e) {
  // Silently fail
}
```

#### Component Structure
```typescript
// ✅ Good: Organized with hooks at top
export function MyComponent() {
  const { data } = trpc.feature.useQuery();
  const { mutate } = trpc.feature.useMutation();
  const [state, setState] = useState();

  useEffect(() => {
    // Side effects
  }, []);

  return <div>{/* JSX */}</div>;
}

// ❌ Bad: Mixed logic and JSX
export function MyComponent() {
  return (
    <div>
      {(() => {
        const { data } = trpc.feature.useQuery();
        return data?.map(...);
      })()}
    </div>
  );
}
```

---

### 3. Testing Standards

**All new features MUST include tests:**

```typescript
// Minimum test coverage
describe("featureName", () => {
  // Happy path
  it("should work correctly", async () => {
    const result = await operation();
    expect(result).toBeDefined();
  });

  // Error cases
  it("should handle errors", async () => {
    expect(async () => {
      await invalidOperation();
    }).rejects.toThrow();
  });

  // Edge cases
  it("should handle edge cases", async () => {
    const result = await operation(null);
    expect(result).toEqual(expected);
  });
});
```

**Run tests before committing:**
```bash
pnpm test
# All tests must pass
```

---

### 4. API Response Format

All tRPC endpoints return typed responses:

```typescript
// Success response
{
  status: "success",
  data: { /* payload */ },
  timestamp: "2026-03-18T12:00:00Z"
}

// Error response
{
  status: "error",
  error: {
    code: "UNAUTHORIZED",
    message: "User not authenticated"
  },
  timestamp: "2026-03-18T12:00:00Z"
}
```

---

### 5. Database Migration Checklist

- [ ] Schema changes defined in `drizzle/schema.ts`
- [ ] Migration generated with `pnpm drizzle-kit generate`
- [ ] SQL file reviewed for correctness
- [ ] Migration applied with `webdev_execute_sql`
- [ ] Rollback plan documented
- [ ] All tests passing
- [ ] Changes committed to GitHub

---

### 6. Security Checklist

- [ ] Input validation with Zod
- [ ] Authentication check with `protectedProcedure`
- [ ] Authorization checks in procedures
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection (tRPC handles)
- [ ] Rate limiting applied
- [ ] Sensitive data not logged
- [ ] API keys not hardcoded

---

## Production Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm tsc`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented
- [ ] Code reviewed and approved
- [ ] Changelog updated
- [ ] Deployment runbook created

---

## Common Tasks

### Adding a New API Endpoint
1. Create input schema with Zod
2. Add procedure to router
3. Register in main router
4. Write tests
5. Create frontend hook
6. Commit with message: `feat: Add new endpoint`

### Fixing a Bug
1. Create test that reproduces bug
2. Fix the bug
3. Verify test passes
4. Commit with message: `fix: Resolve issue with...`

### Performance Optimization
1. Profile with browser DevTools
2. Identify bottleneck
3. Implement optimization
4. Benchmark improvement
5. Commit with message: `perf: Improve...`

### Database Schema Change
1. Update `drizzle/schema.ts`
2. Generate migration
3. Review SQL
4. Apply migration
5. Update database helpers
6. Update tests
7. Commit with message: `refactor: Update database schema`

---

## Troubleshooting

### Database Connection Issues
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
mysql -u user -p -h host database

# Check migrations applied
mysql -u user -p database -e "SELECT * FROM drizzle_migrations;"
```

### TypeScript Errors
```bash
# Check for errors
pnpm tsc --noEmit

# Fix common issues
pnpm tsc --noEmit 2>&1 | head -20
```

### Test Failures
```bash
# Run specific test
pnpm test -- filename.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose

# Update snapshots
pnpm test -- -u
```

---

## Resources

- **tRPC Documentation:** https://trpc.io/docs
- **Drizzle ORM:** https://orm.drizzle.team
- **React Documentation:** https://react.dev
- **TypeScript Handbook:** https://www.typescriptlang.org/docs
- **MySQL Documentation:** https://dev.mysql.com/doc

---

## Support & Questions

For questions about implementation:
1. Check existing code patterns in similar features
2. Review test files for usage examples
3. Consult this guide's implementation sections
4. Ask in team communication channels

---

**Last Updated:** March 18, 2026
**Version:** 1.0
**Maintained By:** Engineering Team
