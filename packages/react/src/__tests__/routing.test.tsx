import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { ListView } from '../components/views/ListView';
import { DetailView } from '../components/views/DetailView';
import { FormView } from '../components/views/FormView';
import { DashboardView } from '../components/views/DashboardView';
import type { UIGenApp, Resource } from '@uigen-dev/core';

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

const createMockResource = (slug: string, name: string): Resource => ({
  name,
  slug,
  operations: [
    {
      id: `list${name}`,
      method: 'GET',
      path: `/${slug}`,
      summary: `List ${name}`,
      parameters: [],
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'array',
            key: 'items',
            label: 'Items',
            required: false,
          },
        },
      },
      viewHint: 'list',
    },
    {
      id: `get${name}`,
      method: 'GET',
      path: `/${slug}/{id}`,
      summary: `Get ${name}`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true },
        },
      ],
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'object',
            key: 'item',
            label: 'Item',
            required: false,
            children: [
              { type: 'string', key: 'id', label: 'ID', required: true },
              { type: 'string', key: 'name', label: 'Name', required: true },
            ],
          },
        },
      },
      viewHint: 'detail',
    },
    {
      id: `create${name}`,
      method: 'POST',
      path: `/${slug}`,
      summary: `Create ${name}`,
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: 'object',
          key: 'body',
          label: 'Body',
          required: true,
          children: [
            { type: 'string', key: 'name', label: 'Name', required: true },
          ],
        },
      },
      responses: {
        '201': {
          description: 'Created',
          schema: {
            type: 'object',
            key: 'item',
            label: 'Item',
            required: false,
          },
        },
      },
      viewHint: 'create',
    },
    {
      id: `update${name}`,
      method: 'PUT',
      path: `/${slug}/{id}`,
      summary: `Update ${name}`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true },
        },
      ],
      requestBody: {
        required: true,
        schema: {
          type: 'object',
          key: 'body',
          label: 'Body',
          required: true,
          children: [
            { type: 'string', key: 'name', label: 'Name', required: true },
          ],
        },
      },
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'object',
            key: 'item',
            label: 'Item',
            required: false,
          },
        },
      },
      viewHint: 'update',
    },
  ],
  schema: {
    type: 'object',
    key: 'root',
    label: name,
    required: false,
    children: [
      { type: 'string', key: 'id', label: 'ID', required: true },
      { type: 'string', key: 'name', label: 'Name', required: true },
    ],
  },
  relationships: [],
});

const createMockConfig = (): UIGenApp => ({
  meta: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API',
  },
  resources: [
    createMockResource('users', 'Users'),
    createMockResource('posts', 'Posts'),
  ],
  auth: {
    schemes: [],
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local',
    },
  ],
  dashboard: {
    widgets: [],
  },
});

// Placeholder for SearchView
const SearchViewPlaceholder = () => (
  <div className="p-4 text-muted-foreground">Search view coming soon</div>
);

// Create routes configuration
const createRoutes = (config: UIGenApp) => {
  return [
    {
      path: '/',
      element: <Layout config={config}><DashboardView config={config} /></Layout>,
    },
    ...config.resources.flatMap(resource => [
      {
        path: `/${resource.slug}`,
        element: <Layout config={config}><ListView resource={resource} /></Layout>,
      },
      {
        path: `/${resource.slug}/new`,
        element: <Layout config={config}><FormView resource={resource} mode="create" /></Layout>,
      },
      {
        path: `/${resource.slug}/search`,
        element: <Layout config={config}><SearchViewPlaceholder /></Layout>,
      },
      {
        path: `/${resource.slug}/:id`,
        element: <Layout config={config}><DetailView resource={resource} /></Layout>,
      },
      {
        path: `/${resource.slug}/:id/edit`,
        element: <Layout config={config}><FormView resource={resource} mode="edit" /></Layout>,
      },
    ]),
  ];
};

describe('Routing', () => {
  let queryClient: QueryClient;
  let mockConfig: UIGenApp;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockConfig = createMockConfig();
  });

  /**
   * Test route navigation
   * Validates Requirements 32.1, 32.2, 32.3
   */
  describe('Route Navigation', () => {
    it('should render dashboard at root path', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Should show dashboard with app title
      await waitFor(() => {
        expect(screen.getByText('Test API')).toBeInTheDocument();
        expect(screen.getByText('Resources')).toBeInTheDocument();
      });
    });

    it('should render list view for resource route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
      });
    });

    it('should render detail view for resource/:id route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users/123'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Users Details')).toBeInTheDocument();
      });
    });

    it('should render create form for resource/new route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users/new'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Create Users/i)).toBeInTheDocument();
      });
    });

    it('should render edit form for resource/:id/edit route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users/123/edit'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Edit Users/i)).toBeInTheDocument();
      });
    });

    it('should render search placeholder for resource/search route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users/search'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Search view coming soon/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test URL updates
   * Validates Requirements 32.4
   */
  describe('URL Updates', () => {
    it('should update URL when navigating between views', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Initial URL
      expect(router.state.location.pathname).toBe('/users');

      // Navigate to create
      router.navigate('/users/new');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/new');
      });

      // Navigate to detail
      router.navigate('/users/123');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123');
      });

      // Navigate to edit
      router.navigate('/users/123/edit');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123/edit');
      });
    });

    it('should maintain URL state across different resources', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Navigate to posts
      router.navigate('/posts');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/posts');
      });

      // Navigate to posts detail
      router.navigate('/posts/456');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/posts/456');
      });
    });
  });

  /**
   * Test browser history
   * Validates Requirements 32.5
   */
  describe('Browser History', () => {
    it('should support browser back navigation', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users', '/users/123', '/users/123/edit'],
        initialIndex: 2,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Currently at /users/123/edit
      expect(router.state.location.pathname).toBe('/users/123/edit');

      // Go back
      router.navigate(-1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123');
      });

      // Go back again
      router.navigate(-1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users');
      });
    });

    it('should support browser forward navigation', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users', '/users/123', '/users/123/edit'],
        initialIndex: 0,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Currently at /users
      expect(router.state.location.pathname).toBe('/users');

      // Go forward
      router.navigate(1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123');
      });

      // Go forward again
      router.navigate(1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123/edit');
      });
    });

    it('should maintain history stack correctly', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Navigate through multiple views
      router.navigate('/users/123');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123');
      });

      router.navigate('/users/123/edit');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123/edit');
      });

      router.navigate('/posts');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/posts');
      });

      // Go back through history
      router.navigate(-1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123/edit');
      });

      router.navigate(-1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users/123');
      });

      router.navigate(-1);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/users');
      });
    });
  });

  /**
   * Test breadcrumb navigation
   * Validates Requirement 32.6
   */
  describe('Breadcrumb Navigation', () => {
    it('should display breadcrumbs for current route', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users/123'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
      });
    });

    it('should update breadcrumbs when navigating', async () => {
      const router = createMemoryRouter(createRoutes(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      );

      // Navigate to detail
      router.navigate('/users/123');
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
      });

      // Navigate to edit
      router.navigate('/users/123/edit');
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });
  });
});
