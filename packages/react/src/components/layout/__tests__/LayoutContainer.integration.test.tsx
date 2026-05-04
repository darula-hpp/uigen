import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LayoutContainer } from '../LayoutContainer';
import { LayoutRegistry } from '@/lib/layout-registry';
import { SidebarLayoutStrategy } from '../strategies/SidebarLayoutStrategy';
import { CenteredLayoutStrategy } from '../strategies/CenteredLayoutStrategy';
import { DashboardGridLayoutStrategy } from '../strategies/DashboardGridLayoutStrategy';
import type { LayoutConfig } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * Integration tests for LayoutContainer with built-in strategies
 * Tests Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

// Mock config for testing
const mockConfig: UIGenApp = {
  meta: {
    title: 'Test App',
    version: '1.0.0',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      uigenId: 'users',
      operations: [],
      schema: {
        type: 'object',
        properties: {},
      },
      relationships: [],
    },
  ],
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

// Helper to render with AppContext
const renderWithContext = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AppProvider config={mockConfig}>
        {children}
      </AppProvider>
    </BrowserRouter>
  );
};

describe('LayoutContainer Integration Tests', () => {
  let registry: LayoutRegistry;

  beforeEach(() => {
    registry = LayoutRegistry.getInstance();
    registry.clear();
    
    // Register all built-in strategies
    registry.register(new SidebarLayoutStrategy());
    registry.register(new CenteredLayoutStrategy());
    registry.register(new DashboardGridLayoutStrategy());
    registry.setDefault('sidebar');
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Sidebar Layout Strategy Integration', () => {
    it('should render LayoutContainer with sidebar strategy correctly', () => {
      const layoutConfig: LayoutConfig = {
        type: 'sidebar',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Verify sidebar layout structure
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Sidebar layout should have navigation elements (aside element)
      const sidebar = document.querySelector('aside');
      expect(sidebar).toBeTruthy();
      expect(sidebar).toHaveClass('bg-card', 'border-r');
    });

    it('should apply sidebar metadata configuration', () => {
      const layoutConfig: LayoutConfig = {
        type: 'sidebar',
        metadata: {
          sidebarWidth: 300,
          sidebarCollapsible: true,
          sidebarDefaultCollapsed: false,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should use sidebar default metadata when not provided', () => {
      const layoutConfig: LayoutConfig = {
        type: 'sidebar',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should render with default sidebar configuration
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Centered Layout Strategy Integration', () => {
    it('should render LayoutContainer with centered strategy correctly', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Verify centered layout structure
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Centered layout should have header with app title
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('should apply centered metadata configuration', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
        metadata: {
          maxWidth: 600,
          showHeader: true,
          verticalCenter: true,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Verify maxWidth is applied via CSS variable
      const main = screen.getByTestId('test-content').closest('main');
      expect(main).toHaveStyle({ '--max-width': '600px' });
    });

    it('should hide header when showHeader is false', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
        metadata: {
          showHeader: false,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Header should not be present
      expect(screen.queryByText('Test App')).not.toBeInTheDocument();
    });

    it('should use centered default metadata when not provided', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should render with default centered configuration (maxWidth: 480)
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      const main = screen.getByTestId('test-content').closest('main');
      expect(main).toHaveStyle({ '--max-width': '480px' });
    });
  });

  describe('Dashboard Grid Layout Strategy Integration', () => {
    it('should render LayoutContainer with dashboard grid strategy correctly', () => {
      const layoutConfig: LayoutConfig = {
        type: 'dashboard-grid',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Verify dashboard grid layout structure
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Dashboard grid should have sidebar (aside element)
      const sidebar = document.querySelector('aside');
      expect(sidebar).toBeTruthy();
      expect(sidebar).toHaveClass('bg-card', 'border-r');
    });

    it('should apply dashboard grid metadata configuration', () => {
      const layoutConfig: LayoutConfig = {
        type: 'dashboard-grid',
        metadata: {
          columns: {
            mobile: 1,
            tablet: 2,
            desktop: 4,
          },
          gap: 32,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Verify grid gap is applied via CSS variable
      const gridContainer = screen.getByTestId('test-content').parentElement;
      expect(gridContainer).toHaveStyle({ '--grid-gap': '32px' });
    });

    it('should use dashboard grid default metadata when not provided', () => {
      const layoutConfig: LayoutConfig = {
        type: 'dashboard-grid',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should render with default dashboard grid configuration
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      const gridContainer = screen.getByTestId('test-content').parentElement;
      expect(gridContainer).toHaveStyle({ '--grid-gap': '24px' });
    });
  });

  describe('Layout Overrides at Resource Level', () => {
    it('should apply layout override from resource configuration', () => {
      // Simulate resource-level layout override
      const resourceLayoutConfig: LayoutConfig = {
        type: 'centered',
        metadata: {
          maxWidth: 500,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={resourceLayoutConfig}>
          <div data-testid="test-content">Resource Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Verify override is applied via CSS variable
      const main = screen.getByTestId('test-content').closest('main');
      expect(main).toHaveStyle({ '--max-width': '500px' });
    });

    it('should override global layout with resource-specific layout', () => {
      // First render with global sidebar layout
      const { unmount } = renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'sidebar' }}>
          <div data-testid="global-content">Global Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('global-content')).toBeInTheDocument();
      
      unmount();
      
      // Then render with resource-specific centered layout
      renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'centered' }}>
          <div data-testid="resource-content">Resource Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('resource-content')).toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument(); // Centered layout header
    });

    it('should merge resource-level metadata with strategy defaults', () => {
      const resourceLayoutConfig: LayoutConfig = {
        type: 'centered',
        metadata: {
          maxWidth: 700, // Override default
          // showHeader and verticalCenter should use defaults
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={resourceLayoutConfig}>
          <div data-testid="test-content">Resource Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Custom maxWidth should be applied via CSS variable
      const main = screen.getByTestId('test-content').closest('main');
      expect(main).toHaveStyle({ '--max-width': '700px' });
      
      // Default showHeader should be true (header visible)
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });
  });

  describe('Strategy Switching', () => {
    it('should handle switching from sidebar to centered layout', () => {
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'sidebar' }}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Switch to centered layout
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={{ type: 'centered' }}>
              <div data-testid="test-content">Test Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument(); // Centered layout header
    });

    it('should handle switching from centered to dashboard grid layout', () => {
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'centered' }}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument();
      
      // Switch to dashboard grid layout
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={{ type: 'dashboard-grid' }}>
              <div data-testid="test-content">Test Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Dashboard grid should have dashboard-grid-container class
      const gridContainer = screen.getByTestId('test-content').parentElement;
      expect(gridContainer).toHaveClass('dashboard-grid-container');
    });

    it('should handle switching from dashboard grid to sidebar layout', () => {
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'dashboard-grid' }}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Switch to sidebar layout
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={{ type: 'sidebar' }}>
              <div data-testid="test-content">Test Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should preserve children content when switching layouts', () => {
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={{ type: 'sidebar' }}>
          <div data-testid="test-content">Persistent Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toHaveTextContent('Persistent Content');
      
      // Switch layout
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={{ type: 'centered' }}>
              <div data-testid="test-content">Persistent Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      // Content should remain the same
      expect(screen.getByTestId('test-content')).toHaveTextContent('Persistent Content');
    });

    it('should update metadata when switching to same layout type with different metadata', () => {
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={{ 
          type: 'centered',
          metadata: { maxWidth: 400 }
        }}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const main1 = screen.getByTestId('test-content').closest('main');
      expect(main1).toHaveStyle({ '--max-width': '400px' });
      
      // Update metadata
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={{ 
              type: 'centered',
              metadata: { maxWidth: 800 }
            }}>
              <div data-testid="test-content">Test Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      const main2 = screen.getByTestId('test-content').closest('main');
      expect(main2).toHaveStyle({ '--max-width': '800px' });
    });
  });

  describe('Error Handling with Real Strategies', () => {
    it('should handle invalid sidebar metadata gracefully', () => {
      const layoutConfig: LayoutConfig = {
        type: 'sidebar',
        metadata: {
          sidebarWidth: -100, // Invalid: negative width
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should still render with defaults
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should handle invalid centered metadata gracefully', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
        metadata: {
          maxWidth: -500, // Invalid: negative width
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should still render with defaults
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should handle invalid dashboard grid metadata gracefully', () => {
      const layoutConfig: LayoutConfig = {
        type: 'dashboard-grid',
        metadata: {
          columns: {
            mobile: -1, // Invalid: negative columns
            tablet: 0,  // Invalid: zero columns
            desktop: 3,
          },
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should still render with defaults
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should render multiple children in dashboard grid layout', () => {
      const layoutConfig: LayoutConfig = {
        type: 'dashboard-grid',
        metadata: {
          columns: { mobile: 1, tablet: 2, desktop: 3 },
          gap: 16,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="widget-1">Widget 1</div>
          <div data-testid="widget-2">Widget 2</div>
          <div data-testid="widget-3">Widget 3</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('widget-1')).toBeInTheDocument();
      expect(screen.getByTestId('widget-2')).toBeInTheDocument();
      expect(screen.getByTestId('widget-3')).toBeInTheDocument();
    });

    it('should handle nested components in centered layout', () => {
      const layoutConfig: LayoutConfig = {
        type: 'centered',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="form-container">
            <h1>Login Form</h1>
            <form data-testid="login-form">
              <input type="text" placeholder="Username" />
              <input type="password" placeholder="Password" />
              <button type="submit">Login</button>
            </form>
          </div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('form-container')).toBeInTheDocument();
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('should handle complex sidebar layout with navigation', () => {
      const layoutConfig: LayoutConfig = {
        type: 'sidebar',
        metadata: {
          sidebarWidth: 280,
          sidebarCollapsible: true,
        },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="main-content">
            <h1>Dashboard</h1>
            <p>Welcome to the dashboard</p>
          </div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
