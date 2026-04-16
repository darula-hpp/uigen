import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import { storeAuthCredentials, clearAuthCredentials, type AuthCredentials } from '../lib/auth';
import type { UIGenApp } from '@uigen-dev/core';

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

const createMockConfig = (): UIGenApp => ({
  meta: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      operations: [
        {
          id: 'listUsers',
          method: 'GET',
          path: '/users',
          summary: 'List Users',
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
    },
  ],
  auth: {
    schemes: [
      {
        type: 'bearer',
        name: 'bearerAuth',
        scheme: 'bearer',
      },
    ],
    globalRequired: false,
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local',
    },
  ],
  dashboard: {
    enabled: true,
    widgets: [],
  },
});

describe('Login Routing', () => {
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
    // Clear session storage before each test
    clearAuthCredentials();
    // Ensure sessionStorage is available
    if (typeof sessionStorage === 'undefined') {
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });
    }
  });

  afterEach(() => {
    clearAuthCredentials();
  });

  /**
   * Test unauthenticated user redirects to /login
   * Validates Requirement 16.6, 32.3
   */
  describe('Unauthenticated User Redirects', () => {
    it('should redirect unauthenticated user from dashboard to /login', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });
    });

    it('should redirect unauthenticated user from protected route to /login', async () => {
      // Try to access /users without authentication
      window.history.pushState({}, '', '/users');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });
    });

    it('should show login page when accessing /login directly', async () => {
      window.history.pushState({}, '', '/login');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
        expect(screen.getByLabelText('Bearer Token')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test authenticated user can access protected routes
   * Validates Requirement 16.6, 32.1, 32.2
   */
  describe('Authenticated User Access', () => {
    it('should allow authenticated user to access dashboard', async () => {
      // Set up authentication
      const credentials: AuthCredentials = {
        type: 'bearer',
        token: 'test-token-123',
      };
      storeAuthCredentials(credentials);

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should show dashboard with Resources heading
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
      });
    });

    it('should allow authenticated user to access protected routes', async () => {
      // Set up authentication
      const credentials: AuthCredentials = {
        type: 'bearer',
        token: 'test-token-123',
      };
      storeAuthCredentials(credentials);

      window.history.pushState({}, '', '/users');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should show users list view - check for navigation link
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
      });
    });

    it('should allow user with API key authentication to access protected routes', async () => {
      // Set up API key authentication
      const credentials: AuthCredentials = {
        type: 'apiKey',
        apiKey: 'test-api-key',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header',
      };
      storeAuthCredentials(credentials);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should NOT show login page
      await waitFor(() => {
        expect(screen.queryByText('Sign in to access the dashboard')).not.toBeInTheDocument();
      });
      
      // Should render some content (not empty)
      expect(container.firstChild).toBeTruthy();
    });

    it('should allow user who skipped authentication to access protected routes', async () => {
      // User chose to skip authentication
      const credentials: AuthCredentials = {
        type: 'none',
      };
      storeAuthCredentials(credentials);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should NOT show login page
      await waitFor(() => {
        expect(screen.queryByText('Sign in to access the dashboard')).not.toBeInTheDocument();
      });
      
      // Should render some content (not empty)
      expect(container.firstChild).toBeTruthy();
    });
  });

  /**
   * Test authenticated user redirects from /login to dashboard
   * Validates Requirement 16.6, 32.3
   */
  describe('Authenticated User Redirects from Login', () => {
    it('should redirect authenticated user from /login to dashboard', async () => {
      // Set up authentication
      const credentials: AuthCredentials = {
        type: 'bearer',
        token: 'test-token-123',
      };
      storeAuthCredentials(credentials);

      window.history.pushState({}, '', '/login');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
      });

      // Should NOT show login page
      expect(screen.queryByText('Sign in to access the dashboard')).not.toBeInTheDocument();
    });

    it('should redirect to dashboard after successful login', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should show login page
      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });

      // Enter bearer token
      const tokenInput = screen.getByLabelText('Bearer Token');
      await user.type(tokenInput, 'my-test-token');

      // Submit form
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should redirect to dashboard
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
      });
    });
  });

  /**
   * Test ProtectedRoute wrapper behavior
   * Validates Requirement 32.1, 32.2
   */
  describe('ProtectedRoute Wrapper', () => {
    it('should wrap all protected routes with authentication check', async () => {
      // Without authentication, all routes should redirect to login
      const protectedRoutes = ['/', '/users', '/users/123', '/users/new', '/users/123/edit'];

      for (const route of protectedRoutes) {
        clearAuthCredentials();
        window.history.pushState({}, '', route);

        const { unmount } = render(
          <QueryClientProvider client={queryClient}>
            <App config={mockConfig} />
          </QueryClientProvider>
        );

        await waitFor(() => {
          expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should not wrap /login route with authentication check', async () => {
      // Login route should be accessible without authentication
      window.history.pushState({}, '', '/login');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });

      // Should show login form, not redirect
      expect(screen.getByLabelText('Bearer Token')).toBeInTheDocument();
    });
  });

  /**
   * Test authentication state changes
   * Validates Requirement 16.6, 67.1-67.4
   */
  describe('Authentication State Changes', () => {
    it('should check authentication on app load', async () => {
      // Set up authentication before rendering
      const credentials: AuthCredentials = {
        type: 'bearer',
        token: 'test-token-123',
      };
      storeAuthCredentials(credentials);

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should immediately show dashboard (no redirect to login)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
      });
    });

    it('should handle missing credentials on app load', async () => {
      // No credentials stored
      clearAuthCredentials();

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });
    });

    it('should handle invalid credentials on app load', async () => {
      // Store invalid credentials (bearer without token)
      const credentials: AuthCredentials = {
        type: 'bearer',
      };
      storeAuthCredentials(credentials);

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });
    });
  });

  /**
   * Test Layout component only wraps authenticated routes
   * Validates Requirement 31.1, 31.2
   */
  describe('Layout Component Wrapping', () => {
    it('should not render Layout on login page', async () => {
      window.history.pushState({}, '', '/login');

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
      });

      // Layout components should not be present
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    });

    it('should render Layout on authenticated routes', async () => {
      // Set up authentication
      const credentials: AuthCredentials = {
        type: 'bearer',
        token: 'test-token-123',
      };
      storeAuthCredentials(credentials);

      render(
        <QueryClientProvider client={queryClient}>
          <App config={mockConfig} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
      });

      // Layout components should be present - check for sidebar navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      // Check for Users link in sidebar (proves layout is rendered)
      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    });
  });
});
