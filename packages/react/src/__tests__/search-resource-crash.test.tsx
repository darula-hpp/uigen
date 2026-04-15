/**
 * Integration Tests: Search Resource Crash
 * 
 * Tests that SearchView handles resources without search operations gracefully
 * without crashing due to React hooks violations.
 * 
 * Bug: When navigating to search route for a resource without a search operation,
 * the app crashes because useApiCall violates React's Rules of Hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchView } from '../components/views/SearchView';
import type { Resource } from '@uigen-dev/core';

// Mock hooks
const mockUseApiCall = vi.fn();
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: (options: any) => mockUseApiCall(options),
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

// Helper to create QueryClient
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// Helper to render SearchView with router
function renderSearchView(resource: Resource) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(
    [{ path: '*', element: <SearchView resource={resource} /> }],
    { initialEntries: ['/'] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

// Mock resource WITHOUT search operation
function createResourceWithoutSearch(): Resource {
  return {
    name: 'Users',
    slug: 'users',
    uigenId: 'users',
    description: undefined,
    relationships: [],
    pagination: undefined,
    schema: {
      type: 'object',
      key: 'root',
      label: 'Users',
      required: false,
      children: [
        { type: 'string', key: 'id', label: 'ID', required: true },
        { type: 'string', key: 'name', label: 'Name', required: true },
      ],
    },
    operations: [
      {
        id: 'listUsers',
        uigenId: 'listUsers',
        method: 'GET',
        path: '/users',
        summary: 'List Users',
        parameters: [],
        responses: {},
        viewHint: 'list',
      },
    ],
  };
}

// Mock resource WITH search operation
function createResourceWithSearch(): Resource {
  return {
    name: 'Products',
    slug: 'products',
    uigenId: 'products',
    description: undefined,
    relationships: [],
    pagination: undefined,
    schema: {
      type: 'object',
      key: 'root',
      label: 'Products',
      required: false,
      children: [
        { type: 'string', key: 'id', label: 'ID', required: true },
        { type: 'string', key: 'name', label: 'Name', required: true },
        { type: 'number', key: 'price', label: 'Price', required: true },
      ],
    },
    operations: [
      {
        id: 'searchProducts',
        uigenId: 'searchProducts',
        method: 'GET',
        path: '/products/search',
        summary: 'Search Products',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'q', label: 'Query', required: false },
          },
          {
            name: 'minPrice',
            in: 'query',
            required: false,
            schema: { type: 'number', key: 'minPrice', label: 'Min Price', required: false },
          },
        ],
        responses: {},
        viewHint: 'search',
      },
    ],
  };
}

describe('Integration Tests: Search Resource Crash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return value
    mockUseApiCall.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  /**
   * Test 1: Resource without search operation
   * Should display graceful message, not crash
   */
  describe('Resource without search operation', () => {
    it('should display "No search operation available" message', async () => {
      const resource = createResourceWithoutSearch();
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
        expect(screen.getByText(/Users/i)).toBeInTheDocument();
      });
    });

    it('should call useApiCall with enabled=false when no search operation', async () => {
      const resource = createResourceWithoutSearch();
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(mockUseApiCall).toHaveBeenCalled();
        const callArgs = mockUseApiCall.mock.calls[0][0];
        expect(callArgs.enabled).toBe(false);
      });
    });

    it('should not crash when rendering', () => {
      const resource = createResourceWithoutSearch();
      
      // Should not throw
      expect(() => {
        renderSearchView(resource);
      }).not.toThrow();
    });
  });

  /**
   * Test 2: Resource with search operation
   * Should display search UI correctly
   */
  describe('Resource with search operation', () => {
    it('should display search UI with filters', async () => {
      const resource = createResourceWithSearch();
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(screen.getByText(/Search Products/i)).toBeInTheDocument();
      });
      
      // Check for filters section (use getAllByText since it might appear multiple times)
      const filtersElements = screen.queryAllByText(/Filters/i);
      expect(filtersElements.length).toBeGreaterThan(0);
    });

    it('should call useApiCall with valid operation', async () => {
      const resource = createResourceWithSearch();
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(mockUseApiCall).toHaveBeenCalled();
        const callArgs = mockUseApiCall.mock.calls[0][0];
        expect(callArgs.operation).toBeDefined();
        expect(callArgs.operation.viewHint).toBe('search');
        expect(callArgs.enabled).toBe(true);
      });
    });

    it('should display results table', async () => {
      const resource = createResourceWithSearch();
      mockUseApiCall.mockReturnValue({
        data: [
          { id: '1', name: 'Product 1', price: 10 },
          { id: '2', name: 'Product 2', price: 20 },
        ],
        isLoading: false,
        error: null,
      });
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test 3: Switching between resources
   * Should not crash when switching from resource with search to without
   */
  describe('Switching between resources', () => {
    it('should handle switching from resource with search to without', async () => {
      const resourceWith = createResourceWithSearch();
      const resourceWithout = createResourceWithoutSearch();
      
      const queryClient = createQueryClient();
      
      // Render with search operation
      const router1 = createMemoryRouter(
        [{ path: '*', element: <SearchView resource={resourceWith} /> }],
        { initialEntries: ['/'] }
      );
      
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router1} />
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Search Products/i)).toBeInTheDocument();
      });
      
      // Switch to resource without search operation
      const router2 = createMemoryRouter(
        [{ path: '*', element: <SearchView resource={resourceWithout} /> }],
        { initialEntries: ['/'] }
      );
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router2} />
        </QueryClientProvider>
      );
      
      // Should not crash
      await waitFor(() => {
        expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
      });
    });

    it('should handle switching from resource without search to with', async () => {
      const resourceWith = createResourceWithSearch();
      const resourceWithout = createResourceWithoutSearch();
      
      const queryClient = createQueryClient();
      
      // Render without search operation
      const router1 = createMemoryRouter(
        [{ path: '*', element: <SearchView resource={resourceWithout} /> }],
        { initialEntries: ['/'] }
      );
      
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router1} />
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
      });
      
      // Switch to resource with search operation
      const router2 = createMemoryRouter(
        [{ path: '*', element: <SearchView resource={resourceWith} /> }],
        { initialEntries: ['/'] }
      );
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router2} />
        </QueryClientProvider>
      );
      
      // Should not crash
      await waitFor(() => {
        expect(screen.getByText(/Search Products/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test 4: SearchView with undefined searchOp at runtime
   * Simulates the actual crash scenario
   */
  describe('SearchView with undefined searchOp at runtime', () => {
    it('should handle operations.find returning undefined', async () => {
      // Create resource where operations.find will return undefined
      const resource: Resource = {
        name: 'Items',
        slug: 'items',
        uigenId: 'items',
        description: undefined,
        relationships: [],
        pagination: undefined,
        schema: {
          type: 'object',
          key: 'root',
          label: 'Items',
          required: false,
          children: [],
        },
        operations: [], // Empty operations array
      };
      
      // Should not crash
      expect(() => {
        renderSearchView(resource);
      }).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
      });
    });

    it('should not throw React hooks error', async () => {
      const resource = createResourceWithoutSearch();
      
      // Spy on console.error to catch React warnings
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderSearchView(resource);
      
      await waitFor(() => {
        expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
      });
      
      // Should not have React hooks errors
      const hookErrors = consoleErrorSpy.mock.calls.filter(call =>
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('Rendered more hooks') || arg.includes('Rendered fewer hooks'))
        )
      );
      
      expect(hookErrors.length).toBe(0);
      
      consoleErrorSpy.mockRestore();
    });
  });
});
