import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotationList } from '../components/AnnotationList.js';
import { AppProvider } from '../contexts/AppContext.js';
import { FileTypesHandler } from '../../../core/src/adapter/annotations/handlers/file-types-handler.js';
import { MaxFileSizeHandler } from '../../../core/src/adapter/annotations/handlers/max-file-size-handler.js';
import type { FieldNode } from '../types/index.js';

/**
 * Tests for contentMediaType detection in Config GUI
 * 
 * Verifies that fields with contentMediaType (without format: binary) 
 * are correctly detected as file fields and show file metadata annotations.
 * 
 * This addresses the bug where fields like:
 * {
 *   type: 'string',
 *   contentMediaType: 'application/octet-stream'
 * }
 * 
 * Were being detected as 'string' instead of 'file'.
 */
describe('contentMediaType Detection in Config GUI', () => {
  // Mock handler class for x-uigen-label (generic annotation)
  class MockLabelHandler {
    name = 'x-uigen-label';
    
    static metadata = {
      name: 'x-uigen-label',
      description: 'Customize the display label for a field',
      targetType: 'field' as const,
      parameterSchema: {
        type: 'string' as const,
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

  const renderAnnotationList = (selectedField?: FieldNode) => {
    return render(
      <AppProvider 
        handlers={mockHandlers} 
        specPath="/test/openapi.yaml" 
        specStructure={null}
      >
        <AnnotationList selectedField={selectedField} />
      </AppProvider>
    );
  };

  describe('Fields with contentMediaType should be detected as file type', () => {
    it('should show file annotations for field with contentMediaType: application/octet-stream', () => {
      // This is the exact case from the meeting-minutes OpenAPI spec
      const fileFieldWithContentMediaType: FieldNode = {
        key: 'recording',
        label: 'Recording',
        type: 'file', // Should be detected as 'file' by type-mapping-visitor
        path: 'Meeting.recording',
        required: false,
        // Note: No format: 'binary', only contentMediaType
        fileMetadata: {
          allowedMimeTypes: ['application/octet-stream'],
          maxSizeBytes: 100 * 1024 * 1024,
          multiple: false,
          accept: 'application/octet-stream',
          fileType: 'generic'
        },
        annotations: {}
      };
      
      renderAnnotationList(fileFieldWithContentMediaType);
      
      // File-specific annotations MUST be visible
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
      
      // Generic annotation should also be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });

    it('should show file annotations for field with contentMediaType: image/png', () => {
      const imageField: FieldNode = {
        key: 'avatar',
        label: 'Avatar',
        type: 'file',
        path: 'User.avatar',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['image/png'],
          maxSizeBytes: 5 * 1024 * 1024,
          multiple: false,
          accept: 'image/png',
          fileType: 'image'
        },
        annotations: {}
      };
      
      renderAnnotationList(imageField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should show file annotations for field with contentMediaType: application/pdf', () => {
      const pdfField: FieldNode = {
        key: 'document',
        label: 'Document',
        type: 'file',
        path: 'Upload.document',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 10 * 1024 * 1024,
          multiple: false,
          accept: 'application/pdf',
          fileType: 'document'
        },
        annotations: {}
      };
      
      renderAnnotationList(pdfField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should show file annotations for field with contentMediaType: video/mp4', () => {
      const videoField: FieldNode = {
        key: 'video',
        label: 'Video',
        type: 'file',
        path: 'Media.video',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['video/mp4'],
          maxSizeBytes: 100 * 1024 * 1024,
          multiple: false,
          accept: 'video/mp4',
          fileType: 'video'
        },
        annotations: {}
      };
      
      renderAnnotationList(videoField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should show file annotations for field with contentMediaType: audio/mpeg', () => {
      const audioField: FieldNode = {
        key: 'audio',
        label: 'Audio',
        type: 'file',
        path: 'Media.audio',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['audio/mpeg'],
          maxSizeBytes: 50 * 1024 * 1024,
          multiple: false,
          accept: 'audio/mpeg',
          fileType: 'audio'
        },
        annotations: {}
      };
      
      renderAnnotationList(audioField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });
  });

  describe('Comparison: file fields vs string fields', () => {
    it('should show file annotations for file field but not for string field', () => {
      const fileField: FieldNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        path: 'Upload.file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['*/*'],
          maxSizeBytes: 10 * 1024 * 1024,
          multiple: false,
          accept: '*/*',
          fileType: 'generic'
        },
        annotations: {}
      };

      const stringField: FieldNode = {
        key: 'name',
        label: 'Name',
        type: 'string',
        path: 'User.name',
        required: true,
        annotations: {}
      };

      // Test file field
      const { rerender } = renderAnnotationList(fileField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();

      // Test string field
      rerender(
        <AppProvider 
          handlers={mockHandlers} 
          specPath="/test/openapi.yaml" 
          specStructure={null}
        >
          <AnnotationList selectedField={stringField} />
        </AppProvider>
      );

      // File annotations should NOT be visible for string field
      expect(screen.queryByText('x-uigen-file-types')).not.toBeInTheDocument();
      expect(screen.queryByText('x-uigen-max-file-size')).not.toBeInTheDocument();
      
      // Generic annotation should still be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });
  });

  describe('Real-world OpenAPI spec scenarios', () => {
    it('should handle meeting-minutes recording field (contentMediaType without format)', () => {
      // This mimics the exact structure from examples/apps/fastapi/meeting-minutes/openapi.yaml
      // Body_create_meeting_api_v1_meetings_post.recording field
      const recordingField: FieldNode = {
        key: 'recording',
        label: 'Recording',
        type: 'file', // Detected by type-mapping-visitor from contentMediaType
        path: 'Body_create_meeting_api_v1_meetings_post.recording',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['application/octet-stream'],
          maxSizeBytes: 100 * 1024 * 1024,
          multiple: false,
          accept: 'application/octet-stream',
          fileType: 'generic'
        },
        annotations: {}
      };
      
      renderAnnotationList(recordingField);
      
      // CRITICAL: These annotations MUST be visible
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should handle meeting-minutes template file field (contentMediaType without format)', () => {
      // This mimics Body_upload_template_api_v1_templates_post.file field
      const templateFileField: FieldNode = {
        key: 'file',
        label: 'File',
        type: 'file', // Detected by type-mapping-visitor from contentMediaType
        path: 'Body_upload_template_api_v1_templates_post.file',
        required: true,
        fileMetadata: {
          allowedMimeTypes: ['application/octet-stream'],
          maxSizeBytes: 50 * 1024 * 1024,
          multiple: false,
          accept: 'application/octet-stream',
          fileType: 'generic'
        },
        annotations: {}
      };
      
      renderAnnotationList(templateFileField);
      
      // CRITICAL: These annotations MUST be visible
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle field with both format: binary and contentMediaType', () => {
      const fieldWithBoth: FieldNode = {
        key: 'data',
        label: 'Data',
        type: 'file',
        path: 'Upload.data',
        required: false,
        format: 'binary',
        fileMetadata: {
          allowedMimeTypes: ['application/octet-stream'],
          maxSizeBytes: 10 * 1024 * 1024,
          multiple: false,
          accept: 'application/octet-stream',
          fileType: 'generic'
        },
        annotations: {}
      };
      
      renderAnnotationList(fieldWithBoth);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should handle field with format: binary but no contentMediaType', () => {
      const binaryField: FieldNode = {
        key: 'binary',
        label: 'Binary',
        type: 'file',
        path: 'Upload.binary',
        required: false,
        format: 'binary',
        fileMetadata: {
          allowedMimeTypes: ['*/*'],
          maxSizeBytes: 10 * 1024 * 1024,
          multiple: false,
          accept: '*/*',
          fileType: 'generic'
        },
        annotations: {}
      };
      
      renderAnnotationList(binaryField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });
  });
});
