import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../contexts/AppContext.js';
import { VisualEditor } from '../components/VisualEditor/VisualEditor.js';
import type { SpecStructure, AnnotationMetadata } from '../types/index.js';
import type { AnnotationHandler } from '@uigen-dev/core';

/**
 * Integration test for file metadata annotations in Visual Editor
 * 
 * Verifies the complete flow:
 * 1. File fields are correctly detected
 * 2. File metadata annotations are available in the dropdown
 * 3. Annotations are properly filtered based on field type
 * 4. Non-file fields don't show file metadata annotations
 */
describe('Visual Editor - File Metadata Integration', () => {
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

  const mockSpecStructure: SpecStructure = {
    resources: [
      {
        slug: 'meeting',
        name: 'Meeting',
        description: 'Meeting resource',
        operations: [],
        fields: [
          {
            path: 'meeting.title',
            key: 'title',
            label: 'Title',
            type: 'string',
            required: true,
            children: []
          },
          {
            path: 'meeting.recording',
            key: 'recording',
            label: 'Recording',
            type: 'file',
            format: undefined,
            required: false,
            children: []
          }
        ]
      }
    ]
  };

  const mockHandlers: AnnotationHandler[] = [];

  it('should show file metadata annotations for file fields', async () => {
    const { container } = render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={mockSpecStructure}
        handlers={mockHandlers}
      >
        <VisualEditor structure={mockSpecStructure} />
      </AppProvider>
    );

    // Manually inject annotations into context
    const appContext = require('../contexts/AppContext.js');
    const originalUseAppContext = appContext.useAppContext;
    appContext.useAppContext = () => ({
      state: {
        config: { version: '1.0', enabled: {}, defaults: {}, annotations: {} },
        handlers: mockHandlers,
        annotations: mockAnnotations,
        isLoading: false,
        error: null,
        configPath: '.uigen/config.yaml',
        specPath: 'test.yaml',
        specStructure: mockSpecStructure
      },
      actions: {
        loadConfig: async () => {},
        saveConfig: async () => {},
        saveConfigImmediate: async () => {},
        updateConfig: () => {},
        setError: () => {},
        clearError: () => {}
      }
    });

    // Find the recording field row
    const recordingField = screen.getByText('Recording').closest('[data-testid="schema-property-row"]');
    expect(recordingField).toBeInTheDocument();

    // Find the "+ Add" button for the recording field
    const addButton = recordingField?.querySelector('[aria-label="Add annotation"]') as HTMLButtonElement;
    expect(addButton).toBeInTheDocument();

    // Click to open dropdown
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

    // Restore original useAppContext
    appContext.useAppContext = originalUseAppContext;
  });

  it('should NOT show file metadata annotations for string fields', async () => {
    const { container } = render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={mockSpecStructure}
        handlers={mockHandlers}
      >
        <VisualEditor structure={mockSpecStructure} />
      </AppProvider>
    );

    // Manually inject annotations into context
    const appContext = require('../contexts/AppContext.js');
    const originalUseAppContext = appContext.useAppContext;
    appContext.useAppContext = () => ({
      state: {
        config: { version: '1.0', enabled: {}, defaults: {}, annotations: {} },
        handlers: mockHandlers,
        annotations: mockAnnotations,
        isLoading: false,
        error: null,
        configPath: '.uigen/config.yaml',
        specPath: 'test.yaml',
        specStructure: mockSpecStructure
      },
      actions: {
        loadConfig: async () => {},
        saveConfig: async () => {},
        saveConfigImmediate: async () => {},
        updateConfig: () => {},
        setError: () => {},
        clearError: () => {}
      }
    });

    // Find the title field row (string type)
    const titleField = screen.getByText('Title').closest('[data-testid="schema-property-row"]');
    expect(titleField).toBeInTheDocument();

    // Find the "+ Add" button for the title field
    const addButton = titleField?.querySelector('[aria-label="Add annotation"]') as HTMLButtonElement;
    expect(addButton).toBeInTheDocument();

    // Click to open dropdown
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

    // Restore original useAppContext
    appContext.useAppContext = originalUseAppContext;
  });

  it('should display correct field types in the UI', () => {
    render(
      <AppProvider
        configPath=".uigen/config.yaml"
        specPath="test.yaml"
        specStructure={mockSpecStructure}
        handlers={mockHandlers}
      >
        <VisualEditor structure={mockSpecStructure} />
      </AppProvider>
    );

    // Find the recording field and verify it shows type "file"
    const recordingField = screen.getByText('Recording').closest('[data-testid="schema-property-row"]');
    expect(recordingField).toBeInTheDocument();
    expect(recordingField?.textContent).toContain('file');

    // Find the title field and verify it shows type "string"
    const titleField = screen.getByText('Title').closest('[data-testid="schema-property-row"]');
    expect(titleField).toBeInTheDocument();
    expect(titleField?.textContent).toContain('string');
  });
});
