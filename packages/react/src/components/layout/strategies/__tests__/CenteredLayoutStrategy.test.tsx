import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CenteredLayoutStrategy } from '../CenteredLayoutStrategy';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { UIGenApp } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';

// Mock config for testing
const mockConfig: UIGenApp = {
  meta: {
    title: 'Test App',
    version: '1.0.0',
  },
  resources: [],
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

describe('CenteredLayoutStrategy', () => {
  let strategy: CenteredLayoutStrategy;

  beforeEach(() => {
    strategy = new CenteredLayoutStrategy();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Strategy interface', () => {
    it('should have correct type identifier', () => {
      expect(strategy.type).toBe('centered');
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

  describe('Requirement 4.1, 4.2: Rendering with default metadata', () => {
    it('should render centered layout with children', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render header with app title by default', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('should render theme toggle in header by default', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Theme toggle button should be present (look for button with theme-related text or icon)
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      
      // ThemeToggle component should be rendered in the header
      const buttons = header?.querySelectorAll('button');
      expect(buttons && buttons.length > 0).toBe(true);
    });

    it('should render main content area', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render with centered layout structure', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Root container should have min-h-screen and flex
      const root = container.querySelector('.min-h-screen.flex.flex-col');
      expect(root).toBeInTheDocument();
    });

    it('should apply default max width', () => {
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      // Content wrapper should have max-width via CSS variable
      const main = container.querySelector('main');
      expect(main).toHaveStyle({ '--max-width': '480px' });
    });

    it('should apply vertical centering by default', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main?.className).toContain('items-center');
      expect(main?.className).not.toContain('items-start');
    });
  });

  describe('Requirement 4.2, 4.4, 4.5: Rendering with custom metadata', () => {
    it('should render with custom maxWidth metadata', () => {
      const metadata: LayoutMetadata = {
        maxWidth: 600,
      };
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main).toHaveStyle({ '--max-width': '600px' });
    });

    it('should hide header when showHeader is false', () => {
      const metadata: LayoutMetadata = {
        showHeader: false,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const header = container.querySelector('header');
      expect(header).not.toBeInTheDocument();
    });

    it('should show header when showHeader is true', () => {
      const metadata: LayoutMetadata = {
        showHeader: true,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should disable vertical centering when verticalCenter is false', () => {
      const metadata: LayoutMetadata = {
        verticalCenter: false,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main?.className).toContain('items-start');
      expect(main?.className).toContain('pt-16');
    });

    it('should enable vertical centering when verticalCenter is true', () => {
      const metadata: LayoutMetadata = {
        verticalCenter: true,
      };
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main?.className).toContain('items-center');
      expect(main?.className).not.toContain('pt-16');
    });

    it('should render with multiple custom metadata properties', () => {
      const metadata: LayoutMetadata = {
        maxWidth: 500,
        showHeader: false,
        verticalCenter: false,
      };
      const children = <div data-testid="test-content">Test Content</div>;
      const rendered = strategy.render(children, metadata);
      
      const { container } = renderWithContext(rendered);
      
      // Header should be hidden
      const header = container.querySelector('header');
      expect(header).not.toBeInTheDocument();
      
      // Max width should be applied via CSS variable
      const main = container.querySelector('main');
      expect(main).toHaveStyle({ '--max-width': '500px' });
      
      // Vertical centering should be disabled
      const main = container.querySelector('main');
      expect(main?.className).toContain('items-start');
    });
  });

  describe('Requirement 4.3: Metadata validation', () => {
    it('should validate undefined metadata as valid', () => {
      expect(strategy.validate(undefined)).toBe(true);
    });

    it('should validate empty metadata as valid', () => {
      expect(strategy.validate({})).toBe(true);
    });

    it('should validate positive maxWidth', () => {
      expect(strategy.validate({ maxWidth: 400 })).toBe(true);
      expect(strategy.validate({ maxWidth: 600 })).toBe(true);
      expect(strategy.validate({ maxWidth: 1000 })).toBe(true);
    });

    it('should invalidate negative maxWidth', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ maxWidth: -100 })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CenteredLayout] Invalid maxWidth: must be a positive number'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should invalidate non-number maxWidth', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ maxWidth: '480' as any })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CenteredLayout] Invalid maxWidth: must be a positive number'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate zero maxWidth as invalid', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(strategy.validate({ maxWidth: 0 })).toBe(false);
      
      consoleWarnSpy.mockRestore();
    });

    it('should validate metadata with other properties', () => {
      expect(strategy.validate({ 
        maxWidth: 480,
        showHeader: true,
        verticalCenter: false,
        customProperty: 'value'
      })).toBe(true);
    });
  });

  describe('Default metadata', () => {
    it('should return default metadata values', () => {
      const defaults = strategy.getDefaults();
      
      expect(defaults).toEqual({
        maxWidth: 480,
        showHeader: true,
        verticalCenter: true,
      });
    });

    it('should return consistent defaults on multiple calls', () => {
      const defaults1 = strategy.getDefaults();
      const defaults2 = strategy.getDefaults();
      
      expect(defaults1).toEqual(defaults2);
    });

    it('should return defaults with correct types', () => {
      const defaults = strategy.getDefaults();
      
      expect(typeof defaults.maxWidth).toBe('number');
      expect(typeof defaults.showHeader).toBe('boolean');
      expect(typeof defaults.verticalCenter).toBe('boolean');
    });
  });

  describe('Integration with AppContext', () => {
    it('should use config from AppContext', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      renderWithContext(rendered);
      
      // Should render app title from config
      expect(screen.getByText('Test App')).toBeInTheDocument();
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

  describe('Responsive behavior', () => {
    it('should apply responsive padding', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main?.className).toContain('p-4');
    });

    it('should use full width container with max-width constraint', () => {
      const children = <div>Test Content</div>;
      const rendered = strategy.render(children);
      
      const { container } = renderWithContext(rendered);
      
      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveStyle({ '--max-width': '480px' });
    });
  });
});
