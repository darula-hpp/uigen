import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../TopBar';
import type { UIGenApp } from '@uigen-dev/core';

// Mock child components
vi.mock('../../ServerSelector', () => ({
  ServerSelector: ({ servers }: any) => (
    <div data-testid="server-selector">
      {servers.map((s: any) => (
        <div key={s.url}>{s.description || s.url}</div>
      ))}
    </div>
  ),
}));

vi.mock('../../AuthUI', () => ({
  AuthUI: ({ config }: any) => (
    <div data-testid="auth-ui">
      Auth schemes: {config.schemes.length}
    </div>
  ),
}));

// Mock useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockConfig: UIGenApp = {
  meta: {
    title: 'Test API',
    version: '1.0.0',
  },
  resources: [],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {
    enabled: false,
    widgets: [],
  },
  servers: [{ url: 'https://api.example.com' }],
};

describe('TopBar', () => {
  const renderTopBar = (config = mockConfig, onMenuClick = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={onMenuClick} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Requirement 30.1: Display app title', () => {
    it('should display app title', () => {
      renderTopBar();
      expect(screen.getByText('Test API')).toBeInTheDocument();
    });

    it('should display different app title', () => {
      const customConfig = {
        ...mockConfig,
        meta: { title: 'Custom API', version: '2.0.0' },
      };
      renderTopBar(customConfig);
      expect(screen.getByText('Custom API')).toBeInTheDocument();
    });
  });

  describe('Requirement 30.2: Display app version', () => {
    it('should display app version', () => {
      renderTopBar();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });

    it('should display different version', () => {
      const customConfig = {
        ...mockConfig,
        meta: { title: 'Test API', version: '2.5.3' },
      };
      renderTopBar(customConfig);
      expect(screen.getByText('2.5.3')).toBeInTheDocument();
    });
  });

  describe('Requirement 30.3: Render server selector', () => {
    it('should render server selector button when multiple servers exist', () => {
      const configWithServers = {
        ...mockConfig,
        servers: [
          { url: 'https://dev.api.com', description: 'Development' },
          { url: 'https://prod.api.com', description: 'Production' },
        ],
      };
      renderTopBar(configWithServers);
      
      expect(screen.getByRole('button', { name: /Server/i })).toBeInTheDocument();
    });

    it('should not render server selector when only one server exists', () => {
      renderTopBar();
      expect(screen.queryByRole('button', { name: /Server/i })).not.toBeInTheDocument();
    });

    it('should show server selector dropdown when button is clicked', () => {
      const configWithServers = {
        ...mockConfig,
        servers: [
          { url: 'https://dev.api.com', description: 'Development' },
          { url: 'https://prod.api.com', description: 'Production' },
        ],
      };
      renderTopBar(configWithServers);
      
      const serverButton = screen.getByRole('button', { name: /Server/i });
      fireEvent.click(serverButton);
      
      expect(screen.getByTestId('server-selector')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('should toggle server selector dropdown', () => {
      const configWithServers = {
        ...mockConfig,
        servers: [
          { url: 'https://dev.api.com' },
          { url: 'https://prod.api.com' },
        ],
      };
      renderTopBar(configWithServers);
      
      const serverButton = screen.getByRole('button', { name: /Server/i });
      
      // Click to open
      fireEvent.click(serverButton);
      expect(screen.getByTestId('server-selector')).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(serverButton);
      expect(screen.queryByTestId('server-selector')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 30.4: Render auth status', () => {
    it('should render auth button when auth schemes exist', () => {
      const configWithAuth = {
        ...mockConfig,
        auth: {
          schemes: [{ type: 'bearer' as const, name: 'bearerAuth' }],
          globalRequired: false,
        },
      };
      renderTopBar(configWithAuth);
      
      expect(screen.getByRole('button', { name: /Auth/i })).toBeInTheDocument();
    });

    it('should not render auth button when no auth schemes exist', () => {
      renderTopBar();
      expect(screen.queryByRole('button', { name: /Auth/i })).not.toBeInTheDocument();
    });

    it('should show auth UI dropdown when button is clicked', () => {
      const configWithAuth = {
        ...mockConfig,
        auth: {
          schemes: [{ type: 'bearer' as const, name: 'bearerAuth' }],
          globalRequired: false,
        },
      };
      renderTopBar(configWithAuth);
      
      const authButton = screen.getByRole('button', { name: /Auth/i });
      fireEvent.click(authButton);
      
      expect(screen.getByTestId('auth-ui')).toBeInTheDocument();
      expect(screen.getByText('Auth schemes: 1')).toBeInTheDocument();
    });

    it('should toggle auth UI dropdown', () => {
      const configWithAuth = {
        ...mockConfig,
        auth: {
          schemes: [{ type: 'bearer' as const, name: 'bearerAuth' }],
          globalRequired: false,
        },
      };
      renderTopBar(configWithAuth);
      
      const authButton = screen.getByRole('button', { name: /Auth/i });
      
      // Click to open
      fireEvent.click(authButton);
      expect(screen.getByTestId('auth-ui')).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(authButton);
      expect(screen.queryByTestId('auth-ui')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 30.5: Render theme toggle', () => {
    it('should render theme toggle button', () => {
      renderTopBar();
      const themeButton = screen.getByTitle(/Switch to/i);
      expect(themeButton).toBeInTheDocument();
    });

    it('should display moon icon for theme toggle', () => {
      renderTopBar();
      const themeButton = screen.getByTitle(/Switch to/i);
      expect(themeButton).toHaveTextContent('🌙');
    });
  });

  describe('Mobile menu button', () => {
    it('should render mobile menu button', () => {
      renderTopBar();
      const menuButton = screen.getByRole('button', { name: /☰/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('should call onMenuClick when menu button is clicked', () => {
      const onMenuClick = vi.fn();
      renderTopBar(mockConfig, onMenuClick);
      
      const menuButton = screen.getByRole('button', { name: /☰/i });
      fireEvent.click(menuButton);
      
      expect(onMenuClick).toHaveBeenCalled();
    });
  });

  describe('Layout and structure', () => {
    it('should render as header element', () => {
      const { container } = renderTopBar();
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have correct height class', () => {
      const { container } = renderTopBar();
      const header = container.querySelector('header');
      expect(header).toHaveClass('h-16');
    });
  });

  describe('Requirement 54: Global Search', () => {
    const configWithSearchableResources: UIGenApp = {
      ...mockConfig,
      resources: [
        {
          name: 'Users',
          slug: 'users',
          operations: [
            {
              id: 'listUsers',
              method: 'GET' as const,
              path: '/users',
              viewHint: 'list' as const,
              parameters: [],
              responses: {},
            },
          ],
          schema: {
            type: 'object' as const,
            key: 'User',
            label: 'User',
            required: false,
            children: [
              { type: 'string' as const, key: 'name', label: 'Name', required: true },
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
              method: 'GET' as const,
              path: '/products',
              viewHint: 'search' as const,
              parameters: [],
              responses: {},
            },
          ],
          schema: {
            type: 'object' as const,
            key: 'Product',
            label: 'Product',
            required: false,
            children: [
              { type: 'string' as const, key: 'title', label: 'Title', required: true },
            ],
          },
          relationships: [],
        },
      ],
    };

    describe('Requirement 54.1: Render global search input in top bar', () => {
      it('should render search input when searchable resources exist', () => {
        renderTopBar(configWithSearchableResources);
        const searchInput = screen.getByPlaceholderText(/Search across all resources/i);
        expect(searchInput).toBeInTheDocument();
      });

      it('should not render search input when no searchable resources exist', () => {
        renderTopBar(mockConfig);
        const searchInput = screen.queryByPlaceholderText(/Search across all resources/i);
        expect(searchInput).not.toBeInTheDocument();
      });

      it('should render search icon', () => {
        renderTopBar(configWithSearchableResources);
        const searchInput = screen.getByPlaceholderText(/Search across all resources/i);
        expect(searchInput.parentElement?.querySelector('svg')).toBeInTheDocument();
      });
    });

    describe('Requirement 54.6: Debounce input', () => {
      it('should allow typing in search input', () => {
        renderTopBar(configWithSearchableResources);
        const searchInput = screen.getByPlaceholderText(/Search across all resources/i) as HTMLInputElement;
        
        fireEvent.change(searchInput, { target: { value: 'test query' } });
        
        expect(searchInput.value).toBe('test query');
      });

      it('should show clear button when search has text', () => {
        renderTopBar(configWithSearchableResources);
        const searchInput = screen.getByPlaceholderText(/Search across all resources/i);
        
        fireEvent.change(searchInput, { target: { value: 'test' } });
        
        // Clear button should be visible (X icon)
        const clearButton = searchInput.parentElement?.querySelector('button');
        expect(clearButton).toBeInTheDocument();
      });

      it('should clear search when clear button is clicked', () => {
        renderTopBar(configWithSearchableResources);
        const searchInput = screen.getByPlaceholderText(/Search across all resources/i) as HTMLInputElement;
        
        fireEvent.change(searchInput, { target: { value: 'test' } });
        expect(searchInput.value).toBe('test');
        
        const clearButton = searchInput.parentElement?.querySelector('button');
        if (clearButton) {
          fireEvent.click(clearButton);
        }
        
        expect(searchInput.value).toBe('');
      });
    });
  });
});
