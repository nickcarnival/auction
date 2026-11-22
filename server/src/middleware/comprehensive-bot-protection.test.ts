import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { comprehensiveBotProtection } from './comprehensive-bot-protection';

interface MockSocket {
  destroy: ReturnType<typeof vi.fn>;
}

interface MockApp {
  get: ReturnType<typeof vi.fn>;
}

// More flexible mock that avoids strict type checking issues
interface MockRequest {
  headers: Record<string, string | undefined>;
  url: string;
  ip: string;
  socket: MockSocket;
  app: MockApp;
}

type MockResponse = Partial<Response>;

describe('comprehensiveBotProtection', () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
    vi.mocked(console.log).mockClear();
  });

  it('should be an array of middleware functions', () => {
    expect(Array.isArray(comprehensiveBotProtection)).toBe(true);
    expect(comprehensiveBotProtection.length).toBeGreaterThan(0);

    // Check that each item is a function
    comprehensiveBotProtection.forEach((middleware, _index) => {
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBeGreaterThanOrEqual(3); // req, res, next parameters
    });
  });

  it('should allow legitimate requests through all middleware', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockApp = { get: vi.fn().mockReturnValue(false) };
    const mockRequest = {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      url: '/api/users',
      ip: '127.0.0.1',
      socket: mockSocket,
      app: mockApp,
    } satisfies MockRequest;
    const mockResponse = {} as MockResponse;

    // Run through all middleware in sequence
    let currentMiddlewareIndex = 0;
    const runNextMiddleware = () => {
      if (currentMiddlewareIndex < comprehensiveBotProtection.length) {
        const middleware = comprehensiveBotProtection[currentMiddlewareIndex];
        currentMiddlewareIndex++;
        middleware(
          mockRequest as unknown as Request,
          mockResponse as Response,
          runNextMiddleware as NextFunction
        );
      }
    };

    runNextMiddleware();

    expect(mockSocket.destroy).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  describe('PHP blocking', () => {
    it('should block PHP requests in comprehensive protection', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        url: '/admin.php',
        ip: '192.168.1.100',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // The PHP middleware should be first and should block immediately
      const phpMiddleware =
        comprehensiveBotProtection.find(
          mw => mw.toString().includes('php') || mw.name === 'blockPhpMiddleware'
        ) || comprehensiveBotProtection[1]; // Assume it's the second middleware

      phpMiddleware(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('PHP REQUEST DETECTED'));
    });
  });

  describe('Bot detection', () => {
    it('should block bot user agents in comprehensive protection', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: { 'user-agent': 'googlebot/2.1' },
        url: '/api/test',
        ip: '66.249.66.1',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // Find and test the bot detection middleware
      const botMiddleware =
        comprehensiveBotProtection.find(
          mw => mw.toString().includes('botDetection') || mw.name === 'botDetectionMiddleware'
        ) || comprehensiveBotProtection[2]; // Assume it's the third middleware

      botMiddleware(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Blocked bot request'));
    });
  });

  describe('Advanced bot detection', () => {
    it('should block rapid-fire requests', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-request-time': (Date.now() - 50).toString(), // 50ms ago
        },
        url: '/api/test',
        ip: '203.0.113.1',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // Find the advanced detection middleware (usually last)
      const advancedMiddleware = comprehensiveBotProtection.at(-1)!;

      advancedMiddleware(
        mockRequest as unknown as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('RAPID-FIRE BOT DETECTED'));
    });

    it('should block requests with too many proxy headers', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-cluster-client-ip': '3.3.3.3',
          forwarded: '4.4.4.4',
          'x-forwarded': '5.5.5.5',
        },
        url: '/api/test',
        ip: '198.51.100.1',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // Find the advanced detection middleware (usually last)
      const advancedMiddleware = comprehensiveBotProtection.at(-1)!;

      advancedMiddleware(
        mockRequest as unknown as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('SUSPICIOUS PROXY HEADERS'));
    });

    it('should block fake Googlebot requests', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: {
          'user-agent': 'Googlebot/2.1',
          referer: 'https://bing.com/search?q=test',
        },
        url: '/api/test',
        ip: '192.0.2.1',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // Find the advanced detection middleware (usually last)
      const advancedMiddleware = comprehensiveBotProtection.at(-1)!;

      advancedMiddleware(
        mockRequest as unknown as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('FAKE GOOGLEBOT DETECTED'));
    });

    it('should allow legitimate Googlebot requests', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockApp = { get: vi.fn().mockReturnValue(false) };
      const mockRequest = {
        headers: {
          'user-agent': 'Googlebot/2.1',
          referer: 'https://google.com/search?q=test',
        },
        url: '/api/test',
        ip: '66.249.66.1',
        socket: mockSocket,
        app: mockApp,
      } satisfies MockRequest;
      const mockResponse = {} as MockResponse;

      // Find the advanced detection middleware (usually last)
      const advancedMiddleware = comprehensiveBotProtection.at(-1)!;

      advancedMiddleware(
        mockRequest as unknown as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockSocket.destroy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('should include rate limiting middleware', () => {
      // The first middleware should be the rate limiter
      const rateLimiter = comprehensiveBotProtection[0];
      expect(typeof rateLimiter).toBe('function');

      // Rate limiters typically have more complex signatures
      // This is a basic test to ensure it exists
      expect(rateLimiter.length).toBeGreaterThanOrEqual(3);
    });
  });
});
