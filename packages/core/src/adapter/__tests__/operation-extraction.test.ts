import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Operation Extraction', () => {
  describe('Basic Metadata Extraction', () => {
    it('should extract method, path, summary, and description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List all users',
              description: 'Retrieves a paginated list of all users in the system',
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.method).toBe('GET');
      expect(operation.path).toBe('/users');
      expect(operation.summary).toBe('List all users');
      expect(operation.description).toBe('Retrieves a paginated list of all users in the system');
    });

    it('should handle missing summary and description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.method).toBe('GET');
      expect(operation.path).toBe('/items');
      expect(operation.summary).toBeUndefined();
      expect(operation.description).toBeUndefined();
    });

    it('should generate operation ID from operationId or fallback', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              responses: { '200': { description: 'Success' } }
            }
          },
          '/products': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const usersOp = result.resources.find(r => r.slug === 'users')?.operations[0];
      expect(usersOp?.id).toBe('listUsers');

      const productsOp = result.resources.find(r => r.slug === 'products')?.operations[0];
      expect(productsOp?.id).toBe('get__products');
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract path parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  description: 'User ID',
                  schema: { type: 'integer' }
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.parameters).toHaveLength(1);
      expect(operation.parameters[0].name).toBe('id');
      expect(operation.parameters[0].in).toBe('path');
      expect(operation.parameters[0].required).toBe(true);
      expect(operation.parameters[0].description).toBe('User ID');
      expect(operation.parameters[0].schema.type).toBe('integer');
    });

    it('should extract query parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  required: false,
                  description: 'Maximum number of results',
                  schema: { type: 'integer', default: 10 }
                },
                {
                  name: 'offset',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer', default: 0 }
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.parameters).toHaveLength(2);
      
      const limitParam = operation.parameters.find(p => p.name === 'limit');
      expect(limitParam?.in).toBe('query');
      expect(limitParam?.required).toBe(false);
      expect(limitParam?.description).toBe('Maximum number of results');
    });

    it('should extract header parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/data': {
            get: {
              parameters: [
                {
                  name: 'X-API-Version',
                  in: 'header',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      const headerParam = operation.parameters.find(p => p.name === 'X-API-Version');
      expect(headerParam?.in).toBe('header');
      expect(headerParam?.required).toBe(true);
    });

    it('should handle operations with no parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/status': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.parameters).toHaveLength(0);
    });

    it('should handle mixed parameter types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}/posts': {
            get: {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer' }
                },
                {
                  name: 'status',
                  in: 'query',
                  required: false,
                  schema: { type: 'string', enum: ['draft', 'published'] }
                },
                {
                  name: 'X-Request-ID',
                  in: 'header',
                  required: false,
                  schema: { type: 'string' }
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.parameters).toHaveLength(3);
      expect(operation.parameters.filter(p => p.in === 'path')).toHaveLength(1);
      expect(operation.parameters.filter(p => p.in === 'query')).toHaveLength(1);
      expect(operation.parameters.filter(p => p.in === 'header')).toHaveLength(1);
    });
  });

  describe('RequestBody Extraction', () => {
    it('should extract requestBody schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['username', 'email'],
                      properties: {
                        username: { type: 'string', minLength: 3 },
                        email: { type: 'string', format: 'email' },
                        age: { type: 'integer', minimum: 18 }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.type).toBe('object');
      expect(operation.requestBody?.children).toBeDefined();
      expect(operation.requestBody?.children?.length).toBe(3);
      
      const usernameField = operation.requestBody?.children?.find(c => c.key === 'username');
      expect(usernameField?.required).toBe(true);
    });

    it('should handle operations without requestBody', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeUndefined();
    });

    it('should handle requestBody with $ref', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            CreateUserRequest: {
              type: 'object',
              required: ['username'],
              properties: {
                username: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateUserRequest'
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.children).toBeDefined();
      
      const usernameField = operation.requestBody?.children?.find(c => c.key === 'username');
      expect(usernameField).toBeDefined();
      expect(usernameField?.required).toBe(true);
    });

    it('should handle requestBody with missing content', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/actions': {
            post: {
              requestBody: {
                description: 'Action payload'
              } as any,
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeUndefined();
    });
  });

  describe('Response Extraction', () => {
    it('should extract response schemas for multiple status codes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
              ],
              responses: {
                '200': {
                  description: 'User found',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                '404': {
                  description: 'User not found',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          error: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.responses).toBeDefined();
      expect(operation.responses['200']).toBeDefined();
      expect(operation.responses['200'].description).toBe('User found');
      expect(operation.responses['200'].schema).toBeDefined();
      expect(operation.responses['404']).toBeDefined();
      expect(operation.responses['404'].description).toBe('User not found');
    });

    it('should handle responses without schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            delete: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
              ],
              responses: {
                '204': {
                  description: 'Deleted successfully'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.responses['204']).toBeDefined();
      expect(operation.responses['204'].description).toBe('Deleted successfully');
      expect(operation.responses['204'].schema).toBeUndefined();
    });

    it('should handle empty responses object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/ping': {
            get: {
              responses: {}
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.responses).toBeDefined();
      expect(Object.keys(operation.responses)).toHaveLength(0);
    });
  });

  describe('Security Requirements Extraction', () => {
    it('should extract security requirements', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        paths: {
          '/users': {
            get: {
              security: [
                { bearerAuth: [] }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.security).toBeDefined();
      expect(operation.security).toHaveLength(1);
      expect(operation.security?.[0].name).toBe('bearerAuth');
      expect(operation.security?.[0].scopes).toEqual([]);
    });

    it('should extract security requirements with scopes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://example.com/oauth/authorize',
                  tokenUrl: 'https://example.com/oauth/token',
                  scopes: {
                    'read:users': 'Read user data',
                    'write:users': 'Write user data'
                  }
                }
              }
            }
          }
        },
        paths: {
          '/users': {
            post: {
              security: [
                { oauth2: ['write:users'] }
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
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.security).toBeDefined();
      expect(operation.security).toHaveLength(1);
      expect(operation.security?.[0].name).toBe('oauth2');
      expect(operation.security?.[0].scopes).toEqual(['write:users']);
    });

    it('should handle operations without security requirements', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/public': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.security).toBeUndefined();
    });

    it('should handle multiple security requirements (OR logic)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        paths: {
          '/data': {
            get: {
              security: [
                { bearerAuth: [] },
                { apiKey: [] }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.security).toBeDefined();
      expect(operation.security).toHaveLength(2);
      expect(operation.security?.[0].name).toBe('bearerAuth');
      expect(operation.security?.[1].name).toBe('apiKey');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed operation objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/broken': {
            get: {
              // Missing responses (required field)
            } as any
          },
          '/valid': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should still process valid operations
      expect(result.resources).toBeDefined();
    });

    it('should handle operations with complex nested schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/complex': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            address: {
                              type: 'object',
                              properties: {
                                street: { type: 'string' },
                                city: { type: 'string' }
                              }
                            }
                          }
                        },
                        tags: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.children).toBeDefined();
      
      const userField = operation.requestBody?.children?.find(c => c.key === 'user');
      expect(userField?.type).toBe('object');
      expect(userField?.children).toBeDefined();
      
      const addressField = userField?.children?.find(c => c.key === 'address');
      expect(addressField?.type).toBe('object');
    });

    it('should handle operations with all HTTP methods', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'Success' } }
            },
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            },
            put: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              },
              responses: { '200': { description: 'Updated' } }
            },
            patch: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              },
              responses: { '200': { description: 'Patched' } }
            },
            delete: {
              responses: { '204': { description: 'Deleted' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const resource = result.resources[0];
      expect(resource.operations).toHaveLength(5);
      expect(resource.operations.map(op => op.method).sort()).toEqual(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
    });
  });
});
