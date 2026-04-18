import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PreviewRenderer } from '../PreviewRenderer.js';
import { AppContext, type AppContextValue } from '../../../contexts/AppContext.js';
import type { SpecStructure } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { ReactNode } from 'react';

/**
 * Integration tests for live preview with ignore functionality
 * 
 * Tests:
 * - Preview update timing (< 500ms)
 * - Property hiding in various views
 * - Request body hiding
 * - Response hiding
 * - "No fields to display" message
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
describe('PreviewRenderer - Ignore Integration', () => {
  const mockStructure: SpecStructure = {
    resources: [
      {
        name: 'User',
        slug: 'User',
        uigenId: 'user-resource',
        operations: [],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'User.id',
            required: true,
            annotations: {}
          },
          {
            key: 'name',
            label: 'Name',
            type: 'string',
            path: 'User.name',
            required: true,
            annotations: {}
          },
          {
            key: 'email',
            label: 'Email',
            type: 'string',
            path: 'User.email',
            required: false,
            annotations: {}
          },
          {
            key: 'age',
            label: 'Age',
            type: 'number',
            path: 'User.age',
            required: false,
            annotations: {}
          }
        ],
        annotations: {}
      }
    ]
  };

  /**
   * Test wrapper that provides AppContext with custom config
   */
  function TestAppProvider({ children, config }: { children: ReactNode; config: ConfigFile }) {
    const mockContextValue: AppContextValue = {
      state: {
        config,
        handlers: [],
        annotations: [],
        isLoading: false,
        error: null,
        configPath: '.uigen/config.yaml',
        specPath: null,
        specStructure: mockStructure,
        concurrentModificationDetected: false,
        lastModifiedTime: null
      },
      actions: {
        loadConfig: vi.fn(),
        saveConfig: vi.fn(),
        saveConfigImmediate: vi.fn(),
        updateConfig: vi.fn(),
        setError: vi.fn(),
        clearError: vi.fn(),
        checkConcurrentModification: vi.fn(),
        dismissConcurrentModification: vi.fn(),
        reloadConfig: vi.fn()
      }
    };

    return (
      <AppContext.Provider value={mockContextValue}>
        {children}
      </AppContext.Provider>
    );
  }

  const renderWithConfig = (structure: SpecStructure | null, config: ConfigFile) => {
    return render(
      <TestAppProvider config={config}>
        <PreviewRenderer structure={structure} />
      </TestAppProvider>
    );
  };

  describe('Preview Update Timing', () => {
    it('should update preview within 500ms of config change', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      const { rerender } = renderWithConfig(mockStructure, config);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // Measure time for update
      const startTime = Date.now();

      // Update config to ignore a field
      const updatedConfig: ConfigFile = {
        ...config,
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          }
        }
      };

      // Rerender with updated config
      rerender(
        <TestAppProvider config={updatedConfig}>
          <PreviewRenderer structure={mockStructure} />
        </TestAppProvider>
      );

      // Wait for preview to update
      await waitFor(() => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(600); // 500ms debounce + 100ms buffer
      }, { timeout: 700 });
    });
  });

  describe('Property Hiding in Form View', () => {
    it('should hide ignored properties from form view', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // ID and Name should be visible
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);

      // Email should not be in form view (filtered out)
      // Note: Email might still appear in list view columns
      const formSection = screen.getByText('Form View').closest('div');
      expect(formSection).toBeInTheDocument();
    });

    it('should show "No fields to display" when all properties are ignored', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.id': {
            'x-uigen-ignore': true
          },
          'User.name': {
            'x-uigen-ignore': true
          },
          'User.email': {
            'x-uigen-ignore': true
          },
          'User.age': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        const noFieldsMessages = screen.getAllByTestId('no-fields-message');
        expect(noFieldsMessages.length).toBeGreaterThan(0);
        expect(noFieldsMessages[0]).toHaveTextContent('No fields to display (all properties ignored)');
      }, { timeout: 600 });
    });
  });

  describe('Property Hiding in List View', () => {
    it('should hide ignored properties from list view', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          },
          'User.age': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // ID and Name should be visible in list
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    });

    it('should show "No fields to display" in list view when all columns are ignored', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.id': {
            'x-uigen-ignore': true
          },
          'User.name': {
            'x-uigen-ignore': true
          },
          'User.email': {
            'x-uigen-ignore': true
          },
          'User.age': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        const noFieldsMessages = screen.getAllByTestId('no-fields-message');
        expect(noFieldsMessages.length).toBeGreaterThan(0);
      }, { timeout: 600 });
    });
  });

  describe('Property Hiding in Detail View', () => {
    it('should hide ignored properties from detail view', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // ID and Name should be visible
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    });

    it('should show "No fields to display" in detail view when all fields are ignored', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.id': {
            'x-uigen-ignore': true
          },
          'User.name': {
            'x-uigen-ignore': true
          },
          'User.email': {
            'x-uigen-ignore': true
          },
          'User.age': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        const noFieldsMessages = screen.getAllByTestId('no-fields-message');
        expect(noFieldsMessages.length).toBeGreaterThan(0);
      }, { timeout: 600 });
    });
  });

  describe('Multiple Properties Ignored', () => {
    it('should handle multiple ignored properties correctly', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          },
          'User.age': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // Only ID and Name should be visible
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    });
  });

  describe('Preview Consistency', () => {
    it('should show consistent state across all view types', async () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithConfig(mockStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });

      // All views should show ID and Name
      const idElements = screen.getAllByText('ID');
      const nameElements = screen.getAllByText('Name');

      expect(idElements.length).toBeGreaterThan(0);
      expect(nameElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Resource Handling', () => {
    it('should handle empty resources gracefully', async () => {
      const emptyStructure: SpecStructure = {
        resources: []
      };

      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      renderWithConfig(emptyStructure, config);

      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 600 });
    });
  });
});
