import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OperationMethodTransformer } from '../operation-method-transformer.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('OperationMethodTransformer', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });
  
  describe('validate', () => {
    it('should return valid for a valid transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              summary: 'Create a user',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    it('should detect missing path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/nonexistent',
        'post',
        'get'
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Path /api/v1/nonexistent not found in spec']);
    });
    
    it('should detect missing original method', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            get: {
              operationId: 'list_users',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/users',
        'post',
        'put'
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Method POST not found at /api/v1/users']);
    });
    
    it('should detect method conflict when target method already exists', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            },
            get: {
              operationId: 'list_users',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Method GET already exists at /api/v1/users']);
    });
    
    it('should handle spec with no paths object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: undefined as any
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Path /api/v1/users not found in spec']);
    });
    
    it('should validate transformation with path parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users/{id}': {
            put: {
              operationId: 'update_user',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.validate(
        spec,
        '/api/v1/users/{id}',
        'put',
        'patch'
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
  
  describe('transform', () => {
    it('should successfully transform operation between methods', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              summary: 'Create a user',
              description: 'Creates a new user in the system',
              responses: {
                '201': {
                  description: 'User created'
                }
              }
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result).toBe(true);
      expect(spec.paths['/api/v1/users'].get).toBeDefined();
      expect(spec.paths['/api/v1/users'].post).toBeUndefined();
    });
    
    it('should preserve operationId during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.operationId).toBe('create_user');
    });
    
    it('should preserve summary during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              summary: 'Create a new user',
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.summary).toBe('Create a new user');
    });
    
    it('should preserve parameters during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users/{id}': {
            put: {
              operationId: 'update_user',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                },
                {
                  name: 'force',
                  in: 'query',
                  required: false,
                  schema: { type: 'boolean' }
                }
              ],
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users/{id}',
        'put',
        'patch'
      );
      
      expect(spec.paths['/api/v1/users/{id}'].patch?.parameters).toHaveLength(2);
      expect(spec.paths['/api/v1/users/{id}'].patch?.parameters?.[0].name).toBe('id');
      expect(spec.paths['/api/v1/users/{id}'].patch?.parameters?.[1].name).toBe('force');
    });
    
    it('should preserve description during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              description: 'Creates a new user in the system with the provided details',
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.description).toBe(
        'Creates a new user in the system with the provided details'
      );
    });
    
    it('should preserve requestBody during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.requestBody).toBeDefined();
      expect((spec.paths['/api/v1/users'].get?.requestBody as any)?.required).toBe(true);
    });
    
    it('should preserve responses during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {
                '201': {
                  description: 'User created successfully'
                },
                '400': {
                  description: 'Invalid input'
                }
              }
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.responses).toBeDefined();
      expect(spec.paths['/api/v1/users'].get?.responses?.['201']).toBeDefined();
      expect(spec.paths['/api/v1/users'].get?.responses?.['400']).toBeDefined();
    });
    
    it('should preserve tags during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              tags: ['users', 'admin'],
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.tags).toEqual(['users', 'admin']);
    });
    
    it('should preserve security requirements during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              security: [
                { bearerAuth: [] }
              ],
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].get?.security).toEqual([
        { bearerAuth: [] }
      ]);
    });
    
    it('should preserve custom x-* extensions during transformation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              'x-uigen-label': 'Create User',
              'x-custom-field': 'custom-value',
              responses: {}
            } as any
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect((spec.paths['/api/v1/users'].get as any)?.['x-uigen-label']).toBe('Create User');
      expect((spec.paths['/api/v1/users'].get as any)?.['x-custom-field']).toBe('custom-value');
    });
    
    it('should remove operation from original method location', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            }
          }
        }
      };
      
      OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(spec.paths['/api/v1/users'].post).toBeUndefined();
    });
    
    it('should return false and log warning when validation fails', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            get: {
              operationId: 'list_users',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot transform POST:/api/v1/users to GET')
      );
    });
    
    it('should return false when target method already exists', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            },
            get: {
              operationId: 'list_users',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result).toBe(false);
      expect(spec.paths['/api/v1/users'].post).toBeDefined();
      expect(spec.paths['/api/v1/users'].get?.operationId).toBe('list_users');
    });
    
    it('should handle transformation with multiple operations on same path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            },
            delete: {
              operationId: 'delete_all_users',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result).toBe(true);
      expect(spec.paths['/api/v1/users'].get).toBeDefined();
      expect(spec.paths['/api/v1/users'].post).toBeUndefined();
      expect(spec.paths['/api/v1/users'].delete).toBeDefined();
    });
    
    it('should work with Swagger 2.0 documents', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec as any,
        '/api/v1/users',
        'post',
        'get'
      );
      
      expect(result).toBe(true);
      expect(spec.paths['/api/v1/users'].get).toBeDefined();
      expect(spec.paths['/api/v1/users'].post).toBeUndefined();
    });
    
    it('should handle case-insensitive method names', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/v1/users': {
            post: {
              operationId: 'create_user',
              responses: {}
            }
          }
        }
      };
      
      const result = OperationMethodTransformer.transform(
        spec,
        '/api/v1/users',
        'POST',
        'GET'
      );
      
      // Should fail because OpenAPI uses lowercase method names
      expect(result).toBe(false);
    });
  });
});
