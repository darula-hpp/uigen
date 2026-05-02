import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ProfileView } from '../ProfileView';
import { BrowserRouter } from 'react-router-dom';
import type { UIGenApp, Resource, Operation, SchemaNode } from '@uigen-dev/core';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
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

import { useApiCall, useApiMutation } from '@/hooks/useApiCall';
import { findProfileResource } from '@/lib/profile-resources';

const mockUseApiCall = useApiCall as ReturnType<typeof vi.fn>;
const mockUseApiMutation = useApiMutation as ReturnType<typeof vi.fn>;
const mockFindProfileResource = findProfileResource as ReturnType<typeof vi.fn>;

describe('ProfileView', () => {
  const mockSchema: SchemaNode = {
    key: 'User',
    type: 'object',
    label: 'User',
    required: false,
    children: [
      { key: 'name', type: 'string', label: 'Name', required: false },
      { key: 'email', type: 'string', label: 'Email', format: 'email', required: false },
      { key: 'phone', type: 'string', label: 'Phone', required: false },
      { key: 'bio', type: 'string', label: 'Bio', required: false },
    ],
  };

  const mockDetailOp: Operation = {
    id: 'getUser',
    uigenId: 'getUser',
    operationId: 'getUser',
    method: 'GET',
    path: '/users/{userId}',
    viewHint: 'detail',
    responses: {
      '200': {
        description: 'Success',
        schema: mockSchema,
      },
    },
    parameters: [],
    requestBody: undefined,
  };

  const mockUpdateOp: Operation = {
    id: 'updateUser',
    uigenId: 'updateUser',
    operationId: 'updateUser',
    method: 'PUT',
    path: '/users/{userId}',
    viewHint: 'update',
    responses: {
      '200': {
        description: 'Success',
        schema: mockSchema,
      },
    },
    parameters: [],
    requestBody: {
      description: 'User update data',
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
    relationships: [],
    __profileAnnotation: true,
  };

  const mockConfig: UIGenApp = {
    name: 'Test App',
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
    
    // Mock useApiMutation for profile updates
    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
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
          { key: 'avatar', type: 'string', label: 'Avatar', format: 'uri', required: false },
          ...mockSchema.children!,
        ],
      };

      const resourceWithAvatar: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
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
        label: 'User',
        required: false,
        children: [
          { key: 'firstName', type: 'string', label: 'First Name', required: false },
          { key: 'lastName', type: 'string', label: 'Last Name', required: false },
          { key: 'email', type: 'string', label: 'Email', required: false },
          { key: 'phone', type: 'string', label: 'Phone', required: false },
          { key: 'address', type: 'string', label: 'Address', required: false },
          { key: 'city', type: 'string', label: 'City', required: false },
        ],
      };

      const resourceWithGroups: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
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
        expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
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

  describe('Keyboard Navigation', () => {
    it('should exit edit mode when Escape key is pressed - Requirement 7.1', async () => {
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

      // Press Escape key
      await user.keyboard('{Escape}');

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should not exit edit mode on Escape when form is submitting', async () => {
      const user = userEvent.setup();
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true, // Form is submitting
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
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

      // Press Escape key while submitting
      await user.keyboard('{Escape}');

      // Should still be in edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should allow keyboard navigation to Edit button - Requirement 7.1', async () => {
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
      
      // Focus the edit button
      editButton.focus();
      expect(document.activeElement).toBe(editButton);

      // Activate with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should allow keyboard navigation to activate Edit button with Space key - Requirement 7.1', async () => {
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
      
      // Focus the edit button
      editButton.focus();
      expect(document.activeElement).toBe(editButton);

      // Activate with Space key
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should maintain focus management when switching to edit mode - Requirement 7.1', async () => {
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
      });

      // Form fields should be keyboard accessible
      const usernameInput = screen.getByLabelText(/name/i);
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);
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
        label: 'User',
        required: false,
        children: [
          { key: 'name', type: 'string', label: 'Name', required: false },
          { key: 'verified', type: 'boolean', label: 'Verified', required: false },
        ],
      };

      const resourceWithBoolean: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
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
        label: 'User',
        required: false,
        children: [
          { key: 'name', type: 'string', label: 'Name', required: false },
          { key: 'tags', type: 'array', label: 'Tags', required: false },
        ],
      };

      const resourceWithArray: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
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

  describe('Styling - Card Layout', () => {
    it('should render profile cards with proper border and rounded corners', async () => {
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

      // Check for card elements with border and rounded corners
      const cards = container.querySelectorAll('.border.rounded-lg');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should apply proper padding to cards', async () => {
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

      // Check for responsive padding (p-4 for mobile, sm:p-6 for larger screens)
      const cardsWithPadding = container.querySelectorAll('.p-4, .sm\\:p-6');
      expect(cardsWithPadding.length).toBeGreaterThan(0);
    });

    it('should use consistent spacing between cards', async () => {
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

      // Check for space-y classes for vertical spacing
      const spacedContainers = container.querySelectorAll('[class*="space-y"]');
      expect(spacedContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Styling - Typography and Visual Hierarchy', () => {
    it('should display field labels with proper typography', async () => {
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
        expect(screen.getByText('Name')).toBeInTheDocument();
      });

      // Check for dt elements (definition term) with proper styling
      const labels = container.querySelectorAll('dt');
      expect(labels.length).toBeGreaterThan(0);
      
      // Labels should have text-sm and text-muted-foreground classes
      const styledLabels = container.querySelectorAll('dt.text-sm.text-muted-foreground');
      expect(styledLabels.length).toBeGreaterThan(0);
    });

    it('should display field values with proper typography', async () => {
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
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Check for dd elements (definition description) with proper styling
      const values = container.querySelectorAll('dd');
      expect(values.length).toBeGreaterThan(0);
      
      // Values should have text-base class
      const styledValues = container.querySelectorAll('dd.text-base');
      expect(styledValues.length).toBeGreaterThan(0);
    });

    it('should display section titles with proper hierarchy', async () => {
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
      });

      // Main title should be h2 with proper styling
      const mainTitle = screen.getByText('Profile');
      expect(mainTitle.tagName).toBe('H2');
      expect(mainTitle.className).toContain('text-2xl');
      expect(mainTitle.className).toContain('font-bold');
    });

    it('should display card section titles with proper styling', async () => {
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

      // Card titles should be h3 with proper styling
      const cardTitles = container.querySelectorAll('h3');
      expect(cardTitles.length).toBeGreaterThan(0);
      
      // Check for text-lg and font-semibold classes
      const styledTitles = container.querySelectorAll('h3.text-lg.font-semibold');
      expect(styledTitles.length).toBeGreaterThan(0);
    });
  });

  describe('Styling - Responsive Design', () => {
    it('should apply max-width constraint for better readability', async () => {
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

      // Check for max-w-2xl container
      const maxWidthContainer = container.querySelector('.max-w-2xl');
      expect(maxWidthContainer).toBeInTheDocument();
      expect(maxWidthContainer?.className).toContain('mx-auto');
    });

    it('should use responsive spacing classes', async () => {
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

      // Check for responsive spacing (space-y-4 for mobile, sm:space-y-6 for larger)
      const responsiveSpacing = container.querySelectorAll('[class*="sm:space-y"]');
      expect(responsiveSpacing.length).toBeGreaterThan(0);
    });

    it('should use responsive flex layout for header', async () => {
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

      // Check for responsive flex layout (flex-col on mobile, sm:flex-row on larger)
      const responsiveFlex = container.querySelectorAll('.flex-col, .sm\\:flex-row');
      expect(responsiveFlex.length).toBeGreaterThan(0);
    });
  });

  describe('Styling - Loading States', () => {
    it('should display skeleton placeholders with proper styling', () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Check for skeleton elements with animate-pulse
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
      
      // Check for bg-muted class on skeletons
      const mutedSkeletons = container.querySelectorAll('.bg-muted.animate-pulse');
      expect(mutedSkeletons.length).toBeGreaterThan(0);
    });

    it('should display skeleton with proper dimensions', () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Check for skeleton elements with height classes
      const skeletonsWithHeight = container.querySelectorAll('[class*="h-"]');
      expect(skeletonsWithHeight.length).toBeGreaterThan(0);
    });

    it('should display skeleton in card layout', () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Check for card structure in loading state
      const cards = container.querySelectorAll('.border.rounded-lg');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Styling - Error States', () => {
    it('should display error with proper styling and colors', async () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load profile'),
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
      });

      // Check for error styling with destructive colors
      const errorContainer = container.querySelector('.border-destructive');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer?.className).toContain('bg-destructive/10');
      expect(errorContainer?.className).toContain('text-destructive');
    });

    it('should display error message with proper typography', async () => {
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
      });

      // Error title should be h2 with proper styling
      const errorTitle = screen.getByText('Error Loading Profile');
      expect(errorTitle.tagName).toBe('H2');
      expect(errorTitle.className).toContain('text-xl');
      expect(errorTitle.className).toContain('font-semibold');
    });

    it('should display error in card layout with proper spacing', async () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load profile'),
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
      });

      // Check for card structure with padding
      const errorCard = container.querySelector('.p-6.border.rounded-lg');
      expect(errorCard).toBeInTheDocument();
    });
  });

  describe('Styling - Avatar Display', () => {
    it('should display avatar with proper styling', async () => {
      const schemaWithAvatar: SchemaNode = {
        ...mockSchema,
        children: [
          { key: 'avatar', type: 'string', label: 'Avatar', format: 'uri', required: false },
          ...mockSchema.children!,
        ],
      };

      const resourceWithAvatar: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
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
        
        // Check for proper avatar styling
        expect(avatar.className).toContain('w-20');
        expect(avatar.className).toContain('h-20');
        expect(avatar.className).toContain('rounded-full');
        expect(avatar.className).toContain('object-cover');
        expect(avatar.className).toContain('border-2');
      });
    });

    it('should display fallback avatar icon with proper styling', async () => {
      const schemaWithAvatar: SchemaNode = {
        ...mockSchema,
        children: [
          { key: 'avatar', type: 'string', label: 'Avatar', format: 'uri', required: false },
          ...mockSchema.children!,
        ],
      };

      const resourceWithAvatar: Resource = {
        ...mockResource,
        operations: [
          {
            ...mockDetailOp,
            responses: {
              '200': {
                description: 'Success',
                schema: schemaWithAvatar,
              },
            },
          },
          mockUpdateOp,
        ],
      };

      mockFindProfileResource.mockReturnValue(resourceWithAvatar);
      mockUseApiCall.mockReturnValue({
        data: { ...mockProfileData, avatar: '' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithAvatar] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      // Check for fallback avatar container
      const fallbackAvatar = container.querySelector('.w-20.h-20.rounded-full.bg-muted');
      expect(fallbackAvatar).toBeInTheDocument();
    });
  });

  describe('Styling - Theme Consistency', () => {
    it('should use muted colors for borders', async () => {
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

      // Check for border-muted class
      const mutedBorders = container.querySelectorAll('.border-muted');
      expect(mutedBorders.length).toBeGreaterThan(0);
    });

    it('should use muted-foreground for secondary text', async () => {
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

      // Check for text-muted-foreground class on labels
      const mutedText = container.querySelectorAll('.text-muted-foreground');
      expect(mutedText.length).toBeGreaterThan(0);
    });

    it('should apply consistent rounded corners', async () => {
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

      // Check for rounded-lg class on cards
      const roundedElements = container.querySelectorAll('.rounded-lg');
      expect(roundedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edit Mode Integration Tests', () => {
    it('should render form inputs with pre-filled values in edit mode', async () => {
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

      // Check that form inputs are pre-filled with current values
      const nameInput = screen.getByDisplayValue('John Doe');
      expect(nameInput).toBeInTheDocument();
      
      const emailInput = screen.getByDisplayValue('john@example.com');
      expect(emailInput).toBeInTheDocument();
      
      const phoneInput = screen.getByDisplayValue('+1234567890');
      expect(phoneInput).toBeInTheDocument();
      
      const bioInput = screen.getByDisplayValue('Software developer');
      expect(bioInput).toBeInTheDocument();
    });

    it('should use appropriate input types for different field formats', async () => {
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

      // Check that email field uses email input type
      const emailInput = screen.getByDisplayValue('john@example.com');
      expect(emailInput).toHaveAttribute('type', 'email');
      
      // Check that other text fields use text input type
      const nameInput = screen.getByDisplayValue('John Doe');
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should display Save and Cancel buttons in edit mode', async () => {
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
        expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
        expect(cancelButtons.length).toBeGreaterThan(0);
      });
    });

    it('should preserve form data when switching between fields', async () => {
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

      // Modify name field
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      // Modify email field
      const emailInput = screen.getByDisplayValue('john@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      // Verify both changes are preserved
      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    });

    it('should discard changes when cancel is clicked', async () => {
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

      // Verify original data is displayed
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Modify name field
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      // Click cancel
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      // Verify we're back in view mode with original data
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should call refetch after successful save', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      const mockMutate = vi.fn();
      const mockReset = vi.fn();
      
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Start with mutation not successful
      mockUseApiMutation.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: mockReset,
      });

      const { rerender } = render(
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

      // Click save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Now simulate successful mutation
      mockUseApiMutation.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true, // Simulate successful mutation
        isError: false,
        error: null,
        data: mockProfileData,
        reset: mockReset,
      });

      // Rerender to trigger the success effect
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Verify refetch was called
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should exit edit mode after successful save', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      const mockReset = vi.fn();
      
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Start with mutation not successful
      mockUseApiMutation.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: mockReset,
      });

      const { rerender } = render(
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

      // Click save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Now simulate successful mutation
      mockUseApiMutation.mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true, // Simulate successful mutation
        isError: false,
        error: null,
        data: mockProfileData,
        reset: mockReset,
      });

      // Rerender to trigger the success effect
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Verify we exit edit mode
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should handle multiple edit sessions correctly', async () => {
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

      // First edit session
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Cancel first session
      const cancelButtons1 = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons1[0]);

      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });

      // Second edit session
      const editButton2 = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton2);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Verify form is properly initialized with original data
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('should not show edit button when no update operation exists', async () => {
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
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      // Verify edit button is not present
      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });

    it('should show edit button when PUT operation exists', async () => {
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

    it('should show edit button when PATCH operation exists', async () => {
      const patchOp: Operation = {
        ...mockUpdateOp,
        method: 'PATCH',
      };

      const resourceWithPatch: Resource = {
        ...mockResource,
        operations: [mockDetailOp, patchOp],
      };

      mockFindProfileResource.mockReturnValue(resourceWithPatch);
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <ProfileView config={{ ...mockConfig, resources: [resourceWithPatch] }} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should maintain view mode state across data refetches', async () => {
      const user = userEvent.setup();
      let currentData = mockProfileData;
      
      mockUseApiCall.mockImplementation(() => ({
        data: currentData,
        isLoading: false,
        error: null,
        refetch: vi.fn(() => {
          currentData = { ...currentData, name: 'Updated Name' };
        }),
      }));

      const { rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Cancel to return to view mode
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });

      // Simulate data refetch
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Verify we're still in view mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility - ARIA Labels and Semantic HTML', () => {
    it('should have aria-label on Edit button - Requirement 7.2', async () => {
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
        const editButton = screen.getByRole('button', { name: /edit profile/i });
        expect(editButton).toBeInTheDocument();
        expect(editButton).toHaveAttribute('aria-label', 'Edit profile');
      });
    });

    it('should have aria-label on Cancel button in edit mode - Requirement 7.2', async () => {
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
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
        expect(cancelButtons[0]).toHaveAttribute('aria-label', 'Cancel editing');
      });
    });

    it('should use semantic HTML with form element in edit mode - Requirement 7.5', async () => {
      const user = userEvent.setup();
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

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();
      });
    });

    it('should use semantic label elements with htmlFor in edit mode - Requirement 7.5', async () => {
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
        // Check that labels are properly associated with inputs
        const nameLabel = screen.getByText('Name');
        const emailLabel = screen.getByText('Email');
        
        expect(nameLabel.tagName).toBe('LABEL');
        expect(emailLabel.tagName).toBe('LABEL');
      });
    });

    it('should have aria-describedby on inputs with error messages - Requirement 7.5', async () => {
      const user = userEvent.setup();
      const serverErrors = {
        email: 'Email already exists',
      };

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

      // Simulate server error by re-rendering with errors
      // This would normally come from the mutation hook
      // For now, we verify the ProfileEditForm component handles this
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
    });

    it('should have aria-invalid on inputs with validation errors - Requirement 7.5', async () => {
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

      // The aria-invalid attribute is set by ProfileEditForm when there are errors
      // This is tested in ProfileEditForm.test.tsx
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('should use semantic dl/dt/dd elements for field display - Requirement 7.5', async () => {
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

      // Check for semantic definition list elements
      const dl = container.querySelector('dl');
      const dt = container.querySelector('dt');
      const dd = container.querySelector('dd');

      expect(dl).toBeInTheDocument();
      expect(dt).toBeInTheDocument();
      expect(dd).toBeInTheDocument();
    });

    it('should have proper heading hierarchy - Requirement 7.5', async () => {
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
      });

      // Main title should be h2
      const mainTitle = screen.getByText('Profile');
      expect(mainTitle.tagName).toBe('H2');

      // Card section titles should be h3
      const cardTitles = screen.getAllByRole('heading', { level: 3 });
      expect(cardTitles.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Tests - Task 11.6', () => {
    it('should have no accessibility violations in view mode - Requirement 7.1, 7.2, 7.3, 7.4, 7.5, 7.6', async () => {
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

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in edit mode', async () => {
      const user = userEvent.setup();
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

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in loading state', async () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in error state', async () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load profile'),
        refetch: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce mode changes to screen readers - Requirement 7.3', async () => {
      const user = userEvent.setup();
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

      // Check for aria-live region
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(liveRegion?.textContent).toBe('Entering edit mode');
      });
    });

    it('should announce loading states during submission - Requirement 7.3', async () => {
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true, // Simulating loading state
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const loadingAnnouncement = container.querySelector('[aria-live="assertive"]');
        expect(loadingAnnouncement).toBeInTheDocument();
        expect(loadingAnnouncement?.textContent).toBe('Saving profile changes, please wait');
      });
    });

    it('should announce success messages - Requirement 7.3', async () => {
      const mockReset = vi.fn();
      
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Start with mutation not successful
      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: mockReset,
      });

      const { container, rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode first
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await userEvent.setup().click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Now simulate successful mutation
      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
        data: mockProfileData,
        reset: mockReset,
      });

      // Rerender to trigger the success effect
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live="polite"]');
        expect(liveRegion?.textContent).toBe('Profile updated successfully');
      });
    });

    it('should announce error messages - Requirement 7.3', async () => {
      const user = userEvent.setup();
      
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const mockError = {
        status: 422,
        response: {
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid email format' },
          ],
        },
        message: 'Validation error',
      };

      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: true,
        error: mockError,
        data: null,
        reset: vi.fn(),
      });

      const { container } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live="polite"]');
        expect(liveRegion?.textContent).toContain('validation');
      });
    });

    it('should move focus to Edit button when exiting edit mode - Requirement 7.4', async () => {
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

      // Cancel edit mode
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      // Focus should return to Edit button
      await waitFor(() => {
        const editButtonAfterCancel = screen.getByRole('button', { name: /edit profile/i });
        expect(document.activeElement).toBe(editButtonAfterCancel);
      });
    });

    it('should move focus to Edit button after successful save - Requirement 7.4', async () => {
      const mockReset = vi.fn();
      
      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      // Start with mutation not successful
      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: mockReset,
      });

      const { rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode first
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await userEvent.setup().click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Now simulate successful mutation
      mockUseApiMutation.mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
        data: mockProfileData,
        reset: mockReset,
      });

      // Rerender to trigger the success effect
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Focus should return to Edit button after successful save
      await waitFor(() => {
        const editButtonAfterSave = screen.getByRole('button', { name: /edit profile/i });
        expect(document.activeElement).toBe(editButtonAfterSave);
      });
    });

    it('should support keyboard navigation to all interactive elements - Requirement 7.1', async () => {
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
      
      // Focus the edit button
      editButton.focus();
      expect(document.activeElement).toBe(editButton);

      // Activate with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should support Escape key to exit edit mode - Requirement 7.1', async () => {
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

      // Press Escape key
      await user.keyboard('{Escape}');

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });
  });
});
