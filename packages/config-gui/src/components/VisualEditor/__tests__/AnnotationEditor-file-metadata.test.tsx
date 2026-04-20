import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationEditor } from '../AnnotationEditor.js';
import { AppProvider } from '../../../contexts/AppContext.js';
import type { AnnotationMetadata } from '../../../types/index.js';
import type { AnnotationHandler } from '@uigen-dev/core';

/**
 * Tests for AnnotationEditor with file metadata annotations
 * 
 * Verifies that:
 * - File metadata annotations (x-uigen-file-types, x-uigen-max-file-size) are displayed
 * - Annotations are properly filtered based on field type
 * - Dynamic annotation loading from AppContext works correctly
 */
describe('AnnotationEditor - File Metadata Annotations', () => {
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

  it('should display file metadata annotations in dropdown for file fields', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={null}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
        />
      </AppProvider>
    );

    // Manually set annotations in the context
    const { state } = require('../../../contexts/AppContext.js').useAppContext();
    state.annotations = mockAnnotations;

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
  });

  it('should NOT display file metadata annotations for non-file fields', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={null}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="title"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
        />
      </AppProvider>
    );

    // Manually set annotations in the context
    const { state } = require('../../../contexts/AppContext.js').useAppContext();
    state.annotations = mockAnnotations;

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

  it('should display all annotations including file metadata when no applicableWhen filter', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={null}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
        />
      </AppProvider>
    );

    // Manually set annotations in the context
    const { state } = require('../../../contexts/AppContext.js').useAppContext();
    state.annotations = mockAnnotations;

    // Click the "+ Add" button to open dropdown
    const addButton = screen.getByLabelText('Add annotation');
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search annotations...')).toBeInTheDocument();
    });

    // Count total annotations displayed (should be 4: ignore, label, file-types, max-file-size)
    const annotationButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('Ignore') || 
             btn.textContent?.includes('Label') ||
             btn.textContent?.includes('File Types') ||
             btn.textContent?.includes('Max File Size')
    );
    
    expect(annotationButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('should search and filter file metadata annotations', async () => {
    const onAnnotationsChange = vi.fn();
    
    render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={null}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="recording"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
        />
      </AppProvider>
    );

    // Manually set annotations in the context
    const { state } = require('../../../contexts/AppContext.js').useAppContext();
    state.annotations = mockAnnotations;

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
});
