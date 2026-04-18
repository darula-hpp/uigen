import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Task 9: Unit Test Coverage Verification
 * 
 * This test file fills gaps in unit test coverage for the ignore functionality:
 * - 9.5: Comprehensive precedence rule tests
 * - 9.7: Backward compatibility tests
 * - Integration tests for complex scenarios
 */

describe('Task 9.5: Comprehensive Precedence Rules', () => {
  describe('Property > Schema precedence', () => {
    it('should include property with false when schema has true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        'x-uigen-ignore': true,
                        properties: {
                          id: {
                            type: 'integer',
                            'x-uigen-ignore': false // Property overrides schema
                          } as any,
                          name: {
                            type: 'string'
                            // Inherits schema ignore
                          }
                        }
                      } as any
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
      const responseSchema = operation.responses['200']?.schema;
      
      // id should be included (explicit false overrides parent true)
      const idChild = responseSchema?.children?.find(c => c.key === 'id');
      expect(idChild).toBeDefined();
      expect((idChild as any).__shouldIgnore).toBeUndefined();
      
      // name should be marked as ignored (inherits from parent)
      const nameChild = responseSchema?.children?.find(c => c.key === 'name');
      expect(nameChild).toBeDefined();
      expect((nameChild as any).__shouldIgnore).toBe(true);
    });

    it('should exclude property with true when schema has false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        'x-uigen-ignore': false,
                        properties: {
                          password: {
                            type: 'string',
                            'x-uigen-ignore': true // Property overrides schema
                          } as any,
                          email: {
                            type: 'string'
                            // Inherits schema include
                          }
                        }
                      } as any
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
      const responseSchema = operation.responses['200']?.schema;
      
      // password should be marked as ignored (explicit true overrides parent false)
      const passwordChild = responseSchema?.children?.find(c => c.key === 'password');
      expect(passwordChild).toBeDefined();
      expect((passwordChild as any).__shouldIgnore).toBe(true);
      
      // email should be included (inherits from parent)
      const emailChild = responseSchema?.children?.find(c => c.key === 'email');
      expect(emailChild).toBeDefined();
      expect((emailChild as any).__shouldIgnore).toBeUndefined();
    });
  });

  describe('Parameter > Operation > Path precedence', () => {
    it('should include parameter with false when operation and path have true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-ignore': true,
            parameters: [
              {
                name: 'debug',
                in: 'query',
                schema: { type: 'boolean' },
                'x-uigen-ignore': true
              } as any
            ],
            get: {
              'x-uigen-ignore': false, // Operation overrides path
              parameters: [
                {
                  name: 'debug',
                  in: 'query',
                  schema: { type: 'boolean' },
                  'x-uigen-ignore': false // Parameter overrides path-level parameter
                } as any,
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'integer' }
                }
              ],
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
                            id: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Operation should be included (operation-level false overrides path-level true)
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      
      const operation = result.resources[0].operations[0];
      
      // Both parameters should be included
      expect(operation.parameters).toHaveLength(2);
      const debugParam = operation.parameters.find(p => p.name === 'debug');
      const limitParam = operation.parameters.find(p => p.name === 'limit');
      expect(debugParam).toBeDefined();
      expect(limitParam).toBeDefined();
    });
  });

  describe('Multi-level nested precedence', () => {
    it('should handle 3-level nesting with mixed annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        'x-uigen-ignore': true, // Level 1: ignore
                        properties: {
                          profile: {
                            type: 'object',
                            'x-uigen-ignore': false, // Level 2: include (overrides parent)
                            properties: {
                              name: {
                                type: 'string'
                                // Level 3: inherits level 2 (include)
                              },
                              ssn: {
                                type: 'string',
                                'x-uigen-ignore': true // Level 3: ignore (overrides parent)
                              } as any
                            }
                          } as any,
                          internal_id: {
                            type: 'string'
                            // Level 2: inherits level 1 (ignore)
                          }
                        }
                      } as any
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
      const responseSchema = operation.responses['200']?.schema;
      
      // profile should be included (level 2 false overrides level 1 true)
      const profileChild = responseSchema?.children?.find(c => c.key === 'profile');
      expect(profileChild).toBeDefined();
      expect((profileChild as any).__shouldIgnore).toBeUndefined();
      
      // profile.name should be included (inherits level 2)
      const nameChild = profileChild?.children?.find(c => c.key === 'name');
      expect(nameChild).toBeDefined();
      expect((nameChild as any).__shouldIgnore).toBeUndefined();
      
      // profile.ssn should be ignored (level 3 true overrides level 2 false)
      const ssnChild = profileChild?.children?.find(c => c.key === 'ssn');
      expect(ssnChild).toBeDefined();
      expect((ssnChild as any).__shouldIgnore).toBe(true);
      
      // internal_id should be ignored (inherits level 1)
      const internalIdChild = responseSchema?.children?.find(c => c.key === 'internal_id');
      expect(internalIdChild).toBeDefined();
      expect((internalIdChild as any).__shouldIgnore).toBe(true);
    });
  });
});

describe('Task 9.7: Backward Compatibility', () => {
  describe('Operation-level ignore (existing behavior)', () => {
    it('should produce identical output for operation-level ignore', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
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
            },
            post: {
              'x-uigen-ignore': true,
              summary: 'Create user',
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should have 1 resource with only GET operation
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].method).toBe('GET');
      expect(result.resources[0].operations[0].path).toBe('/users');
    });

    it('should produce identical output for path-level ignore', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
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
                            id: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/admin': {
            'x-uigen-ignore': true,
            get: {
              summary: 'Admin endpoint',
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should have 1 resource (users), admin should be excluded
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('Users');
      expect(result.resources[0].operations).toHaveLength(1);
    });

    it('should maintain operation-level override of path-level ignore', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/admin': {
            'x-uigen-ignore': true,
            get: {
              'x-uigen-ignore': false,
              summary: 'Public admin endpoint',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          status: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any,
            post: {
              summary: 'Internal admin action',
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          } as any
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should have 1 resource with only GET operation (operation-level false overrides path-level true)
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].method).toBe('GET');
    });
  });

  describe('Default inclusion behavior (no annotations)', () => {
    it('should include all elements when no annotations present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
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
            },
            post: {
              requestBody: {
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
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should have 1 resource with 2 operations
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(2);
      
      const getOp = result.resources[0].operations.find(op => op.method === 'GET');
      const postOp = result.resources[0].operations.find(op => op.method === 'POST');
      
      // GET operation should have parameter
      expect(getOp?.parameters).toHaveLength(1);
      
      // GET response should have all 3 properties
      const getResponseSchema = getOp?.responses['200']?.schema;
      expect(getResponseSchema?.children).toHaveLength(3);
      
      // POST should have request body
      expect(postOp?.requestBody).toBeDefined();
      expect(postOp?.requestBody?.children).toHaveLength(2);
    });
  });

  describe('Swagger 2.0 backward compatibility', () => {
    it('should produce same result for Swagger 2.0 as OpenAPI 3.x', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
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
            },
            post: {
              'x-uigen-ignore': true,
              summary: 'Create user',
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          }
        }
      };

      const openapi3Spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
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
            },
            post: {
              'x-uigen-ignore': true,
              summary: 'Create user',
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            } as any
          }
        }
      };

      const swagger2Adapter = new Swagger2Adapter(swagger2Spec as any);
      const swagger2Result = swagger2Adapter.adapt();

      const openapi3Adapter = new OpenAPI3Adapter(openapi3Spec);
      const openapi3Result = openapi3Adapter.adapt();

      // Both should have same structure
      expect(swagger2Result.resources).toHaveLength(1);
      expect(openapi3Result.resources).toHaveLength(1);
      
      expect(swagger2Result.resources[0].operations).toHaveLength(1);
      expect(openapi3Result.resources[0].operations).toHaveLength(1);
      
      expect(swagger2Result.resources[0].operations[0].method).toBe('GET');
      expect(openapi3Result.resources[0].operations[0].method).toBe('GET');
    });
  });
});

describe('Task 9: Integration Tests - Complex Scenarios', () => {
  it('should handle complex spec with all ignore types', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          parameters: [
            {
              name: 'debug',
              in: 'query',
              schema: { type: 'boolean' },
              'x-uigen-ignore': true // Path-level parameter ignored
            } as any
          ],
          get: {
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' }
                // Not ignored
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
                        password: {
                          type: 'string',
                          'x-uigen-ignore': true // Property ignored
                        } as any
                      }
                    }
                  }
                }
              },
              '500': {
                'x-uigen-ignore': true, // Response ignored
                description: 'Internal error',
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
              } as any
            }
          },
          post: {
            requestBody: {
              'x-uigen-ignore': true, // Request body ignored
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
            } as any,
            responses: {
              '201': {
                description: 'Created'
              }
            }
          }
        },
        '/admin': {
          'x-uigen-ignore': true, // Path ignored
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        } as any
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    // Should have 1 resource (users), admin excluded
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].operations).toHaveLength(2);
    
    const getOp = result.resources[0].operations.find(op => op.method === 'GET');
    const postOp = result.resources[0].operations.find(op => op.method === 'POST');
    
    // GET: should have only limit parameter (debug ignored)
    expect(getOp?.parameters).toHaveLength(1);
    expect(getOp?.parameters[0].name).toBe('limit');
    
    // GET: should have only 200 response (500 ignored)
    expect(Object.keys(getOp?.responses || {})).toEqual(['200']);
    
    // GET: response should have id and name, not password
    const responseSchema = getOp?.responses['200']?.schema;
    expect(responseSchema?.children).toHaveLength(3);
    const passwordChild = responseSchema?.children?.find(c => c.key === 'password');
    expect(passwordChild).toBeDefined();
    expect((passwordChild as any).__shouldIgnore).toBe(true);
    
    // POST: should have no request body (ignored)
    expect(postOp?.requestBody).toBeUndefined();
  });

  it('should handle $ref to ignored schema in multiple contexts', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
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
          },
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/InternalUser'
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created'
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
              name: { type: 'string' },
              internal: {
                $ref: '#/components/schemas/InternalData'
              }
            }
          },
          InternalUser: {
            type: 'object',
            'x-uigen-ignore': true, // Schema ignored
            properties: {
              id: { type: 'integer' },
              secret: { type: 'string' }
            }
          } as any,
          InternalData: {
            type: 'object',
            'x-uigen-ignore': true, // Schema ignored
            properties: {
              flag: { type: 'boolean' }
            }
          } as any
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const getOp = result.resources[0].operations.find(op => op.method === 'GET');
    const postOp = result.resources[0].operations.find(op => op.method === 'POST');
    
    // GET: response should have User schema with internal property marked as ignored
    const responseSchema = getOp?.responses['200']?.schema;
    expect(responseSchema).toBeDefined();
    const internalChild = responseSchema?.children?.find(c => c.key === 'internal');
    expect(internalChild).toBeDefined();
    expect((internalChild as any).__shouldIgnore).toBe(true);
    
    // POST: request body should have all properties marked as ignored (InternalUser schema ignored)
    expect(postOp?.requestBody).toBeDefined();
    const requestBodyChildren = postOp?.requestBody?.children;
    expect(requestBodyChildren).toBeDefined();
    // All properties should be marked as ignored
    requestBodyChildren?.forEach(child => {
      expect((child as any).__shouldIgnore).toBe(true);
    });
  });
});
