import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormView } from '../FormView';
import type { Resource } from '@uigen/core';
import { MemoryRouter, Route, Routes, BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useApiCall and useApiMutation hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockResource: Resource = {
  name: 'User',
  slug: 'users',
  operations: [
    {
      id: 'createUser',
      method: 'POST',
      path: '/users',
      viewHint: 'create',
      parameters: [],
      requestBody: {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true, format: 'email' },
          { type: 'number', key: 'age', label: 'Age', required: false },
        ],
      },
      responses: {
        '201': {
          description: 'Created',
        },
      },
    },
    {
      id: 'updateUser',
      method: 'PUT',
      path: '/users/{id}',
      viewHint: 'update',
      parameters: [],
      requestBody: {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true, format: 'email' },
          { type: 'number', key: 'age', label: 'Age', required: false },
        ],
      },
      responses: {
        '200': {
          description: 'Success',
        },
      },
    },
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
              { type: 'number', key: 'age', label: 'Age', required: false },
            ],
          },
        },
      },
    },
  ],
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
  relationships: [],
};

describe('FormView - Edit Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Task 14.3 - Test data fetching and pre-population
   * Validates Requirements 10.1, 10.2
   */
  it('should fetch current resource data and pre-populate form fields in edit mode', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    const mockData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    // Mock data fetching for edit mode
    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    // Mock mutation
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for form to render with pre-populated data
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    // Check that form fields are pre-populated with fetched data
    const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/) as HTMLInputElement;
    
    await waitFor(() => {
      expect(nameInput.value).toBe('John Doe');
      expect(emailInput.value).toBe('john@example.com');
    });
  });

  /**
   * Task 14.3 - Test loading state during data fetch
   * Validates Requirement 10.2
   */
  it('should display loading skeletons while fetching data in edit mode', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    // Mock loading state
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that loading skeletons are displayed
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  /**
   * Task 14.3 - Test error state during data fetch
   * Validates Requirement 10.7
   */
  it('should display error message when data fetching fails in edit mode', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    // Mock error state
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch user'),
      refetch: vi.fn(),
      isError: true,
      isSuccess: false,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that error message is displayed
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByText(/Error loading data/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch user/)).toBeInTheDocument();
  });

  /**
   * Task 14.3 - Test successful update submission
   * Validates Requirements 10.5, 10.6
   */
  it('should submit PUT request with path params and navigate to detail view on success', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    const user = userEvent.setup();
    
    const mockData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    // Update a field
    const nameInput = screen.getByLabelText(/Name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Update/ });
    await user.click(submitButton);

    // Check that mutation was called with correct params
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        pathParams: { id: '123' },
        body: expect.objectContaining({
          name: 'Jane Doe',
        }),
      });
    });
  });

  /**
   * Task 14.3 - Test failed update submission
   * Validates Requirements 10.7, 10.8
   */
  it('should display error message when update fails', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    const user = userEvent.setup();
    
    const mockData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Update failed'));

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: true,
      error: new Error('Update failed'),
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Update/ });
    await user.click(submitButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error updating user/)).toBeInTheDocument();
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  /**
   * Task 14.3 - Test submit button disabled state during submission
   * Validates Requirement 10.8
   */
  it('should disable submit button while update is in progress', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    const mockData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    // Check that submit button is disabled and shows loading text
    const submitButton = screen.getByRole('button', { name: /Updating/ });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Task 14.3 - Test form displays correct title for edit mode
   * Validates Requirement 10.1
   */
  it('should display "Edit" title in edit mode', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    const mockData = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/123/edit']}>
          <Routes>
            <Route path="/users/:id/edit" element={<FormView resource={mockResource} mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that title shows "Edit"
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  /**
   * Task 14.3 - Test create mode still works correctly
   * Validates that edit mode changes don't break create mode
   */
  it('should not fetch data in create mode', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    const mockUseApiCall = vi.fn().mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    });

    vi.mocked(useApiCall).mockImplementation(mockUseApiCall);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/users/new']}>
          <Routes>
            <Route path="/users/new" element={<FormView resource={mockResource} mode="create" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that title shows "Create"
    expect(screen.getByText('Create User')).toBeInTheDocument();
    
    // Form should render without fetching data
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });
});
