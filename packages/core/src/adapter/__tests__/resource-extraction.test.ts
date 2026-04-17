import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Resource Extraction', () => {
  describe('Path Grouping', () => {
    it('should group paths by resource name', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/users/{id}': {
            get: {
              summary: 'Get user',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer' }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string' }
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

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('Users');
      expect(result.resources[0].slug).toBe('users');
      expect(result.resources[0].operations).toHaveLength(2);
    });

    it('should group /users, /users/{id}, and /users/{id}/posts correctly', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: { '200': { description: 'Success' } }
            }
          },
          '/users/{id}': {
            get: {
              summary: 'Get user',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
              responses: { '200': { description: 'Success' } }
            }
          },
          '/users/{id}/posts': {
            get: {
              summary: 'List user posts',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
              responses: { '200': { description: 'Success' } }
            }
          },
          '/posts': {
            get: {
              summary: 'List all posts',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(2);
      
      const usersResource = result.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      expect(usersResource?.operations).toHaveLength(2); // /users, /users/{id}
      
      const postsResource = result.resources.find(r => r.slug === 'posts');
      expect(postsResource).toBeDefined();
      expect(postsResource?.operations).toHaveLength(2); // /posts, /users/{id}/posts
    });

    it('should handle multiple distinct resources', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { summary: 'List users', responses: { '200': { description: 'Success' } } }
          },
          '/products': {
            get: { summary: 'List products', responses: { '200': { description: 'Success' } } }
          },
          '/orders': {
            get: { summary: 'List orders', responses: { '200': { description: 'Success' } } }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(3);
      expect(result.resources.map(r => r.slug).sort()).toEqual(['orders', 'products', 'users']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty paths object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(0);
    });

    it('should handle paths without resource names (root paths)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/': {
            get: { summary: 'Root', responses: { '200': { description: 'Success' } } }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Root paths without resource names should be skipped
      expect(result.resources).toHaveLength(0);
    });

    it('should handle malformed path patterns', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '///': {
            get: { summary: 'Malformed', responses: { '200': { description: 'Success' } } }
          },
          '/valid-resource': {
            get: { summary: 'Valid', responses: { '200': { description: 'Success' } } }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should only extract valid resource
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].slug).toBe('valid-resource');
    });

    it('should handle paths with only path parameters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/{id}': {
            get: {
              summary: 'Get by ID',
              parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Paths with only parameters should be skipped
      expect(result.resources).toHaveLength(0);
    });
  });


  describe('Schema Extraction from Responses', () => {
    it('should extract schema from response bodies', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/products/{id}': {
          get: {
            summary: 'Get product',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['id', 'name'],
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        price: { type: 'number' },
                        inStock: { type: 'boolean' }
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

    const resource = result.resources[0];
    expect(resource.schema.type).toBe('object');
    expect(resource.schema.children).toBeDefined();
    expect(resource.schema.children?.length).toBeGreaterThan(0);
    
    const idField = resource.schema.children?.find(c => c.key === 'id');
    expect(idField).toBeDefined();
    expect(idField?.type).toBe('integer');
    expect(idField?.required).toBe(true);
  });

  it('should handle missing response schemas gracefully', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/items/{id}': {
          get: {
            summary: 'Get item',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': {
                description: 'Success'
                // No content/schema defined
              }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const resource = result.resources[0];
    expect(resource).toBeDefined();
    // Should have placeholder schema
    expect(resource.schema.type).toBe('object');
  });

  it('should extract schema from array responses', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/books': {
          get: {
            summary: 'List books',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          isbn: { type: 'string' },
                          title: { type: 'string' },
                          author: { type: 'string' }
                        }
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

    const resource = result.resources[0];
    expect(resource.schema.type).toBe('object');
    expect(resource.schema.children).toBeDefined();
    
    const isbnField = resource.schema.children?.find(c => c.key === 'isbn');
    expect(isbnField).toBeDefined();
  });
});


  describe('Schema Extraction from Request Bodies', () => {
    it('should extract schema from request bodies', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/posts': {
          post: {
            summary: 'Create post',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['title', 'content'],
                    properties: {
                      title: { type: 'string', minLength: 1 },
                      content: { type: 'string' },
                      published: { type: 'boolean', default: false }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        published: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' }
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

    const resource = result.resources[0];
    expect(resource.schema.children).toBeDefined();
    
    // Should have fields from both request and response
    const titleField = resource.schema.children?.find(c => c.key === 'title');
    expect(titleField).toBeDefined();
    
    const idField = resource.schema.children?.find(c => c.key === 'id');
    expect(idField).toBeDefined();
    
    const createdAtField = resource.schema.children?.find(c => c.key === 'createdAt');
    expect(createdAtField).toBeDefined();
  });

  it('should handle missing request body schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/actions/trigger': {
          post: {
            summary: 'Trigger action',
            responses: {
              '200': { description: 'Success' }
            }
            // No requestBody defined
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const resource = result.resources[0];
    expect(resource).toBeDefined();
    const operation = resource.operations[0];
    expect(operation.requestBody).toBeUndefined();
  });

  it('should handle request body with $ref', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          CreateUserRequest: {
            type: 'object',
            required: ['username', 'email'],
            properties: {
              username: { type: 'string', minLength: 3 },
              email: { type: 'string', format: 'email' },
              age: { type: 'integer', minimum: 18 }
            }
          }
        }
      },
      paths: {
        '/users': {
          post: {
            summary: 'Create user',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateUserRequest'
                  }
                }
              }
            },
            responses: {
              '201': { description: 'Created' }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const resource = result.resources[0];
    expect(resource.schema.children).toBeDefined();
    
    const usernameField = resource.schema.children?.find(c => c.key === 'username');
    expect(usernameField).toBeDefined();
    expect(usernameField?.required).toBe(true);
    expect(usernameField?.validations).toBeDefined();
  });
});


  describe('Schema Merging', () => {
    it('should merge schemas from multiple operations', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            summary: 'List items',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create item',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': { description: 'Created' }
            }
          }
        },
        '/items/{id}': {
          get: {
            summary: 'Get item',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
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

    const resource = result.resources[0];
    expect(resource.schema.children).toBeDefined();
    
    // Should have all unique fields from all operations
    const fieldKeys = resource.schema.children?.map(c => c.key) || [];
    expect(fieldKeys).toContain('id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('description');
    expect(fieldKeys).toContain('createdAt');
  });

  it('should prefer fields with more details when merging', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/products': {
          get: {
            summary: 'List products',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' } // Basic field
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/products/{id}': {
          get: {
            summary: 'Get product',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { 
                          type: 'string',
                          minLength: 1,
                          maxLength: 100,
                          description: 'Product name'
                        } // Detailed field
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

    const resource = result.resources[0];
    const nameField = resource.schema.children?.find(c => c.key === 'name');
    
    // Should use the more detailed version
    expect(nameField?.description).toBe('Product name');
    expect(nameField?.validations).toBeDefined();
    expect(nameField?.validations?.length).toBeGreaterThan(0);
  });

  it('should merge nested object schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/profiles': {
          get: {
            summary: 'List profiles',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          address: {
                            type: 'object',
                            properties: {
                              street: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/profiles/{id}': {
          get: {
            summary: 'Get profile',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
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
                }
              }
            }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const resource = result.resources[0];
    const addressField = resource.schema.children?.find(c => c.key === 'address');
    
    expect(addressField).toBeDefined();
    expect(addressField?.type).toBe('object');
    expect(addressField?.children).toBeDefined();
    
    // Should have all address fields from both operations
    const addressChildren = addressField?.children?.map(c => c.key) || [];
    expect(addressChildren).toContain('street');
    expect(addressChildren).toContain('city');
    expect(addressChildren).toContain('zipCode');
  });
});


  describe('Reference Resolution', () => {
    it('should handle $ref in schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'username'],
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      },
      paths: {
        '/users/{id}': {
          get: {
            summary: 'Get user',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User'
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

    const resource = result.resources[0];
    expect(resource.schema.children).toBeDefined();
    
    const usernameField = resource.schema.children?.find(c => c.key === 'username');
    expect(usernameField).toBeDefined();
    expect(usernameField?.required).toBe(true);
  });

  it('should handle nested $ref in schemas', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' }
            }
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              address: {
                $ref: '#/components/schemas/Address'
              }
            }
          }
        }
      },
      paths: {
        '/users/{id}': {
          get: {
            summary: 'Get user',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User'
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

    const resource = result.resources[0];
    const addressField = resource.schema.children?.find(c => c.key === 'address');
    
    expect(addressField).toBeDefined();
    expect(addressField?.type).toBe('object');
    expect(addressField?.children).toBeDefined();
    
    const streetField = addressField?.children?.find(c => c.key === 'street');
    expect(streetField).toBeDefined();
  });

  it('should handle unresolvable $ref gracefully', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/items/{id}': {
          get: {
            summary: 'Get item',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/NonExistent'
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

    // Should not crash, should create resource with placeholder schema
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].schema).toBeDefined();
  });
});
});

describe('Version Prefix Handling', () => {
  it('should skip version prefixes like v1, v2, v3 when extracting resource names', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/v1/accounts': {
          get: {
            summary: 'List accounts',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/v1/accounts/{id}': {
          get: {
            summary: 'Get account',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/v2/customers': {
          get: {
            summary: 'List customers',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' }
                        }
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

    // Should have 2 resources: accounts and customers (not v1 and v2)
    expect(result.resources).toHaveLength(2);
    expect(result.resources.map(r => r.slug).sort()).toEqual(['accounts', 'customers']);
    
    // Accounts should have 2 operations (list and detail)
    const accounts = result.resources.find(r => r.slug === 'accounts');
    expect(accounts?.operations).toHaveLength(2);
  });

  it('should handle paths without version prefixes normally', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { type: 'object' }
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

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].slug).toBe('users');
  });
});
