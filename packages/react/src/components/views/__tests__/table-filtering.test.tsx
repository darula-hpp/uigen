import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ListView } from '../ListView';
import type { Resource } from '@uigen-dev/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: [
      { id: '1', name: 'Alice', email: 'alice@example.com', age: 25 },
      { id: '2', name: 'Bob', email: 'bob@example.com', age: 30 },
      { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35 },
    ],
    isLoading: false,
    error: null,
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ListView - Table Filtering', () => {
  const mockResource: Resource = {
    name: 'User',
    slug: 'users',
    operations: [
      {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        summary: 'List users',
        parameters: [],
        responses: {
          '200': {
            description: 'Success',
            schema: {
              type: 'array',
              key: 'users',
              label: 'Users',
              required: false,
            },
          },
        },
        viewHint: 'list',
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
        { type: 'number', key: 'age', label: 'Age', required: false },
      ],
    },
    relationships: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filter inputs above each column - Requirement 36.1', () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText('Filter ID...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter Name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter Email...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter Age...')).toBeInTheDocument();
  });

  it('should filter by single column - Requirement 36.2', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Initially all rows should be visible
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Filter by name
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });
  });

  it('should filter by multiple columns - Requirement 36.2', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Filter by name
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'o' } }); // Matches Bob

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });

    // Add email filter
    const emailFilter = screen.getByPlaceholderText('Filter Email...');
    fireEvent.change(emailFilter, { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });
  });

  it('should display filtered result count - Requirement 36.3', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Filter by name
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Showing 1 filtered result')).toBeInTheDocument();
    });
  });

  it('should provide Clear Filters button - Requirement 36.4', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Filter by name
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    // Click Clear button
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('should support case-insensitive filtering - Requirement 36.5', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Filter with uppercase
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'ALICE' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    // Filter with lowercase
    fireEvent.change(nameFilter, { target: { value: 'alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });

  it('should show all results when filters are cleared', async () => {
    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    // Filter by name
    const nameFilter = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilter, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    // Clear filter
    fireEvent.change(nameFilter, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });
});
