import { Request, Response, NextFunction } from "express";

/**
 * CORS Configuration
 */
export interface CORSConfig {
  origin?: string | string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
}

/**
 * Default CORS configuration
 */
export const defaultCORSConfig: CORSConfig = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  credentials: false,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
};

/**
 * CORS middleware factory
 */
export function createCORSMiddleware(config: CORSConfig = defaultCORSConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Determine if origin is allowed
    let isAllowed = false;
    if (typeof config.origin === "string") {
      isAllowed = config.origin === "*" || config.origin === origin;
    } else if (Array.isArray(config.origin)) {
      isAllowed = config.origin.includes(origin || "");
    } else if (typeof config.origin === "function") {
      config.origin(origin, (err, allow) => {
        if (err) {
          return next(err);
        }
        if (allow) {
          res.setHeader("Access-Control-Allow-Origin", origin || "*");
        }
      });
      isAllowed = true;
    } else {
      isAllowed = true;
    }

    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (config.origin === "*") {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Set allowed methods
    if (config.methods) {
      res.setHeader("Access-Control-Allow-Methods", config.methods.join(", "));
    }

    // Set allowed headers
    if (config.allowedHeaders) {
      res.setHeader("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
    }

    // Set exposed headers
    if (config.exposedHeaders) {
      res.setHeader("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
    }

    // Set credentials
    if (config.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // Set max age for preflight
    if (config.maxAge) {
      res.setHeader("Access-Control-Max-Age", config.maxAge.toString());
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      if (config.preflightContinue) {
        next();
      } else {
        res.sendStatus(204);
      }
    } else {
      next();
    }
  };
}

/**
 * Strict CORS middleware (only specific origins)
 */
export function createStrictCORSMiddleware(allowedOrigins: string[]) {
  return createCORSMiddleware({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });
}

/**
 * Public CORS middleware (all origins)
 */
export function publicCORSMiddleware(req: Request, res: Response, next: NextFunction) {
  return createCORSMiddleware(defaultCORSConfig)(req, res, next);
}

/**
 * Development CORS middleware (all origins with credentials)
 */
export function devCORSMiddleware(req: Request, res: Response, next: NextFunction) {
  const devConfig: CORSConfig = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["*"],
    credentials: false,
    maxAge: 86400,
  };

  return createCORSMiddleware(devConfig)(req, res, next);
}
