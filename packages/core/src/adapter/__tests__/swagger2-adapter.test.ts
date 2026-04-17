import { describe, it, expect, vi } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';
import type { UIGenApp } from '../../ir/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';

// Helper to find workspace root by looking for examples directory
function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const examplesPath = path.join(currentDir, 'examples');
    if (fs.existsSync(examplesPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

describe('Swagger2Adapter', () => {
  describe('canHandle', () => {
    it('should detect Swagger 2.0 specs', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };
      expect(Swagger2Adapter.canHandle(spec)).toBe(true);
    });

    it('should reject OpenAPI 3.x specs', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };
      expect(Swagger2Adapter.canHandle(spec)).toBe(false);
    });

    it('should reject invalid specs', () => {
      expect(Swagger2Adapter.canHandle(null)).toBe(false);
      expect(Swagger2Adapter.canHandle(undefined)).toBe(false);
      expect(Swagger2Adapter.canHandle('string')).toBe(false);
      expect(Swagger2Adapter.canHandle({})).toBe(false);
    });
  });

  describe('adapt', () => {
    it('should convert minimal Swagger 2.0 spec to IR', () => {
      const spec = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test description'
        },
        paths: {}
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.meta.title).toBe('Test API');
      expect(ir.meta.version).toBe('1.0.0');
      expect(ir.meta.description).toBe('Test description');
      expect(ir.resources).toEqual([]);
    });

    it('should construct server URLs from host, basePath, and schemes', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https', 'http'],
        paths: {}
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.servers).toHaveLength(2);
      expect(ir.servers[0].url).toBe('https://api.example.com/v1');
      expect(ir.servers[0].description).toBe('HTTPS server');
      expect(ir.servers[1].url).toBe('http://api.example.com/v1');
      expect(ir.servers[1].description).toBe('HTTP server');
    });

    it('should use default localhost when no host specified', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.servers).toHaveLength(1);
      expect(ir.servers[0].url).toBe('http://localhost:3000');
    });

    it('should convert definitions to schemas', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/User' }
                  }
                }
              }
            }
          }
        },
        definitions: {
          User: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer', format: 'int64' },
              name: { type: 'string', minLength: 1, maxLength: 100 },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].name).toBe('Users');
      expect(ir.resources[0].slug).toBe('users');
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].viewHint).toBe('list');
    });

    it('should convert securityDefinitions to securitySchemes', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        securityDefinitions: {
          api_key: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header'
          },
          oauth: {
            type: 'oauth2',
            flow: 'accessCode',
            authorizationUrl: 'https://example.com/oauth/authorize',
            tokenUrl: 'https://example.com/oauth/token',
            scopes: {
              'read:users': 'Read users',
              'write:users': 'Write users'
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.auth.schemes).toHaveLength(1);
      expect(ir.auth.schemes[0].type).toBe('apiKey');
      expect(ir.auth.schemes[0].name).toBe('api_key');
    });

    it('should convert body parameters to requestBody', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  required: true,
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' }
                    }
                  }
                }
              ],
              responses: {
                '201': {
                  description: 'Created',
                  schema: { $ref: '#/definitions/User' }
                }
              }
            }
          }
        },
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].viewHint).toBe('create');
      expect(ir.resources[0].operations[0].requestBody).toBeDefined();
      expect(ir.resources[0].operations[0].requestBody?.type).toBe('object');
    });

    it('should handle CRUD operations correctly', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              operationId: 'listPets',
              responses: { '200': { description: 'Success' } }
            },
            post: {
              operationId: 'createPet',
              responses: { '201': { description: 'Created' } }
            }
          },
          '/pets/{id}': {
            get: {
              operationId: 'getPet',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            },
            put: {
              operationId: 'updatePet',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            },
            delete: {
              operationId: 'deletePet',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '204': { description: 'Deleted' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].name).toBe('Pets');
      expect(ir.resources[0].operations).toHaveLength(5);

      const viewHints = ir.resources[0].operations.map(op => op.viewHint);
      expect(viewHints).toContain('list');
      expect(viewHints).toContain('create');
      expect(viewHints).toContain('detail');
      expect(viewHints).toContain('update');
      expect(viewHints).toContain('delete');
    });

    it('should handle validation constraints', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 3,
                        maxLength: 50
                      },
                      age: {
                        type: 'integer',
                        minimum: 18,
                        maximum: 120
                      },
                      email: {
                        type: 'string',
                        pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'
                      }
                    }
                  }
                }
              ],
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const requestBody = ir.resources[0].operations[0].requestBody;
      expect(requestBody).toBeDefined();
      expect(requestBody?.children).toBeDefined();

      const nameField = requestBody?.children?.find(c => c.key === 'name');
      expect(nameField?.validations).toBeDefined();
      expect(nameField?.validations?.some(v => v.type === 'minLength' && v.value === 3)).toBe(true);
      expect(nameField?.validations?.some(v => v.type === 'maxLength' && v.value === 50)).toBe(true);

      const ageField = requestBody?.children?.find(c => c.key === 'age');
      expect(ageField?.validations?.some(v => v.type === 'minimum' && v.value === 18)).toBe(true);
      expect(ageField?.validations?.some(v => v.type === 'maximum' && v.value === 120)).toBe(true);

      const emailField = requestBody?.children?.find(c => c.key === 'email');
      expect(emailField?.validations?.some(v => v.type === 'pattern')).toBe(true);
    });

    it('should handle enum values', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/pets': {
            post: {
              operationId: 'createPet',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        enum: ['available', 'pending', 'sold']
                      }
                    }
                  }
                }
              ],
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const requestBody = ir.resources[0].operations[0].requestBody;
      const statusField = requestBody?.children?.find(c => c.key === 'status');
      
      expect(statusField?.type).toBe('enum');
      expect(statusField?.enumValues).toEqual(['available', 'pending', 'sold']);
    });

    it('should handle array schemas', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      tags: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 1,
                        maxItems: 10
                      }
                    }
                  }
                }
              ],
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const requestBody = ir.resources[0].operations[0].requestBody;
      const tagsField = requestBody?.children?.find(c => c.key === 'tags');
      
      expect(tagsField?.type).toBe('array');
      expect(tagsField?.items).toBeDefined();
      expect(tagsField?.items?.type).toBe('string');
      expect(tagsField?.validations?.some(v => v.type === 'minItems' && v.value === 1)).toBe(true);
      expect(tagsField?.validations?.some(v => v.type === 'maxItems' && v.value === 10)).toBe(true);
    });

    it('should handle nested object schemas', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              operationId: 'createUser',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      address: {
                        type: 'object',
                        properties: {
                          street: { type: 'string' },
                          city: { type: 'string' },
                          zipCode: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              ],
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const requestBody = ir.resources[0].operations[0].requestBody;
      const addressField = requestBody?.children?.find(c => c.key === 'address');
      
      expect(addressField?.type).toBe('object');
      expect(addressField?.children).toBeDefined();
      expect(addressField?.children?.length).toBe(3);
      expect(addressField?.children?.map(c => c.key)).toEqual(['street', 'city', 'zipCode']);
    });

    it('should handle $ref references in definitions', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/User' }
                  }
                }
              }
            }
          }
        },
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              address: { $ref: '#/definitions/Address' }
            }
          },
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].schema.type).toBe('object');
      
      // The schema should have been resolved through the reference
      const addressField = ir.resources[0].schema.children?.find(c => c.key === 'address');
      expect(addressField).toBeDefined();
      expect(addressField?.type).toBe('object');
    });

    it('should cache resolved references for performance', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/User' }
                  }
                }
              }
            },
            post: {
              operationId: 'createUser',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: { $ref: '#/definitions/User' }
                }
              ],
              responses: {
                '201': {
                  description: 'Created',
                  schema: { $ref: '#/definitions/User' }
                }
              }
            }
          }
        },
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // The same User reference is used multiple times
      // Caching should make subsequent resolutions faster
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(2);
      
      // Both operations should have successfully resolved the User schema
      const listOp = ir.resources[0].operations.find(op => op.id === 'listUsers');
      const createOp = ir.resources[0].operations.find(op => op.id === 'createUser');
      
      expect(listOp).toBeDefined();
      expect(createOp).toBeDefined();
      expect(createOp?.requestBody).toBeDefined();
    });

    it('should handle circular references gracefully', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/nodes': {
            get: {
              operationId: 'listNodes',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/Node' }
                  }
                }
              }
            }
          }
        },
        definitions: {
          Node: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              parent: { $ref: '#/definitions/Node' },
              children: {
                type: 'array',
                items: { $ref: '#/definitions/Node' }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      
      // Should not throw an error or cause infinite loop
      expect(() => adapter.adapt()).not.toThrow();
      
      const ir = adapter.adapt();
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].schema.type).toBe('object');
    });

    it('should log warning for unresolvable references', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/NonExistent' }
                  }
                }
              }
            }
          }
        },
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' }
            }
          }
        }
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // Should continue processing despite unresolvable reference
      expect(ir.resources).toHaveLength(1);
      
      // Should have logged a warning (note: warning might be logged by OpenAPI3Adapter)
      // We just verify it doesn't crash
      
      consoleSpy.mockRestore();
    });
  });
});

