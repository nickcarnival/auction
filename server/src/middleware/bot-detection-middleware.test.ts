import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { botDetectionMiddleware } from './bot-detection-middleware';

interface MockSocket {
  destroy: ReturnType<typeof vi.fn>;
}

type MockRequest = Partial<Request> & {
  headers: Record<string, string | undefined>;
  url: string;
  ip: string;
  socket: MockSocket;
};

type MockResponse = Partial<Response>;

describe('botDetectionMiddleware', () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
    vi.mocked(console.log).mockClear();
  });

  describe('legitimate requests', () => {
    it('should allow legitimate requests with normal user agents', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        url: '/api/users',
        ip: '127.0.0.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockSocket.destroy).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should allow Vite code-split chunks whose names contain /admin substring', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        },
        url: '/assets/admin-layout-vv_r7QPk.js',
        ip: '10.23.204.9',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockSocket.destroy).not.toHaveBeenCalled();
    });
  });

  describe('blocked user agents', () => {
    const blockedAgents = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'googlebot',
      'python-requests',
      'curl/7.68.0',
      'wget/1.20.3',
      'nmap',
      'sqlmap',
    ];

    blockedAgents.forEach(agent => {
      it(`should block requests with user agent containing "${agent}"`, () => {
        const mockSocket = { destroy: vi.fn() };
        const mockRequest = {
          headers: { 'user-agent': `SomeApp ${agent} v1.0` },
          url: '/api/test',
          ip: '192.168.1.100',
          socket: mockSocket,
        } as MockRequest;
        const mockResponse = {} as MockResponse;

        botDetectionMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockSocket.destroy).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Blocked bot request from 192.168.1.100: blocked user-agent')
        );
      });
    });
  });

  describe('suspicious paths', () => {
    const suspiciousPaths = [
      '/admin',
      '/wp-admin',
      '/phpmyadmin',
      '/wordpress',
      '/.env',
      '/xmlrpc.php',
      '../etc/passwd',
      '%2e%2e/config',
    ];

    suspiciousPaths.forEach(path => {
      it(`should block requests to suspicious path "${path}"`, () => {
        const mockSocket = { destroy: vi.fn() };
        const mockRequest = {
          headers: { 'user-agent': 'Mozilla/5.0 (legitimate browser)' },
          url: path,
          ip: '10.0.0.50',
          socket: mockSocket,
        } as MockRequest;
        const mockResponse = {} as MockResponse;

        botDetectionMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction
        );

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockSocket.destroy).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Blocked bot request from 10.0.0.50: suspicious path')
        );
      });
    });
  });

  describe('missing user agent', () => {
    it('should block requests with no user-agent header', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: {},
        url: '/api/test',
        ip: '172.16.0.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Blocked bot request from 172.16.0.1: missing user-agent')
      );
    });

    it('should block requests with empty user-agent', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: { 'user-agent': '' },
        url: '/api/test',
        ip: '203.0.113.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Blocked bot request from 203.0.113.1: missing user-agent')
      );
    });
  });

  describe('suspicious request patterns', () => {
    it('should block URLs with too many slashes', () => {
      const mockSocket = { destroy: vi.fn() };
      const urlWithManySlashes = '/' + Array.from({ length: 15 }).fill('test').join('/');
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        url: urlWithManySlashes,
        ip: '198.51.100.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Blocked bot request from 198.51.100.1: suspicious request pattern')
      );
    });

    it('should block very long URLs', () => {
      const mockSocket = { destroy: vi.fn() };
      const longUrl = '/api/' + 'a'.repeat(2500);
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        url: longUrl,
        ip: '192.0.2.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Blocked bot request from 192.0.2.1: suspicious request pattern')
      );
    });

    it('should block URLs with binary content', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        url: '/api/test\u0000\u0001\u0002',
        ip: '203.0.113.50',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Blocked bot request from 203.0.113.50: suspicious request pattern')
      );
    });
  });

  describe('case sensitivity', () => {
    it('should handle case-insensitive user agent matching', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: { 'user-agent': 'GOOGLEBOT/2.1' },
        url: '/api/test',
        ip: '66.249.66.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should handle case-insensitive path matching', () => {
      const mockSocket = { destroy: vi.fn() };
      const mockRequest = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        url: '/ADMIN/login',
        ip: '10.0.0.1',
        socket: mockSocket,
      } as MockRequest;
      const mockResponse = {} as MockResponse;

      botDetectionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });
});
