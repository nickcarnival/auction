import { Request, Response, NextFunction } from 'express';
import { isApiError } from '@/errors/api-error';

interface ExpressError extends Error {
  status?: number;
  statusCode?: number;
}

function safeMessageLower(err: ExpressError, req: Request): string {
  const parts = [err.message, req.url, req.method].filter(Boolean).join(' ').toLowerCase();
  return parts;
}

// Security-focused error handler
export const errorHandler = (
  err: ExpressError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const securityKeywords = ['injection', 'xss', 'script', 'attack', 'malicious', 'unauthorized'];
  const haystack = safeMessageLower(err, req);
  const isSecurityRelated = securityKeywords.some(keyword => haystack.includes(keyword));

  if (isSecurityRelated) {
    console.error('SECURITY ALERT:', {
      error: err?.message || 'Unknown error',
      method: req?.method || 'Unknown method',
      url: req?.url || 'Unknown URL',
      ip: req?.ip || 'Unknown IP',
      userAgent: req?.get ? req.get('User-Agent') : 'Unknown User-Agent',
      timestamp: new Date().toISOString(),
    });
  } else {
    console.error('Application Error:', {
      error: err?.message || 'Unknown error',
      method: req?.method || 'Unknown method',
      url: req?.url || 'Unknown URL',
      timestamp: new Date().toISOString(),
    });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  if (res.headersSent) {
    return next(err);
  }

  if (isApiError(err)) {
    return res.status(err.statusCode).json({
      ...err.toJSON(),
    });
  }

  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      ...(isDevelopment ? { details: err.message } : {}),
    });
  }

  const status = err?.status || err?.statusCode;

  if (err?.name === 'UnauthorizedError' || status === 401) {
    return res.status(401).json({
      error: 'Unauthorized access',
      code: 'UNAUTHORIZED',
    });
  }

  if (err?.name === 'ForbiddenError' || status === 403) {
    return res.status(403).json({
      error: 'Access forbidden',
      code: 'FORBIDDEN',
    });
  }

  if (status === 429) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment ? { details: err?.message || 'Unknown error' } : {}),
    timestamp: new Date().toISOString(),
  });
};
