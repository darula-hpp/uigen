import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationForm } from '../AnnotationForm.js';
import { AppContext } from '../../contexts/AppContext.js';
import type { AnnotationMetadata } from '../../types/index.js';
import type { ConfigFile, AnnotationHandler } from '@uigen-dev/core';

/**
 * Tests for AnnotationForm component
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

// Mock annotation metadata
const mockLabelAnnotation: AnnotationMetadata = {
  name: 'x-uigen-label',
  description: 'Customize field labels in the generated UI',
  targetType: 'field',
  parameterSchema: {
    type: 'string'
  },
  examples: []
};

const mockRefAnnotation: AnnotationMetadata = {
  name: 'x-uigen-ref',
  description: 'Link a field to another resource',
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
  examples: []
};

const mockIgnoreAnnotation: AnnotationMetadata = {
  name: 'x-uigen-ignore',
  description: 'Exclude a field from the generated UI',
  targetType: 'field',
  parameterSchema: {
    type: 'boolean'
  },
  examples: []
};

const mockEnumAnnotation: AnnotationMetadata = {
  name: 'x-uigen-enum',
  description: 'Test enum annotation',
  targetType: 'field',
  parameterSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'enum',
        description: 'Display mode',
        enum: ['dropdown', 'radio', 'checkbox']
      }
    }
  },
  examples: []
};

const mockConfig: ConfigFile = {
  version: '1.0',
  enabled: {},
  defaults: {
    'x-uigen-ref': {
      resource: 'User',
      valueField: 'id',
      labelField: 'name'
    }
  },
  annotations: {}
};

describe('AnnotationForm', () => {
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
    annotation: AnnotationMetadata,
    config: ConfigFile | null = mockConfig
  ) => {
    const mockContextValue = {
      state: {
        config,
        handlers: [] as AnnotationHandler[],
        annotations: [],
        isLoading: false,
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
        <AnnotationForm annotation={annotation} />
      </AppContext.Provider>
    );
  };
  
  describe('Form Generation', () => {
    it('should generate form from parameter schema', () => {
      renderWithMockContext(mockRefAnnotation);
      
      expect(screen.getByText('Default Values for x-uigen-ref')).toBeInTheDocument();
      expect(screen.getByLabelText(/Resource/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Value Field/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Label Field/)).toBeInTheDocument();
    });
    
    it('should show required field indicators', () => {
      renderWithMockContext(mockRefAnnotation);
      
      // All three fields are required
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers).toHaveLength(3);
    });
    
    it('should display field descriptions', () => {
      renderWithMockContext(mockRefAnnotation);
      
      expect(screen.getByText('Target resource name')).toBeInTheDocument();
      expect(screen.getByText('Field to use as value')).toBeInTheDocument();
      expect(screen.getByText('Field to use as label')).toBeInTheDocument();
    });
    
    it('should show message when no configurable parameters', () => {
      const noParamsAnnotation: AnnotationMetadata = {
        name: 'x-uigen-test',
        description: 'Test annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
          properties: {}
        },
        examples: []
      };
      
      renderWithMockContext(noParamsAnnotation);
      expect(screen.getByText('No configurable parameters for this annotation.')).toBeInTheDocument();
    });
  });
  
  describe('Control Types', () => {
    it('should render text input for string parameters', () => {
      renderWithMockContext(mockRefAnnotation);
      
      const resourceInput = screen.getByLabelText(/Resource/);
      expect(resourceInput).toHaveAttribute('type', 'text');
    });
    
    it('should render toggle for boolean parameters', () => {
      renderWithMockContext(mockIgnoreAnnotation);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });
    
    it('should render dropdown for enum parameters', () => {
      renderWithMockContext(mockEnumAnnotation);
      
      const dropdown = screen.getByLabelText(/Mode/);
      expect(dropdown.tagName).toBe('SELECT');
      // ControlFactory capitalizes enum values
      expect(screen.getByText('Dropdown')).toBeInTheDocument();
      expect(screen.getByText('Radio')).toBeInTheDocument();
      expect(screen.getByText('Checkbox')).toBeInTheDocument();
    });
  });
  
  describe('Form Values', () => {
    it('should initialize form with existing defaults from config', () => {
      renderWithMockContext(mockRefAnnotation, mockConfig);
      
      const resourceInput = screen.getByLabelText(/Resource/) as HTMLInputElement;
      const valueFieldInput = screen.getByLabelText(/Value Field/) as HTMLInputElement;
      const labelFieldInput = screen.getByLabelText(/Label Field/) as HTMLInputElement;
      
      expect(resourceInput.value).toBe('User');
      expect(valueFieldInput.value).toBe('id');
      expect(labelFieldInput.value).toBe('name');
    });
    
    it('should initialize with empty values when no defaults exist', () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      const resourceInput = screen.getByLabelText(/Resource/) as HTMLInputElement;
      expect(resourceInput.value).toBe('');
    });
    
    it('should update form values on input change', () => {
      renderWithMockContext(mockRefAnnotation);
      
      const resourceInput = screen.getByLabelText(/Resource/) as HTMLInputElement;
      fireEvent.change(resourceInput, { target: { value: 'Role' } });
      
      expect(resourceInput.value).toBe('Role');
    });
    
    it('should handle toggle changes', () => {
      renderWithMockContext(mockIgnoreAnnotation);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });
  
  describe('Validation', () => {
    it('should validate required fields on submit', async () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Resource is required')).toBeInTheDocument();
        expect(screen.getByText('Value Field is required')).toBeInTheDocument();
        expect(screen.getByText('Label Field is required')).toBeInTheDocument();
      });
      
      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
    
    it('should clear error when field is corrected', async () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      // Submit to trigger validation
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Resource is required')).toBeInTheDocument();
      });
      
      // Fix the error
      const resourceInput = screen.getByLabelText(/Resource/);
      fireEvent.change(resourceInput, { target: { value: 'User' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Resource is required')).not.toBeInTheDocument();
      });
    });
    
    it('should show inline error messages', async () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/is required/);
        expect(errorMessages.length).toBeGreaterThan(0);
        
        // Check that error styling is applied
        const resourceInput = screen.getByLabelText(/Resource/);
        expect(resourceInput).toHaveClass('border-red-500');
      });
    });
  });
  
  describe('Form Submission', () => {
    it('should save defaults to config file on submit', async () => {
      mockSaveConfig.mockResolvedValueOnce(undefined);
      
      renderWithMockContext(mockRefAnnotation, mockConfig);
      
      // Change a value
      const resourceInput = screen.getByLabelText(/Resource/);
      fireEvent.change(resourceInput, { target: { value: 'Role' } });
      
      // Submit form
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledWith({
          ...mockConfig,
          defaults: {
            ...mockConfig.defaults,
            'x-uigen-ref': {
              resource: 'Role',
              valueField: 'id',
              labelField: 'name'
            }
          }
        });
      });
    });
    
    it('should not submit when validation fails', async () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Resource is required')).toBeInTheDocument();
      });
      
      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
    
    it('should show submitting state during save', async () => {
      mockSaveConfig.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithMockContext(mockRefAnnotation, mockConfig);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Save Defaults')).toBeInTheDocument();
      });
    });
    
    it('should handle save errors gracefully', async () => {
      mockSaveConfig.mockRejectedValueOnce(new Error('Failed to save'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithMockContext(mockRefAnnotation, mockConfig);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save defaults:', expect.any(Error));
        expect(mockSetError).toHaveBeenCalledWith('Failed to save default values');
      });
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should not submit when config is null', async () => {
      renderWithMockContext(mockRefAnnotation, null);
      
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveConfig).not.toHaveBeenCalled();
      });
    });
  });
  
  describe('Reset Functionality', () => {
    it('should reset form to config defaults', async () => {
      renderWithMockContext(mockRefAnnotation, mockConfig);
      
      // Change a value
      const resourceInput = screen.getByLabelText(/Resource/) as HTMLInputElement;
      fireEvent.change(resourceInput, { target: { value: 'Role' } });
      expect(resourceInput.value).toBe('Role');
      
      // Reset form
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(resourceInput.value).toBe('User');
      });
    });
    
    it('should clear validation errors on reset', async () => {
      const emptyConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      renderWithMockContext(mockRefAnnotation, emptyConfig);
      
      // Submit to trigger validation
      const submitButton = screen.getByText('Save Defaults');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Resource is required')).toBeInTheDocument();
      });
      
      // Reset form
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Resource is required')).not.toBeInTheDocument();
      });
    });
  });
});
