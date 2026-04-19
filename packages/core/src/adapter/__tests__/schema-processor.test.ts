import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaProcessor } from '../schema-processor.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { AdapterUtils } from '../annotations/index.js';
import type { UIGenApp } from '../../ir/types.js';

/**
 * Unit tests for SchemaProcessor
 *
 * Requirements: 14.5
 */

describe('SchemaProcessor', () => {
  const createMockAdapterUtils = (): AdapterUtils => ({
    humanize: (str: string) => str.replace(/([A-Z])/g, ' $1').trim(),
    resolveRef: vi.fn(() => null),
    logError: vi.fn(),
    logWarning: vi.fn()
  });

  const createMockAnnotationRegistry = () => ({
    processAnnotations: vi.fn()
  });

  const createMinimalDocument = (): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: { schemas: {} }
  });

  const createMockIR = (): UIGenApp => ({
    meta: { title: 'Test', version: '1.0.0' },
    resources: [],
    auth: { schemes: [], globalRequired: false },
    dashboard: { enabled: false, widgets: [] },
    servers: []
  });

  describe('processSchema', () => {
    it('returns placeholder for null schema', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const result = processor.processSchema('user', null as any);

      expect(result.type).toBe('object');
      expect(result.key).toBe('user');
      expect(result.children).toEqual([]);
    });

    it('returns placeholder for undefined schema', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const result = processor.processSchema('user', undefined as any);

      expect(result.type).toBe('object');
      expect(result.key).toBe('user');
      expect(result.children).toEqual([]);
    });

    it('handles object schemas', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        }
      };

      const result = processor.processSchema('user', schema);

      expect(result.type).toBe('object');
      expect(result.key).toBe('user');
      expect(result.children).toHaveLength(2);
      expect(result.children![0].key).toBe('name');
      expect(result.children![1].key).toBe('age');
    });

    it('handles array schemas', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'string' }
      };

      const result = processor.processSchema('tags', schema);

      expect(result.type).toBe('array');
      expect(result.key).toBe('tags');
      expect(result.items).toBeDefined();
      expect(result.items!.type).toBe('string');
    });

    it('handles primitive schemas - string', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = { type: 'string' };

      const result = processor.processSchema('name', schema);

      expect(result.type).toBe('string');
      expect(result.key).toBe('name');
    });

    it('handles primitive schemas - number', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = { type: 'number' };

      const result = processor.processSchema('price', schema);

      expect(result.type).toBe('number');
      expect(result.key).toBe('price');
    });

    it('handles primitive schemas - integer', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = { type: 'integer' };

      const result = processor.processSchema('count', schema);

      expect(result.type).toBe('integer');
      expect(result.key).toBe('count');
    });

    it('handles primitive schemas - boolean', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = { type: 'boolean' };

      const result = processor.processSchema('active', schema);

      expect(result.type).toBe('boolean');
      expect(result.key).toBe('active');
    });

    it('handles enum schemas', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive', 'pending']
      };

      const result = processor.processSchema('status', schema);

      expect(result.type).toBe('enum');
      expect(result.key).toBe('status');
      expect(result.enumValues).toEqual(['active', 'inactive', 'pending']);
    });

    it('handles file schemas - binary format', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };

      const result = processor.processSchema('avatar', schema);

      expect(result.type).toBe('file');
      expect(result.key).toBe('avatar');
      expect(result.fileMetadata).toBeDefined();
    });

    it('handles date schemas - date format', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date'
      };

      const result = processor.processSchema('createdAt', schema);

      expect(result.type).toBe('date');
      expect(result.key).toBe('createdAt');
      expect(result.format).toBe('date');
    });

    it('handles date schemas - date-time format', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date-time'
      };

      const result = processor.processSchema('updatedAt', schema);

      expect(result.type).toBe('date');
      expect(result.key).toBe('updatedAt');
      expect(result.format).toBe('date-time');
    });

    it('applies x-uigen-label annotations', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-label': 'Custom Label'
      } as any as OpenAPIV3.SchemaObject;

      const result = processor.processSchema('fieldName', schema);

      expect(result.label).toBe('Custom Label');
    });

    it('calls annotationRegistry.processAnnotations when currentIR is set', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const ir = createMockIR();

      processor.setCurrentIR(ir);

      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      processor.processSchema('name', schema);

      expect(registry.processAnnotations).toHaveBeenCalled();
    });

    it('does not call annotationRegistry.processAnnotations when currentIR is not set', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      processor.processSchema('name', schema);

      expect(registry.processAnnotations).not.toHaveBeenCalled();
    });

    it('handles $ref schemas - resolves and applies annotations', () => {
      const utils = createMockAdapterUtils();
      utils.resolveRef = vi.fn(() => ({
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }));
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      document.components!.schemas!['User'] = {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      };
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/User'
      };

      const result = processor.processSchema('user', schema);

      expect(result.type).toBe('object');
      expect(result.key).toBe('user');
    });

    it('handles circular references with visited Set', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      document.components!.schemas!['Node'] = {
        type: 'object',
        properties: {
          value: { type: 'string' },
          next: { $ref: '#/components/schemas/Node' }
        }
      };
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/Node'
      };

      const visited = new Set<string>();
      const result = processor.processSchema('node', schema, visited);

      // Should handle circular reference gracefully
      expect(result).toBeDefined();
      expect(result.key).toBe('node');
    });

    it('handles $ref with x-uigen-ignore annotation', () => {
      const utils = createMockAdapterUtils();
      utils.resolveRef = vi.fn(() => null);
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        $ref: '#/components/schemas/User',
        'x-uigen-ignore': true
      } as any as OpenAPIV3.ReferenceObject;

      const result = processor.processSchema('user', schema);

      expect((result as any).__shouldIgnore).toBe(true);
    });

    it('resolves label from resolved target when different from humanized key', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      document.components!.schemas!['User'] = {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      };
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/User'
      };

      const result = processor.processSchema('user', schema);

      expect(result.label).toBeDefined();
    });
  });

  describe('shouldIgnoreSchema', () => {
    it('returns true for x-uigen-ignore: true', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-ignore': true
      } as any as OpenAPIV3.SchemaObject;

      const result = processor.shouldIgnoreSchema(schema);

      expect(result).toBe(true);
    });

    it('returns false for x-uigen-ignore: false', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-ignore': false
      } as any as OpenAPIV3.SchemaObject;

      const result = processor.shouldIgnoreSchema(schema);

      expect(result).toBe(false);
    });

    it('checks parent when element has no annotation', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const parent = {
        type: 'object',
        'x-uigen-ignore': true
      } as any as OpenAPIV3.SchemaObject;

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };

      const result = processor.shouldIgnoreSchema(schema, parent);

      expect(result).toBe(true);
    });

    it('element-level annotation overrides parent annotation', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const parent = {
        type: 'object',
        'x-uigen-ignore': true
      } as any as OpenAPIV3.SchemaObject;

      const schema = {
        type: 'string',
        'x-uigen-ignore': false
      } as any as OpenAPIV3.SchemaObject;

      const result = processor.shouldIgnoreSchema(schema, parent);

      expect(result).toBe(false);
    });

    it('logs warnings for non-boolean values', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const schema = {
        type: 'string',
        'x-uigen-ignore': 'yes'
      } as any as OpenAPIV3.SchemaObject;

      processor.shouldIgnoreSchema(schema);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );

      consoleWarnSpy.mockRestore();
    });

    it('defaults to false when no annotations', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };

      const result = processor.shouldIgnoreSchema(schema);

      expect(result).toBe(false);
    });

    it('logs warning for non-boolean parent annotation', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const parent = {
        type: 'object',
        'x-uigen-ignore': 123
      } as any as OpenAPIV3.SchemaObject;

      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };

      processor.shouldIgnoreSchema(schema, parent);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('resolveLabel', () => {
    it('returns x-uigen-label when present', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-label': 'Custom Label'
      } as any;

      const result = processor.resolveLabel('fieldName', schema);

      expect(result).toBe('Custom Label');
    });

    it('returns resolved target label when different from humanized key', () => {
      const utils = createMockAdapterUtils();
      utils.humanize = vi.fn((str: string) => str.replace(/([A-Z])/g, ' $1').trim());
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const resolvedTarget = {
        type: 'string' as const,
        key: 'userId',
        label: 'User Identifier',
        required: false
      };

      const result = processor.resolveLabel('user', {}, resolvedTarget);

      expect(result).toBe('User Identifier');
    });

    it('returns humanized key as fallback', () => {
      const utils = createMockAdapterUtils();
      utils.humanize = vi.fn((str: string) => 'Humanized Key');
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const result = processor.resolveLabel('fieldName', {});

      expect(result).toBe('Humanized Key');
      expect(utils.humanize).toHaveBeenCalledWith('fieldName');
    });

    it('ignores empty x-uigen-label', () => {
      const utils = createMockAdapterUtils();
      utils.humanize = vi.fn((str: string) => 'Humanized Key');
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-label': '   '
      } as any;

      const result = processor.resolveLabel('fieldName', schema);

      expect(result).toBe('Humanized Key');
    });

    it('prioritizes x-uigen-label over resolved target label', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema = {
        type: 'string',
        'x-uigen-label': 'Custom Label'
      } as any;

      const resolvedTarget = {
        type: 'string' as const,
        key: 'userId',
        label: 'User Identifier',
        required: false
      };

      const result = processor.resolveLabel('user', schema, resolvedTarget);

      expect(result).toBe('Custom Label');
    });

    it('does not use resolved target label when it matches humanized key', () => {
      const utils = createMockAdapterUtils();
      utils.humanize = vi.fn((str: string) => 'User Id');
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const resolvedTarget = {
        type: 'string' as const,
        key: 'userId',
        label: 'User Id',
        required: false
      };

      const result = processor.resolveLabel('userId', {}, resolvedTarget);

      expect(result).toBe('User Id');
    });
  });

  describe('annotation integration', () => {
    it('calls processAnnotations with correct context for non-ref schemas', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const ir = createMockIR();

      processor.setCurrentIR(ir);

      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      processor.processSchema('name', schema);

      expect(registry.processAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({
          element: schema,
          path: 'name',
          utils,
          ir
        })
      );
    });

    it('calls processAnnotations with correct context for $ref schemas', () => {
      const utils = createMockAdapterUtils();
      utils.resolveRef = vi.fn(() => ({
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }));
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      document.components!.schemas!['User'] = {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      };
      const processor = new SchemaProcessor(document, utils, registry as any);
      const ir = createMockIR();

      processor.setCurrentIR(ir);

      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/User'
      };
      processor.processSchema('user', schema);

      expect(registry.processAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({
          element: schema,
          path: 'user',
          utils,
          ir
        })
      );
    });

    it('passes parent schema to annotation context', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const ir = createMockIR();

      processor.setCurrentIR(ir);

      const parentSchema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const childSchema: OpenAPIV3.SchemaObject = { type: 'string' };
      processor.processSchema('name', childSchema, new Set(), parentSchema);

      expect(registry.processAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: parentSchema
        })
      );
    });
  });

  describe('setCurrentIR', () => {
    it('sets the current IR', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);
      const ir = createMockIR();

      processor.setCurrentIR(ir);

      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      processor.processSchema('name', schema);

      expect(registry.processAnnotations).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles schema with no type', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        description: 'A schema without type'
      };

      const result = processor.processSchema('field', schema);

      expect(result).toBeDefined();
      expect(result.key).toBe('field');
    });

    it('handles empty object schema', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {};

      const result = processor.processSchema('field', schema);

      expect(result).toBeDefined();
      expect(result.key).toBe('field');
    });

    it('handles object with no properties', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'object'
      };

      const result = processor.processSchema('user', schema);

      expect(result.type).toBe('object');
      expect(result.children).toEqual([]);
    });

    it('handles array with no items', () => {
      const utils = createMockAdapterUtils();
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.SchemaObject = {
        type: 'array'
      };

      const result = processor.processSchema('tags', schema);

      expect(result.type).toBe('array');
      expect(result.items).toBeUndefined();
    });

    it('handles unresolvable $ref', () => {
      const utils = createMockAdapterUtils();
      utils.resolveRef = vi.fn(() => null);
      const registry = createMockAnnotationRegistry();
      const document = createMinimalDocument();
      const processor = new SchemaProcessor(document, utils, registry as any);

      const schema: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/NonExistent'
      };

      const result = processor.processSchema('user', schema);

      expect(result.type).toBe('object');
      expect(result.key).toBe('user');
      expect(result.children).toEqual([]);
    });
  });
});
