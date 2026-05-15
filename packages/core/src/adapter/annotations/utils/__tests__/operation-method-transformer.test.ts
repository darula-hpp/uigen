import { describe, it, expect } from 'vitest';
import { OperationMethodTransformer } from '../operation-method-transformer.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('OperationMethodTransformer', () => {
  describe('validate', () => {
    it('should return valid for a valid transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(spec, '/users', 'post', 'get');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    it('should return invalid when path does not exist', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const result = OperationMethodTransformer.validate(spec, '/users', 'post', 'get');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path /users not found in spec');
    });
    
    it('should return invalid when original method does not exist', () => {
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
      
      const result = OperationMethodTransformer.validate(spec, '/users', 'post', 'put');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Method POST not found at /users');
    });
    
    it('should return invalid when target method already exists', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            },
            get: {
              operationId: 'getUsers',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(spec, '/users', 'post', 'get');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Method GET already exists at /users');
    });
    
    it('should handle missing paths object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: undefined as any
      };
      
      const result = OperationMethodTransformer.validate(spec, '/users', 'post', 'get');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path /users not found in spec');
    });
  });
  
  describe('transform', () => {
    it('should successfully move operation between methods', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              summary: 'Create a user',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(true);
      expect(spec.paths['/users'].post).toBeUndefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].get?.operationId).toBe('createUser');
    });
    
    it('should preserve all operation properties during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              summary: 'Create a user',
              description: 'Creates a new user in the system',
              tags: ['users'],
              parameters: [
                {
                  name: 'x-api-key',
                  in: 'header',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'User created'
                }
              }
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(true);
      const getOperation = spec.paths['/users'].get;
      expect(getOperation?.operationId).toBe('createUser');
      expect(getOperation?.summary).toBe('Create a user');
      expect(getOperation?.description).toBe('Creates a new user in the system');
      expect(getOperation?.tags).toEqual(['users']);
      expect(getOperation?.parameters).toHaveLength(1);
      expect(getOperation?.requestBody).toBeDefined();
      expect(getOperation?.responses).toHaveProperty('201');
    });
    
    it('should remove operation from original method location', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            },
            put: {
              operationId: 'updateUser',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(true);
      expect(spec.paths['/users'].post).toBeUndefined();
      expect(spec.paths['/users'].get).toBeDefined();
      expect(spec.paths['/users'].put).toBeDefined(); // Other methods unaffected
    });
    
    it('should add operation to new method location', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'patch');
      
      expect(success).toBe(true);
      expect(spec.paths['/users'].patch).toBeDefined();
      expect(spec.paths['/users'].patch?.operationId).toBe('createUser');
    });
    
    it('should preserve operationId when moving between methods', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            delete: {
              operationId: 'deleteUser',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'delete', 'post');
      
      expect(success).toBe(true);
      expect(spec.paths['/users'].post?.operationId).toBe('deleteUser');
    });
    
    it('should return false when validation fails', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            },
            get: {
              operationId: 'getUsers',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(false);
      // Original operation should remain unchanged
      expect(spec.paths['/users'].post).toBeDefined();
      expect(spec.paths['/users'].get?.operationId).toBe('getUsers');
    });
    
    it('should return false when path does not exist', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(false);
    });
    
    it('should return false when original method does not exist', () => {
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
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'put');
      
      expect(success).toBe(false);
    });
    
    it('should handle complex operation with extensions', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              'x-uigen-label': 'Create User',
              'x-custom-extension': { foo: 'bar' },
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(true);
      const getOperation = spec.paths['/users'].get as any;
      expect(getOperation['x-uigen-label']).toBe('Create User');
      expect(getOperation['x-custom-extension']).toEqual({ foo: 'bar' });
    });
    
    it('should handle Swagger 2.0 specs', () => {
      const spec: any = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              responses: {}
            }
          }
        }
      };
      
      const success = OperationMethodTransformer.transform(spec, '/users', 'post', 'get');
      
      expect(success).toBe(true);
      expect(spec.paths['/users'].post).toBeUndefined();
      expect(spec.paths['/users'].get).toBeDefined();
    });
  });
});
