// Vitest setup file for shared utilities
import { vi } from 'vitest';

// Mock console methods during tests to avoid noise
global.console = {
  ...console,
  // Uncomment these if you want to silence console output during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Setup any global test utilities or mocks here
