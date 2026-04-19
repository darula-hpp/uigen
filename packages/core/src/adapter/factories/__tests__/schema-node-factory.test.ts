import { describe, it, expect, vi } from 'vitest';
import { DefaultSchemaNodeFactory } from '../schema-node-factory.js';
import { DefaultTypeMappingVisitor } from '../../visitors/type-mapping-visitor.js';
import { DefaultValidationExtractionVisitor } from '../../visitors/validation-extraction-visitor.js';
import { DefaultFileMetadataVisitor } from '../../visitors/file-metadata-visitor.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../../ir/types.js';

/**
 * Unit tests for DefaultSchemaNodeFactory
 *
 * Requirements: 14.7
 */

// Simple humanize helper that mirrors the real one
const humanize = (str: string): string =>
  str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());

// A simple processSchema mock that returns a minimal SchemaNode
const makeMockProcessSchema = () =>
  vi.fn(
    (
      key: string,
      _schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
      _visited: Set<string>,
      _parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    ): SchemaNode => ({
      type: 'string',
      key,
      label: humanize(key),
      required: false,
    })
  );

const makeFactory = (processSchema = makeMockProcessSchema()) => {
  const typeMappingVisitor = new DefaultTypeMappingVisitor();
  const validationVisitor = new DefaultValidationExtractionVisitor();
  const fileMetadataVisitor = new DefaultFileMetadataVisitor();
  return {
    factory: new DefaultSchemaNodeFactory(
      typeMappingVisitor,
      validationVisitor,
      fileMetadataVisitor,
      processSchema,
      humanize
    ),
    processSchema,
  };
};

describe('DefaultSchemaNodeFactory', () => {
  // ---------------------------------------------------------------------------
  // createObjectNode
  // ---------------------------------------------------------------------------
  describe('createObjectNode', () => {
    it('creates a node with type "object"', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(node.type).toBe('object');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      const node = factory.createObjectNode('firstName', schema, new Set());
      expect(node.key).toBe('firstName');
      expect(node.label).toBe('First Name');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(node.required).toBe(false);
    });

    it('creates empty children array when no properties', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(node.children).toEqual([]);
    });

    it('calls processSchema for each property', () => {
      const { factory, processSchema } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      };
      factory.createObjectNode('user', schema, new Set());
      expect(processSchema).toHaveBeenCalledTimes(2);
      expect(processSchema).toHaveBeenCalledWith('name', { type: 'string' }, expect.any(Set), schema);
      expect(processSchema).toHaveBeenCalledWith('age', { type: 'integer' }, expect.any(Set), schema);
    });

    it('populates children from processSchema results', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(node.children).toHaveLength(1);
      expect(node.children![0].key).toBe('name');
    });

    it('marks required children', () => {
      const mockProcessSchema = vi.fn(
        (key: string): SchemaNode => ({
          type: 'string',
          key,
          label: humanize(key),
          required: false,
        })
      );
      const { factory } = makeFactory(mockProcessSchema as any);
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const node = factory.createObjectNode('user', schema, new Set());
      const nameChild = node.children?.find(c => c.key === 'name');
      const emailChild = node.children?.find(c => c.key === 'email');
      expect(nameChild?.required).toBe(true);
      expect(emailChild?.required).toBe(false);
    });

    it('propagates x-uigen-ignore: true to children without explicit annotations', () => {
      const { factory } = makeFactory();
      const schema = {
        type: 'object',
        'x-uigen-ignore': true,
        properties: {
          name: { type: 'string' },
          // email has its own explicit annotation
          email: { type: 'string', 'x-uigen-ignore': false },
        },
      } as any as OpenAPIV3.SchemaObject;

      const node = factory.createObjectNode('user', schema, new Set());
      const nameChild = node.children?.find(c => c.key === 'name');
      const emailChild = node.children?.find(c => c.key === 'email');
      // name has no explicit annotation, so parent propagates __shouldIgnore
      expect((nameChild as any).__shouldIgnore).toBe(true);
      // email has explicit annotation, so parent does NOT propagate
      expect((emailChild as any).__shouldIgnore).toBeUndefined();
    });

    it('does not propagate x-uigen-ignore when parent annotation is false', () => {
      const { factory } = makeFactory();
      const schema = {
        type: 'object',
        'x-uigen-ignore': false,
        properties: {
          name: { type: 'string' },
        },
      } as any as OpenAPIV3.SchemaObject;

      const node = factory.createObjectNode('user', schema, new Set());
      const nameChild = node.children?.find(c => c.key === 'name');
      expect((nameChild as any).__shouldIgnore).toBeUndefined();
    });

    it('applies common metadata (description, readOnly, writeOnly, nullable, deprecated)', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        description: 'A user object',
        readOnly: true,
        writeOnly: false,
        nullable: true,
        deprecated: true,
      };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(node.description).toBe('A user object');
      expect(node.readOnly).toBe(true);
      expect(node.writeOnly).toBe(false);
      expect(node.nullable).toBe(true);
      expect(node.deprecated).toBe(true);
    });

    it('applies validations via validationVisitor', () => {
      const { factory } = makeFactory();
      // Objects don't typically have string validations, but the visitor runs regardless
      const schema: OpenAPIV3.SchemaObject = { type: 'object' };
      const node = factory.createObjectNode('user', schema, new Set());
      expect(Array.isArray(node.validations)).toBe(true);
    });

    it('passes the visited Set through to processSchema', () => {
      const { factory, processSchema } = makeFactory();
      const visited = new Set<string>(['#/components/schemas/Existing']);
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      factory.createObjectNode('user', schema, visited);
      expect(processSchema).toHaveBeenCalledWith('name', expect.anything(), visited, schema);
    });
  });

  // ---------------------------------------------------------------------------
  // createArrayNode
  // ---------------------------------------------------------------------------
  describe('createArrayNode', () => {
    it('creates a node with type "array"', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      const node = factory.createArrayNode('tags', schema, new Set());
      expect(node.type).toBe('array');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      const node = factory.createArrayNode('tagList', schema, new Set());
      expect(node.key).toBe('tagList');
      expect(node.label).toBe('Tag List');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      const node = factory.createArrayNode('tags', schema, new Set());
      expect(node.required).toBe(false);
    });

    it('calls processSchema for items', () => {
      const { factory, processSchema } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      factory.createArrayNode('tags', schema, new Set());
      expect(processSchema).toHaveBeenCalledWith('item', { type: 'string' }, expect.any(Set), schema);
    });

    it('populates items from processSchema result', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      const node = factory.createArrayNode('tags', schema, new Set());
      expect(node.items).toBeDefined();
      expect(node.items?.key).toBe('item');
    });

    it('handles array with no items', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
      // Remove items to simulate missing items
      const schemaNoItems = { type: 'array' } as any as OpenAPIV3.SchemaObject;
      const node = factory.createArrayNode('tags', schemaNoItems, new Set());
      expect(node.items).toBeUndefined();
    });

    it('handles multiple file upload (array of binary items)', () => {
      const { factory } = makeFactory();
      const schema = {
        type: 'array',
        items: { type: 'string', format: 'binary' },
      } as any as OpenAPIV3.SchemaObject;
      const node = factory.createArrayNode('attachments', schema, new Set());
      expect(node.items).toBeDefined();
      expect(node.items?.fileMetadata).toBeDefined();
      expect(node.items?.fileMetadata?.multiple).toBe(true);
    });

    it('applies common metadata', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
        description: 'List of tags',
        deprecated: true,
      };
      const node = factory.createArrayNode('tags', schema, new Set());
      expect(node.description).toBe('List of tags');
      expect(node.deprecated).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createPrimitiveNode
  // ---------------------------------------------------------------------------
  describe('createPrimitiveNode', () => {
    it('creates a string node', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      const node = factory.createPrimitiveNode('name', schema, 'string');
      expect(node.type).toBe('string');
    });

    it('creates a number node', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'number' };
      const node = factory.createPrimitiveNode('price', schema, 'number');
      expect(node.type).toBe('number');
    });

    it('creates an integer node', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'integer' };
      const node = factory.createPrimitiveNode('count', schema, 'integer');
      expect(node.type).toBe('integer');
    });

    it('creates a boolean node', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'boolean' };
      const node = factory.createPrimitiveNode('active', schema, 'boolean');
      expect(node.type).toBe('boolean');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      const node = factory.createPrimitiveNode('firstName', schema, 'string');
      expect(node.key).toBe('firstName');
      expect(node.label).toBe('First Name');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string' };
      const node = factory.createPrimitiveNode('name', schema, 'string');
      expect(node.required).toBe(false);
    });

    it('applies common metadata (format, readOnly, writeOnly, nullable, deprecated)', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'email',
        readOnly: true,
        writeOnly: false,
        nullable: false,
        deprecated: false,
        description: 'User email',
      };
      const node = factory.createPrimitiveNode('email', schema, 'string');
      expect(node.format).toBe('email');
      expect(node.readOnly).toBe(true);
      expect(node.writeOnly).toBe(false);
      expect(node.nullable).toBe(false);
      expect(node.deprecated).toBe(false);
      expect(node.description).toBe('User email');
    });

    it('extracts validations', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 3,
        maxLength: 50,
      };
      const node = factory.createPrimitiveNode('username', schema, 'string');
      expect(node.validations).toHaveLength(2);
      expect(node.validations![0].type).toBe('minLength');
      expect(node.validations![1].type).toBe('maxLength');
    });

    it('preserves default value', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', default: 'hello' };
      const node = factory.createPrimitiveNode('greeting', schema, 'string');
      expect(node.default).toBe('hello');
    });
  });

  // ---------------------------------------------------------------------------
  // createEnumNode
  // ---------------------------------------------------------------------------
  describe('createEnumNode', () => {
    it('creates a node with type "enum"', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      };
      const node = factory.createEnumNode('status', schema);
      expect(node.type).toBe('enum');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['a', 'b'],
      };
      const node = factory.createEnumNode('orderStatus', schema);
      expect(node.key).toBe('orderStatus');
      expect(node.label).toBe('Order Status');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', enum: ['a'] };
      const node = factory.createEnumNode('status', schema);
      expect(node.required).toBe(false);
    });

    it('populates enumValues from schema', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      };
      const node = factory.createEnumNode('status', schema);
      expect(node.enumValues).toEqual(['active', 'inactive', 'pending']);
    });

    it('applies common metadata', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        enum: ['a', 'b'],
        description: 'Current status',
        deprecated: true,
      };
      const node = factory.createEnumNode('status', schema);
      expect(node.description).toBe('Current status');
      expect(node.deprecated).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createFileNode
  // ---------------------------------------------------------------------------
  describe('createFileNode', () => {
    it('creates a node with type "file"', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'binary' };
      const node = factory.createFileNode('avatar', schema);
      expect(node.type).toBe('file');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'binary' };
      const node = factory.createFileNode('profilePicture', schema);
      expect(node.key).toBe('profilePicture');
      expect(node.label).toBe('Profile Picture');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'binary' };
      const node = factory.createFileNode('avatar', schema);
      expect(node.required).toBe(false);
    });

    it('populates fileMetadata for binary schema', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'binary' };
      const node = factory.createFileNode('avatar', schema);
      expect(node.fileMetadata).toBeDefined();
      expect(node.fileMetadata?.multiple).toBe(false);
      expect(node.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('extracts MIME types from vendor extension', () => {
      const { factory } = makeFactory();
      const schema = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/png', 'image/jpeg'],
      } as any as OpenAPIV3.SchemaObject;
      const node = factory.createFileNode('avatar', schema);
      expect(node.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('applies common metadata', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        description: 'Profile picture',
        readOnly: false,
      };
      const node = factory.createFileNode('avatar', schema);
      expect(node.description).toBe('Profile picture');
      expect(node.readOnly).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createDateNode
  // ---------------------------------------------------------------------------
  describe('createDateNode', () => {
    it('creates a node with type "date"', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'date' };
      const node = factory.createDateNode('createdAt', schema);
      expect(node.type).toBe('date');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'date' };
      const node = factory.createDateNode('createdAt', schema);
      expect(node.key).toBe('createdAt');
      expect(node.label).toBe('Created At');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'date' };
      const node = factory.createDateNode('createdAt', schema);
      expect(node.required).toBe(false);
    });

    it('preserves format field', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'date-time' };
      const node = factory.createDateNode('updatedAt', schema);
      expect(node.format).toBe('date-time');
    });

    it('applies common metadata', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date',
        description: 'Creation date',
        readOnly: true,
      };
      const node = factory.createDateNode('createdAt', schema);
      expect(node.description).toBe('Creation date');
      expect(node.readOnly).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createPlaceholderNode
  // ---------------------------------------------------------------------------
  describe('createPlaceholderNode', () => {
    it('creates a node with type "object"', () => {
      const { factory } = makeFactory();
      const node = factory.createPlaceholderNode('circular');
      expect(node.type).toBe('object');
    });

    it('sets key and humanized label', () => {
      const { factory } = makeFactory();
      const node = factory.createPlaceholderNode('circularRef');
      expect(node.key).toBe('circularRef');
      expect(node.label).toBe('Circular Ref');
    });

    it('defaults required to false', () => {
      const { factory } = makeFactory();
      const node = factory.createPlaceholderNode('circular');
      expect(node.required).toBe(false);
    });

    it('has empty children array', () => {
      const { factory } = makeFactory();
      const node = factory.createPlaceholderNode('circular');
      expect(node.children).toEqual([]);
    });

    it('has no validations or metadata', () => {
      const { factory } = makeFactory();
      const node = factory.createPlaceholderNode('circular');
      expect(node.validations).toBeUndefined();
      expect(node.description).toBeUndefined();
      expect(node.fileMetadata).toBeUndefined();
      expect(node.enumValues).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Common metadata (applyCommonMetadata)
  // ---------------------------------------------------------------------------
  describe('common metadata application', () => {
    it('applies format to primitive nodes', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'email' };
      const node = factory.createPrimitiveNode('email', schema, 'string');
      expect(node.format).toBe('email');
    });

    it('applies readOnly flag', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', readOnly: true };
      const node = factory.createPrimitiveNode('id', schema, 'string');
      expect(node.readOnly).toBe(true);
    });

    it('applies writeOnly flag', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', writeOnly: true };
      const node = factory.createPrimitiveNode('password', schema, 'string');
      expect(node.writeOnly).toBe(true);
    });

    it('applies nullable flag', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', nullable: true };
      const node = factory.createPrimitiveNode('middleName', schema, 'string');
      expect(node.nullable).toBe(true);
    });

    it('applies deprecated flag', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', deprecated: true };
      const node = factory.createPrimitiveNode('legacyField', schema, 'string');
      expect(node.deprecated).toBe(true);
    });

    it('extracts validations for string with email format', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'email' };
      const node = factory.createPrimitiveNode('email', schema, 'string');
      const emailValidation = node.validations?.find(v => v.type === 'email');
      expect(emailValidation).toBeDefined();
    });

    it('extracts validations for string with uri format', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'string', format: 'uri' };
      const node = factory.createPrimitiveNode('website', schema, 'string');
      const urlValidation = node.validations?.find(v => v.type === 'url');
      expect(urlValidation).toBeDefined();
    });

    it('extracts minimum/maximum validations for number', () => {
      const { factory } = makeFactory();
      const schema: OpenAPIV3.SchemaObject = { type: 'number', minimum: 0, maximum: 100 };
      const node = factory.createPrimitiveNode('score', schema, 'number');
      expect(node.validations?.find(v => v.type === 'minimum')).toBeDefined();
      expect(node.validations?.find(v => v.type === 'maximum')).toBeDefined();
    });
  });
});
