/**
 * Tests to detect conditional hook calls in the override system
 * 
 * Ensures that the override system doesn't violate React's Rules of Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { overrideRegistry } from '../registry';
import { OverrideHooksHost } from '../OverrideHooksHost';
import { ListView } from '../../components/views/ListView';
import { SearchView } from '../../components/views/SearchView';
import type { Resource } from '@uigen-dev/core';
import { useState } from 'react';

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
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

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

describe('Override System - Conditional Hooks Detection', () => {
  beforeEach(() => {
    overrideRegistry.clear();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    overrideRegistry.clear();
  });

  describe('OverrideHooksHost', () => {
    it('should call useHooks unconditionally when override exists', () => {
      const useHooksMock = vi.fn(() => ({ customData: 'test' }));

      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: useHooksMock,
      });

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

      render(
        <Wrapper>
          <OverrideHooksHost
            uigenId="test-resource.list"
            resource={resource}
            operation={resource.operations[0]}
          >
            <div>Test Content</div>
          </OverrideHooksHost>
        </Wrapper>
      );

      expect(useHooksMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should not crash when useHooks throws an error', () => {
      const useHooksMock = vi.fn(() => {
        throw new Error('Hook error');
      });

      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: useHooksMock,
      });

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

      // Should not crash - error should be caught
      expect(() => {
        render(
          <Wrapper>
            <OverrideHooksHost
              uigenId="test-resource.list"
              resource={resource}
              operation={resource.operations[0]}
            >
              <div>Test Content</div>
            </OverrideHooksHost>
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should maintain consistent hook calls across re-renders', () => {
      let renderCount = 0;
      const useHooksMock = vi.fn(() => {
        renderCount++;
        return { renderCount };
      });

      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: useHooksMock,
      });

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

      const { rerender } = render(
        <Wrapper>
          <OverrideHooksHost
            uigenId="test-resource.list"
            resource={resource}
            operation={resource.operations[0]}
          >
            <div>Test Content</div>
          </OverrideHooksHost>
        </Wrapper>
      );

      const initialCallCount = useHooksMock.mock.calls.length;

      // Force re-render
      rerender(
        <Wrapper>
          <OverrideHooksHost
            uigenId="test-resource.list"
            resource={resource}
            operation={resource.operations[0]}
          >
            <div>Test Content</div>
          </OverrideHooksHost>
        </Wrapper>
      );

      // Hook should be called again on re-render
      expect(useHooksMock.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should not call hooks conditionally based on operation presence', () => {
      const useHooksMock = vi.fn(() => ({}));

      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: useHooksMock,
      });

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

      // Render with operation
      const { unmount } = render(
        <Wrapper>
          <OverrideHooksHost
            uigenId="test-resource.list"
            resource={resource}
            operation={resource.operations[0]}
          >
            <div>Test Content</div>
          </OverrideHooksHost>
        </Wrapper>
      );

      const callsWithOp = useHooksMock.mock.calls.length;
      unmount();
      useHooksMock.mockClear();

      // Render without operation
      render(
        <Wrapper>
          <OverrideHooksHost
            uigenId="test-resource.list"
            resource={resource}
            operation={undefined}
          >
            <div>Test Content</div>
          </OverrideHooksHost>
        </Wrapper>
      );

      const callsWithoutOp = useHooksMock.mock.calls.length;

      // Both should call the hook
      expect(callsWithOp).toBeGreaterThan(0);
      expect(callsWithoutOp).toBeGreaterThan(0);
    });
  });

  describe('ListView with hooks override', () => {
    it('should not crash when hooks override is registered', () => {
      const useHooksMock = vi.fn(() => {
        // Simulate a hook that uses useState
        const [count] = useState(0);
        return { count };
      });

      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: useHooksMock,
      });

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

      expect(() => {
        render(
          <Wrapper>
            <ListView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('should maintain consistent hook calls when switching between override modes', () => {
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

      // First render without override
      const { unmount, rerender } = render(
        <Wrapper>
          <ListView resource={resource} />
        </Wrapper>
      );

      // Register override
      overrideRegistry.register({
        targetId: 'test-resource.list',
        useHooks: () => ({ test: true }),
      });

      // Re-render with override - this should NOT cause hook count mismatch
      // because the component should be remounted when override changes
      rerender(
        <Wrapper>
          <ListView resource={resource} />
        </Wrapper>
      );

      unmount();

      // Clear override
      overrideRegistry.clear();

      // Render again without override
      render(
        <Wrapper>
          <ListView resource={resource} />
        </Wrapper>
      );

      // If we get here without errors, hook calls are consistent
      expect(true).toBe(true);
    });
  });

  describe('SearchView with hooks override', () => {
    it('should not crash when hooks override is registered', () => {
      const useHooksMock = vi.fn(() => {
        const [filters] = useState({});
        return { filters };
      });

      overrideRegistry.register({
        targetId: 'test-resource.search',
        useHooks: useHooksMock,
      });

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
            <SearchView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Hook call consistency with conditional rendering', () => {
    it('should call hooks before any conditional returns in views', () => {
      const resource = createResource({
        operations: [], // No operations - will trigger early return
      });

      // This should NOT crash even though there's an early return
      expect(() => {
        render(
          <Wrapper>
            <ListView resource={resource} />
          </Wrapper>
        );
      }).not.toThrow();

      expect(screen.getByText(/No list operation available/i)).toBeInTheDocument();
    });

    it('should handle rapid state changes without hook count mismatches', () => {
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

      const { rerender } = render(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );

      // Simulate rapid re-renders (like filter changes)
      for (let i = 0; i < 5; i++) {
        rerender(
          <Wrapper>
            <SearchView resource={resource} />
          </Wrapper>
        );
      }

      // Should not crash with hook count mismatch
      expect(true).toBe(true);
    });
  });
});
