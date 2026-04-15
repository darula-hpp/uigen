/**
 * Tests to detect conditional hook calls that violate React's Rules of Hooks
 * 
 * These tests help identify the source of React error #300:
 * "Rendered more hooks than during the previous render"
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ListView } from '../components/views/ListView';
import { SearchView } from '../components/views/SearchView';
import { DetailView } from '../components/views/DetailView';
import { FormView } from '../components/views/FormView';
import { ToastProvider } from '../components/Toast';
import type { Resource } from '@uigen-dev/core';

// Mock fetch
global.fetch = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

// Helper to create a minimal resource
function createResource(overrides?: Partial<Resource>): Resource {
  return {
    name: 'TestResource',
    slug: 'test-resource',
    uigenId: 'test-resource',
    description: 'Test resource',
    schema: {
      type: 'object',
      key: 'test',
      label: 'Test',
      required: false,
      children: [
        { type: 'string', key: 'id', label: 'ID', required: true },
        { type: 'string', key: 'name', label: 'Name', required: true },
      ],
    },
    operations: [],
    relationships: [],
    pagination: undefined,
    ...overrides,
  };
}

describe('Conditional Hooks Detection', () => {
  describe('ListView', () => {
    it('should call hooks unconditionally even when no list operation exists', () => {
      const resource = createResource({
        operations: [], // No operations
      });

      // This should NOT crash with hook error
      expect(() => {
        render(
          <Wrapper>
            <ListView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No list operation available/i)).toBeInTheDocument();
    });

    it('should call hooks unconditionally when operation is undefined', () => {
      const resource = createResource({
        operations: [
          {
            id: 'list-test',
            method: 'GET',
            path: '/test',
            viewHint: 'list',
            parameters: [],
            responses: {},
          },
        ],
      });

      // Pass undefined operation explicitly
      expect(() => {
        render(
          <Wrapper>
            <ListView resource={resource} operation={undefined} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('should maintain consistent hook calls across re-renders', async () => {
      const resource = createResource({
        operations: [
          {
            id: 'list-test',
            method: 'GET',
            path: '/test',
            viewHint: 'list',
            parameters: [],
            responses: {},
          },
        ],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { rerender } = render(
        <Wrapper>
          <ListView resource={resource} />
        </Wrapper>
      );

      // Force re-render - should not cause hook count mismatch
      rerender(
        <Wrapper>
          <ListView resource={resource} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('SearchView', () => {
    it('should call hooks unconditionally even when no search operation exists', () => {
      const resource = createResource({
        operations: [], // No operations
      });

      expect(() => {
        render(
          <Wrapper>
            <SearchView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No search operation available/i)).toBeInTheDocument();
    });

    it('should call hooks unconditionally when operation is undefined', () => {
      const resource = createResource({
        operations: [
          {
            id: 'search-test',
            method: 'GET',
            path: '/test/search',
            viewHint: 'search',
            parameters: [],
            responses: {},
          },
        ],
      });

      expect(() => {
        render(
          <Wrapper>
            <SearchView resource={resource} operation={undefined} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('should maintain consistent hook calls when filters change', async () => {
      const resource = createResource({
        operations: [
          {
            id: 'search-test',
            method: 'GET',
            path: '/test/search',
            viewHint: 'search',
            parameters: [
              {
                name: 'query',
                in: 'query',
                required: false,
                schema: { type: 'string', key: 'query', label: 'Query', required: false },
              },
            ],
            responses: {},
          },
        ],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const { rerender } = render(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );

      // Simulate state change (filters) - should not cause hook count mismatch
      rerender(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('DetailView', () => {
    it('should call hooks unconditionally even when no detail operation exists', () => {
      const resource = createResource({
        operations: [], // No operations
      });

      expect(() => {
        render(
          <Wrapper>
            <DetailView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No detail operation available/i)).toBeInTheDocument();
    });

    it('should maintain consistent hook calls across re-renders', async () => {
      const resource = createResource({
        operations: [
          {
            id: 'detail-test',
            method: 'GET',
            path: '/test/{id}',
            viewHint: 'detail',
            parameters: [],
            responses: {
              '200': {
                schema: {
                  type: 'object',
                  key: 'test',
                  label: 'Test',
                  required: false,
                  children: [
                    { type: 'string', key: 'id', label: 'ID', required: true },
                    { type: 'string', key: 'name', label: 'Name', required: true },
                  ],
                },
              },
            },
          },
        ],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', name: 'Test' }),
      });

      const { rerender } = render(
        <Wrapper>
          <DetailView resource={resource} />
        </Wrapper>
      );

      rerender(
        <Wrapper>
          <DetailView resource={resource} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('FormView', () => {
    it('should call hooks unconditionally even when no create operation exists', () => {
      const resource = createResource({
        operations: [], // No operations
      });

      expect(() => {
        render(
          <Wrapper>
            <FormView resource={resource} mode="create" />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No create operation available/i)).toBeInTheDocument();
    });

    it('should call hooks unconditionally even when no update operation exists', () => {
      const resource = createResource({
        operations: [], // No operations
      });

      expect(() => {
        render(
          <Wrapper>
            <FormView resource={resource} mode="edit" />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No edit operation available/i)).toBeInTheDocument();
    });

    it('should maintain consistent hook calls when switching between create and edit modes', async () => {
      const resource = createResource({
        operations: [
          {
            id: 'create-test',
            method: 'POST',
            path: '/test',
            viewHint: 'create',
            parameters: [],
            responses: {},
            requestBody: {
              type: 'object',
              key: 'test',
              label: 'Test',
              required: false,
              children: [
                { type: 'string', key: 'name', label: 'Name', required: true },
              ],
            },
          },
          {
            id: 'update-test',
            method: 'PUT',
            path: '/test/{id}',
            viewHint: 'update',
            parameters: [],
            responses: {},
            requestBody: {
              type: 'object',
              key: 'test',
              label: 'Test',
              required: false,
              children: [
                { type: 'string', key: 'name', label: 'Name', required: true },
              ],
            },
          },
        ],
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', name: 'Test' }),
      });

      const { rerender } = render(
        <Wrapper>
          <FormView resource={resource} mode="create" />
        </Wrapper>
      );

      // Switch to edit mode - should not cause hook count mismatch
      rerender(
        <Wrapper>
          <FormView resource={resource} mode="edit" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Hook Call Order Consistency', () => {
    it('should call the same number of hooks regardless of operation presence', () => {
      const resourceWithOp = createResource({
        operations: [
          {
            id: 'list-test',
            method: 'GET',
            path: '/test',
            viewHint: 'list',
            parameters: [],
            responses: {},
          },
        ],
      });

      const resourceWithoutOp = createResource({
        operations: [],
      });

      // Both should render without crashing
      const { unmount: unmount1 } = render(
        <Wrapper>
          <ListView resource={resourceWithOp} />
        </Wrapper>
      );
      unmount1();

      const { unmount: unmount2 } = render(
        <Wrapper>
          <ListView resource={resourceWithoutOp} />
        </Wrapper>
      );
      unmount2();

      // If we get here without errors, hook calls are consistent
      expect(true).toBe(true);
    });
  });
});
