import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Input validation middleware factory
 */
export function createInputValidationMiddleware(schemas: Record<string, z.ZodSchema>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            error: "Invalid query parameters",
            details: result.error.issues,
          });
        }
        req.query = result.data as any;
      }

      // Validate request body
      if (schemas.body && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: "Invalid request body",
            details: result.error.issues,
          });
        }
        req.body = result.data as any;
      }

      // Validate URL parameters
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            error: "Invalid URL parameters",
            details: result.error.issues,
          });
        }
        req.params = result.data as any;
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: "Validation error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Sanitize input middleware
 */
export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  // Sanitize query parameters
  Object.keys(req.query).forEach((key) => {
    const value = req.query[key];
    if (typeof value === "string") {
      req.query[key] = sanitizeString(value);
    }
  });

  // Sanitize request body
  if (typeof req.body === "object" && req.body !== null) {
    req.body = sanitizeObject(req.body);
  }

  next();
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object" && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate JSON Web Token
 */
export function validateJWTMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authorization header missing",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid authorization header format",
    });
  }

  // Token validation would happen here
  // For now, just pass it through
  (req as any).token = parts[1];
  next();
}

/**
 * Validate request size
 */
export function createRequestSizeMiddleware(maxSizeInMB: number = 10) {
  const maxSize = maxSizeInMB * 1024 * 1024;

  return (req: Request, res: Response, next: NextFunction) => {
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        req.pause();
        res.status(413).json({
          error: "Payload Too Large",
          message: `Request size exceeds maximum of ${maxSizeInMB}MB`,
        });
      }
    });

    req.on("end", () => {
      next();
    });
  };
}

/**
 * Validate content type
 */
export function createContentTypeValidationMiddleware(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      const contentType = req.headers["content-type"];

      if (!contentType) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Content-Type header is required",
        });
      }

      const isAllowed = allowedTypes.some((type) => contentType.includes(type));

      if (!isAllowed) {
        return res.status(415).json({
          error: "Unsupported Media Type",
          message: `Content-Type must be one of: ${allowedTypes.join(", ")}`,
        });
      }
    }

    next();
  };
}
