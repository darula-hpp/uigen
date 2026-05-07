import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * Unit tests for favicon integration in App.tsx
 * Tests Requirements 8.1, 8.4, 8.6
 * 
 * Validates:
 * - Favicon link is created when appConfig.icon provided
 * - Favicon link href is updated when icon changes
 * - Component handles missing appConfig.icon gracefully
 * - Component updates existing link element if present
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

describe('App.tsx Favicon Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Register layout strategies before each test
    registerLayoutStrategies();
    
    // Remove any existing favicon links before each test
    const existingLinks = document.querySelectorAll("link[rel~='icon']");
    existingLinks.forEach(link => link.remove());
    
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
    // Clean up favicon links after each test
    const links = document.querySelectorAll("link[rel~='icon']");
    links.forEach(link => link.remove());
  });

  /**
   * Requirement 8.4: Favicon link is created when appConfig.icon provided
   */
  it('should create favicon link when appConfig.icon is provided', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo.svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('/assets/logo.svg');
  });

  /**
   * Requirement 8.4: Favicon link href is updated when icon changes
   */
  it('should update favicon link href when icon changes', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo-v1.svg',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link?.href).toContain('/assets/logo-v1.svg');

    // Update config with new icon
    const updatedConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo-v2.svg',
      },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={updatedConfig} />
      </QueryClientProvider>
    );

    link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link?.href).toContain('/assets/logo-v2.svg');
  });

  /**
   * Requirement 8.6: Component handles missing appConfig.icon gracefully
   */
  it('should handle missing appConfig.icon gracefully', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        // No icon field
      },
    });

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );
    }).not.toThrow();

    // No favicon link should be created
    const link = document.querySelector("link[rel~='icon']");
    expect(link).toBeNull();
  });

  /**
   * Requirement 8.6: Component handles missing appConfig gracefully
   */
  it('should handle missing appConfig gracefully', () => {
    const mockConfig = createMockConfig({
      // No appConfig
    });

    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );
    }).not.toThrow();

    // No favicon link should be created
    const link = document.querySelector("link[rel~='icon']");
    expect(link).toBeNull();
  });

  /**
   * Requirement 8.4: Component updates existing link element if present
   */
  it('should update existing favicon link if already present', () => {
    // Create an existing favicon link
    const existingLink = document.createElement('link');
    existingLink.rel = 'icon';
    existingLink.href = '/old-favicon.ico';
    document.head.appendChild(existingLink);

    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/new-logo.svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Should update the existing link, not create a new one
    const links = document.querySelectorAll("link[rel~='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toContain('/assets/new-logo.svg');
  });

  /**
   * Requirement 8.4: Component creates new link if none exists
   */
  it('should create new favicon link if none exists', () => {
    // Ensure no existing favicon link
    const existingLinks = document.querySelectorAll("link[rel~='icon']");
    expect(existingLinks.length).toBe(0);

    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo.svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Should create a new link
    const links = document.querySelectorAll("link[rel~='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toContain('/assets/logo.svg');
  });

  /**
   * Edge case: Empty string icon should not create link
   */
  it('should not create favicon link when icon is empty string', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Empty string is falsy, so no link should be created
    const link = document.querySelector("link[rel~='icon']");
    expect(link).toBeNull();
  });

  /**
   * Integration: Favicon with absolute URL
   */
  it('should handle absolute URL for favicon', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: 'https://example.com/logo.svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link?.href).toBe('https://example.com/logo.svg');
  });

  /**
   * Integration: Favicon with relative path
   */
  it('should handle relative path for favicon', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: './assets/logo.svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('assets/logo.svg');
  });

  /**
   * Integration: Favicon with data URI
   */
  it('should handle data URI for favicon', () => {
    const dataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    const mockConfig = createMockConfig({
      appConfig: {
        icon: dataUri,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link?.href).toBe(dataUri);
  });

  /**
   * Integration: Favicon removal when icon is removed from config
   */
  it('should not remove existing favicon when icon is removed from config', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo.svg',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('/assets/logo.svg');

    // Remove icon from config
    const updatedConfig = createMockConfig({
      appConfig: {
        // No icon field
      },
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={updatedConfig} />
      </QueryClientProvider>
    );

    // Link should still exist (effect doesn't run when icon is undefined)
    link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('/assets/logo.svg');
  });

  /**
   * Integration: Multiple rerenders with same icon
   */
  it('should not create duplicate links on multiple rerenders with same icon', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo.svg',
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Rerender multiple times with same config
    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Should still have only one link
    const links = document.querySelectorAll("link[rel~='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toContain('/assets/logo.svg');
  });

  /**
   * Integration: Favicon with special characters in path
   */
  it('should handle special characters in favicon path', () => {
    const mockConfig = createMockConfig({
      appConfig: {
        icon: '/assets/logo (1).svg',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('logo%20(1).svg');
  });
});
