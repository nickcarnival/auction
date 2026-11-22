/**
 * Structured API errors for consistent JSON responses: `{ error, code }`.
 * Use factories and `.toJSON()` on route handlers; the global `errorHandler` also recognizes instances.
 */
export type ApiErrorBody = {
  error: string;
  code: string;
};

export class ApiError extends Error {
  readonly statusCode: number;

  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): ApiErrorBody {
    return { error: this.message, code: this.code };
  }

  static badRequest(code: string, message: string): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(code: string, message: string): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(code: string, message: string): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(code: string, message: string): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(code: string, message: string): ApiError {
    return new ApiError(409, code, message);
  }

  static tooManyRequests(message: string): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
