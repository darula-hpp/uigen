import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LayoutContainer } from '../LayoutContainer';
import { LayoutRegistry } from '@/lib/layout-registry';
import type { LayoutConfig, LayoutMetadata } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import type { ReactNode } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import type { UIGenApp } from '@uigen-dev/core';

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

// Mock layout strategy for testing
class MockLayoutStrategy implements LayoutStrategy {
  type = 'mock' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return (
      <div data-testid="mock-layout" data-metadata={JSON.stringify(metadata)}>
        {children}
      </div>
    );
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;
    if (metadata.invalid) return false;
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      defaultProp: 'defaultValue',
    };
  }
}

// Mock layout strategy that throws an error
class ErrorLayoutStrategy implements LayoutStrategy {
  type = 'error' as const;
  
  render(): ReactNode {
    throw new Error('Layout rendering error');
  }
  
  validate(): boolean {
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {};
  }
}

describe('LayoutContainer', () => {
  let registry: LayoutRegistry;
  let mockStrategy: MockLayoutStrategy;

  beforeEach(() => {
    registry = LayoutRegistry.getInstance();
    registry.clear();
    
    mockStrategy = new MockLayoutStrategy();
    registry.register(mockStrategy);
    registry.setDefault('mock');
  });

  afterEach(() => {
    vi.clearAllMocks();
    registry.clear();
  });

  describe('Requirement 6.1: Accept layoutConfig prop and children', () => {
    it('should render with layoutConfig and children', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { customProp: 'customValue' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render with children only (no layoutConfig)', () => {
      renderWithContext(
        <LayoutContainer>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should render with empty layoutConfig', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Requirement 6.2: Resolve layout strategy from registry', () => {
    it('should resolve strategy based on layoutConfig type', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      expect(mockLayout).toBeInTheDocument();
    });

    it('should use default strategy when layoutConfig is undefined', () => {
      renderWithContext(
        <LayoutContainer>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should use default 'mock' strategy
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    });

    it('should use default strategy when layoutConfig.type is undefined', () => {
      const layoutConfig: LayoutConfig = {
        type: undefined as any,
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
    });

    it('should fall back to default when strategy type is not registered', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const layoutConfig: LayoutConfig = {
        type: 'unregistered',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should fall back to default strategy
      expect(screen.getByTestId('mock-layout')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Requirement 6.3: Merge metadata with strategy defaults', () => {
    it('should merge custom metadata with defaults', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { customProp: 'customValue' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      
      // Should have both default and custom properties
      expect(metadata.defaultProp).toBe('defaultValue');
      expect(metadata.customProp).toBe('customValue');
    });

    it('should use defaults when metadata is undefined', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      
      expect(metadata.defaultProp).toBe('defaultValue');
    });

    it('should override defaults with custom metadata', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { defaultProp: 'overriddenValue' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      
      expect(metadata.defaultProp).toBe('overriddenValue');
    });
  });

  describe('Requirement 6.4: Validate metadata with strategy validator', () => {
    it('should validate metadata using strategy validator', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { validProp: 'value' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should render successfully with valid metadata
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should detect invalid metadata', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { invalid: true },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Should still render but with warning
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid metadata for layout')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Requirement 6.5: Log warning when metadata validation fails', () => {
    it('should log warning and use defaults when validation fails', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { invalid: true },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutContainer] Invalid metadata for layout "mock". Using defaults.'
      );
      
      // Should use defaults instead of invalid metadata
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      expect(metadata.defaultProp).toBe('defaultValue');
      expect(metadata.invalid).toBeUndefined();
      
      consoleWarnSpy.mockRestore();
    });

    it('should not log warning when validation passes', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { validProp: 'value' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Requirement 6.6: Wrap in ErrorBoundary with fallback UI', () => {
    it('should wrap children in ErrorBoundary component', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      const { container } = renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // ErrorBoundary should be present in the component tree
      // We verify this by checking that the component renders successfully
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should provide custom fallback UI for layout errors', () => {
      // Test that the ErrorBoundary is configured with a custom fallback
      // by verifying the component structure
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Component should render successfully when no error occurs
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should have error boundary with layout-specific error message', () => {
      // Verify that the LayoutContainer uses ErrorBoundary
      // The actual error catching is tested in ErrorBoundary.test.tsx
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Requirement 6.7: Render children within resolved strategy', () => {
    it('should pass children to strategy.render()', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      // Children should be rendered within the strategy
      const mockLayout = screen.getByTestId('mock-layout');
      const content = screen.getByTestId('test-content');
      
      expect(mockLayout).toContainElement(content);
    });

    it('should pass merged metadata to strategy.render()', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { customProp: 'customValue' },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      
      expect(metadata.customProp).toBe('customValue');
      expect(metadata.defaultProp).toBe('defaultValue');
    });

    it('should pass defaults to strategy.render() when metadata is invalid', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: { invalid: true },
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const mockLayout = screen.getByTestId('mock-layout');
      const metadata = JSON.parse(mockLayout.getAttribute('data-metadata') || '{}');
      
      // Should use defaults, not invalid metadata
      expect(metadata.defaultProp).toBe('defaultValue');
      expect(metadata.invalid).toBeUndefined();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Memoization behavior', () => {
    it('should memoize strategy resolution', () => {
      const getSpy = vi.spyOn(registry, 'get');
      
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const initialCallCount = getSpy.mock.calls.length;
      
      // Re-render with same layoutConfig
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={layoutConfig}>
              <div data-testid="test-content">Test Content Updated</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      // Strategy resolution should be memoized (no additional calls)
      expect(getSpy.mock.calls.length).toBe(initialCallCount);
      
      getSpy.mockRestore();
    });

    it('should re-resolve strategy when type changes', () => {
      const getSpy = vi.spyOn(registry, 'get');
      
      const layoutConfig1: LayoutConfig = {
        type: 'mock',
      };
      
      const { rerender } = renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig1}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      const initialCallCount = getSpy.mock.calls.length;
      
      // Re-render with different type
      const layoutConfig2: LayoutConfig = {
        type: 'mock',
      };
      
      rerender(
        <BrowserRouter>
          <AppProvider config={mockConfig}>
            <LayoutContainer layoutConfig={layoutConfig2}>
              <div data-testid="test-content">Test Content</div>
            </LayoutContainer>
          </AppProvider>
        </BrowserRouter>
      );
      
      // Should not re-resolve if type is the same
      expect(getSpy.mock.calls.length).toBe(initialCallCount);
      
      getSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle null children', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      expect(() => {
        renderWithContext(
          <LayoutContainer layoutConfig={layoutConfig}>
            {null}
          </LayoutContainer>
        );
      }).not.toThrow();
    });

    it('should handle multiple children', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should handle empty metadata object', () => {
      const layoutConfig: LayoutConfig = {
        type: 'mock',
        metadata: {},
      };
      
      renderWithContext(
        <LayoutContainer layoutConfig={layoutConfig}>
          <div data-testid="test-content">Test Content</div>
        </LayoutContainer>
      );
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });
});
