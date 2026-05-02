import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * End-to-end tests for complete profile flow.
 * 
 * Tests verify:
 * - Navigate to /profile from sidebar
 * - View profile data
 * - Edit profile data and save changes
 * - Navigate back to dashboard
 * - Profile not in dashboard cards
 * 
 * Requirements: 11.11
 * Task: 14.1 - Write end-to-end tests for complete profile flow
 */

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getAuthCredentials: vi.fn(() => ({ token: 'test-token' })),
  isAuthenticated: vi.fn(() => true),
  setAuthCredentials: vi.fn(),
  clearAuthCredentials: vi.fn(),
}));

const mockProfileConfig: UIGenApp = {
  meta: {
    title: 'Test API',
    version: '1.0.0',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      uigenId: 'users',
      operations: [
        {
          id: 'listUsers',
          method: 'GET',
          path: '/users',
          viewHint: 'list',
          parameters: [],
          responses: {
            '200': {
              schema: {
                type: 'array',
                key: 'users',
                label: 'Users',
                required: false,
                items: {
                  type: 'object',
                  key: 'User',
                  label: 'User',
                  required: false,
                  children: [
                    { type: 'string', key: 'id', label: 'ID', required: true },
                    { type: 'string', key: 'name', label: 'Name', required: true },
                  ],
                },
              },
            },
          },
        },
      ],
      schema: {
        type: 'object',
        key: 'User',
        label: 'User',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    },
    {
      name: 'Profile',
      slug: 'profile',
      uigenId: 'profile',
      __profileAnnotation: true,
      operations: [
        {
          id: 'getProfile',
          method: 'GET',
          path: '/profile',
          viewHint: 'detail',
          parameters: [],
          responses: {
            '200': {
              schema: {
                type: 'object',
                key: 'profile',
                label: 'Profile',
                required: false,
                children: [
                  { type: 'string', key: 'id', label: 'ID', required: true },
                  { type: 'string', key: 'name', label: 'Name', required: true },
                  { type: 'string', key: 'email', label: 'Email', required: true },
                  { type: 'string', key: 'phone', label: 'Phone', required: false },
                ],
              },
            },
          },
        },
        {
          id: 'updateProfile',
          method: 'PUT',
          path: '/profile',
          viewHint: 'update',
          parameters: [],
          requestBody: {
            schema: {
              type: 'object',
              key: 'profile',
              label: 'Profile',
              required: false,
              children: [
                { type: 'string', key: 'name', label: 'Name', required: true },
                { type: 'string', key: 'email', label: 'Email', required: true },
                { type: 'string', key: 'phone', label: 'Phone', required: false },
              ],
            },
          },
          responses: {
            '200': {
              schema: {
                type: 'object',
                key: 'profile',
                label: 'Profile',
                required: false,
                children: [
                  { type: 'string', key: 'id', label: 'ID', required: true },
                  { type: 'string', key: 'name', label: 'Name', required: true },
                  { type: 'string', key: 'email', label: 'Email', required: true },
                  { type: 'string', key: 'phone', label: 'Phone', required: false },
                ],
              },
            },
          },
        },
      ],
      schema: {
        type: 'object',
        key: 'Profile',
        label: 'Profile',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true },
          { type: 'string', key: 'phone', label: 'Phone', required: false },
        ],
      },
      relationships: [],
    },
    {
      name: 'Tasks',
      slug: 'tasks',
      uigenId: 'tasks',
      operations: [
        {
          id: 'listTasks',
          method: 'GET',
          path: '/tasks',
          viewHint: 'list',
          parameters: [],
          responses: {
            '200': {
              schema: {
                type: 'array',
                key: 'tasks',
                label: 'Tasks',
                required: false,
                items: {
                  type: 'object',
                  key: 'Task',
                  label: 'Task',
                  required: false,
                  children: [
                    { type: 'string', key: 'id', label: 'ID', required: true },
                    { type: 'string', key: 'title', label: 'Title', required: true },
                  ],
                },
              },
            },
          },
        },
      ],
      schema: {
        type: 'object',
        key: 'Task',
        label: 'Task',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'title', label: 'Title', required: true },
        ],
      },
      relationships: [],
    },
  ],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {},
  servers: [{ url: 'https://api.example.com' }],
};

describe('Profile Flow End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 14.1: Complete profile flow', () => {
    it('should complete full profile flow: navigate, view, edit, save, return to dashboard', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const user = userEvent.setup();

      const mockProfileData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const mockUpdatedProfileData = {
        id: '123',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1234567890',
      };

      const mockUsersData = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];

      const mockTasksData = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ];

      let apiCallCount = 0;
      vi.mocked(useApiCall).mockImplementation((operation: any) => {
        apiCallCount++;

        // Profile GET operation
        if (operation?.id === 'getProfile') {
          return {
            data: mockProfileData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        // Profile UPDATE operation
        if (operation?.id === 'updateProfile') {
          return {
            data: mockUpdatedProfileData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
            mutate: vi.fn(async () => mockUpdatedProfileData),
          } as any;
        }

        // Users list operation
        if (operation?.id === 'listUsers') {
          return {
            data: mockUsersData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        // Tasks list operation
        if (operation?.id === 'listTasks') {
          return {
            data: mockTasksData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        } as any;
      });

      // Start at dashboard
      render(
        <MemoryRouter initialEntries={['/']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Step 1: Verify we're on dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Step 2: Verify profile resource is NOT in dashboard cards
      await waitFor(() => {
        // Users and Tasks should be visible
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        
        // Profile should NOT be visible in dashboard
        const profileCards = screen.queryAllByText('Profile');
        // Profile might appear in sidebar, but not in dashboard resource cards
        expect(profileCards.length).toBeLessThanOrEqual(1);
      });

      // Step 3: Navigate to profile from sidebar
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toBeInTheDocument();
      await user.click(profileLink);

      // Step 4: View profile data
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
      });

      // Step 5: Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
      await user.click(editButton);

      // Step 6: Edit profile data
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        
        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      await user.clear(nameInput);
      await user.type(nameInput, 'John Smith');
      
      await user.clear(emailInput);
      await user.type(emailInput, 'john.smith@example.com');

      // Step 7: Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
      await user.click(saveButton);

      // Step 8: Verify updated data is displayed
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
      });

      // Step 9: Navigate back to dashboard
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      await user.click(dashboardLink);

      // Step 10: Verify we're back on dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Step 11: Verify profile is still not in dashboard cards
      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        
        // Profile should still NOT be visible in dashboard resource cards
        const profileCards = screen.queryAllByText('Profile');
        expect(profileCards.length).toBeLessThanOrEqual(1);
      });
    });

    it('should handle profile view without edit operation', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithoutEdit: UIGenApp = {
        ...mockProfileConfig,
        resources: mockProfileConfig.resources.map(r => {
          if (r.__profileAnnotation) {
            return {
              ...r,
              operations: r.operations.filter(op => op.method === 'GET'),
            };
          }
          return r;
        }),
      };

      const mockProfileData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={configWithoutEdit} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Edit button should NOT be present
      const editButton = screen.queryByRole('button', { name: /edit/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle loading state during profile fetch', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: false,
      } as any);

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it('should handle error state during profile fetch', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch profile'),
        refetch: vi.fn(),
        isError: true,
        isSuccess: false,
      } as any);

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Task 14.2: Multiple profile resources scenario', () => {
    it('should log warning when multiple profiles configured', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithMultipleProfiles: UIGenApp = {
        ...mockProfileConfig,
        resources: [
          ...mockProfileConfig.resources,
          {
            name: 'Account',
            slug: 'account',
            uigenId: 'account',
            __profileAnnotation: true,
            operations: [
              {
                id: 'getAccount',
                method: 'GET',
                path: '/account',
                viewHint: 'detail',
                parameters: [],
                responses: {
                  '200': {
                    schema: {
                      type: 'object',
                      key: 'account',
                      label: 'Account',
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
            schema: {
              type: 'object',
              key: 'Account',
              label: 'Account',
              required: false,
              children: [
                { type: 'string', key: 'id', label: 'ID', required: true },
                { type: 'string', key: 'name', label: 'Name', required: true },
              ],
            },
            relationships: [],
          },
        ],
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockProfileData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={configWithMultipleProfiles} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Multiple profile resources found')
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('should use first profile for /profile route when multiple exist', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithMultipleProfiles: UIGenApp = {
        ...mockProfileConfig,
        resources: [
          ...mockProfileConfig.resources,
          {
            name: 'Account',
            slug: 'account',
            uigenId: 'account',
            __profileAnnotation: true,
            operations: [
              {
                id: 'getAccount',
                method: 'GET',
                path: '/account',
                viewHint: 'detail',
                parameters: [],
                responses: {
                  '200': {
                    schema: {
                      type: 'object',
                      key: 'account',
                      label: 'Account',
                      required: false,
                      children: [
                        { type: 'string', key: 'id', label: 'ID', required: true },
                        { type: 'string', key: 'accountName', label: 'Account Name', required: true },
                      ],
                    },
                  },
                },
              },
            ],
            schema: {
              type: 'object',
              key: 'Account',
              label: 'Account',
              required: false,
              children: [
                { type: 'string', key: 'id', label: 'ID', required: true },
                { type: 'string', key: 'accountName', label: 'Account Name', required: true },
              ],
            },
            relationships: [],
          },
        ],
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockProfileData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      vi.mocked(useApiCall).mockImplementation((operation: any) => {
        if (operation?.id === 'getProfile') {
          return {
            data: mockProfileData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        } as any;
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={configWithMultipleProfiles} />
        </MemoryRouter>
      );

      // Should render first profile (Profile, not Account)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Should NOT render Account data
      expect(screen.queryByText('Account Name')).not.toBeInTheDocument();

      consoleWarnSpy.mockRestore();
    });

    it('should filter all profiles from dashboard when multiple exist', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithMultipleProfiles: UIGenApp = {
        ...mockProfileConfig,
        resources: [
          ...mockProfileConfig.resources,
          {
            name: 'Account',
            slug: 'account',
            uigenId: 'account',
            __profileAnnotation: true,
            operations: [
              {
                id: 'getAccount',
                method: 'GET',
                path: '/account',
                viewHint: 'detail',
                parameters: [],
                responses: {
                  '200': {
                    schema: {
                      type: 'object',
                      key: 'account',
                      label: 'Account',
                      required: false,
                      children: [],
                    },
                  },
                },
              },
            ],
            schema: {
              type: 'object',
              key: 'Account',
              label: 'Account',
              required: false,
              children: [],
            },
            relationships: [],
          },
        ],
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockUsersData = [{ id: '1', name: 'Alice' }];
      const mockTasksData = [{ id: '1', title: 'Task 1' }];

      vi.mocked(useApiCall).mockImplementation((operation: any) => {
        if (operation?.id === 'listUsers') {
          return {
            data: mockUsersData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        if (operation?.id === 'listTasks') {
          return {
            data: mockTasksData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        } as any;
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <App config={configWithMultipleProfiles} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Both Users and Tasks should be visible
      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
      });

      // Neither Profile nor Account should be visible in dashboard
      const profileTexts = screen.queryAllByText(/profile|account/i);
      // They might appear in sidebar, but not in dashboard resource cards
      // Filter out sidebar occurrences by checking for resource card context
      const dashboardProfileCards = profileTexts.filter(el => {
        const parent = el.closest('[data-testid="resource-card"]');
        return parent !== null;
      });
      expect(dashboardProfileCards.length).toBe(0);

      consoleWarnSpy.mockRestore();
    });

    it('should allow all profiles accessible via standard routes', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithMultipleProfiles: UIGenApp = {
        ...mockProfileConfig,
        resources: [
          ...mockProfileConfig.resources,
          {
            name: 'Account',
            slug: 'account',
            uigenId: 'account',
            __profileAnnotation: true,
            operations: [
              {
                id: 'getAccount',
                method: 'GET',
                path: '/account',
                viewHint: 'detail',
                parameters: [],
                responses: {
                  '200': {
                    schema: {
                      type: 'object',
                      key: 'account',
                      label: 'Account',
                      required: false,
                      children: [
                        { type: 'string', key: 'id', label: 'ID', required: true },
                        { type: 'string', key: 'accountName', label: 'Account Name', required: true },
                      ],
                    },
                  },
                },
              },
            ],
            schema: {
              type: 'object',
              key: 'Account',
              label: 'Account',
              required: false,
              children: [
                { type: 'string', key: 'id', label: 'ID', required: true },
                { type: 'string', key: 'accountName', label: 'Account Name', required: true },
              ],
            },
            relationships: [],
          },
        ],
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockAccountData = {
        id: '456',
        accountName: 'My Account',
      };

      vi.mocked(useApiCall).mockImplementation((operation: any) => {
        if (operation?.id === 'getAccount') {
          return {
            data: mockAccountData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any;
        }

        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        } as any;
      });

      // Navigate directly to /account route
      render(
        <MemoryRouter initialEntries={['/account']}>
          <App config={configWithMultipleProfiles} />
        </MemoryRouter>
      );

      // Should render Account data via standard route
      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      consoleWarnSpy.mockRestore();
    });
  });
});
