import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * Unit tests for document title integration in App.tsx
 * Tests Requirements 8.1, 8.2, 8.3, 8.6
 * 
 * Validates:
 * - Document title is set from appConfig.name when provided
 * - Document title falls back to meta.title when appConfig.name missing
 * - Document title updates when appConfig.name changes
 * - Component handles missing appConfig gracefully
 */

// Mock hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock Toast
vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import layout strategies (don't mock - we need them to work)
import { registerLayoutStrategies } from '../lib/layout-strategies';

// Mock file upload strategies
vi.mock('@/lib/file-upload', () => ({
  registerDefaultStrategies: vi.fn(),
}));

// Mock overrides
vi.mock('@/overrides', () => ({
  reconcile: vi.fn(() => ({
    mode: 'default',
    overrideComponent: null,
  })),
}));

const createMockConfig = (overrides?: Partial<UIGenApp>): UIGenApp => ({
  meta: {
    title: 'Default App Title',
    version: '1.0.0',
  },
  resources: [],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {
    enabled: false,
    widgets: [],
  },
  servers: [{ url: 'http://localhost:3000' }],
  ...overrides,
});

describe('App.tsx Document Title Integration', () => {
  let queryClient: QueryClient;
  let originalTitle: string;

  beforeEach(() => {
    // Register layout strategies before each test
    registerLayoutStrategies();
    
    // Store original document title
    originalTitle = document.title;
    
    // Reset document title before each test
    document.title = '';
    
    // Create fresh query client
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original document title
    document.title = originalTitle;
  });

  /**
   * Requirement 8.1: Document title is set from appConfig.name when provided
   */
  it('should set document.title from appConfig.name when provided', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        name: 'My Custom App',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('My Custom App');
  });

  /**
   * Requirement 8.2: Document title falls back to meta.title when appConfig.name missing
   */
  it('should fall back to meta.title when appConfig.name is not provided', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Fallback Title',
        version: '1.0.0',
      },
      appConfig: {
        // No name field
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Fallback Title');
  });

  /**
   * Requirement 8.2: Document title falls back to meta.title when appConfig missing
   */
  it('should fall back to meta.title when appConfig is not provided', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Default App Title',
        version: '1.0.0',
      },
      // No appConfig
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Default App Title');
  });

  /**
   * Requirement 8.3: Document title updates when appConfig.name changes
   */
  it('should update document.title when appConfig.name changes', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        name: 'Initial App Name',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Initial App Name');

    // Update config with new app name
    const updatedConfig = createMockConfig({
      appConfig: {
        name: 'Updated App Name',
      },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={updatedConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Updated App Name');
  });

  /**
   * Requirement 8.3: Document title updates when meta.title changes (fallback scenario)
   */
  it('should update document.title when meta.title changes and no appConfig.name', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Initial Meta Title',
        version: '1.0.0',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Initial Meta Title');

    // Update config with new meta title
    const updatedConfig = createMockConfig({
      meta: {
        title: 'Updated Meta Title',
        version: '1.0.0',
      },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={updatedConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Updated Meta Title');
  });

  /**
   * Requirement 8.3: Document title switches from appConfig.name to meta.title
   */
  it('should switch from appConfig.name to meta.title when appConfig.name is removed', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Meta Title',
        version: '1.0.0',
      },
      appConfig: {
        name: 'App Config Name',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('App Config Name');

    // Remove appConfig.name
    const updatedConfig = createMockConfig({
      meta: {
        title: 'Meta Title',
        version: '1.0.0',
      },
      appConfig: {
        // No name field
      },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={updatedConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('Meta Title');
  });

  /**
   * Requirement 8.6: Component handles missing appConfig gracefully
   */
  it('should handle undefined appConfig gracefully', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Graceful Fallback',
        version: '1.0.0',
      },
      appConfig: undefined,
    });

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );
    }).not.toThrow();

    expect(document.title).toBe('Graceful Fallback');
  });

  /**
   * Requirement 8.6: Component handles empty appConfig gracefully
   */
  it('should handle empty appConfig object gracefully', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Empty Config Fallback',
        version: '1.0.0',
      },
      appConfig: {},
    });

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );
    }).not.toThrow();

    expect(document.title).toBe('Empty Config Fallback');
  });

  /**
   * Requirement 8.1, 8.2: appConfig.name takes precedence over meta.title
   */
  it('should prioritize appConfig.name over meta.title when both are provided', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Meta Title',
        version: '1.0.0',
      },
      appConfig: {
        name: 'App Config Name',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('App Config Name');
  });

  /**
   * Edge case: Empty string in appConfig.name should fall back to meta.title
   */
  it('should fall back to meta.title when appConfig.name is empty string', () => {
    const mockConfig = createMockConfig({
      meta: {
        title: 'Meta Title',
        version: '1.0.0',
      },
      appConfig: {
        name: '',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Empty string is falsy, so should fall back to meta.title
    expect(document.title).toBe('Meta Title');
  });

  /**
   * Integration: Document title with special characters
   */
  it('should handle special characters in app name', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        name: 'My App™ - Dashboard & Analytics',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('My App™ - Dashboard & Analytics');
  });

  /**
   * Integration: Document title with unicode characters
   */
  it('should handle unicode characters in app name', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        name: '我的应用 🚀',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    expect(document.title).toBe('我的应用 🚀');
  });
});
