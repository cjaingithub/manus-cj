import { Request, Response, NextFunction } from "express";
import { TokenBucketLimiter, DEFAULT_CONFIGS, getRateLimitHeaders } from "../services/rateLimiter";

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(
  limiter: TokenBucketLimiter,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate identifier (user ID, IP, or custom)
      const identifier = keyGenerator ? keyGenerator(req) : req.ip || "unknown";

      // Check rate limit
      const allowed = await limiter.isAllowed(identifier);

      // Add rate limit headers
      const headers = await getRateLimitHeaders(limiter, identifier, {
        windowMs: 60 * 1000,
        maxRequests: 100,
      });

      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!allowed) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: headers["X-RateLimit-Reset"],
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      next();
    }
  };
}

/**
 * Per-user rate limit middleware
 */
export function perUserRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.perUser);

  return createRateLimitMiddleware(limiter, (req) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.id ? `user-${(req as any).user.id}` : req.ip || "unknown";
  })(req, res, next);
}

/**
 * Per-IP rate limit middleware
 */
export function perIpRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.perIp);

  return createRateLimitMiddleware(limiter, (req) => {
    return req.ip || "unknown";
  })(req, res, next);
}

/**
 * API endpoint rate limit middleware
 */
export function apiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.apiEndpoint);

  return createRateLimitMiddleware(limiter, (req) => {
    const endpoint = `${req.method}:${req.path}`;
    return (req as any).user?.id ? `user-${(req as any).user.id}:${endpoint}` : endpoint;
  })(req, res, next);
}

/**
 * Strict rate limit middleware (for sensitive endpoints)
 */
export function strictRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.strict);

  return createRateLimitMiddleware(limiter, (req) => {
    return (req as any).user?.id ? `user-${(req as any).user.id}` : req.ip || "unknown";
  })(req, res, next);
}

/**
 * Relaxed rate limit middleware (for public endpoints)
 */
export function relaxedRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = new TokenBucketLimiter(DEFAULT_CONFIGS.relaxed);

  return createRateLimitMiddleware(limiter, (req) => {
    return req.ip || "unknown";
  })(req, res, next);
}
