import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfileView } from '../components/views/ProfileView';
import type { UIGenApp } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getAuthCredentials: vi.fn(),
  isAuthenticated: vi.fn(() => true),
}));

const mockConfig: UIGenApp = {
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
          responses: {},
        },
      ],
      schema: { type: 'object', key: 'User', label: 'User', required: false },
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
                  { type: 'string', key: 'name', label: 'Name', required: true },
                  { type: 'string', key: 'email', label: 'Email', required: true },
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
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true },
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

describe('Profile Routing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 7.1: Add /profile route to React Router configuration', () => {
    it('should render ProfileView when navigating to /profile', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: { name: 'John Doe', email: 'john@example.com' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('should show "No Profile Configured" when no profile resource exists', async () => {
      const configWithoutProfile: UIGenApp = {
        ...mockConfig,
        resources: mockConfig.resources.filter(r => !r.__profileAnnotation),
      };

      render(
        <BrowserRouter>
          <ProfileView config={configWithoutProfile} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Profile Configured')).toBeInTheDocument();
      });
    });
  });

  describe('Task 7.2: Implement profile route resolution logic', () => {
    it('should use first profile resource when multiple exist', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');

      const configWithMultipleProfiles: UIGenApp = {
        ...mockConfig,
        resources: [
          ...mockConfig.resources,
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
            schema: { type: 'object', key: 'Account', label: 'Account', required: false },
            relationships: [],
          },
        ],
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(useApiCall).mockReturnValue({
        data: { name: 'John Doe', email: 'john@example.com' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ProfileView config={configWithMultipleProfiles} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Multiple profile resources found')
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle profile resource without GET operation', async () => {
      const configWithoutGetOp: UIGenApp = {
        ...mockConfig,
        resources: [
          {
            name: 'Profile',
            slug: 'profile',
            uigenId: 'profile',
            __profileAnnotation: true,
            operations: [
              {
                id: 'updateProfile',
                method: 'PUT',
                path: '/profile',
                viewHint: 'update',
                parameters: [],
                responses: {},
              },
            ],
            schema: { type: 'object', key: 'Profile', label: 'Profile', required: false },
            relationships: [],
          },
        ],
      };

      render(
        <BrowserRouter>
          <ProfileView config={configWithoutGetOp} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile Data Cannot Be Loaded')).toBeInTheDocument();
      });
    });
  });
});
