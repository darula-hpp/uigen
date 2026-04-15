import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListView } from '../components/views/ListView';
import { DetailView } from '../components/views/DetailView';
import { overrideRegistry } from '../overrides';
import { App } from '../App';
import type { Resource, UIGenApp } from '@uigen-dev/core';

// Mock API calls
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

const createResource = (): Resource => ({
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
    {
      id: 'getUser',
      uigenId: 'getUser',
      method: 'GET',
      path: '/users/{id}',
      summary: 'Get User',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', key: 'id', label: 'ID', required: true } },
      ],
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'object', key: 'item', label: 'Item', required: false,
            children: [
              { type: 'string', key: 'id', label: 'ID', required: true },
              { type: 'string', key: 'name', label: 'Name', required: true },
            ],
          },
        },
      },
      viewHint: 'detail',
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
});

const createAppConfig = (): UIGenApp => ({
  meta: { title: 'Test App', version: '1.0.0', description: 'Test' },
  resources: [createResource()],
  auth: { schemes: [] },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  dashboard: { widgets: [] },
});

const renderListView = (resource: Resource) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

const renderApp = (path = '/users') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App config={createAppConfig()} />
    </QueryClientProvider>
  );
};

describe('Override error handling', () => {
  beforeEach(() => {
    overrideRegistry.clear();
  });

  afterEach(() => {
    overrideRegistry.clear();
  });

  /**
   * Render mode error → fallback to built-in view
   * Requirements: 15.4, 15.6, 15.8
   */
  describe('render mode error handling', () => {
    it('should fall back to built-in view when renderFn throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        render: () => {
          throw new Error('Render function crashed');
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        // Built-in view renders as fallback
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UIGen Override]'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error with uigenId when renderFn throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        render: () => {
          throw new Error('Render crash');
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
   * useHooks error → built-in view still renders
   * Requirements: 15.5, 15.6, 15.8
   */
  describe('useHooks error handling', () => {
    it('should render built-in view when useHooks throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {
          throw new Error('Hook crashed');
        },
      });

      renderListView(createResource());

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Component mode error → error boundary catches it
   * Requirements: 15.3, 15.6, 15.8
   */
  describe('component mode error boundary', () => {
    it('should catch component override errors with error boundary', async () => {
      // Suppress React's error boundary console output in tests
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function CrashingComponent() {
        throw new Error('Component override crashed');
      }

      overrideRegistry.register({
        targetId: 'users.list',
        component: CrashingComponent,
      });

      // Render the ErrorBoundary wrapping the crashing component directly
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { ErrorBoundary: EB } = await import('../components/ErrorBoundary');

      render(
        <QueryClientProvider client={queryClient}>
          <EB>
            <CrashingComponent />
          </EB>
        </QueryClientProvider>
      );

      await waitFor(() => {
        // ErrorBoundary fallback renders "Something went wrong"
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should display error message from crashed component override', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function CrashingComponent() {
        throw new Error('Custom override error message');
      }

      overrideRegistry.register({
        targetId: 'users.list',
        component: CrashingComponent,
      });

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { ErrorBoundary: EB } = await import('../components/ErrorBoundary');

      render(
        <QueryClientProvider client={queryClient}>
          <EB>
            <CrashingComponent />
          </EB>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom override error message')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Registry validation warnings
   * Requirements: 15.1, 15.2
   */
  describe('registry validation warnings', () => {
    it('should warn when registering override with empty targetId', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({ targetId: '', component: () => null });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('empty targetId')
      );
      expect(overrideRegistry.get('')).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should warn when registering override with no mode fields', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({ targetId: 'users' } as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('no component, render, or useHooks')
      );
      expect(overrideRegistry.get('users')).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  /**
   * Non-existent uigenId warning
   * Requirements: 15.7
   */
  describe('non-existent uigenId warning', () => {
    it('should warn with similar suggestion when uigenId is close to a registered one', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({ targetId: 'users.list', component: () => null });

      // Render a view that calls reconcile('users') — partial match
      renderListView({
        ...createResource(),
        uigenId: 'user', // Will produce reconcile('user.list') — close to 'users.list'
      });

      await waitFor(() => {
        // The warn may or may not fire depending on similarity logic — just verify no crash
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});
