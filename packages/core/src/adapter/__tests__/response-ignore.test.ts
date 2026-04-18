import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3';
import type { OpenAPIV3 } from 'openapi-types';

describe('Response Ignore - Task 5.2', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('adaptResponses with x-uigen-ignore', () => {
    it('should skip response when response has x-uigen-ignore: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  'x-uigen-ignore': true,
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
                } as any,
                '404': {
                  description: 'Not Found'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Should have one resource
      expect(ir.resources).toHaveLength(1);
      const resource = ir.resources[0];
      
      // Should have one operation
      expect(resource.operations).toHaveLength(1);
      const operation = resource.operations[0];
      
      // Should only have the 404 response, not the 200
      expect(operation.responses).toBeDefined();
      expect(Object.keys(operation.responses)).toEqual(['404']);
      expect(operation.responses['200']).toBeUndefined();
      
      // Verify info message was logged (Task 5.3)
      expect(consoleInfoSpy).toHaveBeenCalledWith('Response 200 ignored due to x-uigen-ignore annotation');
    });

    it('should include response when x-uigen-ignore: false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  'x-uigen-ignore': false,
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
                } as any
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const resource = ir.resources[0];
      const operation = resource.operations[0];
      
      // Should have the 200 response
      expect(operation.responses).toBeDefined();
      expect(operation.responses['200']).toBeDefined();
      expect(operation.responses['200'].description).toBe('Success');
    });

    it('should mark all properties as ignored when $ref target schema has x-uigen-ignore: true and no child overrides', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/IgnoredSchema'
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
            IgnoredSchema: {
              type: 'object',
              'x-uigen-ignore': true,
              properties: {
                id: { type: 'string' }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const resource = ir.resources[0];
      const operation = resource.operations[0];
      
      // Should have the 200 response with schema
      expect(operation.responses).toBeDefined();
      expect(Object.keys(operation.responses)).toEqual(['200']);
      
      const responseSchema = operation.responses['200']?.schema;
      expect(responseSchema).toBeDefined();
      
      // All properties should be marked as ignored (inherit from parent)
      expect(responseSchema?.children).toBeDefined();
      const idChild = responseSchema?.children?.find(c => c.key === 'id');
      expect(idChild).toBeDefined();
      expect((idChild as any).__shouldIgnore).toBe(true);
    });

    it('should skip response when response $ref has x-uigen-ignore: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  $ref: '#/components/responses/IgnoredResponse'
                }
              }
            }
          }
        },
        components: {
          responses: {
            IgnoredResponse: {
              description: 'Success',
              'x-uigen-ignore': true,
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
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const resource = ir.resources[0];
      const operation = resource.operations[0];
      
      // Should not have the 200 response because the $ref target is ignored
      expect(operation.responses).toBeDefined();
      expect(Object.keys(operation.responses)).toEqual([]);
      
      // Verify info message was logged (Task 5.3)
      expect(consoleInfoSpy).toHaveBeenCalledWith('Response 200 $ref target ignored: #/components/responses/IgnoredResponse');
    });

    it('should log warning for non-boolean x-uigen-ignore value on response', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  'x-uigen-ignore': 'true' as any,
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
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith('x-uigen-ignore must be a boolean, found string');
      
      // Should include the response (treat invalid as absent)
      const resource = ir.resources[0];
      const operation = resource.operations[0];
      expect(operation.responses['200']).toBeDefined();
    });

    it('should handle multiple responses with mixed ignore annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  'x-uigen-ignore': true,
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
                } as any,
                '201': {
                  description: 'Created',
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
                },
                '404': {
                  description: 'Not Found',
                  'x-uigen-ignore': false
                } as any
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const resource = ir.resources[0];
      const operation = resource.operations[0];
      
      // Should have 201 and 404, but not 200
      expect(operation.responses).toBeDefined();
      expect(Object.keys(operation.responses).sort()).toEqual(['201', '404']);
      expect(operation.responses['200']).toBeUndefined();
      expect(operation.responses['201']).toBeDefined();
      expect(operation.responses['404']).toBeDefined();
    });
  });
});
