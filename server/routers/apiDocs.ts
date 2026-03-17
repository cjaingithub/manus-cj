import { publicProcedure, router } from "../_core/trpc";
import { OpenAPIGenerator } from "../services/openApiGenerator";

/**
 * API Documentation Router
 * Provides endpoints for API documentation and OpenAPI specification
 */

export const apiDocsRouter = router({
  // Get OpenAPI specification
  getOpenAPISpec: publicProcedure.query(async () => {
    return OpenAPIGenerator.generateOpenAPISpec();
  }),

  // Get API documentation HTML
  getDocumentation: publicProcedure.query(async () => {
    return {
      html: OpenAPIGenerator.generateDocumentationHTML(),
      format: "html",
    };
  }),

  // Get API reference markdown
  getAPIReference: publicProcedure.query(async () => {
    return {
      markdown: OpenAPIGenerator.generateAPIReference(),
      format: "markdown",
    };
  }),

  // Get client SDK
  getClientSDK: publicProcedure.query(async () => {
    return {
      code: OpenAPIGenerator.generateClientSDK(),
      language: "typescript",
      format: "typescript",
    };
  }),

  // Get API endpoints list
  getEndpoints: publicProcedure.query(async () => {
    const spec = OpenAPIGenerator.generateOpenAPISpec();
    const endpoints = Object.entries(spec.paths).map(([path, methods]: any) => {
      return Object.entries(methods).map(([method, details]: any) => ({
        path,
        method: method.toUpperCase(),
        summary: details.summary,
        description: details.description,
        tags: details.tags || [],
      }));
    }).flat();

    return {
      total: endpoints.length,
      endpoints,
    };
  }),

  // Get API tags
  getTags: publicProcedure.query(async () => {
    const spec = OpenAPIGenerator.generateOpenAPISpec();
    return {
      tags: spec.tags,
      total: spec.tags.length,
    };
  }),

  // Get API schemas
  getSchemas: publicProcedure.query(async () => {
    const spec = OpenAPIGenerator.generateOpenAPISpec();
    return {
      schemas: spec.components.schemas,
      total: Object.keys(spec.components.schemas).length,
    };
  }),

  // Get API rate limits
  getRateLimits: publicProcedure.query(async () => {
    return {
      default: {
        requestsPerHour: 1000,
        description: "Default rate limit for all endpoints",
      },
      burst: {
        requestsPerHour: 5000,
        description: "Burst rate limit for premium users",
      },
      resetWindow: "1 hour",
      headers: {
        "X-RateLimit-Limit": "Maximum requests allowed",
        "X-RateLimit-Remaining": "Requests remaining in current window",
        "X-RateLimit-Reset": "Unix timestamp when limit resets",
      },
    };
  }),

  // Get API authentication methods
  getAuthMethods: publicProcedure.query(async () => {
    return {
      methods: [
        {
          name: "Bearer Token",
          type: "http",
          scheme: "bearer",
          format: "JWT",
          description: "Include token in Authorization header",
          example: "Authorization: Bearer YOUR_API_KEY",
        },
        {
          name: "API Key",
          type: "apiKey",
          in: "header",
          description: "Include API key in X-API-Key header",
          example: "X-API-Key: YOUR_API_KEY",
        },
      ],
    };
  }),

  // Get API error codes
  getErrorCodes: publicProcedure.query(async () => {
    return {
      errors: [
        {
          code: "INVALID_REQUEST",
          status: 400,
          description: "The request is invalid or malformed",
        },
        {
          code: "UNAUTHORIZED",
          status: 401,
          description: "Authentication failed or token is invalid",
        },
        {
          code: "FORBIDDEN",
          status: 403,
          description: "Access denied - insufficient permissions",
        },
        {
          code: "NOT_FOUND",
          status: 404,
          description: "The requested resource was not found",
        },
        {
          code: "RATE_LIMITED",
          status: 429,
          description: "Too many requests - rate limit exceeded",
        },
        {
          code: "INTERNAL_ERROR",
          status: 500,
          description: "Internal server error",
        },
        {
          code: "SERVICE_UNAVAILABLE",
          status: 503,
          description: "Service temporarily unavailable",
        },
      ],
    };
  }),

  // Get API changelog
  getChangelog: publicProcedure.query(async () => {
    return {
      versions: [
        {
          version: "1.0.0",
          date: "2026-03-17",
          changes: [
            "Initial API release",
            "Task management endpoints",
            "Webhook support",
            "Analytics and reporting",
            "Data export functionality",
            "Admin dashboard",
            "Real-time notifications",
            "Rate limiting",
            "API documentation",
          ],
        },
      ],
    };
  }),

  // Get API usage examples
  getExamples: publicProcedure.query(async () => {
    return {
      examples: [
        {
          title: "Create a Task",
          description: "Create a new autonomous task",
          language: "bash",
          code: `curl -X POST https://api.manus.space/api/trpc/tasks.create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Analyze website performance",
    "description": "Run performance analysis",
    "priority": "high"
  }'`,
        },
        {
          title: "List Tasks",
          description: "Retrieve all tasks with optional filtering",
          language: "bash",
          code: `curl https://api.manus.space/api/trpc/tasks.list?status=completed \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
        },
        {
          title: "Create a Webhook",
          description: "Set up a webhook for event notifications",
          language: "bash",
          code: `curl -X POST https://api.manus.space/api/trpc/webhooks.create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhook",
    "events": ["task.completed", "task.failed"]
  }'`,
        },
        {
          title: "Export Audit Logs",
          description: "Export audit logs in JSON format",
          language: "bash",
          code: `curl https://api.manus.space/api/trpc/dataExport.exportAuditLogs?format=json \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  > audit-logs.json`,
        },
      ],
    };
  }),

  // Get API SDKs
  getSDKs: publicProcedure.query(async () => {
    return {
      sdks: [
        {
          name: "TypeScript/JavaScript",
          language: "typescript",
          url: "https://github.com/cjaingithub/manus-cj/tree/main/sdk/typescript",
          packageManager: "npm",
          installCommand: "npm install @hunter-agent/sdk",
        },
        {
          name: "Python",
          language: "python",
          url: "https://github.com/cjaingithub/manus-cj/tree/main/sdk/python",
          packageManager: "pip",
          installCommand: "pip install hunter-agent-sdk",
        },
        {
          name: "Go",
          language: "go",
          url: "https://github.com/cjaingithub/manus-cj/tree/main/sdk/go",
          packageManager: "go",
          installCommand: "go get github.com/cjaingithub/manus-cj/sdk/go",
        },
      ],
    };
  }),
});
