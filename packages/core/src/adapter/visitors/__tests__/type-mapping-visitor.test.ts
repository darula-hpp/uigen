import { describe, it, expect } from 'vitest';
import { DefaultTypeMappingVisitor } from '../type-mapping-visitor.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit tests for TypeMappingVisitor
 * 
 * Requirements: 2.1-2.12
 */
describe('DefaultTypeMappingVisitor', () => {
  const visitor = new DefaultTypeMappingVisitor();

  describe('visitString', () => {
    it('should return "string" for basic string schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should return "date" for date format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date'
      };
      expect(visitor.visitString(schema)).toBe('date');
    });

    it('should return "date" for date-time format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date-time'
      };
      expect(visitor.visitString(schema)).toBe('date');
    });

    it('should return "file" for binary format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      expect(visitor.visitString(schema)).toBe('file');
    });

    it('should return "file" for contentMediaType application/octet-stream', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/octet-stream'
      };
      expect(visitor.visitString(schema)).toBe('file');
    });

    it('should return "string" for email format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'email'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should return "string" for uri format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'uri'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should return "string" for uuid format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'uuid'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should return "string" for password format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'password'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should return "string" for byte format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'byte'
      };
      expect(visitor.visitString(schema)).toBe('string');
    });

    it('should prioritize format over contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date',
        contentMediaType: 'application/octet-stream'
      };
      expect(visitor.visitString(schema)).toBe('date');
    });

    it('should handle schema with no format or contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 1,
        maxLength: 100
      };
      expect(visitor.visitString(schema)).toBe('string');
    });
  });

  describe('visitNumber', () => {
    it('should return "number" for number schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number'
      };
      expect(visitor.visitNumber(schema)).toBe('number');
    });

    it('should return "number" for number with float format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        format: 'float'
      };
      expect(visitor.visitNumber(schema)).toBe('number');
    });

    it('should return "number" for number with double format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        format: 'double'
      };
      expect(visitor.visitNumber(schema)).toBe('number');
    });

    it('should return "number" for number with minimum/maximum', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        minimum: 0,
        maximum: 100
      };
      expect(visitor.visitNumber(schema)).toBe('number');
    });
  });

  describe('visitInteger', () => {
    it('should return "integer" for integer schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer'
      };
      expect(visitor.visitInteger(schema)).toBe('integer');
    });

    it('should return "integer" for integer with int32 format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        format: 'int32'
      };
      expect(visitor.visitInteger(schema)).toBe('integer');
    });

    it('should return "integer" for integer with int64 format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        format: 'int64'
      };
      expect(visitor.visitInteger(schema)).toBe('integer');
    });

    it('should return "integer" for integer with minimum/maximum', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        minimum: 1,
        maximum: 10
      };
      expect(visitor.visitInteger(schema)).toBe('integer');
    });
  });

  describe('visitBoolean', () => {
    it('should return "boolean" for boolean schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'boolean'
      };
      expect(visitor.visitBoolean(schema)).toBe('boolean');
    });

    it('should return "boolean" for boolean with default value', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'boolean',
        default: false
      };
      expect(visitor.visitBoolean(schema)).toBe('boolean');
    });
  });

  describe('visitObject', () => {
    it('should return "object" for object schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object'
      };
      expect(visitor.visitObject(schema)).toBe('object');
    });

    it('should return "object" for object with properties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        }
      };
      expect(visitor.visitObject(schema)).toBe('object');
    });

    it('should return "object" for object with required fields', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      };
      expect(visitor.visitObject(schema)).toBe('object');
    });

    it('should return "object" for object with additionalProperties', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'object',
        additionalProperties: true
      };
      expect(visitor.visitObject(schema)).toBe('object');
    });
  });

  describe('visitArray', () => {
    it('should return "array" for array schema', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array'
      };
      expect(visitor.visitArray(schema)).toBe('array');
    });

    it('should return "array" for array with items', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'string' }
      };
      expect(visitor.visitArray(schema)).toBe('array');
    });

    it('should return "array" for array with minItems/maxItems', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'integer' },
        minItems: 1,
        maxItems: 10
      };
      expect(visitor.visitArray(schema)).toBe('array');
    });

    it('should return "array" for array with uniqueItems', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true
      };
      expect(visitor.visitArray(schema)).toBe('array');
    });
  });

  describe('mapType', () => {
    it('should map string type to "string"', () => {
      expect(visitor.mapType('string', undefined)).toBe('string');
    });

    it('should map number type to "number"', () => {
      expect(visitor.mapType('number', undefined)).toBe('number');
    });

    it('should map integer type to "integer"', () => {
      expect(visitor.mapType('integer', undefined)).toBe('integer');
    });

    it('should map boolean type to "boolean"', () => {
      expect(visitor.mapType('boolean', undefined)).toBe('boolean');
    });

    it('should map object type to "object"', () => {
      expect(visitor.mapType('object', undefined)).toBe('object');
    });

    it('should map array type to "array"', () => {
      expect(visitor.mapType('array', undefined)).toBe('array');
    });

    it('should map date format to "date"', () => {
      expect(visitor.mapType('string', 'date')).toBe('date');
    });

    it('should map date-time format to "date"', () => {
      expect(visitor.mapType('string', 'date-time')).toBe('date');
    });

    it('should map binary format to "file"', () => {
      expect(visitor.mapType('string', 'binary')).toBe('file');
    });

    it('should map contentMediaType to "file"', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/octet-stream'
      };
      expect(visitor.mapType('string', undefined, schema)).toBe('file');
    });

    it('should default to "string" for unknown type', () => {
      expect(visitor.mapType('unknown', undefined)).toBe('string');
    });

    it('should default to "string" for undefined type', () => {
      expect(visitor.mapType(undefined, undefined)).toBe('string');
    });

    it('should prioritize format over type', () => {
      expect(visitor.mapType('string', 'date')).toBe('date');
      expect(visitor.mapType('string', 'binary')).toBe('file');
    });

    it('should handle string with email format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'email'
      };
      expect(visitor.mapType('string', 'email', schema)).toBe('string');
    });

    it('should handle string with uri format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'uri'
      };
      expect(visitor.mapType('string', 'uri', schema)).toBe('string');
    });

    it('should handle string with uuid format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'uuid'
      };
      expect(visitor.mapType('string', 'uuid', schema)).toBe('string');
    });

    it('should handle number with float format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        format: 'float'
      };
      expect(visitor.mapType('number', 'float', schema)).toBe('number');
    });

    it('should handle number with double format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        format: 'double'
      };
      expect(visitor.mapType('number', 'double', schema)).toBe('number');
    });

    it('should handle integer with int32 format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        format: 'int32'
      };
      expect(visitor.mapType('integer', 'int32', schema)).toBe('integer');
    });

    it('should handle integer with int64 format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'integer',
        format: 'int64'
      };
      expect(visitor.mapType('integer', 'int64', schema)).toBe('integer');
    });

    it('should delegate to visitString when type is string and schema provided', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date'
      };
      expect(visitor.mapType('string', undefined, schema)).toBe('date');
    });

    it('should handle schema without type', () => {
      const schema: OpenAPIV3.SchemaObject = {
        properties: {
          name: { type: 'string' }
        }
      };
      expect(visitor.mapType(undefined, undefined, schema)).toBe('string');
    });

    it('should handle empty schema', () => {
      const schema: OpenAPIV3.SchemaObject = {};
      expect(visitor.mapType(undefined, undefined, schema)).toBe('string');
    });

    it('should handle null type', () => {
      expect(visitor.mapType(null as any, undefined)).toBe('string');
    });

    it('should handle null format', () => {
      expect(visitor.mapType('string', null as any)).toBe('string');
    });

    it('should handle both type and format as undefined', () => {
      expect(visitor.mapType(undefined, undefined, undefined)).toBe('string');
    });

    it('should handle contentMediaType with binary format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        contentMediaType: 'image/png'
      };
      // Format takes precedence
      expect(visitor.mapType('string', 'binary', schema)).toBe('file');
    });

    it('should handle contentMediaType without binary format', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/octet-stream'
      };
      expect(visitor.mapType('string', undefined, schema)).toBe('file');
    });

    it('should handle non-octet-stream contentMediaType', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/json'
      };
      expect(visitor.mapType('string', undefined, schema)).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle schema with multiple formats (use first)', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date'
      };
      expect(visitor.mapType('string', 'date', schema)).toBe('date');
    });

    it('should handle case-sensitive format values', () => {
      expect(visitor.mapType('string', 'Date')).toBe('string');
      expect(visitor.mapType('string', 'DATE')).toBe('string');
      expect(visitor.mapType('string', 'Binary')).toBe('string');
    });

    it('should handle case-sensitive type values', () => {
      expect(visitor.mapType('String', undefined)).toBe('string');
      expect(visitor.mapType('NUMBER', undefined)).toBe('string');
      expect(visitor.mapType('Integer', undefined)).toBe('string');
    });

    it('should handle whitespace in type', () => {
      expect(visitor.mapType(' string ', undefined)).toBe('string');
    });

    it('should handle whitespace in format', () => {
      expect(visitor.mapType('string', ' date ')).toBe('string');
    });

    it('should handle empty string type', () => {
      expect(visitor.mapType('', undefined)).toBe('string');
    });

    it('should handle empty string format', () => {
      expect(visitor.mapType('string', '')).toBe('string');
    });
  });

  describe('type mapping consistency', () => {
    it('should return consistent results for same input', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'date'
      };
      
      const result1 = visitor.mapType('string', 'date', schema);
      const result2 = visitor.mapType('string', 'date', schema);
      const result3 = visitor.visitString(schema);
      
      expect(result1).toBe(result2);
      expect(result1).toBe(result3);
    });

    it('should handle all OpenAPI primitive types', () => {
      expect(visitor.mapType('string', undefined)).toBe('string');
      expect(visitor.mapType('number', undefined)).toBe('number');
      expect(visitor.mapType('integer', undefined)).toBe('integer');
      expect(visitor.mapType('boolean', undefined)).toBe('boolean');
      expect(visitor.mapType('object', undefined)).toBe('object');
      expect(visitor.mapType('array', undefined)).toBe('array');
    });

    it('should handle all date-related formats', () => {
      expect(visitor.mapType('string', 'date')).toBe('date');
      expect(visitor.mapType('string', 'date-time')).toBe('date');
    });

    it('should handle all file-related formats', () => {
      expect(visitor.mapType('string', 'binary')).toBe('file');
      
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        contentMediaType: 'application/octet-stream'
      };
      expect(visitor.mapType('string', undefined, schema)).toBe('file');
    });
  });
});
