import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '../contexts/AppContext';
import { LayoutContainer } from '../components/layout/LayoutContainer';
import { DashboardView } from '../components/views/DashboardView';
import { LoginView } from '../components/views/LoginView';
import { SignUpView } from '../components/views/SignUpView';
import { PasswordResetView } from '../components/views/PasswordResetView';
import { ListView } from '../components/views/ListView';
import { DetailView } from '../components/views/DetailView';
import { FormView } from '../components/views/FormView';
import { registerLayoutStrategies } from '../lib/layout-strategies';
import type { UIGenApp, Resource, LayoutConfig } from '@uigen-dev/core';

/**
 * Integration tests for App.tsx with layout system
 * Tests Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * Validates:
 * - Dashboard route uses sidebar layout
 * - Auth routes use centered layout
 * - Resource routes use configured layout
 * - Layout overrides apply at resource level
 * - Layout fallback when strategy not found
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

const createMockResource = (
  slug: string,
  name: string,
  layoutOverride?: LayoutConfig
): Resource => ({
  name,
  slug,
  uigenId: slug,
  operations: [
    {
      id: `list${name}`,
      uigenId: `list${name}`,
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
      uigenId: `get${name}`,
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
      uigenId: `create${name}`,
      method: 'POST',
      path: `/${slug}`,
      summary: `Create ${name}`,
      parameters: [],
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
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
  layoutOverride,
});

// Helper to create routes with layout
const createRoutesWithLayout = (
  config: UIGenApp,
  layoutConfig?: LayoutConfig
) => {
  const routes = [];
  
  // Dashboard route
  routes.push({
    path: '/',
    element: (
      <LayoutContainer layoutConfig={layoutConfig || config.layoutConfig}>
        <DashboardView config={config} />
      </LayoutContainer>
    ),
  });
  
  // Auth routes
  if (config.auth.loginEndpoints && config.auth.loginEndpoints.length > 0) {
    routes.push({
      path: '/login',
      element: (
        <LayoutContainer layoutConfig={{ type: 'centered' }}>
          <LoginView config={config.auth} appTitle={config.meta.title} />
        </LayoutContainer>
      ),
    });
  }
  
  if (config.auth.signUpEndpoints && config.auth.signUpEndpoints.length > 0) {
    routes.push({
      path: '/signup',
      element: (
        <LayoutContainer layoutConfig={{ type: 'centered' }}>
          <SignUpView config={config.auth} appTitle={config.meta.title} />
        </LayoutContainer>
      ),
    });
  }
  
  if (config.auth.passwordResetEndpoints && config.auth.passwordResetEndpoints.length > 0) {
    routes.push({
      path: '/password-reset',
      element: (
        <LayoutContainer layoutConfig={{ type: 'centered' }}>
          <PasswordResetView config={config.auth} appTitle={config.meta.title} />
        </LayoutContainer>
      ),
    });
  }
  
  // Resource routes
  config.resources.forEach(resource => {
    const resourceLayout = resource.layoutOverride || layoutConfig || config.layoutConfig;
    
    routes.push({
      path: `/${resource.slug}`,
      element: (
        <LayoutContainer layoutConfig={resourceLayout}>
          <ListView resource={resource} />
        </LayoutContainer>
      ),
    });
    
    routes.push({
      path: `/${resource.slug}/:id`,
      element: (
        <LayoutContainer layoutConfig={resourceLayout}>
          <DetailView resource={resource} />
        </LayoutContainer>
      ),
    });
    
    routes.push({
      path: `/${resource.slug}/new`,
      element: (
        <LayoutContainer layoutConfig={resourceLayout}>
          <FormView resource={resource} mode="create" />
        </LayoutContainer>
      ),
    });
  });
  
  return routes;
};

describe('App.tsx Layout Integration Tests', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    // Register layout strategies before each test
    registerLayoutStrategies();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh query client
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  /**
   * Requirement 6.1, 6.2: Dashboard route uses sidebar layout
   * Validates that the dashboard view is wrapped with sidebar layout
   */
  describe('Dashboard Route Layout', () => {
    it('should render dashboard with sidebar layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: true,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
        expect(sidebar).toHaveClass('bg-card', 'border-r');
      });
    });

    it('should use global layout config for dashboard when specified', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: true,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 300,
          },
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });

    it('should default to sidebar layout when no global layout config', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: true,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });
  });

  /**
   * Requirement 7.1, 7.2: Auth routes use centered layout
   * Validates that login, signup, and password reset views use centered layout
   */
  describe('Auth Routes Layout', () => {
    it('should render login view with centered layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [{ type: 'bearer', name: 'bearerAuth' }],
          globalRequired: true,
          loginEndpoints: [
            {
              path: '/auth/login',
              method: 'POST',
              requestBodySchema: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: true,
                children: [
                  { type: 'string', key: 'email', label: 'Email', required: true },
                  { type: 'string', key: 'password', label: 'Password', required: true },
                ],
              },
              tokenPath: 'token',
            },
          ],
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/login'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Test App' });
        expect(headings.length).toBeGreaterThan(0);
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeFalsy();
        
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });
    });

    it('should render signup view with centered layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
          signUpEndpoints: [
            {
              path: '/auth/signup',
              method: 'POST',
              requestBodySchema: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: true,
                children: [
                  { type: 'string', key: 'email', label: 'Email', required: true },
                  { type: 'string', key: 'password', label: 'Password', required: true },
                ],
              },
            },
          ],
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/signup'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Test App' });
        expect(headings.length).toBeGreaterThan(0);
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeFalsy();
        
        expect(screen.getByText('Create your account')).toBeInTheDocument();
      });
    });

    it('should render password reset view with centered layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
          passwordResetEndpoints: [
            {
              path: '/auth/password-reset',
              method: 'POST',
              requestBodySchema: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: true,
                children: [
                  { type: 'string', key: 'email', label: 'Email', required: true },
                ],
              },
            },
          ],
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/password-reset'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: 'Test App' });
        expect(headings.length).toBeGreaterThan(0);
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeFalsy();
        
        expect(screen.getByText('Reset your password')).toBeInTheDocument();
      });
    });
  });

  /**
   * Requirement 6.3, 7.3: Resource routes use configured layout
   * Validates that resource views use the global layout configuration
   */
  describe('Resource Routes with Global Layout', () => {
    it('should render resource list view with global sidebar layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [createMockResource('users', 'Users')],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });

    it('should render resource detail view with global layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [createMockResource('users', 'Users')],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users/123'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Users Details')).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });

    it('should render resource create view with global layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [createMockResource('users', 'Users')],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users/new'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Create Users/i)).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });
  });

  /**
   * Requirement 7.4, 7.5: Layout overrides apply at resource level
   * Validates that resource-specific layout overrides take precedence over global config
   */
  describe('Resource-Level Layout Overrides', () => {
    it('should apply resource layout override instead of global layout', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [
          createMockResource('users', 'Users'),
          createMockResource('settings', 'Settings', {
            type: 'centered',
            metadata: {
              maxWidth: 600,
            },
          }),
        ],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/settings'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeFalsy();
        
        expect(screen.getByText('Test App')).toBeInTheDocument();
      });
    });

    it('should apply layout override to all resource views', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [
          createMockResource('settings', 'Settings', {
            type: 'centered',
          }),
        ],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/settings'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeFalsy();
      });
    });

    it('should use global layout when resource has no override', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [
          createMockResource('users', 'Users'),
        ],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });

    it('should support different layout overrides for different resources', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [
          createMockResource('users', 'Users'),
          createMockResource('settings', 'Settings', {
            type: 'centered',
          }),
          createMockResource('dashboard-widgets', 'Dashboard Widgets', {
            type: 'dashboard-grid',
            metadata: {
              columns: { mobile: 1, tablet: 2, desktop: 3 },
            },
          }),
        ],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/dashboard-widgets'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard Widgets' })).toBeInTheDocument();
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
        
        const gridContainer = document.querySelector('.grid');
        expect(gridContainer).toBeTruthy();
      });
    });
  });

  /**
   * Requirement 6.2: Layout fallback when strategy not found
   * Validates that the app falls back to default layout when strategy is not registered
   */
  describe('Layout Fallback Behavior', () => {
    it('should fall back to default layout when strategy not found', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: true,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'nonexistent-layout' as any,
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should fall back to default layout for resource with invalid override', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [
          createMockResource('users', 'Users', {
            type: 'invalid-layout' as any,
          }),
        ],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
        layoutConfig: {
          type: 'sidebar',
        },
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing global layout config gracefully', async () => {
      const mockConfig: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [createMockResource('users', 'Users')],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [{ url: 'http://localhost:3000' }],
      };

      const router = createMemoryRouter(createRoutesWithLayout(mockConfig), {
        initialEntries: ['/users'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AppProvider config={mockConfig}>
            <RouterProvider router={router} />
          </AppProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
        
        const sidebar = document.querySelector('aside');
        expect(sidebar).toBeTruthy();
      });
    });
  });
});
