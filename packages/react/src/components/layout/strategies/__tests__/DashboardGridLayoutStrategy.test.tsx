import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardGridLayoutStrategy } from '../DashboardGridLayoutStrategy';
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

describe('DashboardGridLayoutStrategy', () => {
  let strategy: DashboardGridLayoutStrategy;

  beforeEach(() => {
    strategy = new DashboardGridLayoutStrategy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Strategy interface', () => {
    it('should have correct type identifier', () => {
      expect(strategy.type).toBe('dashboard-grid');
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

  describe('Requirement 5.1, 5.2, 5.3: Rendering with default metadata', () => {
    it('should render dashboard grid layout with children', () => {
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

    it('should render main content area with grid', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Main content area should be present
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      
      // Grid container should be present
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      
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

    it('should apply default grid gap', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gap: '24px' });
    });

    it('should apply default mobile columns', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(1, 1fr)' });
    });

    it('should include responsive CSS for tablet and desktop', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Style tag should be present with media queries
      const styleTag = container.querySelector('style');
      expect(styleTag).toBeInTheDocument();
      expect(styleTag?.textContent).toContain('@media (min-width: 768px)');
      expect(styleTag?.textContent).toContain('@media (min-width: 1024px)');
    });
  });

  describe('Requirement 5.2, 5.4: Rendering with custom metadata', () => {
    it('should render with custom columns metadata', () => {
      const metadata: LayoutMetadata = {
        columns: {
          mobile: 1,
          tablet: 3,
          desktop: 4,
        },
      };
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(1, 1fr)' });
      
      // Check responsive CSS
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('repeat(3, 1fr)'); // tablet
      expect(styleTag?.textContent).toContain('repeat(4, 1fr)'); // desktop
    });

    it('should render with custom gap metadata', () => {
      const metadata: LayoutMetadata = {
        gap: 16,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gap: '16px' });
    });

    it('should render with multiple custom metadata properties', () => {
      const metadata: LayoutMetadata = {
        columns: {
          mobile: 1,
          tablet: 2,
          desktop: 4,
        },
        gap: 32,
      };
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gap: '32px' });
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(1, 1fr)' });
    });
  });

  describe('Requirement 5.3: Metadata validation', () => {
    it('should validate undefined metadata as valid', () => {
      expect(strategy.validate(undefined)).toBe(true);
    });

    it('should validate empty metadata as valid', () => {
      expect(strategy.validate({})).toBe(true);
    });

    it('should validate positive column counts', () => {
      expect(strategy.validate({ 
        columns: { mobile: 1, tablet: 2, desktop: 3 }
      })).toBe(true);
      expect(strategy.validate({ 
        columns: { mobile: 2, tablet: 3, desktop: 4 }
      })).toBe(true);
    });

    it('should invalidate zero column count', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ 
        columns: { mobile: 0, tablet: 2, desktop: 3 }
      })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DashboardGridLayout] Invalid columns.mobile: must be a positive integer'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should invalidate negative column count', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ 
        columns: { mobile: 1, tablet: -2, desktop: 3 }
      })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DashboardGridLayout] Invalid columns.tablet: must be a positive integer'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should invalidate non-number column count', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ 
        columns: { mobile: '1' as any, tablet: 2, desktop: 3 }
      })).toBe(false);
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate non-negative gap', () => {
      expect(strategy.validate({ gap: 0 })).toBe(true);
      expect(strategy.validate({ gap: 16 })).toBe(true);
      expect(strategy.validate({ gap: 24 })).toBe(true);
    });

    it('should invalidate negative gap', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ gap: -10 })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DashboardGridLayout] Invalid gap: must be a non-negative number'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should invalidate non-number gap', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ gap: '24' as any })).toBe(false);
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate metadata with other properties', () => {
      expect(strategy.validate({ 
        columns: { mobile: 1, tablet: 2, desktop: 3 },
        gap: 24,
        customProperty: 'value'
      })).toBe(true);
    });
  });

  describe('Default metadata', () => {
    it('should return default metadata values', () => {
      const defaults = strategy.getDefaults();
      
      expect(defaults).toEqual({
        columns: {
          mobile: 1,
          tablet: 2,
          desktop: 3
        },
        gap: 24
      });
    });

    it('should return consistent defaults on multiple calls', () => {
      const defaults1 = strategy.getDefaults();
      const defaults2 = strategy.getDefaults();
      
      expect(defaults1).toEqual(defaults2);
    });

    it('should return defaults with correct types', () => {
      const defaults = strategy.getDefaults();
      
      expect(typeof defaults.gap).toBe('number');
      expect(typeof defaults.columns).toBe('object');
      expect(typeof defaults.columns?.mobile).toBe('number');
      expect(typeof defaults.columns?.tablet).toBe('number');
      expect(typeof defaults.columns?.desktop).toBe('number');
    });
  });

  describe('Requirement 5.5: Mobile sidebar overlay behavior', () => {
    it('should render mobile menu button in TopBar', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // TopBar should have menu button (☰)
      const menuButton = screen.getByRole('button', { name: /☰/i });
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

  describe('Responsive grid behavior', () => {
    it('should apply responsive column configuration', () => {
      const metadata: LayoutMetadata = {
        columns: {
          mobile: 1,
          tablet: 2,
          desktop: 4,
        },
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      // Check that responsive CSS is generated
      const styleTag = container.querySelector('style');
      // Mobile columns are in inline style, not in style tag
      expect(styleTag?.textContent).toContain('repeat(2, 1fr)'); // tablet
      expect(styleTag?.textContent).toContain('repeat(4, 1fr)'); // desktop
      
      // Mobile columns should be in inline style
      const grid = container.querySelector('.grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(1, 1fr)' });
    });

    it('should use grid display', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toContain('grid');
    });
  });
});
