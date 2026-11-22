import { Request, Response, NextFunction } from 'express';
import { blockPhpMiddleware } from './php-block-middleware';
import { botDetectionMiddleware } from './bot-detection-middleware';

const advancedBotDetection = (req: Request, res: Response, next: NextFunction): void => {
  // Check for rapid-fire requests (multiple requests in same second)
  const requestTime = req.headers['x-request-time'];
  if (requestTime && typeof requestTime === 'string') {
    const parsedTime = parseInt(requestTime, 10);
    if (!isNaN(parsedTime)) {
      const timeDiff = Date.now() - parsedTime;
      if (timeDiff < 100) {
        // Less than 100ms between requests = bot-like behavior, DESTROY!
        console.log(`💀 RAPID-FIRE BOT DETECTED - DESTROYING SOCKET: ${req.ip}`);
        try {
          req.socket?.destroy();
        } catch (error) {
          console.warn('Error destroying socket:', error);
        }
        return;
      }
    }
  }

  // Check for suspicious headers patterns
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  let proxyHeaderCount = 0;
  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) proxyHeaderCount++;
  });

  // Too many proxy headers might indicate bot using proxy chains
  if (proxyHeaderCount > 3) {
    console.log(
      `💀 SUSPICIOUS PROXY HEADERS - DESTROYING SOCKET: ${req.ip}: ${proxyHeaderCount} headers`
    );
    try {
      req.socket?.destroy();
    } catch (error) {
      console.warn('Error destroying socket:', error);
    }
    return;
  }

  // Check for common bot request patterns
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'];

  // Bots often have mismatched referer/user-agent
  if (referer && userAgent) {
    const refererDomain = referer.toLowerCase();
    const userAgentLower = userAgent.toLowerCase();

    // Google bot with non-Google referer is suspicious
    if (userAgentLower.includes('googlebot') && !refererDomain.includes('google.com')) {
      console.log(`💀 FAKE GOOGLEBOT DETECTED - DESTROYING SOCKET: ${req.ip}`);
      try {
        req.socket?.destroy();
      } catch (error) {
        console.warn('Error destroying socket:', error);
      }
      return;
    }
  }

  next();
};

/**
 * 💀 COMPREHENSIVE BOT PROTECTION - ALL MIDDLEWARE IN ONE PLACE
 * Destroys sockets for all bot activity - no mercy!
 */
export const comprehensiveBotProtection = [
  blockPhpMiddleware,
  botDetectionMiddleware,
  advancedBotDetection,
];
