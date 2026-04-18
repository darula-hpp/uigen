/**
 * Unit tests for Element Path Resolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ElementPathResolver } from '../../path-resolver';
import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from '../../types';

describe('ElementPathResolver', () => {
  let resolver: ElementPathResolver;

  beforeEach(() => {
    resolver = new ElementPathResolver();
  });

  describe('Operation Path Resolution', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            summary: 'Get users',
            responses: {},
          },
          post: {
            summary: 'Create user',
            responses: {},
          },
        },
        '/users/{id}': {
          get: {
            summary: 'Get user by ID',
            responses: {},
          },
          put: {
            summary: 'Update user',
            responses: {},
          },
          delete: {
            summary: 'Delete user',
            responses: {},
          },
        },
      },
    };

    it('should resolve GET operation', () => {
      const resolved = resolver.resolve(spec, 'GET:/users');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
      expect(resolved?.object).toHaveProperty('summary', 'Get users');
    });

    it('should resolve POST operation', () => {
      const resolved = resolver.resolve(spec, 'POST:/users');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
      expect(resolved?.object).toHaveProperty('summary', 'Create user');
    });

    it('should resolve PUT operation', () => {
      const resolved = resolver.resolve(spec, 'PUT:/users/{id}');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
      expect(resolved?.object).toHaveProperty('summary', 'Update user');
    });

    it('should resolve DELETE operation', () => {
      const resolved = resolver.resolve(spec, 'DELETE:/users/{id}');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
      expect(resolved?.object).toHaveProperty('summary', 'Delete user');
    });

    it('should handle path parameters', () => {
      const resolved = resolver.resolve(spec, 'GET:/users/{id}');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
      expect(resolved?.object).toHaveProperty('summary', 'Get user by ID');
    });

    it('should return null for non-existent path', () => {
      const resolved = resolver.resolve(spec, 'GET:/nonexistent');
      
      expect(resolved).toBeNull();
    });

    it('should return null for non-existent method', () => {
      const resolved = resolver.resolve(spec, 'PATCH:/users');
      
      expect(resolved).toBeNull();
    });

    it('should be case-insensitive for HTTP methods', () => {
      const resolved = resolver.resolve(spec, 'get:/users');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
    });
  });

  describe('Schema Property Path Resolution', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  country: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          Product: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    };

    it('should resolve top-level property', () => {
      const resolved = resolver.resolve(spec, 'User.email');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
      expect(resolved?.object).toHaveProperty('type', 'string');
    });

    it('should resolve nested property', () => {
      const resolved = resolver.resolve(spec, 'User.address.street');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
      expect(resolved?.object).toHaveProperty('type', 'string');
    });

    it('should resolve deeply nested property', () => {
      const resolved = resolver.resolve(spec, 'User.address.country.code');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
      expect(resolved?.object).toHaveProperty('type', 'string');
    });

    it('should return null for non-existent schema', () => {
      const resolved = resolver.resolve(spec, 'NonExistent.property');
      
      expect(resolved).toBeNull();
    });

    it('should return null for non-existent property', () => {
      const resolved = resolver.resolve(spec, 'User.nonexistent');
      
      expect(resolved).toBeNull();
    });

    it('should return null for schema without property path', () => {
      const resolved = resolver.resolve(spec, 'User');
      
      expect(resolved).toBeNull();
    });
  });

  describe('$ref Resolution', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              address: {
                $ref: '#/components/schemas/Address',
              },
            },
          },
        },
      },
    };

    it('should resolve $ref in schema', () => {
      const resolved = resolver.resolve(spec, 'User.address.street');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
      expect(resolved?.object).toHaveProperty('type', 'string');
    });

    it('should handle $ref at schema level', () => {
      const specWithRef: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            BaseUser: {
              type: 'object',
              properties: {
                email: { type: 'string' },
              },
            },
            User: {
              $ref: '#/components/schemas/BaseUser',
            },
          },
        },
      };

      const resolved = resolver.resolve(specWithRef, 'User.email');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
    });
  });

  describe('Swagger 2.0 Support', () => {
    const spec: Swagger2Document = {
      swagger: '2.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            summary: 'Get users',
            responses: {},
          },
        },
      },
      definitions: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    };

    it('should resolve operation in Swagger 2.0', () => {
      const resolved = resolver.resolve(spec, 'GET:/users');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('operation');
    });

    it('should resolve schema property in Swagger 2.0', () => {
      const resolved = resolver.resolve(spec, 'User.email');
      
      expect(resolved).not.toBeNull();
      expect(resolved?.type).toBe('schema-property');
    });
  });

  describe('Path Similarity Suggestions', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: { responses: {} },
          post: { responses: {} },
        },
        '/products': {
          get: { responses: {} },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              username: { type: 'string' },
            },
          },
        },
      },
    };

    it('should suggest similar operation paths', () => {
      const suggestions = resolver.suggestSimilarPaths(spec, 'GET:/userz');
      
      expect(suggestions).toContain('GET:/users');
    });

    it('should suggest similar schema property paths', () => {
      const suggestions = resolver.suggestSimilarPaths(spec, 'User.emial');
      
      expect(suggestions).toContain('User.email');
    });

    it('should limit suggestions to maxSuggestions', () => {
      const suggestions = resolver.suggestSimilarPaths(spec, 'GET:/x', 2);
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should not suggest paths with distance > 50% of path length', () => {
      const suggestions = resolver.suggestSimilarPaths(spec, 'COMPLETELY_DIFFERENT');
      
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Cache Behavior', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: { responses: {} },
        },
      },
    };

    it('should cache resolved paths', () => {
      const resolved1 = resolver.resolve(spec, 'GET:/users');
      const resolved2 = resolver.resolve(spec, 'GET:/users');
      
      // Should return the same object reference (cached)
      expect(resolved1).toBe(resolved2);
    });

    it('should cache null results', () => {
      const resolved1 = resolver.resolve(spec, 'GET:/nonexistent');
      const resolved2 = resolver.resolve(spec, 'GET:/nonexistent');
      
      expect(resolved1).toBeNull();
      expect(resolved2).toBeNull();
    });

    it('should clear cache', () => {
      resolver.resolve(spec, 'GET:/users');
      resolver.clearCache();
      
      // After clearing cache, should resolve again
      const resolved = resolver.resolve(spec, 'GET:/users');
      expect(resolved).not.toBeNull();
    });
  });

  describe('Invalid Path Formats', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    };

    it('should return null for path without colon or dot', () => {
      const resolved = resolver.resolve(spec, 'invalid');
      
      expect(resolved).toBeNull();
    });

    it('should return null for empty path', () => {
      const resolved = resolver.resolve(spec, '');
      
      expect(resolved).toBeNull();
    });
  });
});
