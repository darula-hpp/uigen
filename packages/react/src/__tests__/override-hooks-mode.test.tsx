import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListView } from '../components/views/ListView';
import { overrideRegistry } from '../overrides';
import { OverrideHooksHost, useOverrideData } from '../overrides';
import { renderHook, act } from '@testing-library/react';
import type { Resource } from '@uigen-dev/core';
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';

// Mock API calls so views render without network
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: [{ id: '1', name: 'Alice' }],
    isLoading: false,
    error: null,
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Minimal resource fixture
const createResource = (overrides?: Partial<Resource>): Resource => ({
  name: 'Users',
  slug: 'users',
  uigenId: 'users',
  description: undefined,
  operations: [
    {
      id: 'listUsers',
      uigenId: 'listUsers',
      method: 'GET',
      path: '/users',
      summary: 'List Users',
      parameters: [],
      responses: {
        '200': {
          description: 'Success',
          schema: { type: 'array', key: 'items', label: 'Items', required: false },
        },
      },
      viewHint: 'list',
    },
  ],
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
  relationships: [],
  pagination: undefined,
  ...overrides,
});

const renderListView = (resource: Resource) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: '/users', element: <ListView resource={resource} /> }],
    { initialEntries: ['/users'] }
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

describe('useHooks mode override', () => {
  beforeEach(() => {
    overrideRegistry.clear();
  });

  afterEach(() => {
    overrideRegistry.clear();
  });

  /**
   * Task 7.2: useHooks mode — hook is called and built-in view still renders
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  describe('basic useHooks behavior', () => {
    it('should call useHooks when override is registered', async () => {
      const useHooksSpy = vi.fn(() => {});
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: useHooksSpy,
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(useHooksSpy).toHaveBeenCalled();
      });
    });

    it('should pass resource and operation props to useHooks', async () => {
      const useHooksSpy = vi.fn(() => {});
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: useHooksSpy,
      });

      const resource = createResource();
      renderListView(resource);

      await waitFor(() => {
        expect(useHooksSpy).toHaveBeenCalledWith(
          expect.objectContaining({ resource: expect.objectContaining({ uigenId: 'users' }) })
        );
      });
    });

    it('should still render the built-in table when useHooks mode is active', async () => {
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {},
      });

      renderListView(createResource());

      await waitFor(() => {
        // Built-in table renders the resource name heading
        expect(screen.getByText('Users')).toBeInTheDocument();
      });
    });

    it('should execute side effects via useEffect inside useHooks', async () => {
      const sideEffectSpy = vi.fn();

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          useEffect(() => {
            sideEffectSpy();
          }, []);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(sideEffectSpy).toHaveBeenCalled();
      });
    });

    it('should update document.title as a side effect', async () => {
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          useEffect(() => {
            document.title = 'Custom Users Page';
          }, []);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(document.title).toBe('Custom Users Page');
      });

      // Cleanup
      document.title = '';
    });
  });

  /**
   * Task 7.3: useHooks with standard React hooks
   * Requirements: 7.5, 9.1-9.8
   */
  describe('standard React hooks inside useHooks', () => {
    it('should support useState inside useHooks without violating hook rules', async () => {
      const stateValues: number[] = [];

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          const [count] = useState(42);
          stateValues.push(count);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(stateValues).toContain(42);
      });
    });

    it('should support useEffect inside useHooks', async () => {
      const effectSpy = vi.fn();

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          useEffect(() => {
            effectSpy('mounted');
            return () => effectSpy('unmounted');
          }, []);
        },
      });

      const { unmount } = renderListView(createResource());

      await waitFor(() => {
        expect(effectSpy).toHaveBeenCalledWith('mounted');
      });

      unmount();
      expect(effectSpy).toHaveBeenCalledWith('unmounted');
    });

    it('should support useLayoutEffect inside useHooks', async () => {
      const layoutEffectSpy = vi.fn();

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          useLayoutEffect(() => {
            layoutEffectSpy('layout');
          }, []);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(layoutEffectSpy).toHaveBeenCalledWith('layout');
      });
    });

    it('should support useCallback inside useHooks', async () => {
      const callbackRef: { fn?: () => string } = {};

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          const cb = useCallback(() => 'callback-result', []);
          callbackRef.fn = cb;
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(callbackRef.fn).toBeDefined();
        expect(callbackRef.fn!()).toBe('callback-result');
      });
    });

    it('should support useMemo inside useHooks', async () => {
      const memoValues: number[] = [];

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          const computed = useMemo(() => 2 + 2, []);
          memoValues.push(computed);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(memoValues).toContain(4);
      });
    });

    it('should support useRef inside useHooks', async () => {
      const refValues: unknown[] = [];

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          const ref = useRef('initial-value');
          refValues.push(ref.current);
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(refValues).toContain('initial-value');
      });
    });
  });

  /**
   * Task 7.4: useHooks error handling
   * Requirements: 7.3, 15.5
   */
  describe('useHooks error handling', () => {
    it('should catch errors thrown in useHooks and still render built-in view', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          throw new Error('Hook error');
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        // Built-in view still renders despite hook error
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UIGen Override]'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error with targetId when useHooks throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          throw new Error('Intentional hook failure');
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('users.list'),
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Task 7.5: useHooks return value storage in context
   * Requirements: 7.6
   */
  describe('useHooks return value storage', () => {
    it('should store return value from useHooks in OverrideDataContext', async () => {
      const returnedData = { analyticsId: 'abc123', userId: 42 };
      let capturedData: Record<string, unknown> = {};

      // A child component that reads from context
      function DataReader({ onData }: { onData: (d: Record<string, unknown>) => void }) {
        const data = useOverrideData();
        onData(data);
        return null;
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <OverrideHooksHost
            uigenId="users.list"
            resource={createResource()}
          >
            <DataReader onData={(d) => { capturedData = d; }} />
          </OverrideHooksHost>
        </QueryClientProvider>
      );

      // Register override that returns data
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => returnedData,
      });

      // Re-render with the override registered
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <OverrideHooksHost
            uigenId="users.list"
            resource={createResource()}
          >
            <DataReader onData={(d) => { capturedData = d; }} />
          </OverrideHooksHost>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(capturedData).toEqual(returnedData);
      });
    });

    it('should provide empty object when useHooks returns void', async () => {
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => { /* returns void */ },
      });

      let capturedData: Record<string, unknown> = { sentinel: true };

      function DataReader() {
        const data = useOverrideData();
        capturedData = data;
        return null;
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <OverrideHooksHost
            uigenId="users.list"
            resource={createResource()}
          >
            <DataReader />
          </OverrideHooksHost>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(capturedData).toEqual({});
      });
    });

    it('should make useOverrideData accessible to child components', async () => {
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => ({ pageTitle: 'My Users', count: 5 }),
      });

      let hookResult: Record<string, unknown> = {};

      function Consumer() {
        hookResult = useOverrideData();
        return <div data-testid="consumer">{String(hookResult.pageTitle)}</div>;
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <OverrideHooksHost
            uigenId="users.list"
            resource={createResource()}
          >
            <Consumer />
          </OverrideHooksHost>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('consumer')).toHaveTextContent('My Users');
        expect(hookResult.count).toBe(5);
      });
    });
  });
});
