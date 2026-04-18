import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationList } from '../AnnotationList.js';
import { AppProvider, AppContext } from '../../contexts/AppContext.js';
import type { AnnotationMetadata } from '../../types/index.js';
import type { ConfigFile, AnnotationHandler } from '@uigen-dev/core';
import React from 'react';

/**
 * Tests for AnnotationList component
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 3.5
 */

// Mock annotation metadata
const mockAnnotations: AnnotationMetadata[] = [
  {
    name: 'x-uigen-label',
    description: 'Customize field labels in the generated UI',
    targetType: 'field',
    parameterSchema: {
      type: 'string'
    },
    examples: [
      {
        description: 'Set custom label for email field',
        value: 'Email Address'
      }
    ]
  },
  {
    name: 'x-uigen-ref',
    description: 'Link a field to another resource for select/autocomplete widgets',
    targetType: 'field',
    parameterSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Target resource name' },
        valueField: { type: 'string', description: 'Field to use as value' },
        labelField: { type: 'string', description: 'Field to use as label' }
      },
      required: ['resource', 'valueField', 'labelField']
    },
    examples: [
      {
        description: 'Link user role to Role resource',
        value: { resource: 'Role', valueField: 'id', labelField: 'name' }
      }
    ]
  },
  {
    name: 'x-uigen-login',
    description: 'Mark an operation as the login endpoint',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Mark POST /auth/login as login operation',
        value: true
      }
    ]
  },
  {
    name: 'x-uigen-ignore',
    description: 'Exclude a field or resource from the generated UI',
    targetType: 'resource',
    parameterSchema: {
      type: 'boolean'
    },
    examples: []
  }
];

const mockConfig: ConfigFile = {
  version: '1.0',
  enabled: {
    'x-uigen-label': true,
    'x-uigen-ref': true,
    'x-uigen-login': false,
    'x-uigen-ignore': true
  },
  defaults: {},
  annotations: {}
};

describe('AnnotationList', () => {
  const mockSaveConfig = vi.fn();
  const mockLoadConfig = vi.fn();
  const mockUpdateConfig = vi.fn();
  const mockSetError = vi.fn();
  const mockClearError = vi.fn();
  
  beforeEach(() => {
    mockSaveConfig.mockClear();
    mockLoadConfig.mockClear();
    mockUpdateConfig.mockClear();
    mockSetError.mockClear();
    mockClearError.mockClear();
  });
  
  const renderWithMockContext = (
    annotations: AnnotationMetadata[] = [],
    config: ConfigFile | null = mockConfig,
    isLoading = false
  ) => {
    const mockContextValue = {
      state: {
        config,
        handlers: [] as AnnotationHandler[],
        annotations,
        isLoading,
        error: null,
        configPath: '.uigen/config.yaml'
      },
      actions: {
        loadConfig: mockLoadConfig,
        saveConfig: mockSaveConfig,
        updateConfig: mockUpdateConfig,
        setError: mockSetError,
        clearError: mockClearError
      }
    };
    
    return render(
      <AppContext.Provider value={mockContextValue}>
        <AnnotationList />
      </AppContext.Provider>
    );
  };
  
  it('should display loading state when loading', () => {
    renderWithMockContext([], null, true);
    expect(screen.getByText('Loading annotations...')).toBeInTheDocument();
  });
  
  it('should display message when no annotations are registered', () => {
    renderWithMockContext([], mockConfig, false);
    expect(screen.getByText('No annotations registered')).toBeInTheDocument();
  });
  
  it('should group annotations by target type', () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    expect(screen.getByText('Field-Level Annotations')).toBeInTheDocument();
    expect(screen.getByText('Operation-Level Annotations')).toBeInTheDocument();
    expect(screen.getByText('Resource-Level Annotations')).toBeInTheDocument();
  });
  
  it('should display annotation name and description', () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    expect(screen.getByText('Customize field labels in the generated UI')).toBeInTheDocument();
    expect(screen.getByText('x-uigen-ref')).toBeInTheDocument();
    expect(screen.getByText('Link a field to another resource for select/autocomplete widgets')).toBeInTheDocument();
  });
  
  it('should show enabled/disabled status badge', () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    // x-uigen-label is enabled
    const labelSection = screen.getByText('x-uigen-label').closest('div');
    expect(labelSection).toHaveTextContent('Enabled');
    
    // x-uigen-login is disabled
    const loginSection = screen.getByText('x-uigen-login').closest('div');
    expect(loginSection).toHaveTextContent('Disabled');
  });
  
  it('should toggle annotation enable/disable state', async () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    // Find the toggle for x-uigen-label (currently enabled)
    const toggles = screen.getAllByRole('switch');
    const labelToggle = toggles[0]; // First field-level annotation
    
    // Click to disable
    fireEvent.click(labelToggle);
    
    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        enabled: {
          ...mockConfig.enabled,
          'x-uigen-label': false
        }
      });
    });
  });
  
  it('should persist state immediately on toggle', async () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]);
    
    // Should call saveConfig immediately
    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalled();
    });
  });
  
  it('should show/hide examples when clicked', async () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    // Find all "Show examples" buttons
    const showExamplesButtons = screen.getAllByText(/Show examples \(1\)/);
    expect(showExamplesButtons.length).toBeGreaterThan(0);
    
    // Click the first one (x-uigen-label)
    fireEvent.click(showExamplesButtons[0]);
    
    // Example should now be visible
    await waitFor(() => {
      expect(screen.getByText('Set custom label for email field')).toBeInTheDocument();
    });
    
    // Click to hide examples
    const hideExamplesButton = screen.getByText(/Hide examples/);
    fireEvent.click(hideExamplesButton);
    
    // Example should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Set custom label for email field')).not.toBeInTheDocument();
    });
  });
  
  it('should display example descriptions and values', async () => {
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    // Show examples for x-uigen-ref
    const showExamplesButtons = screen.getAllByText(/Show examples/);
    fireEvent.click(showExamplesButtons[1]); // x-uigen-ref
    
    await waitFor(() => {
      expect(screen.getByText('Link user role to Role resource')).toBeInTheDocument();
      expect(screen.getByText(/"resource": "Role"/)).toBeInTheDocument();
    });
  });
  
  it('should handle toggle errors gracefully', async () => {
    mockSaveConfig.mockRejectedValueOnce(new Error('Failed to save'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithMockContext(mockAnnotations, mockConfig, false);
    
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]);
    
    await waitFor(() => {
      expect(mockSaveConfig).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save config:', expect.any(Error));
    });
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should not toggle when config is null', async () => {
    renderWithMockContext(mockAnnotations, null, false);
    
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]);
    
    // Should not call saveConfig when config is null
    await waitFor(() => {
      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
  });
});
