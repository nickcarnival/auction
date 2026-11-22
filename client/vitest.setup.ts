import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Mock console.log to prevent test output from cluttering the console
beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.mocked(console.log).mockClear();
});

afterAll(() => {
  vi.mocked(console.log).mockRestore();
});
