/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock sessionStorage for storage strategy tests
let sessionStorageStore: Record<string, string> = {};

const sessionStorageMock = {
  getItem: (key: string) => sessionStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    sessionStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete sessionStorageStore[key];
  },
  clear: () => {
    sessionStorageStore = {};
  },
  get length() {
    return Object.keys(sessionStorageStore).length;
  },
  key: (index: number) => {
    const keys = Object.keys(sessionStorageStore);
    return keys[index] || null;
  },
};

// Set up sessionStorage mock on all possible global objects
if (typeof globalThis !== 'undefined') {
  (globalThis as any).sessionStorage = sessionStorageMock;
}

if (typeof window !== 'undefined') {
  (window as any).sessionStorage = sessionStorageMock;
}

if (typeof global !== 'undefined') {
  (global as any).sessionStorage = sessionStorageMock;
}

// Also make it available as a bare identifier by setting it on the global scope
// This is needed for code that accesses sessionStorage without window/globalThis prefix
if (typeof globalThis !== 'undefined' && !globalThis.sessionStorage) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
