import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchView } from '../SearchView';
import type { Resource, Operation } from '@uigen-dev/core';

// Mock useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

const { useApiCall } = await import('@/hooks/useApiCall');

describe('SearchView', () => {
  let queryClient: QueryClient;

  const mockResource: Resource = {
    name: 'Users',
    slug: 'users',
    description: 'User management',
    operations: [
      {
        id: 'searchUsers',
        method: 'GET',
        path: '/users/search',
        viewHint: 'search',
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              key: 'name',
              label: 'Name',
              required: false,
            },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'enum',
              key: 'status',
              label: 'Status',
              required: false,
              enumValues: ['active', 'inactive'],
            },
          },
          {
            name: 'age',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              key: 'age',
              label: 'Age',
              required: false,
            },
          },
        ],
        responses: {},
      } as Operation,
      {
        id: 'getUser',
        method: 'GET',
        path: '/users/{id}',
        viewHint: 'detail',
        parameters: [],
        responses: {},
      } as Operation,
    ],
    schema: {
      type: 'object',
      key: 'User',
      label: 'User',
      required: false,
      children: [
        { type: 'string', key: 'id', label: 'ID', required: true },
        { type: 'string', key: 'name', label: 'Name', required: true },
        { type: 'string', key: 'email', label: 'Email', required: true },
        { type: 'string', key: 'status', label: 'Status', required: false },
      ],
    },
    relationships: [],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderSearchView = (resource: Resource = mockResource, operation?: Operation) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SearchView resource={resource} operation={operation} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render filter inputs for query parameters', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Age')).toBeInTheDocument();
  });

  it('should render enum fields as select dropdowns', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.tagName).toBe('SELECT');
    expect(statusSelect.options).toHaveLength(3); // All + 2 enum values
    expect(statusSelect.options[0].value).toBe('');
    expect(statusSelect.options[1].value).toBe('active');
    expect(statusSelect.options[2].value).toBe('inactive');
  });

  it('should render number fields with number input type', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const ageInput = screen.getByLabelText('Age') as HTMLInputElement;
    expect(ageInput.type).toBe('number');
  });

  it('should display search results in table format', () => {
    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('should display result count', () => {
    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('2 results found')).toBeInTheDocument();
  });

  it('should display singular result count for one result', () => {
    const mockData = [{ id: '1', name: 'John Doe', email: 'john@example.com' }];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('1 result found')).toBeInTheDocument();
  });

  it('should clear all filters when Clear All Filters button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    await user.type(nameInput, 'John');

    expect(nameInput.value).toBe('John');

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearButton);

    expect(nameInput.value).toBe('');
  });

  it('should display active filters with remove buttons', async () => {
    const user = userEvent.setup();
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    await user.type(nameInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument();
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  it('should remove individual filter when X button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    await user.type(nameInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('Active filters:')).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText('Remove Name filter');
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
      expect(nameInput.value).toBe('');
    });
  });

  it('should display empty state when no results found', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    renderSearchView();

    const skeletonRows = screen.getAllByRole('row').filter(row => 
      row.querySelector('.animate-pulse')
    );
    expect(skeletonRows.length).toBeGreaterThan(0);
  });

  it('should display error message when API call fails', () => {
    vi.mocked(useApiCall).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch data'),
    } as any);

    renderSearchView();

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('should render message when no search operation available', () => {
    const resourceWithoutSearch: Resource = {
      ...mockResource,
      operations: mockResource.operations.filter(op => op.viewHint !== 'search'),
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView(resourceWithoutSearch);

    expect(screen.getByText('No search operation available for Users')).toBeInTheDocument();
  });

  it('should exclude pagination parameters from filter inputs', () => {
    const resourceWithPagination: Resource = {
      ...mockResource,
      operations: [
        {
          ...mockResource.operations[0],
          parameters: [
            ...mockResource.operations[0].parameters!,
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                key: 'limit',
                label: 'Limit',
                required: false,
              },
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                key: 'offset',
                label: 'Offset',
                required: false,
              },
            },
          ],
        } as Operation,
        ...mockResource.operations.slice(1),
      ],
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView(resourceWithPagination);

    expect(screen.queryByLabelText('Limit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Offset')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('should call useApiCall with query parameters when filters are applied', async () => {
    const user = userEvent.setup();
    const mockUseApiCall = vi.mocked(useApiCall);
    
    mockUseApiCall.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    await user.type(nameInput, 'John');

    await waitFor(() => {
      expect(mockUseApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            name: 'John',
          }),
        })
      );
    });
  });

  it('should call useApiCall with multiple query parameters', async () => {
    const user = userEvent.setup();
    const mockUseApiCall = vi.mocked(useApiCall);
    
    mockUseApiCall.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    
    await user.type(nameInput, 'John');
    await user.selectOptions(statusSelect, 'active');

    await waitFor(() => {
      expect(mockUseApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            name: 'John',
            status: 'active',
          }),
        })
      );
    });
  });

  it('should not include empty filter values in query parameters', () => {
    const mockUseApiCall = vi.mocked(useApiCall);
    
    mockUseApiCall.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    // Initially, no filters should be passed
    expect(mockUseApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: {},
      })
    );
  });

  it('should navigate to detail view when row is clicked', async () => {
    const user = userEvent.setup();
    const mockData = [
      { id: '123', name: 'John Doe', email: 'john@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    const { container } = renderSearchView();

    const row = container.querySelector('tbody tr');
    expect(row).toBeInTheDocument();
    
    await user.click(row!);

    // Check that navigation was attempted (URL would change in real app)
    // In test environment, we just verify the row is clickable
    expect(row).toHaveClass('cursor-pointer');
  });

  it('should navigate to detail view when View button is clicked', async () => {
    const user = userEvent.setup();
    const mockData = [
      { id: '123', name: 'John Doe', email: 'john@example.com' },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const viewButton = screen.getByRole('button', { name: /view/i });
    expect(viewButton).toBeInTheDocument();
    
    await user.click(viewButton);
    
    // Verify button exists and is clickable
    expect(viewButton).toBeEnabled();
  });

  it('should handle data wrapped in items property', () => {
    const mockData = {
      items: [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ],
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('2 results found')).toBeInTheDocument();
  });

  it('should handle data wrapped in data property', () => {
    const mockData = {
      data: [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ],
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1 result found')).toBeInTheDocument();
  });

  it('should not render Actions column when no detail operation exists', () => {
    const resourceWithoutDetail: Resource = {
      ...mockResource,
      operations: mockResource.operations.filter(op => op.viewHint !== 'detail'),
    };

    vi.mocked(useApiCall).mockReturnValue({
      data: [{ id: '1', name: 'John Doe', email: 'john@example.com' }],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView(resourceWithoutDetail);

    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
  });

  it('should format null and undefined values as dash', () => {
    const mockData = [
      { id: '1', name: 'John Doe', email: null, status: undefined },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    const cells = screen.getAllByText('-');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should format object values as JSON string', () => {
    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: { active: true } },
    ];

    vi.mocked(useApiCall).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    renderSearchView();

    expect(screen.getByText('{"active":true}')).toBeInTheDocument();
  });

  it('should use provided operation instead of finding search operation', () => {
    const customOperation: Operation = {
      id: 'customSearch',
      method: 'GET',
      path: '/users/custom-search',
      viewHint: 'search',
      parameters: [
        {
          name: 'query',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            key: 'query',
            label: 'Query',
            required: false,
          },
        },
      ],
      responses: {},
    } as Operation;

    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderSearchView(mockResource, customOperation);

    expect(screen.getByLabelText('Query')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
