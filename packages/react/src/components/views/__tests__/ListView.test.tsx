import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ListView } from '../ListView';
import type { Resource } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockResource: Resource = {
  name: 'Users',
  slug: 'users',
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

describe('ListView', () => {
  it('should display loading skeletons while fetching data', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Should show skeleton rows
    const skeletonRows = screen.getAllByRole('row');
    // Header row + 5 skeleton rows
    expect(skeletonRows.length).toBeGreaterThan(1);
  });

  it('should display error message on failure', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
      isError: true,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('should display data in table when loaded', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('should display empty state when no data', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    // Create a resource with create operation
    const resourceWithCreate: Resource = {
      ...mockResource,
      operations: [
        ...mockResource.operations,
        {
          id: 'createUser',
          method: 'POST',
          path: '/users',
          viewHint: 'create',
          parameters: [],
          responses: {},
        },
      ],
    };

    render(
      <BrowserRouter>
        <ListView resource={resourceWithCreate} />
      </BrowserRouter>
    );

    // Check for empty state message
    expect(screen.getByText('No records found')).toBeInTheDocument();
    
    // Check for descriptive text
    expect(screen.getByText(/Get started by creating your first/i)).toBeInTheDocument();
    
    // Check for "Create First" button since resource has a create operation
    expect(screen.getByRole('button', { name: /Create First Users/i })).toBeInTheDocument();
  });

  it('should display empty state without create button when no create operation exists', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    // Create a resource without create operation
    const resourceWithoutCreate: Resource = {
      ...mockResource,
      operations: mockResource.operations.filter(op => op.viewHint !== 'create'),
    };

    render(
      <BrowserRouter>
        <ListView resource={resourceWithoutCreate} />
      </BrowserRouter>
    );

    // Check for empty state message
    expect(screen.getByText('No records found')).toBeInTheDocument();
    
    // Check for alternative descriptive text
    expect(screen.getByText(/There are no.*to display/i)).toBeInTheDocument();
    
    // Verify "Create First" button is NOT present
    expect(screen.queryByRole('button', { name: /Create First/i })).not.toBeInTheDocument();
  });

  it('should render sortable column headers with sort indicators', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Check that column headers are rendered as buttons (sortable)
    const nameHeader = screen.getByRole('button', { name: /Name/i });
    expect(nameHeader).toBeInTheDocument();
    
    const emailHeader = screen.getByRole('button', { name: /Email/i });
    expect(emailHeader).toBeInTheDocument();
  });

  it('should sort data in ascending order when clicking column header', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    const mockData = [
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Click the Name column header to sort
    const nameHeader = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(nameHeader);

    // Wait for sorting to be applied and check tbody rows
    await waitFor(() => {
      const cells = container.querySelectorAll('tbody tr td:nth-child(2)');
      const names = Array.from(cells).map(cell => cell.textContent);
      // After first click, should be sorted in ascending order
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  it('should sort data when clicking column header', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    const mockData = [
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Click the Name column header to sort
    const nameHeader = screen.getByRole('button', { name: /Name/i });
    fireEvent.click(nameHeader);

    // Wait for the sorting to be applied
    await waitFor(() => {
      const cells = container.querySelectorAll('tbody tr td:nth-child(2)');
      const names = Array.from(cells).map(cell => cell.textContent);
      // After first click, should be sorted (ascending or descending, just not original order)
      expect(names).not.toEqual(['Charlie', 'Alice', 'Bob']);
    });
  });

  it('should display sort indicators on column headers', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    const mockData = [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    render(
      <BrowserRouter>
        <ListView resource={mockResource} />
      </BrowserRouter>
    );

    // Check that sort indicators (arrows) are present in headers
    const nameHeader = screen.getByRole('button', { name: /Name/i });
    expect(nameHeader).toBeInTheDocument();
    
    // The header should contain an SVG icon (sort indicator)
    const svg = nameHeader.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  describe('Pagination', () => {
    it('should render offset pagination controls when pagination style is offset', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [
          { id: '1', name: 'Alice', email: 'alice@example.com' },
          { id: '2', name: 'Bob', email: 'bob@example.com' },
        ],
        total: 50,
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'offset',
          params: { limit: 'limit', offset: 'offset' },
        },
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      // Check pagination controls are rendered
      expect(screen.getByText(/Page 1 of 5/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('should render cursor pagination controls when pagination style is cursor', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [
          { id: '1', name: 'Alice', email: 'alice@example.com' },
          { id: '2', name: 'Bob', email: 'bob@example.com' },
        ],
        nextCursor: 'abc123',
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'cursor',
          params: { cursor: 'cursor' },
        },
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      // Check pagination controls are rendered
      expect(screen.getByText(/Page 1/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('should render page-based pagination controls when pagination style is page', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [
          { id: '1', name: 'Alice', email: 'alice@example.com' },
          { id: '2', name: 'Bob', email: 'bob@example.com' },
        ],
        totalPages: 5,
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'page',
          params: { page: 'page', pageSize: 'pageSize' },
        },
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      // Check pagination controls are rendered
      expect(screen.getByText(/Page 1 of 5/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('should disable Previous button on first page for offset pagination', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
        total: 50,
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'offset',
          params: { limit: 'limit', offset: 'offset' },
        },
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      const previousButton = screen.getByRole('button', { name: /Previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('should disable Next button when no next cursor for cursor pagination', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
        nextCursor: null,
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'cursor',
          params: { cursor: 'cursor' },
        },
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should call API with correct offset parameters when navigating pages', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = {
        items: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
        total: 50,
      };

      const resourceWithPagination: Resource = {
        ...mockResource,
        pagination: {
          style: 'offset',
          params: { limit: 'limit', offset: 'offset' },
        },
      };

      const mockUseApiCall = vi.fn().mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      });

      vi.mocked(useApiCall).mockImplementation(mockUseApiCall);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithPagination} />
        </BrowserRouter>
      );

      // Check that useApiCall was called with correct initial params
      expect(mockUseApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            limit: '10',
            offset: '0',
          }),
        })
      );
    });

    it('should not render pagination controls when no pagination strategy is detected', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Check that pagination controls are NOT rendered
      expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should render filter inputs above each column - Requirement 36.1', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Check that filter inputs are rendered for each column
      expect(screen.getByPlaceholderText('Filter ID...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter Name...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter Email...')).toBeInTheDocument();
    });

    it('should filter rows when text is entered in filter input - Requirement 36.2', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
        { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Initially all rows should be visible
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();

      // Filter by name
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'Bob' } });

      // Only Bob should be visible
      await waitFor(() => {
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
      });
    });

    it('should support filtering by multiple columns simultaneously - Requirement 36.3', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Alice', email: 'alice@test.com' },
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Filter by name
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'Alice' } });

      // Filter by email
      const emailFilter = screen.getByPlaceholderText('Filter Email...');
      fireEvent.change(emailFilter, { target: { value: 'example' } });

      // Only Alice with example.com should be visible
      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.queryByText('alice@test.com')).not.toBeInTheDocument();
        expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument();
      });
    });

    it('should display the number of filtered results - Requirement 36.4', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
        { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Filter by name
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'li' } });

      // Should show filtered result count
      await waitFor(() => {
        expect(screen.getByText(/Showing 2 filtered results/i)).toBeInTheDocument();
      });
    });

    it('should provide a Clear Filters button - Requirement 36.5', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Filter by name
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'Alice' } });

      // Clear button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearButton);

      // All rows should be visible again
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });

      // Filter input should be cleared
      expect(nameFilter).toHaveValue('');
    });

    it('should support case-insensitive text filtering - Requirement 36.6', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'BOB', email: 'BOB@EXAMPLE.COM' },
        { id: '3', name: 'Charlie', email: 'charlie@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Filter with lowercase
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'bob' } });

      // Should match BOB (case-insensitive)
      await waitFor(() => {
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        expect(screen.getByText('BOB')).toBeInTheDocument();
        expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
      });

      // Clear and filter email with uppercase
      fireEvent.change(nameFilter, { target: { value: '' } });
      const emailFilter = screen.getByPlaceholderText('Filter Email...');
      fireEvent.change(emailFilter, { target: { value: 'ALICE' } });

      // Should match alice@example.com (case-insensitive)
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText('BOB')).not.toBeInTheDocument();
        expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
      });
    });

    it('should not show Clear button when no filters are active', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Clear button should not be visible initially
      expect(screen.queryByRole('button', { name: /Clear/i })).not.toBeInTheDocument();
    });

    it('should show filtered result count with singular form for 1 result', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Filter to get exactly 1 result
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'Alice' } });

      // Should show singular form
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 filtered result$/i)).toBeInTheDocument();
      });
    });
  });

  describe('Row Actions', () => {
    it('should display action buttons based on available operations', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      const resourceWithActions: Resource = {
        ...mockResource,
        operations: [
          ...mockResource.operations,
          {
            id: 'getUser',
            method: 'GET',
            path: '/users/{id}',
            viewHint: 'detail',
            parameters: [],
            responses: {},
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
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithActions} />
        </BrowserRouter>
      );

      // Check that action buttons are rendered
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });

    it('should only display View button when only detail operation exists', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      const resourceWithDetailOnly: Resource = {
        ...mockResource,
        operations: [
          ...mockResource.operations,
          {
            id: 'getUser',
            method: 'GET',
            path: '/users/{id}',
            viewHint: 'detail',
            parameters: [],
            responses: {},
          },
        ],
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithDetailOnly} />
        </BrowserRouter>
      );

      // Check that only View button is rendered
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });

    it('should not display actions column when no action operations exist', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Check that Actions header is not rendered
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('should make rows clickable when detail operation exists', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      const resourceWithDetail: Resource = {
        ...mockResource,
        operations: [
          ...mockResource.operations,
          {
            id: 'getUser',
            method: 'GET',
            path: '/users/{id}',
            viewHint: 'detail',
            parameters: [],
            responses: {},
          },
        ],
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      const { container } = render(
        <BrowserRouter>
          <ListView resource={resourceWithDetail} />
        </BrowserRouter>
      );

      // Check that rows have cursor-pointer class
      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).toHaveClass('cursor-pointer');
    });

    it('should display Create button when create operation exists', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      const resourceWithCreate: Resource = {
        ...mockResource,
        operations: [
          ...mockResource.operations,
          {
            id: 'createUser',
            method: 'POST',
            path: '/users',
            viewHint: 'create',
            parameters: [],
            responses: {},
          },
        ],
      };

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={resourceWithCreate} />
        </BrowserRouter>
      );

      // Check that Create button is rendered
      expect(screen.getByRole('button', { name: /Create Users/i })).toBeInTheDocument();
    });

    it('should not display Create button when create operation does not exist', async () => {
      const { useApiCall } = await import('@/hooks/useApiCall');
      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: true,
      } as any);

      render(
        <BrowserRouter>
          <ListView resource={mockResource} />
        </BrowserRouter>
      );

      // Check that Create button is not rendered
      expect(screen.queryByRole('button', { name: /Create/i })).not.toBeInTheDocument();
    });
  });
});
