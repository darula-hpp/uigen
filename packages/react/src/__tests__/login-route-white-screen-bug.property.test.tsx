import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import { clearAuthCredentials, storeAuthCredentials, type AuthCredentials } from '../lib/auth';
import type { UIGenApp } from '@uigen-dev/core';
import * as fc from 'fast-check';

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

const createMockConfig = (hasAuth: boolean = true): UIGenApp => ({
  meta: {
    title: 'Test API',
    version: '1.0.0',
    description: 'Test API',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      uigenId: 'users',
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
  auth: hasAuth
    ? {
        schemes: [
          {
            type: 'bearer',
            name: 'bearerAuth',
            scheme: 'bearer',
          },
        ],
        globalRequired: false,
      }
    : {
        schemes: [],
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

/**
 * Property 1: Bug Condition - Login Route White Screen
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * For any navigation to /login route, the routing structure SHALL render the LoginRoute component,
 * which displays LoginView (if unauthenticated and auth is configured) or redirects to dashboard
 * (if authenticated or no auth configured), ensuring no blank screen occurs.
 */
describe('Bug Condition Exploration: Login Route White Screen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    clearAuthCredentials();
  });

  afterEach(() => {
    clearAuthCredentials();
  });

  /**
   * Helper function to check if the rendered output is a blank screen
   * A blank screen is characterized by:
   * - No LoginView component rendered (no login form elements)
   * - No redirect to dashboard (no Resources heading)
   * - Empty or minimal content
   */
  const isBlankScreen = (container: HTMLElement): boolean => {
    // Check if LoginView is rendered (login form elements present)
    const hasLoginView =
      screen.queryByText(/sign in to access/i) !== null ||
      screen.queryByLabelText(/bearer token/i) !== null ||
      screen.queryByLabelText(/api key/i) !== null;

    // Check if redirected to dashboard (Resources heading present)
    const hasDashboard = screen.queryByRole('heading', { name: /resources/i }) !== null;

    // Check if there's any meaningful content
    const hasContent = container.textContent && container.textContent.trim().length > 0;

    // Blank screen = no login view AND no dashboard AND no meaningful content
    return !hasLoginView && !hasDashboard && !hasContent;
  };

  /**
   * Test Case 1: Unauthenticated user navigates to /login
   * Expected: Should render LoginView with authentication form
   * Bug: Renders blank screen instead
   */
  it('should render LoginView when unauthenticated user navigates to /login', async () => {
    const mockConfig = createMockConfig(true);

    // Navigate to /login
    window.history.pushState({}, '', '/login');

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Wait for rendering to complete
    await waitFor(
      () => {
        // Assert LoginView is rendered (not blank screen)
        expect(isBlankScreen(container)).toBe(false);

        // Assert LoginView component is present
        expect(
          screen.getByText(/sign in to access/i) ||
            screen.getByLabelText(/bearer token/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  /**
   * Test Case 2: Authenticated user navigates to /login
   * Expected: Should redirect to dashboard
   * Bug: May render blank screen instead
   */
  it('should redirect to dashboard when authenticated user navigates to /login', async () => {
    const mockConfig = createMockConfig(true);

    // Set up authentication
    const credentials: AuthCredentials = {
      type: 'bearer',
      token: 'test-token-123',
    };
    storeAuthCredentials(credentials);

    // Navigate to /login
    window.history.pushState({}, '', '/login');

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Wait for rendering to complete
    await waitFor(
      () => {
        // Assert NOT blank screen
        expect(isBlankScreen(container)).toBe(false);

        // Assert redirected to dashboard
        expect(screen.getByRole('heading', { name: /resources/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  /**
   * Test Case 3: Unauthenticated user redirected from protected route to /login
   * Expected: Should render LoginView after redirect
   * Bug: Renders blank screen after redirect
   */
  it('should render LoginView when redirected from protected route to /login', async () => {
    const mockConfig = createMockConfig(true);

    // Try to access protected route without authentication
    window.history.pushState({}, '', '/users');

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Wait for redirect and rendering to complete
    await waitFor(
      () => {
        // Assert NOT blank screen
        expect(isBlankScreen(container)).toBe(false);

        // Assert LoginView is rendered after redirect
        expect(
          screen.getByText(/sign in to access/i) ||
            screen.getByLabelText(/bearer token/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  /**
   * Test Case 4: No auth configured, user navigates to /login
   * Expected: Should redirect to dashboard
   * Bug: May render blank screen
   */
  it('should redirect to dashboard when no auth is configured and user navigates to /login', async () => {
    const mockConfig = createMockConfig(false); // No auth configured

    // Navigate to /login
    window.history.pushState({}, '', '/login');

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <App config={mockConfig} />
      </QueryClientProvider>
    );

    // Wait for rendering to complete
    await waitFor(
      () => {
        // Assert NOT blank screen
        expect(isBlankScreen(container)).toBe(false);

        // Assert redirected to dashboard
        expect(screen.getByRole('heading', { name: /resources/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  /**
   * Property-Based Test: Login Route Renders Correctly
   * 
   * For ANY authentication state (authenticated, unauthenticated, no auth),
   * navigating to /login SHALL NOT result in a blank screen.
   * 
   * The system SHALL either:
   * - Render LoginView (if unauthenticated and auth is configured)
   * - Redirect to dashboard (if authenticated or no auth configured)
   */
  it('property: navigating to /login never results in blank screen', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different authentication states
        fc.record({
          hasAuth: fc.boolean(),
          isAuthenticated: fc.boolean(),
          authType: fc.constantFrom('bearer', 'apiKey', 'none'),
        }),
        async ({ hasAuth, isAuthenticated, authType }) => {
          // Setup
          clearAuthCredentials();
          const mockConfig = createMockConfig(hasAuth);

          if (isAuthenticated && hasAuth) {
            const credentials: AuthCredentials =
              authType === 'bearer'
                ? { type: 'bearer', token: 'test-token' }
                : authType === 'apiKey'
                  ? {
                      type: 'apiKey',
                      apiKey: 'test-key',
                      apiKeyName: 'X-API-Key',
                      apiKeyIn: 'header',
                    }
                  : { type: 'none' };
            storeAuthCredentials(credentials);
          }

          // Navigate to /login
          window.history.pushState({}, '', '/login');

          const { container, unmount } = render(
            <QueryClientProvider client={queryClient}>
              <App config={mockConfig} />
            </QueryClientProvider>
          );

          try {
            // Wait for rendering to complete
            await waitFor(
              () => {
                // Property: SHALL NOT render blank screen
                expect(isBlankScreen(container)).toBe(false);

                // Property: SHALL render either LoginView or Dashboard
                const hasLoginView =
                  screen.queryByText(/sign in to access/i) !== null ||
                  screen.queryByLabelText(/bearer token/i) !== null;
                const hasDashboard =
                  screen.queryByRole('heading', { name: /resources/i }) !== null;

                expect(hasLoginView || hasDashboard).toBe(true);
              },
              { timeout: 3000 }
            );
          } finally {
            unmount();
            clearAuthCredentials();
          }
        }
      ),
      {
        numRuns: 20,
        verbose: true,
      }
    );
  });
});
