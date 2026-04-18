import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn()
  };
});

// Import fs after mocking
const fs = await import('node:fs');

// Test component that uses the context
function TestComponent() {
  const { state, actions } = useAppContext();
  
  return (
    <div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{state.error || 'no-error'}</div>
      <div data-testid="config">{state.config ? 'has-config' : 'no-config'}</div>
      <div data-testid="annotations-count">{state.annotations.length}</div>
      <button onClick={() => actions.clearError()}>Clear Error</button>
    </div>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should provide initial state with default config when no file exists', async () => {
    // Mock file not existing
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });
    
    // Should have default config
    expect(screen.getByTestId('config').textContent).toBe('has-config');
    expect(screen.getByTestId('error').textContent).toBe('no-error');
  });
  
  it('should load existing config file', async () => {
    // Mock file existing and reading
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
version: '1.0'
enabled:
  x-uigen-label: true
defaults: {}
annotations: {}
    `);
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });
    
    // Should have loaded config
    expect(screen.getByTestId('config').textContent).toBe('has-config');
    expect(screen.getByTestId('error').textContent).toBe('no-error');
  });
  
  it('should extract annotation metadata from handlers', async () => {
    const mockHandler = {
      name: 'x-uigen-test',
      extract: vi.fn(),
      validate: vi.fn(),
      apply: vi.fn()
    };
    
    const mockHandlerClass = mockHandler.constructor as any;
    mockHandlerClass.metadata = {
      name: 'x-uigen-test',
      description: 'Test annotation',
      targetType: 'field',
      parameterSchema: { type: 'string' },
      examples: []
    };
    
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    render(
      <AppProvider handlers={[mockHandler as any]}>
        <TestComponent />
      </AppProvider>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });
    
    // Should have extracted metadata
    expect(screen.getByTestId('annotations-count').textContent).toBe('1');
  });
  
  it('should throw error when useAppContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within AppProvider');
    
    consoleError.mockRestore();
  });
});
