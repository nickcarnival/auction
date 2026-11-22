import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { blockPhpMiddleware } from './php-block-middleware';

interface MockSocket {
  destroy: ReturnType<typeof vi.fn>;
}

type MockRequest = Partial<Request> & {
  url: string;
  ip: string;
  socket: MockSocket;
};

type MockResponse = Partial<Response>;

describe('blockPhpMiddleware', () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    mockNext.mockClear();
    vi.mocked(console.log).mockClear();
  });

  it('should call next() for non-PHP requests', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/api/users',
      ip: '127.0.0.1',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockSocket.destroy).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should destroy socket for .php requests (lowercase)', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/admin/login.php',
      ip: '192.168.1.100',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.destroy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      '💀 PHP REQUEST DETECTED - NUKING SOCKET: 192.168.1.100 requested /admin/login.php'
    );
  });

  it('should destroy socket for .PHP requests (uppercase)', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/wp-admin/INDEX.PHP',
      ip: '10.0.0.50',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.destroy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      '💀 PHP REQUEST DETECTED - NUKING SOCKET: 10.0.0.50 requested /wp-admin/INDEX.PHP'
    );
  });

  it('should destroy socket for mixed case .php requests', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/config.PhP',
      ip: '172.16.0.1',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.destroy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      '💀 PHP REQUEST DETECTED - NUKING SOCKET: 172.16.0.1 requested /config.PhP'
    );
  });

  it('should not trigger on URLs containing "php" as substring', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/philosophy/about',
      ip: '127.0.0.1',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockSocket.destroy).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should handle query parameters in PHP requests', () => {
    const mockSocket = { destroy: vi.fn() };
    const mockRequest = {
      url: '/admin.php?action=login&redirect=dashboard',
      ip: '203.0.113.1',
      socket: mockSocket,
    } as MockRequest;
    const mockResponse = {} as MockResponse;

    blockPhpMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockSocket.destroy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      '💀 PHP REQUEST DETECTED - NUKING SOCKET: 203.0.113.1 requested /admin.php?action=login&redirect=dashboard'
    );
  });
});
