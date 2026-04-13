import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionButton } from '../ActionButton';
import type { Operation } from '@uigen/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
const mockShowToast = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useApiCall', () => ({
  useApiMutation: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ActionButton', () => {
  const mockOperation: Operation = {
    id: 'approveUser',
    method: 'POST',
    path: '/users/{id}/approve',
    summary: 'Approve User',
    description: 'Approve a user account',
    parameters: [],
    responses: {
      '200': {
        description: 'Success',
      },
    },
    viewHint: 'action',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockReset();
    mockShowToast.mockReset();
  });

  it('should render action button with operation summary as label - Requirement 15.1', () => {
    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: 'Approve User' })).toBeInTheDocument();
  });

  it('should show confirmation dialog on button click - Requirement 15.3', () => {
    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Approve User').length).toBeGreaterThan(0);
    expect(screen.getByText('Approve a user account')).toBeInTheDocument();
  });

  it('should render input fields when requestBody exists - Requirement 15.4', () => {
    const operationWithBody: Operation = {
      ...mockOperation,
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          {
            type: 'string',
            key: 'reason',
            label: 'Reason',
            required: true,
          },
        ],
      },
    };

    render(<ActionButton operation={operationWithBody} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    // Check that the input field is rendered
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should execute action on confirmation - Requirement 15.5', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    const executeButton = screen.getByRole('button', { name: 'Execute' });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        pathParams: { id: '123' },
        body: undefined,
      });
    });
  });

  it('should display success message on successful execution - Requirement 15.6', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    const executeButton = screen.getByRole('button', { name: 'Execute' });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('success', expect.stringContaining('completed successfully'));
    });
  });

  it('should display error message on failed execution - Requirement 15.7', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Action failed'));

    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    const executeButton = screen.getByRole('button', { name: 'Execute' });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('error', 'Action failed');
    });
  });

  it('should close dialog on cancel', () => {
    render(<ActionButton operation={mockOperation} resourceId="123" />, {
      wrapper: createWrapper(),
    });

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onSuccess callback after successful execution', async () => {
    const mockOnSuccess = vi.fn();
    mockMutateAsync.mockResolvedValue({});

    render(
      <ActionButton operation={mockOperation} resourceId="123" onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    );

    const button = screen.getByRole('button', { name: 'Approve User' });
    fireEvent.click(button);

    const executeButton = screen.getByRole('button', { name: 'Execute' });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
