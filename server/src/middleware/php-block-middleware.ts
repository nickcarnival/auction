import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to block requests to PHP files by destroying the socket connection.
 * This is more aggressive than returning a status code as it immediately terminates the connection.
 */
export const blockPhpMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.url.toLowerCase().includes('.php')) {
    console.log(`💀 PHP REQUEST DETECTED - NUKING SOCKET: ${req.ip} requested ${req.url}`);
    try {
      req.socket?.destroy();
    } catch (error) {
      console.warn('Error destroying socket:', error);
    }
    return;
  }
  next();
};
