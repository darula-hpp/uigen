import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3';
import type { OpenAPIV3 } from 'openapi-types';

describe('Request Body Ignore - Task 5.1', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
  });

  describe('adaptRequestBody with x-uigen-ignore', () => {
    it('should return undefined when request body has x-uigen-ignore: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                'x-uigen-ignore': true,
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
                '200': {
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
      const ir = adapter.adapt();

      // Verify the operation exists but has no request body
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].requestBody).toBeUndefined();
      
      // Verify info message was logged (Task 5.3)
      expect(consoleInfoSpy).toHaveBeenCalledWith('Request body ignored due to x-uigen-ignore annotation');
    });

    it('should include request body when x-uigen-ignore: false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                'x-uigen-ignore': false,
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
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Verify the operation has a request body
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].requestBody).toBeDefined();
      expect(ir.resources[0].operations[0].requestBody?.type).toBe('object');
    });

    it('should mark all properties as ignored when $ref target schema has x-uigen-ignore: true and no child overrides', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User'
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        components: {
          schemas: {
            User: {
              'x-uigen-ignore': true,
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Verify the operation exists and has a request body
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      const requestBody = ir.resources[0].operations[0].requestBody;
      expect(requestBody).toBeDefined();
      
      // All properties should be marked as ignored (inherit from parent)
      expect(requestBody?.children).toBeDefined();
      const nameChild = requestBody?.children?.find(c => c.key === 'name');
      expect(nameChild).toBeDefined();
      expect((nameChild as any).__shouldIgnore).toBe(true);
      
      const emailChild = requestBody?.children?.find(c => c.key === 'email');
      expect(emailChild).toBeDefined();
      expect((emailChild as any).__shouldIgnore).toBe(true);
    });

    it('should return undefined when request body $ref has x-uigen-ignore: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                $ref: '#/components/requestBodies/UserRequest'
              },
              responses: {
                '200': {
                  description: 'Success'
                }
              }
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
      const ir = adapter.adapt();

      // Verify the operation exists but has no request body
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].requestBody).toBeUndefined();
      
      // Verify info message was logged (Task 5.3)
      expect(consoleInfoSpy).toHaveBeenCalledWith('Request body $ref target ignored: #/components/requestBodies/UserRequest');
    });

    it('should log warning for non-boolean x-uigen-ignore value on request body', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                'x-uigen-ignore': 'true' as any,
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
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith('x-uigen-ignore must be a boolean, found string');

      // Verify the request body is included (default behavior when invalid)
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].requestBody).toBeDefined();

      consoleWarnSpy.mockRestore();
    });
  });
});
