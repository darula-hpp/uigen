import { describe, it, expect } from 'vitest';
import { DefaultFileMetadataVisitor } from '../file-metadata-visitor.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('DefaultFileMetadataVisitor', () => {
  const visitor = new DefaultFileMetadataVisitor();

  describe('extractFileMetadata', () => {
    describe('format: binary detection', () => {
      it('should extract metadata from schema with format: binary', () => {
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

      it('should extract contentMediaType from format: binary schema', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          contentMediaType: 'image/png'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['image/png']);
        expect(metadata?.fileType).toBe('image');
      });

      it('should extract x-uigen-file-types from format: binary schema', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-file-types': ['application/pdf', 'application/msword']
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['application/pdf', 'application/msword']);
        expect(metadata?.fileType).toBe('document');
      });

      it('should merge contentMediaType and x-uigen-file-types', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          contentMediaType: 'image/png',
          'x-uigen-file-types': ['image/jpeg', 'image/gif']
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/gif', 'image/png']);
      });

      it('should extract x-uigen-max-file-size', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-max-file-size': 5 * 1024 * 1024
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
      });
    });

    describe('contentMediaType-only detection (without format: binary)', () => {
      it('should extract metadata from schema with contentMediaType only', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'application/octet-stream'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['application/octet-stream']);
        expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
        expect(metadata?.multiple).toBe(false);
        expect(metadata?.accept).toBe('application/octet-stream');
        expect(metadata?.fileType).toBe('generic');
      });

      it('should extract metadata for image contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'image/png'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['image/png']);
        expect(metadata?.fileType).toBe('image');
      });

      it('should extract metadata for video contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'video/mp4'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['video/mp4']);
        expect(metadata?.fileType).toBe('video');
      });

      it('should extract metadata for audio contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'audio/mpeg'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['audio/mpeg']);
        expect(metadata?.fileType).toBe('audio');
      });

      it('should extract x-uigen-file-types with contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'application/pdf',
          'x-uigen-file-types': ['application/msword']
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['application/msword', 'application/pdf']);
      });

      it('should extract x-uigen-max-file-size with contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: 'application/octet-stream',
          'x-uigen-max-file-size': 20 * 1024 * 1024
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.maxSizeBytes).toBe(20 * 1024 * 1024);
      });
    });

    describe('edge cases', () => {
      it('should return undefined for schema without format: binary or contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string'
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeUndefined();
      });

      it('should return undefined for empty contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: ''
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeUndefined();
      });

      it('should return undefined for whitespace-only contentMediaType', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          contentMediaType: '   '
        };

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeUndefined();
      });

      it('should ignore invalid x-uigen-max-file-size values', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-max-file-size': -100
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024); // Default
      });

      it('should ignore non-numeric x-uigen-max-file-size values', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-max-file-size': 'invalid' as any
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.maxSizeBytes).toBe(10 * 1024 * 1024); // Default
      });

      it('should ignore non-array x-uigen-file-types values', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-file-types': 'not-an-array' as any
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['*/*']); // Default
      });

      it('should filter non-string values from x-uigen-file-types array', () => {
        const schema: OpenAPIV3.SchemaObject = {
          type: 'string',
          format: 'binary',
          'x-uigen-file-types': ['image/png', 123, null, 'image/jpeg'] as any
        } as any;

        const metadata = visitor.extractFileMetadata(schema);

        expect(metadata).toBeDefined();
        expect(metadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
      });
    });
  });

  describe('hasFileFields', () => {
    it('should return true for direct file field', () => {
      const schema = {
        type: 'file' as const,
        key: 'avatar',
        label: 'Avatar',
        required: false
      };

      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true for object with file child', () => {
      const schema = {
        type: 'object' as const,
        key: 'user',
        label: 'User',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'file' as const,
            key: 'avatar',
            label: 'Avatar',
            required: false
          }
        ]
      };

      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return true for array with file items', () => {
      const schema = {
        type: 'array' as const,
        key: 'attachments',
        label: 'Attachments',
        required: false,
        items: {
          type: 'file' as const,
          key: 'item',
          label: 'Item',
          required: false
        }
      };

      expect(visitor.hasFileFields(schema)).toBe(true);
    });

    it('should return false for object without file fields', () => {
      const schema = {
        type: 'object' as const,
        key: 'user',
        label: 'User',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'number' as const,
            key: 'age',
            label: 'Age',
            required: false
          }
        ]
      };

      expect(visitor.hasFileFields(schema)).toBe(false);
    });

    it('should return false for primitive types', () => {
      const schema = {
        type: 'string' as const,
        key: 'name',
        label: 'Name',
        required: false
      };

      expect(visitor.hasFileFields(schema)).toBe(false);
    });
  });
});
