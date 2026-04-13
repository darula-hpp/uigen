import { describe, it, expect } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPI3Adapter } from '../openapi3.js';

describe('OpenAPI3Adapter - Schema Resolver Integration', () => {
  it('should resolve $ref in response schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.resources).toHaveLength(1);
    const resource = result.resources[0];
    expect(resource.slug).toBe('users');
    
    const listOp = resource.operations.find(op => op.viewHint === 'list');
    expect(listOp).toBeDefined();
    expect(listOp?.responses['200'].schema).toBeDefined();
  });

  it('should resolve $ref in request body schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UserInput' }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          UserInput: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          },
          User: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.resources).toHaveLength(1);
    const resource = result.resources[0];
    
    const createOp = resource.operations.find(op => op.viewHint === 'create');
    expect(createOp).toBeDefined();
    expect(createOp?.requestBody).toBeDefined();
    // The key should be 'body' (the field name), not 'UserInput' (the schema name)
    expect(createOp?.requestBody?.key).toBe('body');
    // But the schema should have the UserInput fields
    expect(createOp?.requestBody?.children).toBeDefined();
    const nameField = createOp?.requestBody?.children?.find(c => c.key === 'name');
    const emailField = createOp?.requestBody?.children?.find(c => c.key === 'email');
    expect(nameField).toBeDefined();
    expect(emailField).toBeDefined();
  });

  it('should resolve nested $ref references', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/posts': {
          get: {
            operationId: 'getPosts',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Post' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Post: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              author: { $ref: '#/components/schemas/User' }
            }
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.resources).toHaveLength(1);
    const resource = result.resources[0];
    expect(resource.slug).toBe('posts');
    
    const listOp = resource.operations.find(op => op.viewHint === 'list');
    expect(listOp).toBeDefined();
    expect(listOp?.responses['200'].schema).toBeDefined();
  });

  it('should handle circular references without hanging', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/nodes': {
          get: {
            operationId: 'getNodes',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Node' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              parent: { $ref: '#/components/schemas/Node' },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/Node' }
              }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    
    // Should not hang or throw
    expect(() => adapter.adapt()).not.toThrow();
    
    const result = adapter.adapt();
    expect(result.resources).toHaveLength(1);
  });

  it('should cache duplicate $ref resolutions', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          },
          post: {
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    // Should successfully parse with multiple references to the same schema
    expect(result.resources).toHaveLength(1);
    const resource = result.resources[0];
    expect(resource.operations).toHaveLength(2);
  });

  it('should handle unresolvable $ref gracefully', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NonExistent' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {}
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    
    // Should not throw, should log warning and continue
    expect(() => adapter.adapt()).not.toThrow();
    
    const result = adapter.adapt();
    expect(result.resources).toHaveLength(1);
  });
});
