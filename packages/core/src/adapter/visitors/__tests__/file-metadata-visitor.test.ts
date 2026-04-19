import { describe, it, expect } from 'vitest';
import { DefaultFileMetadataVisitor } from '../file-metadata-visitor.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../../ir/types.js';

/**
 * Unit tests for FileMetadataVisitor
 * 
 * Requirements: 4.1-4.12
 */
describe('DefaultFileMetadataVisitor', () => {
  const visitor = new DefaultFileMetadataVisitor();

  describe('extractFileMetadata', () => {
    it('should return undefined for non-binary schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      expect(visitor.extractFileMetadata(schema)).toBeUndefined();
    });

    it('should return undefined for number schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number'
      };
      expect(visitor.extractFileMetadata(schema)).toBeUndefined();
    });

    it('should return undefined for object schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object'
      };
      expect(visitor.extractFileMetadata(schema)).toBeUndefined();
    });

    it('should return metadata for binary format schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata).toBeDefined();
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
      expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(metadata?.multiple).toBe(false);
      expect(metadata?.accept).toBe('*/*');
      expect(metadata?.fileType).toBe('generic');
    });

    it('should extract contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/png']);
      expect(metadata?.accept).toBe('image/png');
      expect(metadata?.fileType).toBe('image');
    });

    it('should extract x-uigen-file-types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/jpeg', 'image/png']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
      expect(metadata?.accept).toBe('image/jpeg,image/png');
      expect(metadata?.fileType).toBe('image');
    });

    it('should combine contentMediaType and x-uigen-file-types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png',
        'x-uigen-file-types': ['image/jpeg', 'image/gif']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/gif', 'image/png']);
      expect(metadata?.accept).toBe('image/jpeg,image/gif,image/png');
    });

    it('should not duplicate contentMediaType if already in x-uigen-file-types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png',
        'x-uigen-file-types': ['image/png', 'image/jpeg']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
      expect(metadata?.accept).toBe('image/png,image/jpeg');
    });

    it('should extract x-uigen-max-file-size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 5 * 1024 * 1024 // 5MB
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });

    it('should use default max size when not specified', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should use default max size for invalid x-uigen-max-file-size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 'invalid'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should use default max size for negative x-uigen-max-file-size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': -1000
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should use default max size for zero x-uigen-max-file-size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 0
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should detect image file type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/png', 'image/jpeg']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('image');
    });

    it('should detect video file type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['video/mp4', 'video/mpeg']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('video');
    });

    it('should detect audio file type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['audio/mp3', 'audio/wav']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('audio');
    });

    it('should detect document file type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['application/pdf', 'application/msword']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('document');
    });

    it('should detect generic file type for archives', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['application/zip', 'application/x-tar']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('generic');
    });

    it('should default to "generic" file type for wildcard', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['*/*']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('generic');
    });

    it('should default to "generic" file type for unknown MIME types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['application/custom']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.fileType).toBe('generic');
    });

    it('should set multiple to false by default', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.multiple).toBe(false);
    });

    it('should filter out non-string values from x-uigen-file-types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/png', 123, null, 'image/jpeg', undefined]
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should handle empty x-uigen-file-types array', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': []
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should handle x-uigen-file-types with only invalid values', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': [123, null, undefined]
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should handle non-array x-uigen-file-types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': 'image/png'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should ignore empty contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: ''
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should ignore whitespace-only contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: '   '
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should handle non-string contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 123
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should generate correct accept attribute for single MIME type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png'
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.accept).toBe('image/png');
    });

    it('should generate correct accept attribute for multiple MIME types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/png', 'image/jpeg', 'image/gif']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.accept).toBe('image/png,image/jpeg,image/gif');
    });

    it('should handle complex file metadata extraction', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png',
        'x-uigen-file-types': ['image/jpeg', 'image/gif'],
        'x-uigen-max-file-size': 2 * 1024 * 1024 // 2MB
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/gif', 'image/png']);
      expect(metadata?.maxSizeBytes).toBe(2 * 1024 * 1024);
      expect(metadata?.multiple).toBe(false);
      expect(metadata?.accept).toBe('image/jpeg,image/gif,image/png');
      expect(metadata?.fileType).toBe('image');
    });
  });

  describe('hasFileFields', () => {
    it('should return true for direct file field', () => {
      const schema: SchemaNode = {
        type: 'file',
        key: 'avatar',
        label: 'Avatar',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return false for string field', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'name',
        label: 'Name',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for number field', () => {
      const schema: SchemaNode = {
        type: 'number',
        key: 'age',
        label: 'Age',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for boolean field', () => {
      const schema: SchemaNode = {
        type: 'boolean',
        key: 'active',
        label: 'Active',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return true for object with file child', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'file',
            key: 'avatar',
            label: 'Avatar',
            required: false
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return false for object without file children', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'number',
            key: 'age',
            label: 'Age',
            required: false
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for object with empty children', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: []
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for object without children property', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return true for array with file items', () => {
      const schema: SchemaNode = {
        type: 'array',
        key: 'attachments',
        label: 'Attachments',
        required: false,
        items: {
          type: 'file',
          key: 'attachment',
          label: 'Attachment',
          required: false
        }
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return false for array with string items', () => {
      const schema: SchemaNode = {
        type: 'array',
        key: 'tags',
        label: 'Tags',
        required: false,
        items: {
          type: 'string',
          key: 'tag',
          label: 'Tag',
          required: false
        }
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for array without items', () => {
      const schema: SchemaNode = {
        type: 'array',
        key: 'items',
        label: 'Items',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return true for nested object with file field', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          {
            type: 'object',
            key: 'profile',
            label: 'Profile',
            required: false,
            children: [
              {
                type: 'file',
                key: 'avatar',
                label: 'Avatar',
                required: false
              }
            ]
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true for array of objects with file fields', () => {
      const schema: SchemaNode = {
        type: 'array',
        key: 'users',
        label: 'Users',
        required: false,
        items: {
          type: 'object',
          key: 'user',
          label: 'User',
          required: false,
          children: [
            {
              type: 'file',
              key: 'avatar',
              label: 'Avatar',
              required: false
            }
          ]
        }
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return false for deeply nested structure without files', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'root',
        label: 'Root',
        required: false,
        children: [
          {
            type: 'object',
            key: 'level1',
            label: 'Level 1',
            required: false,
            children: [
              {
                type: 'array',
                key: 'level2',
                label: 'Level 2',
                required: false,
                items: {
                  type: 'string',
                  key: 'value',
                  label: 'Value',
                  required: false
                }
              }
            ]
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return true for deeply nested structure with file', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'root',
        label: 'Root',
        required: false,
        children: [
          {
            type: 'object',
            key: 'level1',
            label: 'Level 1',
            required: false,
            children: [
              {
                type: 'array',
                key: 'level2',
                label: 'Level 2',
                required: false,
                items: {
                  type: 'object',
                  key: 'level3',
                  label: 'Level 3',
                  required: false,
                  children: [
                    {
                      type: 'file',
                      key: 'document',
                      label: 'Document',
                      required: false
                    }
                  ]
                }
              }
            ]
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true when first child is a file', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'data',
        label: 'Data',
        required: false,
        children: [
          {
            type: 'file',
            key: 'file1',
            label: 'File 1',
            required: false
          },
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: false
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true when last child is a file', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'data',
        label: 'Data',
        required: false,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'file',
            key: 'file1',
            label: 'File 1',
            required: false
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true when middle child is a file', () => {
      const schema: SchemaNode = {
        type: 'object',
        key: 'data',
        label: 'Data',
        required: false,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'file',
            key: 'file1',
            label: 'File 1',
            required: false
          },
          {
            type: 'number',
            key: 'age',
            label: 'Age',
            required: false
          }
        ]
      };
      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should handle date type', () => {
      const schema: SchemaNode = {
        type: 'date',
        key: 'createdAt',
        label: 'Created At',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should handle enum type', () => {
      const schema: SchemaNode = {
        type: 'enum',
        key: 'status',
        label: 'Status',
        required: false,
        enumValues: ['active', 'inactive']
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should handle integer type', () => {
      const schema: SchemaNode = {
        type: 'integer',
        key: 'count',
        label: 'Count',
        required: false
      };
      expect(visitor.hasFileFields(schema)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle schema with all vendor extensions', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png',
        'x-uigen-file-types': ['image/jpeg', 'image/gif'],
        'x-uigen-max-file-size': 5 * 1024 * 1024,
        'x-uigen-label': 'Profile Picture',
        'x-uigen-ignore': false
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata).toBeDefined();
      expect(metadata?.allowedMimeTypes).toContain('image/png');
      expect(metadata?.allowedMimeTypes).toContain('image/jpeg');
      expect(metadata?.allowedMimeTypes).toContain('image/gif');
      expect(metadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });

    it('should handle very large max file size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 1024 * 1024 * 1024 * 5 // 5GB
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(1024 * 1024 * 1024 * 5);
    });

    it('should handle very small max file size', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 1024 // 1KB
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      expect(metadata?.maxSizeBytes).toBe(1024);
    });

    it('should handle mixed file type categories', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/png', 'video/mp4', 'application/pdf']
      };
      const metadata = visitor.extractFileMetadata(schema);
      
      // FileTypeDetector should return the first detected category or 'any'
      expect(metadata?.fileType).toBeDefined();
    });
  });
});
