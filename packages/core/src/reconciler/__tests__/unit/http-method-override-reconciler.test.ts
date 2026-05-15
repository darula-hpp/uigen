import { describe, it, expect } from 'vitest';
import { HttpMethodOverrideReconciler } from '../../http-method-override-reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('HttpMethodOverrideReconciler', () => {
  let reconciler: HttpMethodOverrideReconciler;
  
  beforeEach(() => {
    reconciler = new HttpMethodOverrideReconciler();
  });
  
  describe('reconcile', () => {
    it('should return unchanged spec when no HTTP method override annotations exist', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {}
            }
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.warnings).toEqual([]);
      expect(result.results).toEqual([]);
      expect(result.spec.paths['/users'].get).toBeDefined();
    });
    
    it('should apply x-uigen-http-get override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.warnings).toEqual([]);
      expect(result.spec.paths['/users'].post).toBeUndefined();
      expect(result.spec.paths['/users'].get).toBeDefined();
      expect(result.spec.paths['/users'].get?.operationId).toBe('createUser');
    });
    
    it('should apply x-uigen-http-post override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/logout': {
            delete: {
              operationId: 'logout',
              'x-uigen-http-post': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/logout'].delete).toBeUndefined();
      expect(result.spec.paths['/logout'].post).toBeDefined();
    });
    
    it('should apply x-uigen-http-put override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            post: {
              operationId: 'updateUser',
              'x-uigen-http-put': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/users/{id}'].post).toBeUndefined();
      expect(result.spec.paths['/users/{id}'].put).toBeDefined();
    });
    
    it('should apply x-uigen-http-delete override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            post: {
              operationId: 'deleteUser',
              'x-uigen-http-delete': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/users/{id}'].post).toBeUndefined();
      expect(result.spec.paths['/users/{id}'].delete).toBeDefined();
    });
    
    it('should apply x-uigen-http-patch override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            put: {
              operationId: 'patchUser',
              'x-uigen-http-patch': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/users/{id}'].put).toBeUndefined();
      expect(result.spec.paths['/users/{id}'].patch).toBeDefined();
    });
    
    it('should ignore override when annotation value is false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': false,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.spec.paths['/users'].post).toBeDefined();
      expect(result.spec.paths['/users'].get).toBeUndefined();
    });
    
    it('should skip override when already the target method', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              'x-uigen-http-get': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.spec.paths['/users'].get).toBeDefined();
    });
    
    it('should handle multiple overrides on different operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            } as any
          },
          '/logout': {
            delete: {
              operationId: 'logout',
              'x-uigen-http-post': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(2);
      expect(result.spec.paths['/users'].get).toBeDefined();
      expect(result.spec.paths['/logout'].post).toBeDefined();
    });
    
    it('should add warning when target method already exists', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            } as any,
            get: {
              operationId: 'getUsers',
              responses: {}
            }
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Method GET already exists at /users');
    });
    
    it('should preserve all operation properties during override', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              summary: 'Create a user',
              description: 'Creates a new user',
              tags: ['users'],
              'x-uigen-http-get': true,
              'x-uigen-label': 'List Users',
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      const getOp = result.spec.paths['/users'].get as any;
      expect(getOp.operationId).toBe('createUser');
      expect(getOp.summary).toBe('Create a user');
      expect(getOp.description).toBe('Creates a new user');
      expect(getOp.tags).toEqual(['users']);
      expect(getOp['x-uigen-label']).toBe('List Users');
    });
    
    it('should handle empty paths object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.warnings).toEqual([]);
    });
    
    it('should handle missing paths object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: undefined as any
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(0);
      expect(result.warnings).toEqual([]);
    });
    
    it('should only apply first override annotation when multiple exist', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              'x-uigen-http-put': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/users'].get).toBeDefined();
      expect(result.spec.paths['/users'].put).toBeUndefined();
    });
    
    it('should not mutate original spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            } as any
          }
        }
      };
      
      const originalPost = spec.paths['/users'].post;
      
      reconciler.reconcile(spec);
      
      // Original spec should be unchanged
      expect(spec.paths['/users'].post).toBe(originalPost);
      expect(spec.paths['/users'].get).toBeUndefined();
    });
    
    it('should handle Swagger 2.0 specs', () => {
      const spec: any = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            }
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.overrideCount).toBe(1);
      expect(result.spec.paths['/users'].get).toBeDefined();
    });
    
    it('should include detailed results for each override attempt', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-http-get': true,
              responses: {}
            } as any
          }
        }
      };
      
      const result = reconciler.reconcile(spec);
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        path: '/users',
        originalMethod: 'post',
        newMethod: 'get',
        success: true
      });
    });
  });
});
