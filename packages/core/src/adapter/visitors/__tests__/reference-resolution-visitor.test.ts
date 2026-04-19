import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultReferenceResolutionVisitor } from '../reference-resolution-visitor.js';
import { SchemaResolver } from '../../schema-resolver.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../../ir/types.js';

describe('DefaultReferenceResolutionVisitor', () => {
  let visitor: DefaultReferenceResolutionVisitor;
  let mockResolver: SchemaResolver;
  let mockDocument: OpenAPIV3.Document;

  beforeEach(() => {
    // Create a minimal OpenAPI document
    mockDocument = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          Post: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              author: { $ref: '#/components/schemas/User' }
            }
          },
          Node: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              next: { $ref: '#/components/schemas/Node' }
            }
          }
        }
      }
    };

    // Create a mock adaptSchema function
    const mockAdaptSchema = (key: string, schema: OpenAPIV3.SchemaObject, visited?: Set<string>): SchemaNode => {
      return {
        type: 'object',
        key,
        label: key,
        required: false
      };
    };

    mockResolver = new SchemaResolver(mockDocument, mockAdaptSchema);
    visitor = new DefaultReferenceResolutionVisitor(mockResolver);
  });

  describe('resolveReference', () => {
    it('should resolve a valid reference', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/User', visited);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result?.key).toBe('User');
    });

    it('should return null for invalid reference', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/NonExistent', visited);

      expect(result).toBeNull();
    });

    it('should handle circular references', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/Node', visited);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result?.key).toBe('Node');
    });

    it('should detect circular reference when ref is in visited set', () => {
      const visited = new Set<string>(['#/components/schemas/Node']);
      const result = visitor.resolveReference('#/components/schemas/Node', visited);

      // SchemaResolver should detect circular reference and return placeholder
      expect(result).toBeDefined();
      expect(result?.type).toBe('object');
    });

    it('should pass visited set to resolver', () => {
      const visited = new Set<string>(['#/components/schemas/Other']);
      const resolveSpy = vi.spyOn(mockResolver, 'resolve');

      visitor.resolveReference('#/components/schemas/User', visited);

      expect(resolveSpy).toHaveBeenCalledWith('#/components/schemas/User', visited);
    });

    it('should handle nested references', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/Post', visited);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result?.key).toBe('Post');
    });

    it('should handle external references gracefully', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('external.yaml#/components/schemas/User', visited);

      // External references are not supported, should return null
      expect(result).toBeNull();
    });

    it('should handle malformed references gracefully', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('not-a-valid-ref', visited);

      expect(result).toBeNull();
    });

    it('should handle empty reference', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('', visited);

      expect(result).toBeNull();
    });

    it('should handle reference with empty visited set', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/User', visited);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it('should use resolver caching for repeated references', () => {
      const visited1 = new Set<string>();
      const visited2 = new Set<string>();

      const result1 = visitor.resolveReference('#/components/schemas/User', visited1);
      const result2 = visitor.resolveReference('#/components/schemas/User', visited2);

      // Both should return the same cached result
      expect(result1).toBe(result2);
    });
  });

  describe('detectCircularReference', () => {
    it('should return true when reference is in visited set', () => {
      const visited = new Set<string>(['#/components/schemas/Node']);
      const result = visitor.detectCircularReference('#/components/schemas/Node', visited);

      expect(result).toBe(true);
    });

    it('should return false when reference is not in visited set', () => {
      const visited = new Set<string>(['#/components/schemas/User']);
      const result = visitor.detectCircularReference('#/components/schemas/Post', visited);

      expect(result).toBe(false);
    });

    it('should return false for empty visited set', () => {
      const visited = new Set<string>();
      const result = visitor.detectCircularReference('#/components/schemas/User', visited);

      expect(result).toBe(false);
    });

    it('should handle multiple references in visited set', () => {
      const visited = new Set<string>([
        '#/components/schemas/User',
        '#/components/schemas/Post',
        '#/components/schemas/Node'
      ]);

      expect(visitor.detectCircularReference('#/components/schemas/User', visited)).toBe(true);
      expect(visitor.detectCircularReference('#/components/schemas/Post', visited)).toBe(true);
      expect(visitor.detectCircularReference('#/components/schemas/Node', visited)).toBe(true);
      expect(visitor.detectCircularReference('#/components/schemas/Other', visited)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const visited = new Set<string>(['#/components/schemas/User']);
      
      expect(visitor.detectCircularReference('#/components/schemas/User', visited)).toBe(true);
      expect(visitor.detectCircularReference('#/components/schemas/user', visited)).toBe(false);
    });

    it('should handle exact path matching', () => {
      const visited = new Set<string>(['#/components/schemas/User']);
      
      expect(visitor.detectCircularReference('#/components/schemas/User', visited)).toBe(true);
      expect(visitor.detectCircularReference('#/components/schemas/UserProfile', visited)).toBe(false);
    });
  });

  describe('integration with SchemaResolver', () => {
    it('should delegate resolution to SchemaResolver', () => {
      const resolveSpy = vi.spyOn(mockResolver, 'resolve');
      const visited = new Set<string>();

      visitor.resolveReference('#/components/schemas/User', visited);

      expect(resolveSpy).toHaveBeenCalledTimes(1);
      expect(resolveSpy).toHaveBeenCalledWith('#/components/schemas/User', visited);
    });

    it('should return SchemaResolver result directly', () => {
      const visited = new Set<string>();
      const mockResult: SchemaNode = {
        type: 'object',
        key: 'MockUser',
        label: 'Mock User',
        required: false
      };

      vi.spyOn(mockResolver, 'resolve').mockReturnValue(mockResult);

      const result = visitor.resolveReference('#/components/schemas/User', visited);

      expect(result).toBe(mockResult);
    });

    it('should return null when SchemaResolver returns null', () => {
      const visited = new Set<string>();

      vi.spyOn(mockResolver, 'resolve').mockReturnValue(null);

      const result = visitor.resolveReference('#/components/schemas/NonExistent', visited);

      expect(result).toBeNull();
    });
  });

  describe('circular reference scenarios', () => {
    it('should handle self-referencing schema', () => {
      const visited = new Set<string>();
      const result = visitor.resolveReference('#/components/schemas/Node', visited);

      // Should resolve successfully (SchemaResolver handles circular detection internally)
      expect(result).toBeDefined();
      expect(result?.key).toBe('Node');
    });

    it('should detect circular reference on second visit', () => {
      const visited = new Set<string>();
      
      // First visit - should succeed
      const isCircular1 = visitor.detectCircularReference('#/components/schemas/Node', visited);
      expect(isCircular1).toBe(false);

      // Add to visited
      visited.add('#/components/schemas/Node');

      // Second visit - should detect circular reference
      const isCircular2 = visitor.detectCircularReference('#/components/schemas/Node', visited);
      expect(isCircular2).toBe(true);
    });

    it('should handle mutually referencing schemas', () => {
      // Create a document with mutual references
      const mutualRefDoc: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            A: {
              type: 'object',
              properties: {
                b: { $ref: '#/components/schemas/B' }
              }
            },
            B: {
              type: 'object',
              properties: {
                a: { $ref: '#/components/schemas/A' }
              }
            }
          }
        }
      };

      const mockAdaptSchema = (key: string): SchemaNode => ({
        type: 'object',
        key,
        label: key,
        required: false
      });

      const resolver = new SchemaResolver(mutualRefDoc, mockAdaptSchema);
      const mutualVisitor = new DefaultReferenceResolutionVisitor(resolver);

      const visited = new Set<string>();
      const result = mutualVisitor.resolveReference('#/components/schemas/A', visited);

      // Should resolve successfully
      expect(result).toBeDefined();
      expect(result?.key).toBe('A');
    });
  });
});
