import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../contexts/AppContext.js';
import { AnnotationList } from '../components/AnnotationList.js';
import { FileTypesHandler } from '../../../core/src/adapter/annotations/handlers/file-types-handler.js';
import { MaxFileSizeHandler } from '../../../core/src/adapter/annotations/handlers/max-file-size-handler.js';
import type { FieldNode } from '../types/index.js';

/**
 * Tests to verify that file metadata annotations are properly rendered
 * in the Config GUI for fields with fileMetadata.
 * 
 * This addresses the issue where fields with contentMediaType (but without format: binary)
 * were not showing file metadata annotations in the Config GUI.
 */
describe('File Metadata Annotations Rendering', () => {
  // Mock handler class for x-uigen-label (generic annotation)
  class MockLabelHandler {
    name = 'x-uigen-label';
    
    static metadata = {
      name: 'x-uigen-label',
      description: 'Custom label for the field',
      targetType: 'field' as const,
      parameterSchema: {
        type: 'string' as const
      },
      examples: [
        {
          description: 'Custom label',
          value: 'My Custom Label'
        }
      ]
    };
    
    extract() { return undefined; }
    validate() { return true; }
    apply() {}
  }

  const mockHandlers = [
    new FileTypesHandler(),
    new MaxFileSizeHandler(),
    new MockLabelHandler()
  ] as any[];

  const mockConfig = {
    version: '1.0',
    enabled: {
      'x-uigen-file-types': true,
      'x-uigen-max-file-size': true,
      'x-uigen-label': true
    },
    defaults: {},
    annotations: {}
  };

  const createFileField = (hasFileMetadata: boolean): FieldNode => ({
    type: 'file',
    key: 'recording',
    label: 'Recording',
    required: false,
    path: 'Meetings.POST./api/v1/meetings.requestBody.recording',
    annotations: {},
    fileMetadata: hasFileMetadata ? {
      allowedMimeTypes: ['application/octet-stream'],
      maxSizeBytes: 10485760,
      multiple: false,
      accept: 'application/octet-stream',
      fileType: 'generic'
    } : undefined
  });

  const renderWithContext = (selectedField?: FieldNode) => {
    return render(
      <AppProvider 
        handlers={mockHandlers} 
        specPath="/test/openapi.yaml"
        initialConfig={mockConfig}
      >
        <AnnotationList selectedField={selectedField} />
      </AppProvider>
    );
  };

  describe('File field with fileMetadata', () => {
    it('should show file metadata annotations for file field with fileMetadata', async () => {
      const fileField = createFileField(true);
      renderWithContext(fileField);

      await waitFor(() => {
        // Should show file-specific annotations
        expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
        expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
        
        // Should also show universal annotations
        expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
      });
    });

    it('should display file metadata annotation descriptions', async () => {
      const fileField = createFileField(true);
      renderWithContext(fileField);

      await waitFor(() => {
        expect(screen.getByText(/Array of allowed MIME types/i)).toBeInTheDocument();
        expect(screen.getByText(/Maximum file size in bytes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Non-file field', () => {
    it('should not show file metadata annotations for string field', async () => {
      const stringField: FieldNode = {
        type: 'string',
        key: 'name',
        label: 'Name',
        required: false,
        path: 'User.POST./api/users.requestBody.name',
        annotations: {}
      };

      renderWithContext(stringField);

      await waitFor(() => {
        // Should NOT show file-specific annotations
        expect(screen.queryByText('x-uigen-file-types')).not.toBeInTheDocument();
        expect(screen.queryByText('x-uigen-max-file-size')).not.toBeInTheDocument();
        
        // Should show universal annotations
        expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
      });
    });
  });

  describe('Real-world scenario: contentMediaType field', () => {
    it('should show file metadata annotations for field with contentMediaType', async () => {
      // This simulates the real-world case from meeting-minutes OpenAPI spec
      // where recording field has contentMediaType but no format: binary
      const recordingField: FieldNode = {
        type: 'file', // Type is correctly detected as 'file'
        key: 'recording',
        label: 'Recording',
        required: false,
        path: 'Meetings.POST./api/v1/meetings.requestBody.recording',
        annotations: {},
        fileMetadata: {
          allowedMimeTypes: ['application/octet-stream'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: 'application/octet-stream',
          fileType: 'generic'
        }
      };

      renderWithContext(recordingField);

      await waitFor(() => {
        // Verify file metadata annotations are shown
        expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
        expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
        
        // Verify the field is recognized as a file field
        const fileTypesAnnotation = screen.getByText('x-uigen-file-types');
        expect(fileTypesAnnotation).toBeInTheDocument();
      });
    });
  });
});
