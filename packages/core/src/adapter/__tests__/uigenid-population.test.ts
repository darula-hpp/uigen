import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit tests for uigenId population in OpenAPI3Adapter
 * 
 * Test Coverage:
 * - Resource uigenId population from x-uigen-id vendor extension
 * - Resource uigenId fallback to slug
 * - Operation uigenId population from x-uigen-id vendor extension
 * - Operation uigenId fallback to operationId
 * 
 * Requirements: 1.3, 1.4, 1.5, 1.6
 */

describe('OpenAPI3Adapter - uigenId Population', () => {
  describe('Resource uigenId', () => {
    it('should populate resource uigenId from x-uigen-id vendor extension when present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-id': 'custom-users-id',
            get: {
              responses: { '200': { description: 'Success' } }
            }
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].slug).toBe('users');
      expect(result.resources[0].uigenId).toBe('custom-users-id');
    });

    it('should fall back to slug when x-uigen-id vendor extension is not present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/products': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].slug).toBe('products');
      expect(result.resources[0].uigenId).toBe('products');
    });

    it('should handle multiple resources with mixed x-uigen-id presence', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-id': 'custom-users',
            get: {
              responses: { '200': { description: 'Success' } }
            }
          } as any,
          '/products': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          },
          '/orders': {
            'x-uigen-id': 'custom-orders',
            get: {
              responses: { '200': { description: 'Success' } }
            }
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(3);
      
      const usersResource = result.resources.find(r => r.slug === 'users');
      expect(usersResource?.uigenId).toBe('custom-users');
      
      const productsResource = result.resources.find(r => r.slug === 'products');
      expect(productsResource?.uigenId).toBe('products');
      
      const ordersResource = result.resources.find(r => r.slug === 'orders');
      expect(ordersResource?.uigenId).toBe('custom-orders');
    });

    it('should ensure uigenId is always a non-empty string', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uigenId).toBeTruthy();
      expect(typeof result.resources[0].uigenId).toBe('string');
      expect(result.resources[0].uigenId.length).toBeGreaterThan(0);
    });
  });

  describe('Operation uigenId', () => {
    it('should populate operation uigenId from x-uigen-id vendor extension when present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              'x-uigen-id': 'custom-list-users-id',
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].id).toBe('listUsers');
      expect(result.resources[0].operations[0].uigenId).toBe('custom-list-users-id');
    });

    it('should fall back to operationId when x-uigen-id vendor extension is not present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/products': {
            get: {
              operationId: 'getProducts',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].id).toBe('getProducts');
      expect(result.resources[0].operations[0].uigenId).toBe('getProducts');
    });

    it('should fall back to generated id when neither x-uigen-id nor operationId is present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            post: {
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      
      const operation = result.resources[0].operations[0];
      expect(operation.id).toBeTruthy();
      expect(operation.uigenId).toBeTruthy();
      expect(operation.uigenId).toBe(operation.id);
    });

    it('should handle multiple operations with mixed x-uigen-id presence', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              'x-uigen-id': 'custom-list-users',
              responses: { '200': { description: 'Success' } }
            } as any,
            post: {
              operationId: 'createUser',
              responses: { '201': { description: 'Created' } }
            }
          },
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
              ],
              responses: { '200': { description: 'Success' } }
            },
            put: {
              operationId: 'updateUser',
              'x-uigen-id': 'custom-update-user',
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
              ],
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(4);
      
      const listOp = result.resources[0].operations.find(op => op.id === 'listUsers');
      expect(listOp?.uigenId).toBe('custom-list-users');
      
      const createOp = result.resources[0].operations.find(op => op.id === 'createUser');
      expect(createOp?.uigenId).toBe('createUser');
      
      const getOp = result.resources[0].operations.find(op => op.id === 'getUser');
      expect(getOp?.uigenId).toBe('getUser');
      
      const updateOp = result.resources[0].operations.find(op => op.id === 'updateUser');
      expect(updateOp?.uigenId).toBe('custom-update-user');
    });

    it('should ensure operation uigenId is always a non-empty string', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'Success' } }
            },
            post: {
              operationId: 'createItem',
              responses: { '201': { description: 'Created' } }
            },
            put: {
              operationId: 'updateItem',
              'x-uigen-id': 'custom-update',
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      result.resources[0].operations.forEach(operation => {
        expect(operation.uigenId).toBeTruthy();
        expect(typeof operation.uigenId).toBe('string');
        expect(operation.uigenId.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration - Resources and Operations together', () => {
    it('should populate both resource and operation uigenIds correctly', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-id': 'custom-users-resource',
            get: {
              operationId: 'listUsers',
              'x-uigen-id': 'custom-list-users-op',
              responses: { '200': { description: 'Success' } }
            } as any,
            post: {
              operationId: 'createUser',
              responses: { '201': { description: 'Created' } }
            }
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      
      // Resource uigenId should use x-uigen-id
      expect(result.resources[0].uigenId).toBe('custom-users-resource');
      expect(result.resources[0].slug).toBe('users');
      
      // First operation should use x-uigen-id
      const listOp = result.resources[0].operations.find(op => op.id === 'listUsers');
      expect(listOp?.uigenId).toBe('custom-list-users-op');
      
      // Second operation should fall back to operationId
      const createOp = result.resources[0].operations.find(op => op.id === 'createUser');
      expect(createOp?.uigenId).toBe('createUser');
    });

    it('should handle complex spec with multiple resources and operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-id': 'users-v2',
            get: {
              operationId: 'listUsers',
              responses: { '200': { description: 'Success' } }
            },
            post: {
              operationId: 'createUser',
              'x-uigen-id': 'create-user-v2',
              responses: { '201': { description: 'Created' } }
            } as any
          } as any,
          '/products': {
            get: {
              operationId: 'listProducts',
              'x-uigen-id': 'list-products-v2',
              responses: { '200': { description: 'Success' } }
            } as any,
            post: {
              operationId: 'createProduct',
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(2);
      
      // Users resource
      const usersResource = result.resources.find(r => r.slug === 'users');
      expect(usersResource?.uigenId).toBe('users-v2');
      expect(usersResource?.operations).toHaveLength(2);
      
      const listUsersOp = usersResource?.operations.find(op => op.id === 'listUsers');
      expect(listUsersOp?.uigenId).toBe('listUsers'); // Falls back to id
      
      const createUserOp = usersResource?.operations.find(op => op.id === 'createUser');
      expect(createUserOp?.uigenId).toBe('create-user-v2'); // Uses x-uigen-id
      
      // Products resource
      const productsResource = result.resources.find(r => r.slug === 'products');
      expect(productsResource?.uigenId).toBe('products'); // Falls back to slug
      expect(productsResource?.operations).toHaveLength(2);
      
      const listProductsOp = productsResource?.operations.find(op => op.id === 'listProducts');
      expect(listProductsOp?.uigenId).toBe('list-products-v2'); // Uses x-uigen-id
      
      const createProductOp = productsResource?.operations.find(op => op.id === 'createProduct');
      expect(createProductOp?.uigenId).toBe('createProduct'); // Falls back to id
    });
  });
});
