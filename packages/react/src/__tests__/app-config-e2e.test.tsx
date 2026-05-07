/**
 * End-to-End Integration Tests for x-uigen-app Annotation
 * 
 * Task 14.1: Write integration test for complete flow
 * - Test parsing OpenAPI spec with x-uigen-app annotation
 * - Test IR contains appConfig with correct values
 * - Test React app sets document title correctly
 * - Test React app sets favicon correctly
 * - Test TopBar displays icon and name correctly
 * 
 * Requirements: 1.1-14.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { App } from '../App';
import { OpenAPI3Adapter } from '@uigen-dev/core';
import type { UIGenApp } from '@uigen-dev/core';
import type { OpenAPIV3 } from 'openapi-types';

// Mock hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isError: false,
    isSuccess: false,
  })),
  useApiMutation: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
    reset: vi.fn(),
  })),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getAuthCredentials: vi.fn(() => null),
  isAuthenticated: vi.fn(() => false),
  setAuthCredentials: vi.fn(),
  clearAuthCredentials: vi.fn(),
}));

// Helper function to parse OpenAPI spec
function parseOpenAPISpec(spec: Record<string, unknown>): UIGenApp {
  const adapter = new OpenAPI3Adapter(spec as unknown as OpenAPIV3.Document);
  return adapter.adapt();
}

describe('Task 14.1: Complete x-uigen-app Flow Integration Tests', () => {
  let originalTitle: string;
  let originalFavicon: HTMLLinkElement | null;

  beforeEach(() => {
    // Save original document title
    originalTitle = document.title;
    
    // Save original favicon
    originalFavicon = document.querySelector("link[rel~='icon']");
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original document title
    document.title = originalTitle;
    
    // Restore original favicon
    if (originalFavicon) {
      const currentFavicon = document.querySelector("link[rel~='icon']");
      if (currentFavicon && currentFavicon !== originalFavicon) {
        currentFavicon.remove();
      }
    }
  });

  describe('Complete Flow: OpenAPI Parsing → IR → React Rendering', () => {
    it('should parse OpenAPI spec with x-uigen-app and render correctly', async () => {
      // Step 1: Create OpenAPI spec with x-uigen-app annotation
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Default API Title',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'My Custom Application',
          icon: '/.uigen/assets/custom-logo.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      // Step 2: Parse OpenAPI spec to generate IR
      const ir = parseOpenAPISpec(openApiSpec);

      // Step 3: Verify IR contains appConfig with correct values
      expect(ir.appConfig).toBeDefined();
      expect(ir.appConfig?.name).toBe('My Custom Application');
      expect(ir.appConfig?.icon).toBe('/.uigen/assets/custom-logo.svg');

      // Step 4: Render React App with parsed IR
      render(<App config={ir} />);

      // Step 5: Verify document title is set from appConfig.name
      await waitFor(() => {
        expect(document.title).toBe('My Custom Application');
      });

      // Step 6: Verify favicon is set from appConfig.icon
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon).toBeTruthy();
        expect(favicon?.href).toContain('/.uigen/assets/custom-logo.svg');
      });

      // Step 7: Verify TopBar displays icon and name correctly
      await waitFor(() => {
        // Check for app name in TopBar
        const appTitle = screen.getByRole('heading', { name: 'My Custom Application' });
        expect(appTitle).toBeInTheDocument();
        expect(appTitle.tagName).toBe('H1');

        // Check for app icon in TopBar
        const appIcon = screen.getByAltText('My Custom Application');
        expect(appIcon).toBeInTheDocument();
        expect(appIcon.tagName).toBe('IMG');
        expect(appIcon).toHaveAttribute('src', '/.uigen/assets/custom-logo.svg');
      });
    });

    it('should handle x-uigen-app with name only', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Default API Title',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'Name Only App',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      // Verify IR contains appConfig with name only
      expect(ir.appConfig).toBeDefined();
      expect(ir.appConfig?.name).toBe('Name Only App');
      expect(ir.appConfig?.icon).toBeUndefined();

      render(<App config={ir} />);

      // Verify document title uses appConfig.name
      await waitFor(() => {
        expect(document.title).toBe('Name Only App');
      });

      // Verify TopBar displays name without icon
      await waitFor(() => {
        const appTitle = screen.getByRole('heading', { name: 'Name Only App' });
        expect(appTitle).toBeInTheDocument();

        // Icon should not be present
        const appIcon = screen.queryByAltText('Name Only App');
        expect(appIcon).not.toBeInTheDocument();
      });
    });

    it('should handle x-uigen-app with icon only', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Default API Title',
          version: '1.0.0',
        },
        'x-uigen-app': {
          icon: '/.uigen/assets/icon-only.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      // Verify IR contains appConfig with icon only
      expect(ir.appConfig).toBeDefined();
      expect(ir.appConfig?.name).toBeUndefined();
      expect(ir.appConfig?.icon).toBe('/.uigen/assets/icon-only.svg');

      render(<App config={ir} />);

      // Verify document title falls back to meta.title
      await waitFor(() => {
        expect(document.title).toBe('Default API Title');
      });

      // Verify favicon is set from appConfig.icon
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon).toBeTruthy();
        expect(favicon?.href).toContain('/.uigen/assets/icon-only.svg');
      });

      // Verify TopBar displays icon with fallback name
      await waitFor(() => {
        const topBar = screen.getByRole('banner');
        const appTitle = within(topBar).getByRole('heading', { name: 'Default API Title' });
        expect(appTitle).toBeInTheDocument();

        const appIcon = screen.getByAltText('Default API Title');
        expect(appIcon).toBeInTheDocument();
        expect(appIcon).toHaveAttribute('src', '/.uigen/assets/icon-only.svg');
      });
    });

    it('should fall back to OpenAPI info.title when x-uigen-app is absent', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Fallback API Title',
          version: '1.0.0',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      // Verify IR has no appConfig
      expect(ir.appConfig).toBeUndefined();

      render(<App config={ir} />);

      // Verify document title falls back to meta.title
      await waitFor(() => {
        expect(document.title).toBe('Fallback API Title');
      });

      // Verify TopBar displays fallback name without icon
      await waitFor(() => {
        const topBar = screen.getByRole('banner');
        const appTitle = within(topBar).getByRole('heading', { name: 'Fallback API Title' });
        expect(appTitle).toBeInTheDocument();

        // No icon should be present
        const appIcon = screen.queryByAltText('Fallback API Title');
        expect(appIcon).not.toBeInTheDocument();
      });
    });

    it('should handle empty x-uigen-app object (all fields optional)', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Empty Config API',
          version: '1.0.0',
        },
        'x-uigen-app': {},
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      // Verify IR contains empty appConfig
      expect(ir.appConfig).toBeDefined();
      expect(ir.appConfig?.name).toBeUndefined();
      expect(ir.appConfig?.icon).toBeUndefined();

      render(<App config={ir} />);

      // Verify document title falls back to meta.title
      await waitFor(() => {
        expect(document.title).toBe('Empty Config API');
      });

      // Verify TopBar displays fallback name without icon
      await waitFor(() => {
        const topBar = screen.getByRole('banner');
        const appTitle = within(topBar).getByRole('heading', { name: 'Empty Config API' });
        expect(appTitle).toBeInTheDocument();

        const appIcon = screen.queryByAltText('Empty Config API');
        expect(appIcon).not.toBeInTheDocument();
      });
    });

    it('should preserve unknown fields in appConfig for forward compatibility', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Future Features API',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'Future App',
          icon: '/.uigen/assets/future-logo.svg',
          customField: 'custom value',
          futureFeature: { nested: 'data' },
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      // Verify IR contains appConfig with known and unknown fields
      expect(ir.appConfig).toBeDefined();
      expect(ir.appConfig?.name).toBe('Future App');
      expect(ir.appConfig?.icon).toBe('/.uigen/assets/future-logo.svg');
      expect((ir.appConfig as any)?.customField).toBe('custom value');
      expect((ir.appConfig as any)?.futureFeature).toEqual({ nested: 'data' });

      render(<App config={ir} />);

      // Verify React app still works correctly with unknown fields
      await waitFor(() => {
        expect(document.title).toBe('Future App');
        const appTitle = screen.getByRole('heading', { name: 'Future App' });
        expect(appTitle).toBeInTheDocument();
      });
    });

    it('should handle external icon URLs', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'External Icon API',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'External Icon App',
          icon: 'https://example.com/logo.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      expect(ir.appConfig?.icon).toBe('https://example.com/logo.svg');

      render(<App config={ir} />);

      // Verify favicon uses external URL
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon).toBeTruthy();
        expect(favicon?.href).toBe('https://example.com/logo.svg');
      });

      // Verify TopBar displays external icon
      await waitFor(() => {
        const appIcon = screen.getByAltText('External Icon App');
        expect(appIcon).toBeInTheDocument();
        expect(appIcon).toHaveAttribute('src', 'https://example.com/logo.svg');
      });
    });

    it('should update document title when appConfig changes', async () => {
      const initialSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Initial Title',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'Initial App Name',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(initialSpec);

      const { rerender } = render(<App config={ir} />);

      // Verify initial title
      await waitFor(() => {
        expect(document.title).toBe('Initial App Name');
      });

      // Update config with new name
      const updatedIR: UIGenApp = {
        ...ir,
        appConfig: {
          name: 'Updated App Name',
        },
      };

      rerender(<App config={updatedIR} />);

      // Verify title updates
      await waitFor(() => {
        expect(document.title).toBe('Updated App Name');
      });
    });

    it('should update favicon when appConfig.icon changes', async () => {
      const initialSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Icon Change API',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'Icon Change App',
          icon: '/.uigen/assets/initial-icon.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(initialSpec);

      const { rerender } = render(<App config={ir} />);

      // Verify initial favicon
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon?.href).toContain('/.uigen/assets/initial-icon.svg');
      });

      // Update config with new icon
      const updatedIR: UIGenApp = {
        ...ir,
        appConfig: {
          name: 'Icon Change App',
          icon: '/.uigen/assets/updated-icon.svg',
        },
      };

      rerender(<App config={updatedIR} />);

      // Verify favicon updates
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon?.href).toContain('/.uigen/assets/updated-icon.svg');
      });
    });

    it('should handle missing favicon element gracefully', async () => {
      // Remove existing favicon if present
      const existingFavicon = document.querySelector("link[rel~='icon']");
      if (existingFavicon) {
        existingFavicon.remove();
      }

      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'No Favicon API',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'No Favicon App',
          icon: '/.uigen/assets/new-favicon.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      render(<App config={ir} />);

      // Verify new favicon is created
      await waitFor(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        expect(favicon).toBeTruthy();
        expect(favicon?.href).toContain('/.uigen/assets/new-favicon.svg');
        expect(favicon?.rel).toBe('icon');
      });
    });

    it('should render TopBar with correct icon dimensions', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Icon Dimensions API',
          version: '1.0.0',
        },
        'x-uigen-app': {
          name: 'Icon Dimensions App',
          icon: '/.uigen/assets/logo.svg',
        },
        servers: [{ url: 'http://localhost:3000' }],
        paths: {},
      };

      const ir = parseOpenAPISpec(openApiSpec);

      render(<App config={ir} />);

      // Verify icon has correct CSS classes for dimensions
      await waitFor(() => {
        const appIcon = screen.getByAltText('Icon Dimensions App');
        expect(appIcon).toBeInTheDocument();
        expect(appIcon).toHaveClass('h-8', 'w-8', 'object-contain');
      });
    });
  });
});
