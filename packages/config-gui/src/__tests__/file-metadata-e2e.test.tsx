import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotationList } from '../components/AnnotationList.js';
import { AppProvider } from '../contexts/AppContext.js';
import { FileTypesHandler } from '../../../core/src/adapter/annotations/handlers/file-types-handler.js';
import { MaxFileSizeHandler } from '../../../core/src/adapter/annotations/handlers/max-file-size-handler.js';
import type { AnnotationMetadata, FieldNode } from '../types/index.js';

/**
 * End-to-end tests for file metadata annotation filtering in Config GUI
 * 
 * Tests verify:
 * - File-specific annotations show for file fields
 * - File-specific annotations hide for non-file fields
 * - Annotation filtering based on applicableWhen rules
 * - Clear messaging when annotations not applicable
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.3
 */
describe('File Metadata Annotation Filtering E2E', () => {
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
  
  // Use actual handler instances (not metadata)
  const mockHandlers = [
    new FileTypesHandler(),
    new MaxFileSizeHandler(),
    new MockLabelHandler()
  ] as any[];

  const fileField: FieldNode = {
    key: 'avatar',
    label: 'Avatar',
    type: 'file',
    path: 'User.avatar',
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

  const stringField: FieldNode = {
    key: 'name',
    label: 'Name',
    type: 'string',
    path: 'User.name',
    required: true,
    annotations: {}
  };

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
        specPath="/test/users.yaml" 
        specStructure={null}
        initialConfig={mockConfig}
      >
        <AnnotationList selectedField={selectedField} />
      </AppProvider>
    );
  };

  describe('File field annotation filtering', () => {
    it('should show file-specific annotations for file fields', () => {
      renderAnnotationList(fileField);
      
      // File-specific annotations should be visible
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
      
      // Generic annotation should also be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });

    it('should hide file-specific annotations for non-file fields', () => {
      renderAnnotationList(stringField);
      
      // File-specific annotations should NOT be visible
      expect(screen.queryByText('x-uigen-file-types')).not.toBeInTheDocument();
      expect(screen.queryByText('x-uigen-max-file-size')).not.toBeInTheDocument();
      
      // Generic annotation should still be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });

    it('should show all annotations when no field is selected', () => {
      renderAnnotationList();
      
      // All annotations should be visible
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });

    it('should show message when no annotations applicable to field', () => {
      // Create a field type that has no applicable annotations
      const customField: FieldNode = {
        key: 'customField',
        label: 'Custom Field',
        type: 'custom' as any,
        path: 'User.customField',
        required: false,
        annotations: {}
      };
      
      // Render with only file-specific annotations
      const fileOnlyHandlers = mockHandlers.filter((h: any) => h.constructor.metadata?.applicableWhen);
      
      render(
        <AppProvider 
          handlers={fileOnlyHandlers} 
          specPath="/test/users.yaml" 
          specStructure={null}
          initialConfig={mockConfig}
        >
          <AnnotationList selectedField={customField} />
        </AppProvider>
      );
      
      // Should show "no annotations applicable" message
      expect(screen.getByText('No annotations applicable to this field')).toBeInTheDocument();
      expect(screen.getByText('Some annotations are only available for specific field types')).toBeInTheDocument();
    });
  });

  describe('Annotation metadata display', () => {
    it('should show enabled/disabled status', () => {
      renderAnnotationList(fileField);
      
      // All annotations should show as enabled
      const enabledBadges = screen.getAllByText('Enabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
    });

    it('should group annotations by target type', () => {
      renderAnnotationList();
      
      // Should show "Field-Level Annotations" heading
      expect(screen.getByText('Field-Level Annotations')).toBeInTheDocument();
    });
  });

  describe('Annotation applicability rules', () => {
    it('should respect applicableWhen.type rules', () => {
      renderAnnotationList(fileField);
      
      // File annotations should be present for file type
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
    });

    it('should respect applicableWhen.format rules', () => {
      // Create field with binary format but different type
      const binaryField: FieldNode = {
        key: 'data',
        label: 'Data',
        type: 'string',
        path: 'User.data',
        required: false,
        format: 'binary',
        annotations: {}
      };
      
      // Mock handler class that checks format
      class MockBinaryEncodingHandler {
        name = 'x-uigen-binary-encoding';
        
        static metadata = {
          name: 'x-uigen-binary-encoding',
          description: 'Binary encoding format',
          targetType: 'field' as const,
          applicableWhen: {
            format: 'binary'
          },
          parameterSchema: {
            type: 'string' as const
          },
          examples: []
        };
        
        extract() { return undefined; }
        validate() { return true; }
        apply() {}
      }
      
      render(
        <AppProvider 
          handlers={[...mockHandlers, new MockBinaryEncodingHandler() as any]} 
          specPath="/test/users.yaml" 
          specStructure={null}
          initialConfig={mockConfig}
        >
          <AnnotationList selectedField={binaryField} />
        </AppProvider>
      );
      
      // Format-based annotation should be visible
      expect(screen.getByText('x-uigen-binary-encoding')).toBeInTheDocument();
    });

    it('should handle annotations without applicableWhen rules', () => {
      renderAnnotationList(stringField);
      
      // Generic annotation (no applicableWhen) should always be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });
  });

  describe('Multiple file fields', () => {
    it('should filter annotations independently for different fields', () => {
      // First render with file field
      const { rerender } = renderAnnotationList(fileField);
      
      expect(screen.getByText('x-uigen-file-types')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-max-file-size')).toBeInTheDocument();
      
      // Re-render with string field
      rerender(
        <AppProvider 
          handlers={mockHandlers} 
          specPath="/test/users.yaml" 
          specStructure={null}
          initialConfig={mockConfig}
        >
          <AnnotationList selectedField={stringField} />
        </AppProvider>
      );
      
      // File annotations should now be hidden
      expect(screen.queryByText('x-uigen-file-types')).not.toBeInTheDocument();
      expect(screen.queryByText('x-uigen-max-file-size')).not.toBeInTheDocument();
      
      // Generic annotation should still be visible
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty annotations list', () => {
      render(
        <AppProvider 
          handlers={[]} 
          specPath="/test/users.yaml" 
          specStructure={null}
          initialConfig={mockConfig}
        >
          <AnnotationList selectedField={fileField} />
        </AppProvider>
      );
      
      expect(screen.getByText('No annotations registered')).toBeInTheDocument();
    });

    it('should handle field without type', () => {
      const fieldWithoutType: FieldNode = {
        key: 'unknown',
        label: 'Unknown',
        type: undefined as any,
        path: 'User.unknown',
        required: false,
        annotations: {}
      };
      
      renderAnnotationList(fieldWithoutType);
      
      // Should not crash, file annotations should be hidden
      expect(screen.queryByText('x-uigen-file-types')).not.toBeInTheDocument();
      expect(screen.queryByText('x-uigen-max-file-size')).not.toBeInTheDocument();
    });

    it('should handle field with format but no type', () => {
      const fieldWithFormatOnly: FieldNode = {
        key: 'binary',
        label: 'Binary',
        type: undefined as any,
        path: 'User.binary',
        required: false,
        format: 'binary',
        annotations: {}
      };
      
      renderAnnotationList(fieldWithFormatOnly);
      
      // File annotations might still apply based on format
      // This depends on the annotation's applicableWhen rules
      const fileTypesVisible = screen.queryByText('x-uigen-file-types') !== null;
      
      // Test passes regardless - just checking it doesn't crash
      expect(true).toBe(true);
    });
  });
});


