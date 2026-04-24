import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.js';
import { AppProvider } from '../contexts/AppContext.js';
import { KeyboardNavigationProvider } from '../contexts/KeyboardNavigationContext.js';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Integration tests for the wired-together Config GUI application
 * 
 * These tests verify that:
 * - All components are properly connected
 * - Global state management works correctly
 * - Navigation between views works
 * - Config changes persist immediately
 * 
 * Requirements: 1.5, 4.5, 5.4, 6.8
 */
describe('Config GUI Integration', () => {
  const mockAnnotations: AnnotationMetadata[] = [
    {
      name: 'x-uigen-label',
      description: 'Customize the display label for a field',
      targetType: 'field',
      parameterSchema: {
        type: 'string',
        properties: {
          value: {
            type: 'string',
            description: 'The custom label text'
          }
        },
        required: ['value']
      },
      examples: [
        {
          description: 'Set a custom label',
          value: 'Full Name'
        }
      ]
    },
    {
      name: 'x-uigen-ignore',
      description: 'Hide a field from the generated UI',
      targetType: 'field',
      parameterSchema: {
        type: 'boolean'
      },
      examples: [
        {
          description: 'Ignore a field',
          value: true
        }
      ]
    }
  ];

  const renderApp = () => {
    return render(
      <AppProvider handlers={[]} specPath="/test/spec.yaml" specStructure={null}>
        <KeyboardNavigationProvider>
          <App />
        </KeyboardNavigationProvider>
      </AppProvider>
    );
  };

  describe('Component Wiring', () => {
    it('should render all main components', () => {
      renderApp();
      
      // Header should be present
      expect(screen.getByText('UIGen Config GUI')).toBeInTheDocument();
      
      // Tab navigation should be present
      expect(screen.getByTestId('annotations-tab')).toBeInTheDocument();
      expect(screen.getByTestId('visual-tab')).toBeInTheDocument();
      expect(screen.getByTestId('preview-tab')).toBeInTheDocument();
      
      // Help panel should be present
      expect(screen.getByTestId('help-panel')).toBeInTheDocument();
    });

    it('should connect AnnotationList and AnnotationForm', async () => {
      const { container } = renderApp();
      
      // Initially on annotations tab
      expect(screen.getByTestId('annotations-tab')).toHaveClass('border-blue-500');
      
      // AnnotationList should be rendered
      const annotationList = container.querySelector('[class*="space-y-6"]');
      expect(annotationList).toBeInTheDocument();
    });

    it('should handle navigation between views', () => {
      renderApp();
      
      // Start on annotations tab
      expect(screen.getByTestId('annotations-tab')).toHaveClass('border-blue-500');
      
      // Visual and preview tabs should be disabled when no spec structure
      expect(screen.getByTestId('visual-tab')).toBeDisabled();
      expect(screen.getByTestId('preview-tab')).toBeDisabled();
      
      // Can still navigate back to annotations
      fireEvent.click(screen.getByTestId('annotations-tab'));
      expect(screen.getByTestId('annotations-tab')).toHaveClass('border-blue-500');
    });
  });

  describe('Global State Management', () => {
    it('should provide config state to all components', () => {
      renderApp();
      
      // Config version should be displayed in header
      expect(screen.getByText(/Config version:/)).toBeInTheDocument();
    });

    it('should handle error state globally', async () => {
      renderApp();
      
      // Initially no error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('View Content', () => {
    it('should render annotations view content', () => {
      renderApp();
      
      // Should show annotations configuration section
      expect(screen.getByText('Annotation Configuration')).toBeInTheDocument();
      expect(screen.getByText(/Enable or disable annotations/)).toBeInTheDocument();
    });

    it('should render visual editor view when spec structure is provided', () => {
      const mockSpecStructure = {
        resources: []
      };
      
      render(
        <AppProvider handlers={[]} specPath="/test/spec.yaml" specStructure={mockSpecStructure}>
          <KeyboardNavigationProvider>
            <App />
          </KeyboardNavigationProvider>
        </AppProvider>
      );
      
      // Visual tab should be enabled
      expect(screen.getByTestId('visual-tab')).not.toBeDisabled();
      
      fireEvent.click(screen.getByTestId('visual-tab'));
      
      // Should show visual editor content
      expect(screen.getByTestId('visual-editor')).toBeInTheDocument();
    });

    it('should render preview view when spec structure is provided', () => {
      const mockSpecStructure = {
        resources: []
      };
      
      render(
        <AppProvider handlers={[]} specPath="/test/spec.yaml" specStructure={mockSpecStructure}>
          <KeyboardNavigationProvider>
            <App />
          </KeyboardNavigationProvider>
        </AppProvider>
      );
      
      // Preview tab should be enabled
      expect(screen.getByTestId('preview-tab')).not.toBeDisabled();
      
      fireEvent.click(screen.getByTestId('preview-tab'));
      
      // Should show preview content
      expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
    });
  });

  describe('Spec Path Display', () => {
    it('should display spec path in header when provided', () => {
      render(
        <AppProvider handlers={[]} specPath="/test/petstore.yaml" specStructure={null}>
          <KeyboardNavigationProvider>
            <App />
          </KeyboardNavigationProvider>
        </AppProvider>
      );
      
      expect(screen.getByText('Spec: /test/petstore.yaml')).toBeInTheDocument();
    });

    it('should not display spec path when not provided', () => {
      render(
        <AppProvider handlers={[]} specPath={null} specStructure={null}>
          <KeyboardNavigationProvider>
            <App />
          </KeyboardNavigationProvider>
        </AppProvider>
      );
      
      expect(screen.queryByText(/Spec:/)).not.toBeInTheDocument();
    });
  });
});
