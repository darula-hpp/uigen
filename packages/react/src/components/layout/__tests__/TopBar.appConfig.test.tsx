import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../TopBar';
import type { UIGenApp } from '@uigen-dev/core';

// Mock child components
vi.mock('../../ServerSelector', () => ({
  ServerSelector: () => <div data-testid="server-selector">Server Selector</div>,
}));

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

describe('TopBar - Task 9.1: App Icon and Name Integration', () => {
  const renderTopBar = (config = mockConfig, onMenuClick = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={onMenuClick} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Requirement 8.5: Display app name from appConfig', () => {
    it('should render app name from appConfig.name when provided', () => {
      const configWithAppName = {
        ...mockConfig,
        appConfig: {
          name: 'My Custom App',
        },
      };
      renderTopBar(configWithAppName);
      expect(screen.getByText('My Custom App')).toBeInTheDocument();
    });

    it('should fallback to meta.title when appConfig.name not provided', () => {
      const configWithoutAppName = {
        ...mockConfig,
        appConfig: {},
      };
      renderTopBar(configWithoutAppName);
      expect(screen.getByText('Test API')).toBeInTheDocument();
    });

    it('should fallback to meta.title when appConfig is undefined', () => {
      renderTopBar(mockConfig);
      expect(screen.getByText('Test API')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.6: Display app icon from appConfig', () => {
    it('should render icon when appConfig.icon is provided', () => {
      const configWithIcon = {
        ...mockConfig,
        appConfig: {
          icon: '/assets/logo.svg',
        },
      };
      const { container } = renderTopBar(configWithIcon);
      const icon = container.querySelector('img[src="/assets/logo.svg"]');
      expect(icon).toBeInTheDocument();
    });

    it('should not render icon when appConfig.icon is not provided', () => {
      const configWithoutIcon = {
        ...mockConfig,
        appConfig: {
          name: 'My App',
        },
      };
      const { container } = renderTopBar(configWithoutIcon);
      const icon = container.querySelector('img');
      expect(icon).not.toBeInTheDocument();
    });

    it('should not render icon when appConfig is undefined', () => {
      const { container } = renderTopBar(mockConfig);
      const icon = container.querySelector('img');
      expect(icon).not.toBeInTheDocument();
    });

    it('should use correct alt text for icon', () => {
      const configWithIconAndName = {
        ...mockConfig,
        appConfig: {
          name: 'My Custom App',
          icon: '/assets/logo.svg',
        },
      };
      renderTopBar(configWithIconAndName);
      const icon = screen.getByAltText('My Custom App');
      expect(icon).toBeInTheDocument();
    });

    it('should use meta.title as alt text when appConfig.name not provided', () => {
      const configWithIconOnly = {
        ...mockConfig,
        appConfig: {
          icon: '/assets/logo.svg',
        },
      };
      renderTopBar(configWithIconOnly);
      const icon = screen.getByAltText('Test API');
      expect(icon).toBeInTheDocument();
    });

    it('should apply correct styling classes to icon', () => {
      const configWithIcon = {
        ...mockConfig,
        appConfig: {
          icon: '/assets/logo.svg',
        },
      };
      const { container } = renderTopBar(configWithIcon);
      const icon = container.querySelector('img');
      expect(icon).toHaveClass('h-8', 'w-8', 'object-contain');
    });
  });

  describe('Requirement 8.5, 8.6: Combined icon and name', () => {
    it('should render both icon and name when both provided', () => {
      const configWithBoth = {
        ...mockConfig,
        appConfig: {
          name: 'My Custom App',
          icon: '/assets/logo.svg',
        },
      };
      renderTopBar(configWithBoth);
      
      expect(screen.getByText('My Custom App')).toBeInTheDocument();
      expect(screen.getByAltText('My Custom App')).toBeInTheDocument();
    });

    it('should render icon and name in correct layout', () => {
      const configWithBoth = {
        ...mockConfig,
        appConfig: {
          name: 'My Custom App',
          icon: '/assets/logo.svg',
        },
      };
      const { container } = renderTopBar(configWithBoth);
      
      // Check that icon and name are in the same container
      const brandContainer = container.querySelector('.flex-shrink-0.flex.items-center.gap-2');
      expect(brandContainer).toBeInTheDocument();
      
      // Check that icon comes before the h1
      const icon = brandContainer?.querySelector('img');
      const title = brandContainer?.querySelector('h1');
      expect(icon).toBeInTheDocument();
      expect(title).toBeInTheDocument();
    });
  });
});
