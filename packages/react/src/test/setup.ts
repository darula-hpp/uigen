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
const sessionStorageMock = {
  _store: {} as Record<string, string>,
  getItem(key: string) {
    return this._store[key] || null;
  },
  setItem(key: string, value: string) {
    this._store[key] = value;
  },
  removeItem(key: string) {
    delete this._store[key];
  },
  clear() {
    // Clear all keys from the store object without reassigning
    Object.keys(this._store).forEach(key => {
      delete this._store[key];
    });
  },
  get length() {
    return Object.keys(this._store).length;
  },
  key(index: number) {
    const keys = Object.keys(this._store);
    return keys[index] || null;
  },
};

// Set up sessionStorage mock on globalThis (most reliable)
Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});
