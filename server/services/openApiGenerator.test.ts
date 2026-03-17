import { describe, it, expect } from "vitest";
import { OpenAPIGenerator } from "./openApiGenerator";

describe("OpenAPI Generator", () => {
  describe("OpenAPI Specification Generation", () => {
    it("should generate valid OpenAPI specification", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe("3.0.0");
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it("should include API metadata", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.info.title).toBe("Hunter Agent Platform API");
      expect(spec.info.version).toBe("1.0.0");
      expect(spec.info.description).toBeDefined();
      expect(spec.info.contact).toBeDefined();
      expect(spec.info.license).toBeDefined();
    });

    it("should include servers configuration", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.servers).toBeDefined();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0].url).toBeDefined();
      expect(spec.servers[0].description).toBeDefined();
    });

    it("should include security schemes", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.BearerAuth.type).toBe("http");
      expect(spec.components.securitySchemes.BearerAuth.scheme).toBe("bearer");
    });
  });

  describe("API Paths Generation", () => {
    it("should include task endpoints", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/tasks.create"]).toBeDefined();
      expect(spec.paths["/api/trpc/tasks.list"]).toBeDefined();
    });

    it("should include webhook endpoints", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/webhooks.create"]).toBeDefined();
    });

    it("should include analytics endpoints", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/analytics.getStats"]).toBeDefined();
    });

    it("should include admin endpoints", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/admin.getSystemStats"]).toBeDefined();
    });

    it("should include export endpoints", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/dataExport.exportAuditLogs"]).toBeDefined();
    });

    it("should have proper HTTP methods", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.paths["/api/trpc/tasks.create"].post).toBeDefined();
      expect(spec.paths["/api/trpc/tasks.list"].get).toBeDefined();
    });

    it("should include endpoint descriptions", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;

      expect(createTaskEndpoint.summary).toBeDefined();
      expect(createTaskEndpoint.description).toBeDefined();
      expect(createTaskEndpoint.tags).toBeDefined();
    });
  });

  describe("API Schemas", () => {
    it("should include Task schema", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.components.schemas.Task).toBeDefined();
      expect(spec.components.schemas.Task.properties).toBeDefined();
      expect(spec.components.schemas.Task.properties.id).toBeDefined();
      expect(spec.components.schemas.Task.properties.title).toBeDefined();
    });

    it("should include Webhook schema", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.components.schemas.Webhook).toBeDefined();
      expect(spec.components.schemas.Webhook.properties.url).toBeDefined();
      expect(spec.components.schemas.Webhook.properties.events).toBeDefined();
    });

    it("should include Error schema", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.components.schemas.Error).toBeDefined();
      expect(spec.components.schemas.Error.properties.code).toBeDefined();
      expect(spec.components.schemas.Error.properties.message).toBeDefined();
    });
  });

  describe("API Tags", () => {
    it("should generate API tags", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.tags).toBeDefined();
      expect(spec.tags.length).toBeGreaterThan(0);
    });

    it("should include required tags", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const tagNames = spec.tags.map((t: any) => t.name);

      expect(tagNames).toContain("Tasks");
      expect(tagNames).toContain("Webhooks");
      expect(tagNames).toContain("Analytics");
      expect(tagNames).toContain("Admin");
    });

    it("should have tag descriptions", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();

      expect(spec.tags[0].description).toBeDefined();
    });
  });

  describe("Documentation Generation", () => {
    it("should generate valid HTML documentation", () => {
      const html = OpenAPIGenerator.generateDocumentationHTML();

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Hunter Agent Platform API Documentation");
      expect(html).toContain("redoc");
    });

    it("should include Redoc script", () => {
      const html = OpenAPIGenerator.generateDocumentationHTML();

      expect(html).toContain("redoc@latest");
      expect(html).toContain("redoc.standalone.js");
    });

    it("should reference OpenAPI spec", () => {
      const html = OpenAPIGenerator.generateDocumentationHTML();

      expect(html).toContain("spec-url");
    });
  });

  describe("Client SDK Generation", () => {
    it("should generate TypeScript client SDK", () => {
      const sdk = OpenAPIGenerator.generateClientSDK();

      expect(sdk).toContain("class HunterAgentClient");
      expect(sdk).toContain("constructor");
      expect(sdk).toContain("request");
    });

    it("should include task methods", () => {
      const sdk = OpenAPIGenerator.generateClientSDK();

      expect(sdk).toContain("async createTask");
      expect(sdk).toContain("async listTasks");
      expect(sdk).toContain("async getTask");
    });

    it("should include webhook methods", () => {
      const sdk = OpenAPIGenerator.generateClientSDK();

      expect(sdk).toContain("async createWebhook");
      expect(sdk).toContain("async listWebhooks");
    });

    it("should include export methods", () => {
      const sdk = OpenAPIGenerator.generateClientSDK();

      expect(sdk).toContain("async exportAuditLogs");
      expect(sdk).toContain("async exportUsers");
      expect(sdk).toContain("async exportTasks");
    });

    it("should include authentication handling", () => {
      const sdk = OpenAPIGenerator.generateClientSDK();

      expect(sdk).toContain("Authorization");
      expect(sdk).toContain("Bearer");
    });
  });

  describe("API Reference Generation", () => {
    it("should generate markdown API reference", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("# Hunter Agent Platform API Reference");
      expect(reference).toContain("## Overview");
      expect(reference).toContain("## Authentication");
      expect(reference).toContain("## Endpoints");
    });

    it("should include authentication section", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("Bearer token");
      expect(reference).toContain("Authorization header");
    });

    it("should include base URL information", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("Base URL");
      expect(reference).toContain("https://api.manus.space");
      expect(reference).toContain("http://localhost:3000");
    });

    it("should include rate limiting information", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("Rate Limiting");
      expect(reference).toContain("1000 requests per hour");
    });

    it("should include endpoint examples", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("### Tasks");
      expect(reference).toContain("POST /api/trpc/tasks.create");
      expect(reference).toContain("GET /api/trpc/tasks.list");
    });

    it("should include curl examples", () => {
      const reference = OpenAPIGenerator.generateAPIReference();

      expect(reference).toContain("curl");
      expect(reference).toContain("Authorization: Bearer");
    });
  });

  describe("API Response Formats", () => {
    it("should include response schemas", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;

      expect(createTaskEndpoint.responses).toBeDefined();
      expect(createTaskEndpoint.responses["200"]).toBeDefined();
    });

    it("should include error responses", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;

      expect(createTaskEndpoint.responses["400"]).toBeDefined();
      expect(createTaskEndpoint.responses["401"]).toBeDefined();
    });

    it("should include response content types", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;
      const response = createTaskEndpoint.responses["200"];

      expect(response.content).toBeDefined();
      expect(response.content["application/json"]).toBeDefined();
    });
  });

  describe("API Request Bodies", () => {
    it("should include request body schemas", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;

      expect(createTaskEndpoint.requestBody).toBeDefined();
      expect(createTaskEndpoint.requestBody.required).toBe(true);
    });

    it("should include request content types", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;

      expect(createTaskEndpoint.requestBody.content["application/json"]).toBeDefined();
    });

    it("should include request schema properties", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const createTaskEndpoint = spec.paths["/api/trpc/tasks.create"].post;
      const schema = createTaskEndpoint.requestBody.content["application/json"].schema;

      expect(schema.properties).toBeDefined();
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.description).toBeDefined();
    });
  });

  describe("API Parameters", () => {
    it("should include query parameters", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const listTasksEndpoint = spec.paths["/api/trpc/tasks.list"].get;

      expect(listTasksEndpoint.parameters).toBeDefined();
      expect(listTasksEndpoint.parameters.length).toBeGreaterThan(0);
    });

    it("should include parameter descriptions", () => {
      const spec = OpenAPIGenerator.generateOpenAPISpec();
      const listTasksEndpoint = spec.paths["/api/trpc/tasks.list"].get;
      const statusParam = listTasksEndpoint.parameters.find(
        (p: any) => p.name === "status"
      );

      expect(statusParam).toBeDefined();
      expect(statusParam.description).toBeDefined();
    });
  });
});
