import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ProfileView } from '../ProfileView';
import { BrowserRouter } from 'react-router-dom';
import type { UIGenApp, Resource, Operation, SchemaNode } from '@uigen-dev/core';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock the profile-resources utility
vi.mock('@/lib/profile-resources', () => ({
  findProfileResource: vi.fn(),
}));

// Mock react-router-dom useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'user-123' })),
  };
});

import { useApiCall } from '@/hooks/useApiCall';
import { findProfileResource } from '@/lib/profile-resources';

const mockUseApiCall = useApiCall as ReturnType<typeof vi.fn>;
const mockFindProfileResource = findProfileResource as ReturnType<typeof vi.fn>;

describe('ProfileView', () => {
  const mockSchema: SchemaNode = {
    key: 'User',
    type: 'object',
    children: [
      { key: 'name', type: 'string', label: 'Name' },
      { key: 'email', type: 'string', label: 'Email', format: 'email' },
      { key: 'phone', type: 'string', label: 'Phone' },
      { key: 'bio', type: 'string', label: 'Bio' },
    ],
  };

  const mockDetailOp: Operation = {
    operationId: 'getUser',
    method: 'GET',
    path: '/users/{userId}',
    viewHint: 'detail',
    responses: {
      '200': {
        schema: mockSchema,
      },
    },
    parameters: [],
    requestBody: undefined,
  };

  const mockUpdateOp: Operation = {
    operationId: 'updateUser',
    method: 'PUT',
    path: '/users/{userId}',
    viewHint: 'update',
    responses: {
      '200': {
        schema: mockSchema,
      },
    },
    parameters: [],
    requestBody: {
      schema: mockSchema,
    },
  };

  const mockResource: Resource = {
    name: 'User',
    slug: 'users',
    uigenId: 'users',
    label: 'Users',
    description: 'User profile information',
    operations: [mockDetailOp, mockUpdateOp],
    schema: mockSchema,
    relationships: [],
    __profileAnnotation: true,
  };

  const mockConfig: UIGenApp = {
    title: 'Test App',
    resources: [mockResource],
    servers: [],
    securitySchemes: [],
  };

  const mockProfileData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    bio: 'Software developer',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindProfileResource.mockReturnValue(mockResource);
  });

  describe('Rendering', () => {
    it('should render profile data correctly', async () => {
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
        expect(screen.getByText('Software developer')).toBeInTheDocument();
      });
    });

    it('should display avatar when image field present', async () => {
      const schemaWithAvatar: SchemaNode = {
        ...mockSchema,
        children: [
          { key: 'avatar', type: 'string', label: 'Avatar', format: 'uri' },
          ...mockSchema.children!,
        ],
      };

      const resourceWithAvatar: Resource = {
        ...mockResource,
        schema: schemaWithAvatar,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                schema: schemaWithAvatar,
              },
            },
          },
          mockUpdateOp,
        ],
      };

      mockFindProfileResource.mockReturnValue(resourceWithAvatar);
      mockUseApiCall.mockReturnValue({
        data: { ...mockProfileData, avatar: 'https://example.com/avatar.jpg' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithAvatar] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('John Doe');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('should show edit button when update operation available', async () => {
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should not show edit button when update operation unavailable', async () => {
      const resourceWithoutUpdate: Resource = {
        ...mockResource,
        operations: [mockDetailOp],
      };

      mockFindProfileResource.mockReturnValue(resourceWithoutUpdate);
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithoutUpdate] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Check for skeleton loaders
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should handle error state', async () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load profile'),
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
      });
    });

    it('should show error when no profile resource found', () => {
      mockFindProfileResource.mockReturnValue(undefined);

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      expect(screen.getByText('No Profile Configured')).toBeInTheDocument();
      expect(screen.getByText(/no profile resource is available/i)).toBeInTheDocument();
    });

    it('should show error when no GET operation configured', () => {
      const resourceWithoutGet: Resource = {
        ...mockResource,
        operations: [mockUpdateOp],
      };

      mockFindProfileResource.mockReturnValue(resourceWithoutGet);

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithoutGet] }} />
        </BrowserRouter>
      );

      expect(screen.getByText('Profile Data Cannot Be Loaded')).toBeInTheDocument();
      expect(screen.getByText(/does not have a GET operation/i)).toBeInTheDocument();
    });
  });

  describe('Field Grouping', () => {
    it('should group fields appropriately', async () => {
      const schemaWithGroups: SchemaNode = {
        key: 'User',
        type: 'object',
        children: [
          { key: 'firstName', type: 'string', label: 'First Name' },
          { key: 'lastName', type: 'string', label: 'Last Name' },
          { key: 'email', type: 'string', label: 'Email' },
          { key: 'phone', type: 'string', label: 'Phone' },
          { key: 'address', type: 'string', label: 'Address' },
          { key: 'city', type: 'string', label: 'City' },
        ],
      };

      const resourceWithGroups: Resource = {
        ...mockResource,
        schema: schemaWithGroups,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                schema: schemaWithGroups,
              },
            },
          },
        ],
      };

      mockFindProfileResource.mockReturnValue(resourceWithGroups);
      mockUseApiCall.mockReturnValue({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          city: 'New York',
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithGroups] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should have grouped cards
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
        expect(screen.getByText('Contact Information')).toBeInTheDocument();
        // Address appears as both a group heading and field label, so use getAllByText
        const addressElements = screen.getAllByText('Address');
        expect(addressElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should toggle edit mode when edit button clicked', async () => {
      const user = userEvent.setup();
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });

    it('should show cancel button in edit mode', async () => {
      const user = userEvent.setup();
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
        expect(cancelButtons.length).toBeGreaterThan(0);
      });
    });

    it('should exit edit mode when cancel clicked', async () => {
      const user = userEvent.setup();
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes for mobile', async () => {
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      // Check for responsive classes
      const profileContainer = container.querySelector('.max-w-2xl');
      expect(profileContainer).toBeInTheDocument();

      // Check for spacing classes that adapt to screen size
      const spacingElements = container.querySelectorAll('[class*="sm:"]');
      expect(spacingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Value Formatting', () => {
    it('should format boolean values correctly', async () => {
      const schemaWithBoolean: SchemaNode = {
        key: 'User',
        type: 'object',
        children: [
          { key: 'name', type: 'string', label: 'Name' },
          { key: 'verified', type: 'boolean', label: 'Verified' },
        ],
      };

      const resourceWithBoolean: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                schema: schemaWithBoolean,
              },
            },
          },
        ],
      };

      mockFindProfileResource.mockReturnValue(resourceWithBoolean);
      mockUseApiCall.mockReturnValue({
        data: { name: 'John Doe', verified: true },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithBoolean] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });
    });

    it('should format array values correctly', async () => {
      const schemaWithArray: SchemaNode = {
        key: 'User',
        type: 'object',
        children: [
          { key: 'name', type: 'string', label: 'Name' },
          { key: 'tags', type: 'array', label: 'Tags' },
        ],
      };

      const resourceWithArray: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                schema: schemaWithArray,
              },
            },
          },
        ],
      };

      mockFindProfileResource.mockReturnValue(resourceWithArray);
      mockUseApiCall.mockReturnValue({
        data: { name: 'John Doe', tags: ['developer', 'designer'] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithArray] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('developer, designer')).toBeInTheDocument();
      });
    });

    it('should handle null and undefined values', async () => {
      mockUseApiCall.mockReturnValue({
        data: { name: 'John Doe', email: null, phone: undefined, bio: '' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });
  });
});
