import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DetailView } from '../DetailView';
import type { Resource } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '123' }),
  };
});

const mockResource: Resource = {
  name: 'User',
  slug: 'users',
  operations: [
    {
      id: 'getUser',
      method: 'GET',
      path: '/users/{id}',
      viewHint: 'detail',
      parameters: [],
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'object',
            key: 'user',
            label: 'User',
            required: false,
            children: [
              { type: 'string', key: 'id', label: 'ID', required: true },
              { type: 'string', key: 'name', label: 'Name', required: true },
              { type: 'string', key: 'email', label: 'Email', required: true },
            ],
          },
        },
      },
    },
    {
      id: 'updateUser',
      method: 'PUT',
      path: '/users/{id}',
      viewHint: 'update',
      parameters: [],
      responses: {},
    },
    {
      id: 'deleteUser',
      method: 'DELETE',
      path: '/users/{id}',
      viewHint: 'delete',
      parameters: [],
      responses: {},
    },
  ],
  schema: {
    type: 'object',
    key: 'user',
    label: 'User',
    required: false,
    children: [],
  },
  relationships: [],
};

describe('DetailView - Delete Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Confirmation dialog display
   * Validates Requirements 11.1, 11.2, 64.1, 64.2
   */
  it('should display confirmation dialog when delete button is clicked', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const mockMutateAsync = vi.fn();
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click delete button - Requirement 11.1
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    // Verify confirmation dialog is displayed - Requirement 11.2, 64.1
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Verify dialog displays resource name and warning - Requirement 11.2, 64.2
    expect(screen.getByText('Delete User')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this user/i)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
  });

  /**
   * Test: Confirmation dialog buttons
   * Validates Requirements 11.3, 64.3, 64.4
   */
  it('should display Cancel and Confirm buttons with correct styling', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Verify Cancel button exists - Requirement 64.3
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();

    // Verify Confirm button exists and has destructive styling - Requirements 64.3, 64.4
    const confirmButton = screen.getAllByRole('button', { name: /Delete/i }).find(
      btn => btn.closest('[role="dialog"]')
    );
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toHaveClass('bg-destructive');
  });

  /**
   * Test: Successful deletion
   * Validates Requirements 11.4, 11.5, 64.6
   */
  it('should delete resource and navigate to list view on successful deletion', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click confirm button - Requirement 11.4, 64.6
    const confirmButton = screen.getAllByRole('button', { name: /Delete/i }).find(
      btn => btn.closest('[role="dialog"]')
    );
    fireEvent.click(confirmButton!);

    // Verify DELETE request was sent - Requirement 11.4
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        pathParams: { id: '123' }
      });
    });

    // Verify navigation to list view - Requirement 11.5
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/users');
    });

    // Verify success toast is displayed - Requirement 11.5
    await waitFor(() => {
      expect(screen.getByText('User deleted successfully')).toBeInTheDocument();
    });
  });

  /**
   * Test: Failed deletion
   * Validates Requirement 11.6
   */
  it('should display error message when deletion fails', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getAllByRole('button', { name: /Delete/i }).find(
      btn => btn.closest('[role="dialog"]')
    );
    fireEvent.click(confirmButton!);

    // Verify error toast is displayed - Requirement 11.6
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Verify navigation did NOT occur
    expect(mockNavigate).not.toHaveBeenCalled();

    // Verify dialog is closed after error
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Cancellation
   * Validates Requirements 11.7, 64.5
   */
  it('should close dialog without making API call when cancel is clicked', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const mockMutateAsync = vi.fn();
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click cancel button - Requirement 64.5
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Verify dialog is closed - Requirement 11.7
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Verify no API call was made - Requirement 11.7
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  /**
   * Test: Dialog closes when clicking backdrop
   * Validates Requirement 64.5
   */
  it('should close dialog when clicking backdrop', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const mockMutateAsync = vi.fn();
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click backdrop
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Verify no API call was made
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  /**
   * Test: No delete button when delete operation doesn't exist
   * Validates Requirement 11.1
   */
  it('should not display delete button when delete operation does not exist', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    // Resource without delete operation
    const resourceWithoutDelete: Resource = {
      ...mockResource,
      operations: mockResource.operations.filter(op => op.viewHint !== 'delete'),
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={resourceWithoutDelete} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Verify delete button is not rendered
    const deleteButtons = screen.queryAllByRole('button', { name: /Delete/i });
    expect(deleteButtons.length).toBe(0);
  });

  /**
   * Test: Loading state during deletion
   * Validates that buttons are disabled during deletion
   */
  it('should disable buttons and show loading state during deletion', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', name: 'John Doe', email: 'john@example.com' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    // Mock mutation that stays pending
    const mockMutateAsync = vi.fn(() => new Promise(() => {})); // Never resolves
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true, // Simulating loading state
    } as any);

    render(
      <BrowserRouter>
        <ToastProvider>
          <DetailView resource={mockResource} />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Verify buttons are disabled during loading
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeDisabled();

    // Verify confirm button shows loading text
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
