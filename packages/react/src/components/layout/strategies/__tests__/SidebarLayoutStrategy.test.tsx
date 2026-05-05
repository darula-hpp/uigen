import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SidebarLayoutStrategy } from '../SidebarLayoutStrategy';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { UIGenApp } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';

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
      schema: { type: 'object', key: 'User', label: 'User', required: false },
      relationships: [],
    },
  ],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {},
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

describe('SidebarLayoutStrategy', () => {
  let strategy: SidebarLayoutStrategy;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    strategy = new SidebarLayoutStrategy();
    
    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Strategy interface', () => {
    it('should have correct type identifier', () => {
      expect(strategy.type).toBe('sidebar');
    });

    it('should implement LayoutStrategy interface', () => {
      expect(strategy).toHaveProperty('type');
      expect(strategy).toHaveProperty('render');
      expect(strategy).toHaveProperty('validate');
      expect(strategy).toHaveProperty('getDefaults');
      expect(typeof strategy.render).toBe('function');
      expect(typeof strategy.validate).toBe('function');
      expect(typeof strategy.getDefaults).toBe('function');
    });
  });

  describe('Requirement 3.1, 3.2, 3.3: Rendering with default metadata', () => {
    it('should render sidebar layout with children', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render sidebar component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Sidebar should be present (aside element)
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render top bar component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // TopBar should be present (header element)
      const topBar = container.querySelector('header');
      expect(topBar).toBeInTheDocument();
    });

    it('should render breadcrumb component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Breadcrumb should be present (nav element)
      const breadcrumb = container.querySelector('nav');
      expect(breadcrumb).toBeInTheDocument();
    });

    it('should render main content area', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Main content area should be present
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render with flex layout structure', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Root container should have flex layout
      const root = container.querySelector('.flex.h-screen.overflow-hidden');
      expect(root).toBeInTheDocument();
    });
  });

  describe('Requirement 3.2, 3.5: Rendering with custom metadata', () => {
    it('should render with custom sidebarWidth metadata', () => {
      const metadata: LayoutMetadata = {
        sidebarWidth: 300,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      renderWithContext(rendered);
      
      // Component should render successfully with custom metadata
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with collapsible metadata', () => {
      const metadata: LayoutMetadata = {
        sidebarCollapsible: true,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      renderWithContext(rendered);
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with sidebarDefaultCollapsed metadata', () => {
      const metadata: LayoutMetadata = {
        sidebarDefaultCollapsed: true,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      renderWithContext(rendered);
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with multiple custom metadata properties', () => {
      const metadata: LayoutMetadata = {
        sidebarWidth: 280,
        sidebarCollapsible: true,
        sidebarDefaultCollapsed: false,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      renderWithContext(rendered);
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Metadata validation', () => {
    it('should validate undefined metadata as valid', () => {
      expect(strategy.validate(undefined)).toBe(true);
    });

    it('should validate empty metadata as valid', () => {
      expect(strategy.validate({})).toBe(true);
    });

    it('should validate positive sidebarWidth', () => {
      expect(strategy.validate({ sidebarWidth: 256 })).toBe(true);
      expect(strategy.validate({ sidebarWidth: 300 })).toBe(true);
      expect(strategy.validate({ sidebarWidth: 200 })).toBe(true);
    });

    it('should invalidate negative sidebarWidth', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ sidebarWidth: -100 })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SidebarLayout] Invalid sidebarWidth: must be a positive number'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should invalidate non-number sidebarWidth', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ sidebarWidth: '256' as any })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SidebarLayout] Invalid sidebarWidth: must be a positive number'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate zero sidebarWidth as invalid', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ sidebarWidth: 0 })).toBe(false);
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate metadata with other properties', () => {
      expect(strategy.validate({ 
        sidebarWidth: 256,
        sidebarCollapsible: true,
        customProperty: 'value'
      })).toBe(true);
    });
  });

  describe('Default metadata', () => {
    it('should return default metadata values', () => {
      const defaults = strategy.getDefaults();
      
      expect(defaults).toEqual({
        sidebarWidth: 256,
        sidebarCollapsible: true,
        sidebarDefaultCollapsed: false,
      });
    });

    it('should return consistent defaults on multiple calls', () => {
      const defaults1 = strategy.getDefaults();
      const defaults2 = strategy.getDefaults();
      
      expect(defaults1).toEqual(defaults2);
    });

    it('should return defaults with correct types', () => {
      const defaults = strategy.getDefaults();
      
      expect(typeof defaults.sidebarWidth).toBe('number');
      expect(typeof defaults.sidebarCollapsible).toBe('boolean');
      expect(typeof defaults.sidebarDefaultCollapsed).toBe('boolean');
    });
  });

  describe('Requirement 3.4: Sidebar collapse state persistence', () => {
    it('should load persisted sidebar collapsed state from localStorage', () => {
      // Set persisted state
      const storageKey = 'uigen_layout_prefs_Test App';
      localStorageMock[storageKey] = JSON.stringify({ sidebarCollapsed: true });
      
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Verify localStorage was read
      expect(global.localStorage.getItem).toHaveBeenCalledWith(storageKey);
    });

    it('should use default collapsed state when no persisted state exists', () => {
      const metadata: LayoutMetadata = {
        sidebarDefaultCollapsed: true,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      renderWithContext(rendered);
      
      // Component should render with default state
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should persist sidebar collapsed state to localStorage', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Verify localStorage.setItem was called (happens in useEffect)
      // Note: This tests the initial render persistence
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON
      localStorageMock['uigen_sidebar_collapsed'] = 'invalid-json';
      
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      // Should not throw error
      expect(() => renderWithContext(rendered)).not.toThrow();
    });
  });

  describe('Requirement 3.5: Mobile sidebar overlay behavior', () => {
    it('should render mobile menu button in TopBar', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // TopBar should have menu button (☰)
      const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
      expect(menuButton).toBeInTheDocument();
    });

    it('should pass mobile sidebar state to Sidebar component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Sidebar should be present with mobile overlay support
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      // Sidebar should have mobile-specific classes
      expect(sidebar?.className).toContain('fixed');
      expect(sidebar?.className).toContain('md:static');
    });

    it('should handle mobile sidebar close callback', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Component should render without errors
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Requirement 3.6: Preserve current sidebar implementation', () => {
    it('should use existing Sidebar component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Should render the existing Sidebar component structure
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar?.className).toContain('w-full'); // Mobile-first: full width
      expect(sidebar?.className).toContain('bg-card');
      expect(sidebar?.className).toContain('border-r');
    });

    it('should use existing TopBar component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Should render the existing TopBar component structure
      const topBar = container.querySelector('header');
      expect(topBar).toBeInTheDocument();
      expect(topBar?.className).toContain('h-16');
      expect(topBar?.className).toContain('border-b');
    });

    it('should use existing Breadcrumb component', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Should render the existing Breadcrumb component structure
      const breadcrumb = container.querySelector('nav');
      expect(breadcrumb).toBeInTheDocument();
    });

    it('should maintain existing layout structure', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Should have the same structure as current layout
      const root = container.querySelector('.flex.h-screen.overflow-hidden');
      expect(root).toBeInTheDocument();
      
      const contentColumn = container.querySelector('.flex-1.flex.flex-col.overflow-hidden');
      expect(contentColumn).toBeInTheDocument();
      
      const main = container.querySelector('main.flex-1.overflow-auto');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Integration with AppContext', () => {
    it('should use config from AppContext', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Should render app title from config (appears in both Sidebar and TopBar)
      const appTitles = screen.getAllByText('Test App');
      expect(appTitles.length).toBeGreaterThan(0);
    });

    it('should pass config to child components', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Sidebar should render with resources from config
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should render without metadata', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      expect(() => renderWithContext(rendered)).not.toThrow();
    });

    it('should render with null metadata', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, undefined);
      
      expect(() => renderWithContext(rendered)).not.toThrow();
    });

    it('should render with empty children', () => {
      const rendered = strategy.render(null);
      
      expect(() => renderWithContext(rendered)).not.toThrow();
    });
  });
});
