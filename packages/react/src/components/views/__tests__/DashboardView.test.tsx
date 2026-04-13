import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardView } from '../DashboardView';
import type { UIGenApp } from '@uigen/core';
import { BrowserRouter } from 'react-router-dom';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getAuthCredentials: vi.fn(),
}));

// Mock server utilities
vi.mock('@/lib/server', () => ({
  getSelectedServer: vi.fn(),
}));

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockConfig: UIGenApp = {
  meta: {
    title: 'Test API',
    version: '1.0.0',
    description: 'A test API for UIGen',
  },
  resources: [
    {
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
        {
          id: 'createUser',
          method: 'POST',
          path: '/users',
          viewHint: 'create',
          parameters: [],
          responses: {},
        },
      ],
      schema: {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        description: 'User resource for managing users',
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    },
    {
      name: 'Products',
      slug: 'products',
      operations: [
        {
          id: 'searchProducts',
          method: 'GET',
          path: '/products',
          viewHint: 'search',
          parameters: [],
          responses: {},
        },
      ],
      schema: {
        type: 'object',
        key: 'product',
        label: 'Product',
        required: false,
        description: 'Product catalog',
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    },
  ],
  auth: {
    schemes: [
      {
        type: 'bearer',
        name: 'bearerAuth',
      },
    ],
    globalRequired: false,
  },
  dashboard: {
    enabled: true,
    widgets: [],
  },
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production',
    },
    {
      url: 'https://staging.api.example.com',
      description: 'Staging',
    },
  ],
};

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display app title, description, and version', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test API')).toBeInTheDocument();
    expect(screen.getByText('A test API for UIGen')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });

  it('should display authentication status as not authenticated when no credentials', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
  });

  it('should display authentication status as authenticated when credentials exist', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue({
      type: 'bearer',
      token: 'test-token',
    });
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
  });

  it('should display current server environment', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    expect(screen.getByText('Server Environment')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('should display resource cards with names and descriptions', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Check resource names
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();

    // Check resource descriptions
    expect(screen.getByText('User resource for managing users')).toBeInTheDocument();
    expect(screen.getByText('Product catalog')).toBeInTheDocument();
  });

  it('should display record count when list operation exists', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    
    // Mock different responses for different resources
    vi.mocked(useApiCall).mockImplementation((options: any) => {
      if (options?.operation?.id === 'listUsers') {
        return {
          data: { total: 42 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any;
      }
      if (options?.operation?.id === 'searchProducts') {
        return {
          data: [{ id: '1' }, { id: '2' }, { id: '3' }],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any;
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: false,
      } as any;
    });

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Check record counts
    expect(screen.getByText('42 records')).toBeInTheDocument();
    expect(screen.getByText('3 records')).toBeInTheDocument();
  });

  it('should display loading state for record counts', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    const { container } = render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Check for loading skeleton
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should provide navigation buttons for available operations', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Users resource should have View List and Create New buttons
    const viewListButtons = screen.getAllByRole('button', { name: /View List/i });
    expect(viewListButtons.length).toBeGreaterThan(0);

    const createNewButtons = screen.getAllByRole('button', { name: /Create New/i });
    expect(createNewButtons.length).toBeGreaterThan(0);

    // Products resource should have Search button
    const searchButtons = screen.getAllByRole('button', { name: /Search/i });
    expect(searchButtons.length).toBeGreaterThan(0);
  });

  it('should handle singular record count correctly', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    
    vi.mocked(useApiCall).mockImplementation((options: any) => {
      if (options?.operation?.id === 'listUsers') {
        return {
          data: { total: 1 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any;
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: false,
      } as any;
    });

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Check singular form
    expect(screen.getByText('1 record')).toBeInTheDocument();
  });

  it('should fallback to first server when no server is selected', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue(null);
    vi.mocked(useApiCall).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    // Should display first server's description
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('should extract count from different response formats', async () => {
    const { getAuthCredentials } = await import('@/lib/auth');
    const { getSelectedServer } = await import('@/lib/server');
    const { useApiCall } = await import('@/hooks/useApiCall');

    vi.mocked(getAuthCredentials).mockReturnValue(null);
    vi.mocked(getSelectedServer).mockReturnValue('https://api.example.com');
    
    // Test with data.items format
    vi.mocked(useApiCall).mockImplementation((options: any) => {
      if (options?.operation?.id === 'listUsers') {
        return {
          data: { items: [{ id: '1' }, { id: '2' }] },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any;
      }
      if (options?.operation?.id === 'searchProducts') {
        return {
          data: { data: [{ id: '1' }] },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any;
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isError: false,
        isSuccess: false,
      } as any;
    });

    render(
      <BrowserRouter>
        <DashboardView config={mockConfig} />
      </BrowserRouter>
    );

    expect(screen.getByText('2 records')).toBeInTheDocument();
    expect(screen.getByText('1 record')).toBeInTheDocument();
  });
});
