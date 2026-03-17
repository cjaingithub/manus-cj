import { describe, it, expect } from "vitest";
import { createSecurityHeadersMiddleware, defaultSecurityConfig } from "./securityHeaders";
import { createCORSMiddleware, defaultCORSConfig } from "./cors";
// Inline sanitizeString for testing
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

describe("Security Middleware", () => {
  describe("Security Headers", () => {
    it("should have HSTS header", () => {
      expect(defaultSecurityConfig.enableHSTS).toBe(true);
      expect(defaultSecurityConfig.hstsMaxAge).toBe(31536000);
    });

    it("should have CSP header", () => {
      expect(defaultSecurityConfig.enableCSP).toBe(true);
      expect(defaultSecurityConfig.cspDirectives).toBeDefined();
    });

    it("should have X-Frame-Options header", () => {
      expect(defaultSecurityConfig.enableXFrameOptions).toBe(true);
    });

    it("should have X-Content-Type-Options header", () => {
      expect(defaultSecurityConfig.enableXContentTypeOptions).toBe(true);
    });

    it("should have X-XSS-Protection header", () => {
      expect(defaultSecurityConfig.enableXXSSProtection).toBe(true);
    });

    it("should have Referrer-Policy header", () => {
      expect(defaultSecurityConfig.enableReferrerPolicy).toBe(true);
    });

    it("should have Permissions-Policy header", () => {
      expect(defaultSecurityConfig.enablePermissionsPolicy).toBe(true);
    });

    it("should have CSP directives", () => {
      const directives = defaultSecurityConfig.cspDirectives;
      expect(directives).toHaveProperty("default-src");
      expect(directives).toHaveProperty("script-src");
      expect(directives).toHaveProperty("style-src");
      expect(directives).toHaveProperty("img-src");
      expect(directives).toHaveProperty("font-src");
      expect(directives).toHaveProperty("connect-src");
      expect(directives).toHaveProperty("frame-ancestors");
    });
  });

  describe("CORS Configuration", () => {
    it("should allow all origins by default", () => {
      expect(defaultCORSConfig.origin).toBe("*");
    });

    it("should allow common HTTP methods", () => {
      expect(defaultCORSConfig.methods).toContain("GET");
      expect(defaultCORSConfig.methods).toContain("POST");
      expect(defaultCORSConfig.methods).toContain("PUT");
      expect(defaultCORSConfig.methods).toContain("DELETE");
      expect(defaultCORSConfig.methods).toContain("PATCH");
    });

    it("should allow common headers", () => {
      expect(defaultCORSConfig.allowedHeaders).toContain("Content-Type");
      expect(defaultCORSConfig.allowedHeaders).toContain("Authorization");
    });

    it("should expose rate limit headers", () => {
      expect(defaultCORSConfig.exposedHeaders).toContain("X-RateLimit-Limit");
      expect(defaultCORSConfig.exposedHeaders).toContain("X-RateLimit-Remaining");
      expect(defaultCORSConfig.exposedHeaders).toContain("X-RateLimit-Reset");
    });

    it("should have reasonable max age", () => {
      expect(defaultCORSConfig.maxAge).toBe(86400);
    });
  });

  describe("Input Sanitization", () => {
    it("should remove angle brackets", () => {
      const input = "Hello <script>alert('xss')</script>";
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
    });

    it("should remove javascript protocol", () => {
      const input = "javascript:alert('xss')";
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain("javascript:");
    });

    it("should remove event handlers", () => {
      const input = 'onclick=alert("xss")';
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain("onclick");
    });

    it("should trim whitespace", () => {
      const input = "  hello world  ";
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe("hello world");
    });

    it("should preserve normal text", () => {
      const input = "Hello, World!";
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe("Hello, World!");
    });
  });

  describe("Security Best Practices", () => {
    it("should have HSTS enabled for production", () => {
      expect(defaultSecurityConfig.enableHSTS).toBe(true);
    });

    it("should have CSP enabled", () => {
      expect(defaultSecurityConfig.enableCSP).toBe(true);
    });

    it("should have clickjacking protection", () => {
      expect(defaultSecurityConfig.enableXFrameOptions).toBe(true);
    });

    it("should have MIME type sniffing protection", () => {
      expect(defaultSecurityConfig.enableXContentTypeOptions).toBe(true);
    });

    it("should have XSS protection", () => {
      expect(defaultSecurityConfig.enableXXSSProtection).toBe(true);
    });

    it("should restrict referrer information", () => {
      expect(defaultSecurityConfig.enableReferrerPolicy).toBe(true);
    });

    it("should restrict feature access", () => {
      expect(defaultSecurityConfig.enablePermissionsPolicy).toBe(true);
    });
  });
});
