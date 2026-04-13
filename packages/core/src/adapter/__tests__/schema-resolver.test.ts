import { describe, it, expect, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { SchemaResolver } from '../schema-resolver.js';
import type { SchemaNode } from '../ir/types.js';

describe('SchemaResolver', () => {
  let spec: OpenAPIV3.Document;
  let resolver: SchemaResolver;

  // Simple adapter function for testing
  const adaptSchema = (key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited?: Set<string>): SchemaNode => {
    // Handle reference objects
    if ('$ref' in schema) {
      return {
        type: 'object',
        key,
        label: key,
        required: false
      };
    }
    
    return {
      type: schema.type === 'string' ? 'string' : 
            schema.type === 'number' ? 'number' :
            schema.type === 'integer' ? 'integer' :
            schema.type === 'boolean' ? 'boolean' :
            schema.type === 'array' ? 'array' :
            schema.type === 'object' ? 'object' : 'string',
      key,
      label: key,
      required: false,
      description: schema.description
    };
  };

  beforeEach(() => {
    spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          },
          Post: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              author: { $ref: '#/components/schemas/User' }
            }
          },
          CircularA: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              b: { $ref: '#/components/schemas/CircularB' }
            }
          },
          CircularB: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              a: { $ref: '#/components/schemas/CircularA' }
            }
          }
        }
      }
    };

    resolver = new SchemaResolver(spec, adaptSchema);
  });

  describe('$ref resolution', () => {
    it('should resolve a simple schema reference', () => {
      const result = resolver.resolve('#/components/schemas/User');
      
      expect(result).not.toBeNull();
      expect(result?.key).toBe('User');
      expect(result?.type).toBe('object');
    });

    it('should resolve nested schema references', () => {
      const result = resolver.resolve('#/components/schemas/Post');
      
      expect(result).not.toBeNull();
      expect(result?.key).toBe('Post');
      expect(result?.type).toBe('object');
    });

    it('should return null for unresolvable references', () => {
      const result = resolver.resolve('#/components/schemas/NonExistent');
      
      expect(result).toBeNull();
    });

    it('should handle external references gracefully', () => {
      const result = resolver.resolve('external.yaml#/components/schemas/User');
      
      expect(result).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache resolved references', () => {
      const first = resolver.resolve('#/components/schemas/User');
      const second = resolver.resolve('#/components/schemas/User');
      
      // Should return the same cached instance
      expect(first).toBe(second);
    });

    it('should clear cache when requested', () => {
      const first = resolver.resolve('#/components/schemas/User');
      resolver.clearCache();
      const second = resolver.resolve('#/components/schemas/User');
      
      // After clearing cache, should create a new instance
      expect(first).not.toBe(second);
      expect(first?.key).toBe(second?.key);
    });
  });

  describe('circular reference detection', () => {
    it('should detect circular references and return placeholder', () => {
      const result = resolver.resolve('#/components/schemas/CircularA');
      
      expect(result).not.toBeNull();
      expect(result?.key).toBe('CircularA');
      // Should not throw or hang
    });

    it('should handle mutual circular references', () => {
      const resultA = resolver.resolve('#/components/schemas/CircularA');
      const resultB = resolver.resolve('#/components/schemas/CircularB');
      
      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      // Should not throw or hang
    });
  });

  describe('path navigation', () => {
    it('should navigate complex reference paths', () => {
      const result = resolver.resolve('#/components/schemas/User');
      
      expect(result).not.toBeNull();
      expect(result?.key).toBe('User');
    });

    it('should handle invalid paths gracefully', () => {
      const result = resolver.resolve('#/invalid/path/User');
      
      expect(result).toBeNull();
    });

    it('should handle malformed reference paths', () => {
      const result = resolver.resolve('not-a-valid-ref');
      
      expect(result).toBeNull();
    });
  });
});
