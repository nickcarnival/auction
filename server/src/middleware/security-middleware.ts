import { Request, Response, NextFunction } from 'express';

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove powered by header for security
  res.removeHeader('X-Powered-By');

  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Only set HSTS if using HTTPS
  if (req.secure || req.header('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

// Input sanitization middleware for preventing basic injection attempts
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        // Basic HTML/script tag removal
        return value
          .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replaceAll(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replaceAll(/javascript:/gi, '')
          .replaceAll(/vbscript:/gi, '')
          .replaceAll(/data:/gi, '')
          .trim();
      }
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map(item => sanitizeValue(item));
        } else {
          const sanitized: Record<string, unknown> = {};
          for (const key in value as Record<string, unknown>) {
            sanitized[key] = sanitizeValue((value as Record<string, unknown>)[key]);
          }
          return sanitized;
        }
      }
      return value;
    };

    req.body = sanitizeValue(req.body);
  }

  next();
};
