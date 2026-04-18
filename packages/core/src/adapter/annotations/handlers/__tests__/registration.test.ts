import { describe, it, expect } from 'vitest';
import { AnnotationHandlerRegistry } from '../../registry.js';
import { ActiveServerHandler, PasswordResetHandler, SignUpHandler } from '../index.js';
import { OpenAPI3Adapter } from '../../../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Handler Registration Tests', () => {
  /**
   * Test that all three new handlers are registered after module initialization.
   * Requirements: 1.1, 1.2, 1.3
   */
  describe('Handler registration', () => {
    it('should register ActiveServerHandler', () => {
      const registry = AnnotationHandlerRegistry.getInstance();
      const handlers = (registry as any).handlers;
      
      const activeServerHandler = handlers.get('x-uigen-active-server');
      expect(activeServerHandler).toBeDefined();
      expect(activeServerHandler).toBeInstanceOf(ActiveServerHandler);
      expect(activeServerHandler.name).toBe('x-uigen-active-server');
    });

    it('should register PasswordResetHandler', () => {
      const registry = AnnotationHandlerRegistry.getInstance();
      const handlers = (registry as any).handlers;
      
      const passwordResetHandler = handlers.get('x-uigen-password-reset');
      expect(passwordResetHandler).toBeDefined();
      expect(passwordResetHandler).toBeInstanceOf(PasswordResetHandler);
      expect(passwordResetHandler.name).toBe('x-uigen-password-reset');
    });

    it('should register SignUpHandler', () => {
      const registry = AnnotationHandlerRegistry.getInstance();
      const handlers = (registry as any).handlers;
      
      const signUpHandler = handlers.get('x-uigen-sign-up');
      expect(signUpHandler).toBeDefined();
      expect(signUpHandler).toBeInstanceOf(SignUpHandler);
      expect(signUpHandler.name).toBe('x-uigen-sign-up');
    });

    it('should have all handlers implement the AnnotationHandler interface', () => {
      const registry = AnnotationHandlerRegistry.getInstance();
      const handlers = (registry as any).handlers;
      
      const handlerNames = ['x-uigen-active-server', 'x-uigen-password-reset', 'x-uigen-sign-up'];
      
      handlerNames.forEach(name => {
        const handler = handlers.get(name);
        expect(handler).toBeDefined();
        expect(typeof handler.extract).toBe('function');
        expect(typeof handler.validate).toBe('function');
        expect(typeof handler.apply).toBe('function');
        expect(handler.name).toBe(name);
      });
    });
  });
});


describe('Placement Validation Tests', () => {
  /**
   * Test that x-uigen-active-server is recognized on server objects
   * and ignored on other element types.
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  describe('x-uigen-active-server placement', () => {
    it('should recognize annotation on server objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production server',
            'x-uigen-active-server': true
          } as any
        ],
        paths: {}
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should recognize and set activeServer
      expect(app.activeServer).toBeDefined();
      expect(app.activeServer?.url).toBe('https://api.example.com');
    });

    it('should ignore annotation on operation objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              'x-uigen-active-server': true,
              summary: 'Test operation',
              responses: {
                '200': { description: 'Success' }
              }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should ignore annotation on operation
      expect(app.activeServer).toBeUndefined();
    });

    it('should ignore annotation on path item objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            'x-uigen-active-server': true,
            post: {
              summary: 'Test operation',
              responses: {
                '200': { description: 'Success' }
              }
            }
          } as any
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should ignore annotation on path item
      expect(app.activeServer).toBeUndefined();
    });

    it('should ignore annotation on schema objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              summary: 'Test operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      'x-uigen-active-server': true,
                      type: 'object',
                      properties: {
                        name: { type: 'string' }
                      }
                    } as any
                  }
                }
              },
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should ignore annotation on schema
      expect(app.activeServer).toBeUndefined();
    });
  });

  /**
   * Test that x-uigen-password-reset and x-uigen-sign-up are recognized
   * on operation objects and ignored on other element types.
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  describe('Operation annotation placement', () => {
    it('should recognize x-uigen-password-reset on operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/reset-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset password',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': { description: 'Success' }
              }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should recognize and create password reset endpoint
      expect(app.auth.passwordResetEndpoints).toBeDefined();
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.[0].path).toBe('/reset-password');
    });

    it('should recognize x-uigen-sign-up on operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Register user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should recognize and create sign-up endpoint
      expect(app.auth.signUpEndpoints).toBeDefined();
      expect(app.auth.signUpEndpoints?.length).toBe(1);
      expect(app.auth.signUpEndpoints?.[0].path).toBe('/register');
    });

    it('should ignore operation annotations on path items', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            'x-uigen-password-reset': true,
            'x-uigen-sign-up': true,
            post: {
              summary: 'Test operation',
              responses: {
                '200': { description: 'Success' }
              }
            }
          } as any
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should ignore annotations on path item
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
    });

    it('should ignore operation annotations on request body schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              summary: 'Test operation',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      'x-uigen-password-reset': true,
                      'x-uigen-sign-up': true,
                      type: 'object',
                      properties: {
                        name: { type: 'string' }
                      }
                    } as any
                  }
                }
              },
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should ignore annotations on request body schema
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
    });

    it('should ignore operation annotations on response schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              summary: 'Test operation',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        'x-uigen-password-reset': true,
                        'x-uigen-sign-up': true,
                        type: 'object',
                        properties: {
                          id: { type: 'string' }
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
      const app = adapter.adapt();
      
      // Should ignore annotations on response schema
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
    });
  });
});
