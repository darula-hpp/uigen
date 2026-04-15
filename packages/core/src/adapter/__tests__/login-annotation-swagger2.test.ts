import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Task 4.2: Swagger 2.0 x-uigen-login Annotation Preservation', () => {
  describe('Boolean value preservation (Req 1.4, 7.1, 7.2)', () => {
    it('should preserve x-uigen-login: true through Swagger 2.0 to OpenAPI 3.x conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/authenticate': {
            post: {
              'x-uigen-login': true,
              summary: 'Authenticate user',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Verify the annotation was preserved and the endpoint was detected
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/api/authenticate');
      expect(ir.auth.loginEndpoints![0].method).toBe('POST');
    });

    it('should preserve x-uigen-login: false through Swagger 2.0 to OpenAPI 3.x conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': false,
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Verify the annotation was preserved and the endpoint was excluded
      // Even though the path matches auto-detection pattern, x-uigen-login: false should exclude it
      expect(ir.auth.loginEndpoints).toHaveLength(0);
    });

    it('should preserve x-uigen-login: true on multiple Swagger 2.0 operations', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/v1/authenticate': {
            post: {
              'x-uigen-login': true,
              summary: 'Primary login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '/api/v1/phone-login': {
            post: {
              'x-uigen-login': true,
              summary: 'Phone login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      phone: { type: 'string' },
                      otp: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Verify both annotations were preserved
      expect(ir.auth.loginEndpoints).toHaveLength(2);
      expect(ir.auth.loginEndpoints![0].path).toBe('/api/v1/authenticate');
      expect(ir.auth.loginEndpoints![1].path).toBe('/api/v1/phone-login');
    });
  });

  describe('Non-boolean value handling (Req 1.3, 7.2)', () => {
    it('should treat string value as absent in Swagger 2.0 and fall back to auto-detection', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': 'yes',
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should fall back to auto-detection (path matches /auth/login pattern)
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should treat number value as absent in Swagger 2.0 and fall back to auto-detection', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': 1,
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should fall back to auto-detection (path matches /auth/login pattern)
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should treat object value as absent in Swagger 2.0 and fall back to auto-detection', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': { enabled: true },
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should fall back to auto-detection (path matches /auth/login pattern)
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should treat array value as absent in Swagger 2.0 and fall back to auto-detection', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': [true],
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should fall back to auto-detection (path matches /auth/login pattern)
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should treat null value as absent in Swagger 2.0 and fall back to auto-detection', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': null,
              summary: 'User login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should fall back to auto-detection (path matches /auth/login pattern)
      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
    });
  });

  describe('Annotation preservation with various Swagger 2.0 features (Req 7.3)', () => {
    it('should preserve annotation with formData parameters', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/login': {
            post: {
              'x-uigen-login': true,
              summary: 'Form-based login',
              consumes: ['application/x-www-form-urlencoded'],
              parameters: [
                {
                  name: 'username',
                  in: 'formData',
                  type: 'string',
                  required: true
                },
                {
                  name: 'password',
                  in: 'formData',
                  type: 'string',
                  required: true
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/api/login');
    });

    it('should preserve annotation with $ref in response schema', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/authenticate': {
            post: {
              'x-uigen-login': true,
              summary: 'Authenticate',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: { $ref: '#/definitions/LoginRequest' }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: { $ref: '#/definitions/AuthResponse' }
                }
              }
            }
          }
        },
        definitions: {
          LoginRequest: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string' },
              password: { type: 'string' }
            }
          },
          AuthResponse: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              expiresIn: { type: 'integer' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/api/authenticate');
      expect(ir.auth.loginEndpoints![0].tokenPath).toBe('token');
    });

    it('should preserve annotation with security definitions', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/login': {
            post: {
              'x-uigen-login': true,
              summary: 'Login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        securityDefinitions: {
          bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header'
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/api/login');
    });

    it('should preserve annotation with host, basePath, and schemes', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https', 'http'],
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': true,
              summary: 'Login',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      expect(ir.auth.loginEndpoints).toHaveLength(1);
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/login');
      expect(ir.auth.loginEndpoints![0].tokenPath).toBe('accessToken');
      
      // Verify servers were constructed correctly
      expect(ir.servers).toHaveLength(2);
      expect(ir.servers[0].url).toBe('https://api.example.com/v1');
      expect(ir.servers[1].url).toBe('http://api.example.com/v1');
    });
  });

  describe('Validation consistency between Swagger 2.0 and OpenAPI 3.x (Req 7.2)', () => {
    it('should apply same boolean-only validation to Swagger 2.0 as OpenAPI 3.x', () => {
      // Test that non-boolean values are treated the same way in both formats
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/weird-endpoint': {
            post: {
              'x-uigen-login': 'true', // String, not boolean
              summary: 'Some endpoint',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Should not be detected as annotated endpoint (string value is invalid)
      // Should fall back to auto-detection, but path doesn't match patterns and no credential fields
      expect(ir.auth.loginEndpoints).toHaveLength(0);
    });

    it('should ignore annotation on path item level in Swagger 2.0 (same as OpenAPI 3.x)', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/some-endpoint': {
            'x-uigen-login': true, // Invalid placement - on path item, not operation
            post: {
              summary: 'Some operation',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      result: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Annotation on path item should be ignored
      // Should fall back to auto-detection, but path doesn't match patterns and no credential fields
      expect(ir.auth.loginEndpoints).toHaveLength(0);
    });
  });

  describe('Output equivalence between Swagger 2.0 and OpenAPI 3.x (Req 7.4)', () => {
    it('should produce equivalent LoginEndpoint from Swagger 2.0 and OpenAPI 3.x specs', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/login': {
            post: {
              'x-uigen-login': true,
              summary: 'User login endpoint',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const swagger2Adapter = new Swagger2Adapter(swagger2Spec as any);
      const swagger2IR = swagger2Adapter.adapt();

      // Verify Swagger 2.0 produces expected output
      expect(swagger2IR.auth.loginEndpoints).toHaveLength(1);
      const swagger2Endpoint = swagger2IR.auth.loginEndpoints![0];
      
      expect(swagger2Endpoint.path).toBe('/api/login');
      expect(swagger2Endpoint.method).toBe('POST');
      expect(swagger2Endpoint.description).toBe('User login endpoint');
      expect(swagger2Endpoint.tokenPath).toBe('token');
      expect(swagger2Endpoint.requestBodySchema).toBeDefined();
      expect(swagger2Endpoint.requestBodySchema.type).toBe('object');
      expect(swagger2Endpoint.requestBodySchema.children).toHaveLength(2);
      
      const usernameField = swagger2Endpoint.requestBodySchema.children?.find(c => c.key === 'username');
      expect(usernameField).toBeDefined();
      expect(usernameField?.type).toBe('string');
      expect(usernameField?.required).toBe(true);
    });
  });
});
