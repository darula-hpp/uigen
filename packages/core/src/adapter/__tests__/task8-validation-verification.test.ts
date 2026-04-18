import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Task 8 Verification: Validation and Error Handling
 * 
 * This test file verifies that all Task 8 requirements are met:
 * - 8.1: Non-boolean value validation with proper logging
 * - 8.2: Logging for ignored elements (operations, $refs, etc.)
 * - 8.3: Graceful error recovery (no exceptions, continue processing)
 */

describe('Task 8: Validation and Error Handling - Verification', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Task 8.1: Non-boolean value validation', () => {
    it('should log warning for non-boolean value on operation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': 'true' as any, // Invalid: string instead of boolean
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found string')
      );
    });

    it('should log warning for non-boolean value on schema property', () => {
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
                        properties: {
                          id: {
                            type: 'integer',
                            'x-uigen-ignore': 123 as any // Invalid: number instead of boolean
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
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found number')
      );
    });

    it('should log warning for non-boolean value on parameter', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                {
                  name: 'debug',
                  in: 'query',
                  schema: { type: 'boolean' },
                  'x-uigen-ignore': { invalid: true } as any // Invalid: object instead of boolean
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found object')
      );
    });

    it('should log warning for non-boolean value on request body', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                'x-uigen-ignore': ['invalid'] as any, // Invalid: array instead of boolean
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
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found object')
      );
    });

    it('should log warning for non-boolean value on response', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  'x-uigen-ignore': null as any, // Invalid: null instead of boolean
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
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
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found object')
      );
    });
  });

  describe('Task 8.2: Logging for ignored elements', () => {
    it('should log info when operation is ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': true,
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring operation: GET /users')
      );
    });

    it('should log info when request body is ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                'x-uigen-ignore': true,
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
      adapter.adapt();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Request body ignored due to x-uigen-ignore annotation'
      );
    });

    it('should log info when response is ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  'x-uigen-ignore': true,
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
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
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Response 200 ignored due to x-uigen-ignore annotation'
      );
    });

    it('should log info when $ref target for request body is ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                $ref: '#/components/requestBodies/UserRequest'
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        },
        components: {
          requestBodies: {
            UserRequest: {
              'x-uigen-ignore': true,
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
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request body $ref target ignored')
      );
    });

    it('should log info when $ref target for response is ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  $ref: '#/components/responses/UserResponse'
                }
              }
            }
          }
        },
        components: {
          responses: {
            UserResponse: {
              'x-uigen-ignore': true,
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
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
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Response 200 $ref target ignored')
      );
    });

    it('should log warning when all operations in a resource are ignored', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': true,
              responses: { '200': { description: 'Success' } }
            },
            post: {
              'x-uigen-ignore': true,
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'All operations were ignored - no resources will be generated'
      );
    });
  });

  describe('Task 8.3: Graceful error recovery', () => {
    it('should not throw exception for invalid annotation values', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': 'invalid' as any,
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      
      // Should not throw
      expect(() => adapter.adapt()).not.toThrow();
    });

    it('should continue processing after validation errors', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': 'invalid' as any, // Invalid annotation
              responses: { '200': { description: 'Success' } }
            },
            post: {
              // Valid operation
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should have processed both operations (invalid treated as absent)
      expect(result.resources.length).toBeGreaterThan(0);
      const userResource = result.resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.operations.length).toBe(2); // Both operations included
    });

    it('should treat invalid annotations as absent (default behavior)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': 123 as any, // Invalid: number
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
                            'x-uigen-ignore': 'yes' as any // Invalid: string
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

      // Operation should be included (invalid annotation treated as absent)
      const userResource = result.resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.operations.length).toBe(1);

      // Property should be included (invalid annotation treated as absent)
      const getOp = userResource!.operations[0];
      const responseSchema = getOp.responses['200']?.schema;
      expect(responseSchema).toBeDefined();
      expect(responseSchema!.children).toBeDefined();
      expect(responseSchema!.children!.length).toBe(2); // Both id and name included
    });

    it('should handle multiple validation errors without throwing', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            'x-uigen-ignore': 'invalid' as any, // Invalid at path level
            get: {
              'x-uigen-ignore': 123 as any, // Invalid at operation level
              parameters: [
                {
                  name: 'debug',
                  in: 'query',
                  schema: { type: 'boolean' },
                  'x-uigen-ignore': null as any // Invalid at parameter level
                }
              ],
              responses: {
                '200': {
                  'x-uigen-ignore': ['invalid'] as any, // Invalid at response level
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'integer',
                            'x-uigen-ignore': { invalid: true } as any // Invalid at property level
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
      
      // Should not throw despite multiple validation errors
      expect(() => adapter.adapt()).not.toThrow();
      
      // Should have logged warnings for all invalid values
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );
      
      // Should have logged multiple warnings (one for each invalid annotation)
      const ignoreWarnings = consoleWarnSpy.mock.calls.filter(call =>
        call[0].includes('x-uigen-ignore must be a boolean')
      );
      expect(ignoreWarnings.length).toBeGreaterThanOrEqual(4); // At least 4 warnings
    });
  });

  describe('Task 8: Complete verification', () => {
    it('should satisfy all Task 8 requirements in a single spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              'x-uigen-ignore': 'invalid' as any, // 8.1: Non-boolean validation
              responses: { '200': { description: 'Success' } }
            },
            post: {
              'x-uigen-ignore': true, // 8.2: Operation ignored
              responses: { '201': { description: 'Created' } }
            }
          },
          '/products': {
            get: {
              requestBody: {
                'x-uigen-ignore': true, // 8.2: Request body ignored
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
                '200': {
                  'x-uigen-ignore': true, // 8.2: Response ignored
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      
      // 8.3: Should not throw
      expect(() => adapter.adapt()).not.toThrow();
      
      const result = adapter.adapt();
      
      // 8.1: Should have logged warning for invalid value
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean, found string')
      );
      
      // 8.2: Should have logged info for ignored operation
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring operation: POST /users')
      );
      
      // 8.2: Should have logged info for ignored request body
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Request body ignored due to x-uigen-ignore annotation'
      );
      
      // 8.2: Should have logged info for ignored response
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Response 200 ignored due to x-uigen-ignore annotation'
      );
      
      // 8.3: Should have continued processing and generated resources
      expect(result.resources.length).toBeGreaterThan(0);
    });
  });
});
