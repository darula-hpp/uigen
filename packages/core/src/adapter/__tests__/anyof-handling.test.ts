import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaProcessor } from '../schema-processor.js';
import { AnnotationHandlerRegistry } from '../annotations/index.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { AdapterUtils } from '../annotations/index.js';

/**
 * Tests for anyOf schema handling in SchemaProcessor
 * 
 * Verifies that schemas with anyOf (especially nullable fields) are correctly unwrapped
 * and the first non-null option is used for type detection.
 */
describe('SchemaProcessor anyOf handling', () => {
  let processor: SchemaProcessor;
  let mockDocument: OpenAPIV3.Document;
  let mockAdapterUtils: AdapterUtils;
  let mockRegistry: AnnotationHandlerRegistry;

  beforeEach(() => {
    mockDocument = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} }
    };

    mockAdapterUtils = {
      humanize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
      resolveRef: () => null,
      logError: () => {},
      logWarning: () => {}
    };

    mockRegistry = new AnnotationHandlerRegistry([], mockAdapterUtils);

    processor = new SchemaProcessor(mockDocument, mockAdapterUtils, mockRegistry);
  });

  describe('anyOf with nullable string', () => {
    it('should detect string type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'string' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('name', schema);
      
      expect(node.type).toBe('string');
      expect(node.key).toBe('name');
    });

    it('should detect file type from anyOf with contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'string',
            contentMediaType: 'application/octet-stream'
          } as any,
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('recording', schema);
      
      expect(node.type).toBe('file');
      expect(node.key).toBe('recording');
    });

    it('should detect file type from anyOf with format: binary', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'string',
            format: 'binary'
          },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('file', schema);
      
      expect(node.type).toBe('file');
      expect(node.key).toBe('file');
    });

    it('should detect date type from anyOf with format: date-time', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'string',
            format: 'date-time'
          },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('createdAt', schema);
      
      expect(node.type).toBe('date');
      expect(node.key).toBe('createdAt');
    });
  });

  describe('anyOf with nullable number', () => {
    it('should detect number type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'number' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('price', schema);
      
      expect(node.type).toBe('number');
      expect(node.key).toBe('price');
    });

    it('should detect integer type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'integer' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('count', schema);
      
      expect(node.type).toBe('integer');
      expect(node.key).toBe('count');
    });
  });

  describe('anyOf with nullable boolean', () => {
    it('should detect boolean type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'boolean' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('isActive', schema);
      
      expect(node.type).toBe('boolean');
      expect(node.key).toBe('isActive');
    });
  });

  describe('anyOf with nullable object', () => {
    it('should detect object type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('user', schema);
      
      expect(node.type).toBe('object');
      expect(node.key).toBe('user');
    });
  });

  describe('anyOf with nullable array', () => {
    it('should detect array type from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'array',
            items: { type: 'string' }
          },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('tags', schema);
      
      expect(node.type).toBe('array');
      expect(node.key).toBe('tags');
    });
  });

  describe('anyOf order handling', () => {
    it('should use first non-null option when null comes first', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'null' },
          { type: 'string' }
        ]
      };

      const node = processor.processSchema('name', schema);
      
      expect(node.type).toBe('string');
    });

    it('should use first non-null option when multiple non-null options exist', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('value', schema);
      
      // Should use the first non-null option (string)
      expect(node.type).toBe('string');
    });
  });

  describe('anyOf with enum', () => {
    it('should detect enum from anyOf with null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { 
            type: 'string',
            enum: ['active', 'inactive']
          },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('status', schema);
      
      expect(node.type).toBe('enum');
      expect(node.key).toBe('status');
    });
  });

  describe('schemas without anyOf', () => {
    it('should handle regular schemas without anyOf', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };

      const node = processor.processSchema('name', schema);
      
      expect(node.type).toBe('string');
      expect(node.key).toBe('name');
    });

    it('should handle file schemas without anyOf', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/octet-stream'
      } as any;

      const node = processor.processSchema('file', schema);
      
      expect(node.type).toBe('file');
      expect(node.key).toBe('file');
    });
  });

  describe('real-world meeting-minutes scenario', () => {
    it('should handle recording field with anyOf and contentMediaType', () => {
      // This is the exact structure from the meeting-minutes OpenAPI spec
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          {
            type: 'string',
            contentMediaType: 'application/octet-stream'
          } as any,
          {
            type: 'null'
          }
        ],
        title: 'Recording'
      };

      const node = processor.processSchema('recording', schema);
      
      expect(node.type).toBe('file');
      expect(node.key).toBe('recording');
      expect(node.label).toBe('Recording');
    });
  });

  describe('edge cases', () => {
    it('should handle empty anyOf array', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: []
      };

      const node = processor.processSchema('empty', schema);
      
      // Should default to string when no valid options
      expect(node.type).toBe('string');
    });

    it('should handle anyOf with only null', () => {
      const schema: OpenAPIV3.SchemaObject = {
        anyOf: [
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('nullOnly', schema);
      
      // Should default to string when only null option
      expect(node.type).toBe('string');
    });

    it('should preserve parent schema properties when unwrapping', () => {
      const schema: OpenAPIV3.SchemaObject = {
        title: 'My Field',
        description: 'A nullable field',
        anyOf: [
          { type: 'string' },
          { type: 'null' }
        ]
      };

      const node = processor.processSchema('field', schema);
      
      expect(node.type).toBe('string');
      expect(node.key).toBe('field');
    });
  });
});
