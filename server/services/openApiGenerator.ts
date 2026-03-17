/**
 * OpenAPI Documentation Generator
 * Generates OpenAPI 3.0 specification for the Hunter Agent Platform API
 */

export interface OpenAPIEndpoint {
  path: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: string[];
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header";
  description: string;
  required: boolean;
  schema: Record<string, any>;
}

export interface OpenAPIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, { schema: Record<string, any> }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: Record<string, any> }>;
}

export class OpenAPIGenerator {
  /**
   * Generate OpenAPI specification
   */
  static generateOpenAPISpec(): Record<string, any> {
    return {
      openapi: "3.0.0",
      info: {
        title: "Hunter Agent Platform API",
        description: "API for creating and executing autonomous tasks with real-time observability",
        version: "1.0.0",
        contact: {
          name: "Hunter Agent Support",
          url: "https://github.com/cjaingithub/manus-cj",
        },
        license: {
          name: "MIT",
        },
      },
      servers: [
        {
          url: "https://api.manus.space",
          description: "Production server",
        },
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      paths: this.generatePaths(),
      components: this.generateComponents(),
      tags: this.generateTags(),
      security: [
        {
          BearerAuth: [],
        },
      ],
    };
  }

  /**
   * Generate API paths
   */
  private static generatePaths(): Record<string, any> {
    return {
      "/api/trpc/tasks.create": {
        post: {
          summary: "Create a new task",
          description: "Create a new autonomous task for execution",
          tags: ["Tasks"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["title"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Task created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      title: { type: "string" },
                      status: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid input",
            },
            "401": {
              description: "Unauthorized",
            },
          },
        },
      },
      "/api/trpc/tasks.list": {
        get: {
          summary: "List all tasks",
          description: "Retrieve a list of all tasks with optional filtering",
          tags: ["Tasks"],
          parameters: [
            {
              name: "status",
              in: "query",
              description: "Filter by task status",
              required: false,
              schema: {
                type: "string",
                enum: ["pending", "running", "completed", "failed"],
              },
            },
            {
              name: "limit",
              in: "query",
              description: "Maximum number of tasks to return",
              required: false,
              schema: { type: "number", default: 50 },
            },
          ],
          responses: {
            "200": {
              description: "List of tasks",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/trpc/webhooks.create": {
        post: {
          summary: "Create a webhook",
          description: "Create a new webhook for event notifications",
          tags: ["Webhooks"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string", format: "uri" },
                    events: { type: "array", items: { type: "string" } },
                  },
                  required: ["url", "events"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Webhook created successfully",
            },
          },
        },
      },
      "/api/trpc/analytics.getStats": {
        get: {
          summary: "Get platform analytics",
          description: "Retrieve platform statistics and metrics",
          tags: ["Analytics"],
          responses: {
            "200": {
              description: "Platform analytics",
            },
          },
        },
      },
      "/api/trpc/admin.getSystemStats": {
        get: {
          summary: "Get system statistics",
          description: "Retrieve system-wide statistics (admin only)",
          tags: ["Admin"],
          responses: {
            "200": {
              description: "System statistics",
            },
            "403": {
              description: "Forbidden - admin access required",
            },
          },
        },
      },
      "/api/trpc/dataExport.exportAuditLogs": {
        get: {
          summary: "Export audit logs",
          description: "Export audit logs in JSON or CSV format",
          tags: ["Export"],
          parameters: [
            {
              name: "format",
              in: "query",
              description: "Export format",
              required: false,
              schema: { type: "string", enum: ["json", "csv"], default: "json" },
            },
          ],
          responses: {
            "200": {
              description: "Exported audit logs",
            },
          },
        },
      },
    };
  }

  /**
   * Generate component schemas
   */
  private static generateComponents(): Record<string, any> {
    return {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "number" },
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["pending", "running", "completed", "failed"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            createdAt: { type: "string", format: "date-time" },
            completedAt: { type: "string", format: "date-time", nullable: true },
          },
          required: ["id", "title", "status", "createdAt"],
        },
        Webhook: {
          type: "object",
          properties: {
            id: { type: "number" },
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            active: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["id", "url", "events", "active"],
        },
        Error: {
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: { type: "object" },
          },
          required: ["code", "message"],
        },
      },
    };
  }

  /**
   * Generate API tags
   */
  private static generateTags(): Array<{ name: string; description: string }> {
    return [
      { name: "Tasks", description: "Task management endpoints" },
      { name: "Webhooks", description: "Webhook management endpoints" },
      { name: "Analytics", description: "Analytics and reporting endpoints" },
      { name: "Admin", description: "Admin-only endpoints" },
      { name: "Export", description: "Data export endpoints" },
      { name: "Notifications", description: "Notification management endpoints" },
      { name: "Health", description: "System health endpoints" },
      { name: "Auth", description: "Authentication endpoints" },
    ];
  }

  /**
   * Generate API documentation HTML
   */
  static generateDocumentationHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Hunter Agent Platform API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <redoc spec-url='/api/openapi.json'></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"> </script>
</body>
</html>
    `;
  }

  /**
   * Generate API client SDK
   */
  static generateClientSDK(): string {
    return `
/**
 * Hunter Agent Platform API Client
 * Auto-generated SDK for the Hunter Agent Platform
 */

export class HunterAgentClient {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(\`\${this.baseURL}\${path}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.token}\`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.statusText}\`);
    }

    return response.json();
  }

  // Tasks
  async createTask(title: string, description?: string) {
    return this.request('/api/trpc/tasks.create', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async listTasks(status?: string, limit: number = 50) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', String(limit));
    return this.request(\`/api/trpc/tasks.list?\${params}\`);
  }

  async getTask(id: number) {
    return this.request(\`/api/trpc/tasks.get?id=\${id}\`);
  }

  // Webhooks
  async createWebhook(url: string, events: string[]) {
    return this.request('/api/trpc/webhooks.create', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    });
  }

  async listWebhooks() {
    return this.request('/api/trpc/webhooks.list');
  }

  // Analytics
  async getAnalytics() {
    return this.request('/api/trpc/analytics.getStats');
  }

  // Export
  async exportAuditLogs(format: 'json' | 'csv' = 'json') {
    return this.request(\`/api/trpc/dataExport.exportAuditLogs?format=\${format}\`);
  }

  async exportUsers(format: 'json' | 'csv' = 'json') {
    return this.request(\`/api/trpc/dataExport.exportUsers?format=\${format}\`);
  }

  async exportTasks(format: 'json' | 'csv' = 'json') {
    return this.request(\`/api/trpc/dataExport.exportTasks?format=\${format}\`);
  }
}

export default HunterAgentClient;
    `;
  }

  /**
   * Generate API reference documentation
   */
  static generateAPIReference(): string {
    return `
# Hunter Agent Platform API Reference

## Overview
The Hunter Agent Platform API allows you to create and manage autonomous tasks, webhooks, and access analytics.

## Authentication
All API requests require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Base URL
- Production: https://api.manus.space
- Development: http://localhost:3000

## Rate Limiting
- Default: 1000 requests per hour
- Burst: 5000 requests per hour

## Error Handling
All errors follow the standard error format:
\`\`\`json
{
  "code": "ERROR_CODE",
  "message": "Error message",
  "details": {}
}
\`\`\`

## Endpoints

### Tasks
- POST /api/trpc/tasks.create - Create a new task
- GET /api/trpc/tasks.list - List all tasks
- GET /api/trpc/tasks.get - Get task details
- PUT /api/trpc/tasks.update - Update a task
- DELETE /api/trpc/tasks.delete - Delete a task

### Webhooks
- POST /api/trpc/webhooks.create - Create a webhook
- GET /api/trpc/webhooks.list - List webhooks
- GET /api/trpc/webhooks.get - Get webhook details
- PUT /api/trpc/webhooks.update - Update a webhook
- DELETE /api/trpc/webhooks.delete - Delete a webhook

### Analytics
- GET /api/trpc/analytics.getStats - Get platform statistics
- GET /api/trpc/analytics.getExecutionTimeline - Get execution timeline
- GET /api/trpc/analytics.getTaskTrends - Get task trends

### Export
- GET /api/trpc/dataExport.exportAuditLogs - Export audit logs
- GET /api/trpc/dataExport.exportUsers - Export users
- GET /api/trpc/dataExport.exportTasks - Export tasks
- GET /api/trpc/dataExport.exportNotifications - Export notifications

## Examples

### Create a Task
\`\`\`bash
curl -X POST https://api.manus.space/api/trpc/tasks.create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Analyze website performance",
    "description": "Run performance analysis on example.com",
    "priority": "high"
  }'
\`\`\`

### List Tasks
\`\`\`bash
curl https://api.manus.space/api/trpc/tasks.list \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

### Create a Webhook
\`\`\`bash
curl -X POST https://api.manus.space/api/trpc/webhooks.create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhook",
    "events": ["task.completed", "task.failed"]
  }'
\`\`\`

## Webhook Events
- task.created
- task.started
- task.completed
- task.failed
- task.paused
- notification.created
- system.alert

## Support
For support, visit https://help.manus.im or contact support@manus.im
    `;
  }
}
