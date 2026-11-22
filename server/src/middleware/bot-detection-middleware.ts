import { Request, Response, NextFunction } from 'express';

/**
 * Known bot user agents and patterns to block
 */
const BLOCKED_USER_AGENTS = [
  // Generic bot patterns
  'bot',
  'crawler',
  'spider',
  'scraper',
  // Specific bots
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  // Malicious/unwanted bots
  'python-requests',
  'curl',
  'wget',
  'httpclient',
  'java/',
  'php/',
  'perl/',
  'ruby/',
  // Security scanners
  'nmap',
  'masscan',
  'zmap',
  'sqlmap',
  'nikto',
  'acunetix',
  'nessus',
  'openvas',
  // SEO/monitoring bots (add as needed)
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
];

/**
 * Public static prefixes: names can contain substrings like "/admin" (e.g. admin-layout chunk).
 * These must not go through naive substring path rules.
 */
const STATIC_ASSET_PREFIXES = ['/assets/', '/images/'];

/**
 * Suspicious URL path prefixes (segment-safe: "/assets/admin-layout.js" does not match "/admin").
 */
const SUSPICIOUS_PATH_PREFIXES = [
  '/admin',
  '/administrator',
  '/wp-admin',
  '/wp-login',
  '/phpmyadmin',
  '/phpinfo',
  '/config',
  '/wordpress',
  '/blog',
  '/cms',
  '/backup',
  '/db_backup',
  '/database',
];

/**
 * Patterns matched anywhere in the pathname (dotfiles, traversal, injection).
 */
const SUSPICIOUS_PATH_SUBSTRINGS = [
  '/.env',
  '/xmlrpc.php',
  '/wp-config.php',
  '../',
  '..\\',
  '%2e%2e',
  '<script',
  'javascript:',
  'eval(',
];

function pathnameIsSuspicious(rawUrl: string): boolean {
  const pathname = rawUrl.split('?')[0].split('#')[0].toLowerCase();

  if (
    pathname === '/assets' ||
    pathname === '/images' ||
    STATIC_ASSET_PREFIXES.some(prefix => pathname.startsWith(prefix))
  ) {
    return false;
  }

  if (pathname.startsWith('/wp')) {
    return true;
  }

  for (const prefix of SUSPICIOUS_PATH_PREFIXES) {
    const p = prefix.toLowerCase();
    if (pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`)) {
      return true;
    }
  }

  return SUSPICIOUS_PATH_SUBSTRINGS.some(s => pathname.includes(s.toLowerCase()));
}

/**
 * Enhanced bot detection middleware using user-agent analysis and behavioral patterns
 */
export const botDetectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const urlLower = req.url.toLowerCase();
  const clientIP = req.ip;

  // Check for blocked user agents
  const isBlockedUserAgent = BLOCKED_USER_AGENTS.some(pattern =>
    userAgent.includes(pattern.toLowerCase())
  );

  const isSuspiciousPath = pathnameIsSuspicious(req.url);

  // Check for missing user agent (common with bots)
  const isMissingUserAgent = !req.headers['user-agent'] || req.headers['user-agent'].trim() === '';

  // Check for suspicious request patterns
  const isSuspiciousRequest =
    // Too many slashes (directory traversal)
    (urlLower.match(/\//g) || []).length > 10 ||
    // Very long URLs (potential buffer overflow attempts)
    urlLower.length > 2000 ||
    // Binary content in URL
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(urlLower);

  if (isBlockedUserAgent || isSuspiciousPath || isMissingUserAgent || isSuspiciousRequest) {
    const reason = isBlockedUserAgent
      ? 'blocked user-agent'
      : isSuspiciousPath
        ? 'suspicious path'
        : isMissingUserAgent
          ? 'missing user-agent'
          : 'suspicious request pattern';

    console.log(
      `Blocked bot request from ${clientIP}: ${reason} - ${userAgent || 'no UA'} - ${req.url}`
    );

    // NUCLEAR OPTION: Destroy all bot sockets immediately! 💥
    // No mercy for bots, hackers, or suspicious requests
    console.log(`💀 DESTROYING SOCKET for bot from ${clientIP}`);
    try {
      req.socket?.destroy();
    } catch (error) {
      console.warn('Error destroying socket:', error);
    }
    return;
  }

  next();
};
