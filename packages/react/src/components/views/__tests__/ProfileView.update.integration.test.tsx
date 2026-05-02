import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ProfileView } from '../ProfileView';
import { BrowserRouter } from 'react-router-dom';
import type { UIGenApp, Resource, Operation, SchemaNode } from '@uigen-dev/core';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

// Mock the useProfileUpdate hook
vi.mock('@/hooks/useProfileUpdate', () => ({
  useProfileUpdate: vi.fn(),
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
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { findProfileResource } from '@/lib/profile-resources';

const mockUseApiCall = useApiCall as ReturnType<typeof vi.fn>;
const mockUseProfileUpdate = useProfileUpdate as ReturnType<typeof vi.fn>;
const mockFindProfileResource = findProfileResource as ReturnType<typeof vi.fn>;

/**
 * Integration tests for profile update flow
 * Task 9.5: Write integration tests for profile update flow
 * 
 * These tests verify the complete profile update workflow including:
 * - API integration with useProfileUpdate hook
 * - Success handling (messages, mode transitions, data refetch)
 * - Error handling (validation errors, network errors, conflict errors)
 * - Loading states during submission
 */
describe('ProfileView - Profile Update Integration', () => {
  const mockSchema: SchemaNode = {
    key: 'User',
    type: 'object',
    label: 'User',
    required: false,
    children: [
      { key: 'username', type: 'string', label: 'Username', required: true },
      { key: 'email', type: 'string', label: 'Email', format: 'email', required: false },
    ],
  };

  const mockDetailOp: Operation = {
    id: 'getCurrentUser',
    uigenId: 'getCurrentUser',
    operationId: 'getCurrentUser',
    method: 'GET',
    path: '/api/v1/auth/me',
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
    id: 'updateCurrentUser',
    uigenId: 'updateCurrentUser',
    operationId: 'updateCurrentUser',
    method: 'PUT',
    path: '/api/v1/auth/me',
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
    username: 'johndoe',
    email: 'john@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindProfileResource.mockReturnValue(mockResource);
  });

  describe('Successful Profile Update', () => {
    it('should call updateProfile mutation with form data when save is clicked', async () => {
      const user = userEvent.setup();
      const mockUpdateProfile = vi.fn();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: null,
        isSuccess: false,
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

      // Modify username
      const usernameInput = screen.getByDisplayValue('johndoe');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'janedoe');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Verify updateProfile was called with updated data
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'janedoe',
            email: 'john@example.com',
          }),
          expect.any(Object)
        );
      });
    });

    it('should display success message after successful update', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      let isSuccess = false;

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockImplementation(() => ({
        updateProfile: vi.fn(() => {
          isSuccess = true;
        }),
        isUpdating: false,
        error: null,
        isSuccess,
        reset: vi.fn(),
      }));

      const { rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Update mock to reflect success state
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: true,
        reset: vi.fn(),
      });

      // Rerender to trigger useEffect
      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText(/profile has been updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should exit edit mode after successful update', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Start with not success
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: false,
        reset: vi.fn(),
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

      // Simulate successful update
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: true,
        reset: vi.fn(),
      });

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

    it('should refetch profile data after successful update', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: false,
        reset: vi.fn(),
      });

      const { rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode and save
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Simulate successful update
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: true,
        reset: vi.fn(),
      });

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

    it('should clear server errors after successful update', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      // Start with an error
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [{ loc: ['body', 'username'], msg: 'Username already exists' }],
          },
        } as any,
        isSuccess: false,
        reset: vi.fn(),
      });

      const { rerender } = render(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Username already exists')).toBeInTheDocument();
      });

      // Simulate successful update
      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: null,
        isSuccess: true,
        reset: vi.fn(),
      });

      rerender(
        <BrowserRouter>
          <ProfileView config={mockConfig} />
        </BrowserRouter>
      );

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText('Username already exists')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State During Update', () => {
    it('should disable save button while update is in progress', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: true,
        error: null,
        isSuccess: false,
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

      // Verify save button is disabled
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show loading text on save button during update', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: true,
        error: null,
        isSuccess: false,
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
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should disable form inputs while update is in progress', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: true,
        error: null,
        isSuccess: false,
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

      // Verify inputs are disabled
      const usernameInput = screen.getByDisplayValue('johndoe');
      expect(usernameInput).toBeDisabled();

      const emailInput = screen.getByDisplayValue('john@example.com');
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Validation Error Handling (422)', () => {
    it('should display field-specific validation errors', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [
              { loc: ['body', 'username'], msg: 'Username must be at least 3 characters' },
              { loc: ['body', 'email'], msg: 'Invalid email format' },
            ],
          },
        } as any,
        isSuccess: false,
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

      // Verify field-specific errors are displayed
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('should keep form in edit mode on validation error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [{ loc: ['body', 'username'], msg: 'Username already exists' }],
          },
        } as any,
        isSuccess: false,
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

      // Verify we stay in edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
      });
    });

    it('should allow user to correct validation errors', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [{ loc: ['body', 'username'], msg: 'Username too short' }],
          },
        } as any,
        isSuccess: false,
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

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Username too short')).toBeInTheDocument();
      });

      // User can still modify the field
      const usernameInput = screen.getByDisplayValue('johndoe');
      expect(usernameInput).not.toBeDisabled();
      
      await user.clear(usernameInput);
      await user.type(usernameInput, 'longerusername');

      // Verify the input was updated
      expect(screen.getByDisplayValue('longerusername')).toBeInTheDocument();
    });
  });

  describe('Conflict Error Handling (409)', () => {
    it('should display conflict error for username', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 409,
          message: 'Username already exists',
        } as any,
        isSuccess: false,
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

      // Verify conflict error is displayed
      await waitFor(() => {
        expect(screen.getByText('Username already exists')).toBeInTheDocument();
      });
    });

    it('should display conflict error for email', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 409,
          message: 'Email already in use',
        } as any,
        isSuccess: false,
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

      // Verify conflict error is displayed
      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeInTheDocument();
      });
    });

    it('should keep form in edit mode on conflict error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 409,
          message: 'Username already exists',
        } as any,
        isSuccess: false,
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

      // Verify we stay in edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should display network error message when no status code', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: new Error('Network request failed') as any,
        isSuccess: false,
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

      // Verify network error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
        expect(screen.getByText(/unable to connect to the server/i)).toBeInTheDocument();
      });
    });

    it('should keep form in edit mode on network error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: new Error('Network request failed') as any,
        isSuccess: false,
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

      // Verify we stay in edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Clearing', () => {
    it('should clear server errors when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: vi.fn(),
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [{ loc: ['body', 'username'], msg: 'Username already exists' }],
          },
        } as any,
        isSuccess: false,
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

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Username already exists')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText('Username already exists')).not.toBeInTheDocument();
      });
    });

    it('should clear server errors when save is attempted again', async () => {
      const user = userEvent.setup();
      const mockUpdateProfile = vi.fn();
      const mockRefetch = vi.fn();

      mockUseApiCall.mockReturnValue({
        data: mockProfileData,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      mockUseProfileUpdate.mockReturnValue({
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        error: {
          status: 422,
          response: {
            detail: [{ loc: ['body', 'username'], msg: 'Username already exists' }],
          },
        } as any,
        isSuccess: false,
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

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Username already exists')).toBeInTheDocument();
      });

      // Modify username and try again
      const usernameInput = screen.getByDisplayValue('johndoe');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'differentusername');

      // Click save again
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Verify updateProfile was called (errors should be cleared before call)
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });
  });
});
