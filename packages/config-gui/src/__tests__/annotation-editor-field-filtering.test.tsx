import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationEditor } from '../components/VisualEditor/AnnotationEditor.js';
import { AppContext } from '../contexts/AppContext.js';
import type { AnnotationMetadata } from '../types/index.js';
import type { AnnotationHandler } from '@uigen-dev/core';

/**
 * Tests for AnnotationEditor field type filtering
 * 
 * Verifies that:
 * - File metadata annotations are shown for file fields
 * - File metadata annotations are hidden for non-file fields
 * - Filtering works correctly based on applicableWhen rules
 */
describe('AnnotationEditor - Field Type Filtering', () => {
  const mockAnnotations: AnnotationMetadata[] = [
    {
      name: 'x-uigen-ignore',
      description: 'Exclude from generated UI',
      targetType: 'field',
      parameterSchema: { type: 'boolean' },
      examples: []
    },
    {
      name: 'x-uigen-label',
      description: 'Override display label',
      targetType: 'field',
      parameterSchema: { type: 'string' },
      examples: []
    },
    {
      name: 'x-uigen-file-types',
      description: 'Array of allowed MIME types for file uploads',
      targetType: 'field',
      parameterSchema: {
        type: 'object',
        properties: {
          types: {
            type: 'array',
            description: 'Array of MIME types'
          }
        }
      },
      examples: [],
      applicableWhen: {
        type: 'file'
      }
    },
    {
      name: 'x-uigen-max-file-size',
      description: 'Maximum file size in bytes',
      targetType: 'field',
      parameterSchema: {
        type: 'object',
        properties: {
          maxSize: {
            type: 'number',
            description: 'Maximum size in bytes'
          }
        }
      },
      examples: [],
      applicableWhen: {
        type: 'file'
      }
    }
  ];

  const mockHandlers: AnnotationHandler[] = [];

  // Helper to create a test wrapper with mocked annotations
  const TestWrapper = ({ children, annotations = mockAnnotations }: { children: React.ReactNode; annotations?: AnnotationMetadata[] }) => {
    const mockState = {
      config: { version: '1.0', enabled: {}, defaults: {}, annotations: {} },
      handlers: mockHandlers,
      annotations: annotations,
      isLoading: false,
      error: null,
      configPath: '.uigen/config.yaml',
      specPath: 'test.yaml',
      specStructure: null
    };

    const mockActions = {
      loadConfig: async () => {},
      saveConfig: async () => {},
      saveConfigImmediate: async () => {},
      updateConfig: () => {},
      setError: () => {},
      clearError: () => {}
    };

    return (
      <AppContext.Provider value={{ state: mockState, actions: mockActions }}>
        {children}
      </AppContext.Provider>
    );
  };

  it('should show file metadata annotations for file fields', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <TestWrapper>
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'file' }}
        />
      </TestWrapper>
    );

    // Click the "+ Add" button to open dropdown
    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Verify file metadata annotations are present
    expect(screen.getByText('File Types')).toBeInTheDocument();
    expect(screen.getByText('Array of allowed MIME types for file uploads')).toBeInTheDocument();
    expect(screen.getByText('Max File Size')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size in bytes')).toBeInTheDocument();
    
    // General annotations should also be present
    expect(screen.getByText('Ignore')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('should NOT show file metadata annotations for string fields', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <TestWrapper>
        <AnnotationEditor
          elementPath="title"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'string' }}
        />
      </TestWrapper>
    );

    // Click the "+ Add" button to open dropdown
    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Verify file metadata annotations are NOT present
    expect(screen.queryByText('File Types')).not.toBeInTheDocument();
    expect(screen.queryByText('Max File Size')).not.toBeInTheDocument();
    
    // But general annotations should be present
    expect(screen.getByText('Ignore')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('should show all annotations when fieldInfo is not provided', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <TestWrapper>
        <AnnotationEditor
          elementPath="someField"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
        />
      </TestWrapper>
    );

    // Click the "+ Add" button to open dropdown
    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // When fieldInfo is not provided, all annotations should be shown
    expect(screen.getByText('Ignore')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('File Types')).toBeInTheDocument();
    expect(screen.getByText('Max File Size')).toBeInTheDocument();
  });

  it('should filter annotations by search query', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <TestWrapper>
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'file' }}
        />
      </TestWrapper>
    );

    // Click the "+ Add" button to open dropdown
    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Search for "file"
    const searchInput = screen.getByPlaceholderText('Search annotations...');
    fireEvent.change(searchInput, { target: { value: 'file' } });

    // Should show file-related annotations
    await waitFor(() => {
      expect(screen.getByText('File Types')).toBeInTheDocument();
      expect(screen.getByText('Max File Size')).toBeInTheDocument();
    });

    // Should NOT show non-file annotations
    expect(screen.queryByText('Ignore')).not.toBeInTheDocument();
    expect(screen.queryByText('Label')).not.toBeInTheDocument();
  });

  it('should respect both type and format in applicableWhen', async () => {
    const annotationsWithFormat: AnnotationMetadata[] = [
      ...mockAnnotations,
      {
        name: 'x-uigen-binary-encoding',
        description: 'Binary encoding format',
        targetType: 'field',
        parameterSchema: { type: 'string' },
        examples: [],
        applicableWhen: {
          type: 'file',
          format: 'binary'
        }
      }
    ];

    const onAnnotationsChange = vi.fn();
    
    // Test with file type but no format
    const { unmount } = render(
      <TestWrapper annotations={annotationsWithFormat}>
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'file' }}
        />
      </TestWrapper>
    );

    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Binary encoding should NOT be shown (format doesn't match)
    expect(screen.queryByText('Binary Encoding')).not.toBeInTheDocument();
    
    // But other file annotations should be shown
    expect(screen.getByText('File Types')).toBeInTheDocument();
    expect(screen.getByText('Max File Size')).toBeInTheDocument();

    // Unmount and remount with different props
    unmount();

    // Now test with file type AND binary format
    render(
      <TestWrapper annotations={annotationsWithFormat}>
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'file', format: 'binary' }}
        />
      </TestWrapper>
    );

    const addButton2 = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton2);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Now binary encoding SHOULD be shown
    expect(screen.getByText('Binary Encoding')).toBeInTheDocument();
    expect(screen.getByText('File Types')).toBeInTheDocument();
    expect(screen.getByText('Max File Size')).toBeInTheDocument();
  });
});
