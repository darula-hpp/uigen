import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// Mock ResizeObserver for components that use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.location and window.history for URL-based routing tests
beforeEach(() => {
  // Reset URL to default state before each test
  const url = new URL('http://localhost:3000');
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      search: '',
      pathname: '/',
      href: url.href,
    },
    writable: true,
    configurable: true,
  });

  // Mock history.pushState
  window.history.pushState = () => {};
});
