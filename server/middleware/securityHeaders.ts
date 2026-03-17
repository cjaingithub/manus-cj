import { Request, Response, NextFunction } from "express";

/**
 * Security Headers Configuration
 */
export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  enableCSP?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableXXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  hstsMaxAge?: number;
  cspDirectives?: Record<string, string>;
}

/**
 * Default security headers configuration
 */
export const defaultSecurityConfig: SecurityHeadersConfig = {
  enableHSTS: true,
  enableCSP: true,
  enableXFrameOptions: true,
  enableXContentTypeOptions: true,
  enableXXSSProtection: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
  hstsMaxAge: 31536000, // 1 year
  cspDirectives: {
    "default-src": "'self'",
    "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: https:",
    "font-src": "'self' data:",
    "connect-src": "'self' wss: https:",
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
  },
};

/**
 * Security headers middleware factory
 */
export function createSecurityHeadersMiddleware(config: SecurityHeadersConfig = defaultSecurityConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // HSTS - HTTP Strict Transport Security
    if (config.enableHSTS) {
      res.setHeader(
        "Strict-Transport-Security",
        `max-age=${config.hstsMaxAge || 31536000}; includeSubDomains; preload`
      );
    }

    // CSP - Content Security Policy
    if (config.enableCSP && config.cspDirectives) {
      const cspHeader = Object.entries(config.cspDirectives)
        .map(([key, value]) => `${key} ${value}`)
        .join("; ");
      res.setHeader("Content-Security-Policy", cspHeader);
    }

    // X-Frame-Options - Clickjacking protection
    if (config.enableXFrameOptions) {
      res.setHeader("X-Frame-Options", "DENY");
    }

    // X-Content-Type-Options - MIME type sniffing protection
    if (config.enableXContentTypeOptions) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    // X-XSS-Protection - XSS protection (legacy)
    if (config.enableXXSSProtection) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    // Referrer-Policy - Referrer information control
    if (config.enableReferrerPolicy) {
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    }

    // Permissions-Policy - Feature control
    if (config.enablePermissionsPolicy) {
      res.setHeader(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
      );
    }

    // Remove X-Powered-By header
    res.removeHeader("X-Powered-By");

    next();
  };
}

/**
 * Strict security headers middleware (most restrictive)
 */
export function strictSecurityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const strictConfig: SecurityHeadersConfig = {
    ...defaultSecurityConfig,
    cspDirectives: {
      "default-src": "'none'",
      "script-src": "'self'",
      "style-src": "'self'",
      "img-src": "'self'",
      "font-src": "'self'",
      "connect-src": "'self'",
      "frame-ancestors": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "upgrade-insecure-requests": "",
      "block-all-mixed-content": "",
    },
  };

  return createSecurityHeadersMiddleware(strictConfig)(req, res, next);
}

/**
 * Relaxed security headers middleware (for development)
 */
export function relaxedSecurityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const relaxedConfig: SecurityHeadersConfig = {
    enableHSTS: false,
    enableCSP: true,
    enableXFrameOptions: true,
    enableXContentTypeOptions: true,
    enableXXSSProtection: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: false,
    cspDirectives: {
      "default-src": "'self' 'unsafe-inline' 'unsafe-eval'",
      "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src": "'self' 'unsafe-inline'",
      "img-src": "'self' data: https:",
      "font-src": "'self' data:",
      "connect-src": "'self' wss: https:",
    },
  };

  return createSecurityHeadersMiddleware(relaxedConfig)(req, res, next);
}
