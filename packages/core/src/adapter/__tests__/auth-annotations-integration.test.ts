import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Auth Annotations - Integration Tests', () => {
  /**
   * Test end-to-end parsing of OpenAPI specs with all three annotations.
   * Requirements: 1.4, 1.5
   */
  describe('End-to-end annotation processing', () => {
    it('should process all three annotations together', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production',
            'x-uigen-active-server': true
          } as any,
          {
            url: 'https://staging.api.example.com',
            description: 'Staging'
          }
        ],
        paths: {
          '/auth/reset-password': {
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
          },
          '/auth/register': {
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
      
      // Verify activeServer
      expect(app.activeServer).toBeDefined();
      expect(app.activeServer?.url).toBe('https://api.example.com');
      
      // Verify passwordResetEndpoints
      expect(app.auth.passwordResetEndpoints).toBeDefined();
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.[0].path).toBe('/auth/reset-password');
      
      // Verify signUpEndpoints
      expect(app.auth.signUpEndpoints).toBeDefined();
      expect(app.auth.signUpEndpoints?.length).toBe(1);
      expect(app.auth.signUpEndpoints?.[0].path).toBe('/auth/register');
    });

    it('should handle multiple servers and operations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://prod.api.example.com',
            'x-uigen-active-server': true
          } as any,
          { url: 'https://staging.api.example.com' },
          { url: 'http://localhost:3000' }
        ],
        paths: {
          '/auth/reset': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset password',
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/forgot': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Forgot password',
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/signup': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Sign up',
              responses: { '201': { description: 'Created' } }
            } as any
          },
          '/auth/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Register',
              responses: { '201': { description: 'Created' } }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Verify activeServer (first one)
      expect(app.activeServer?.url).toBe('https://prod.api.example.com');
      
      // Verify all servers in array
      expect(app.servers.length).toBe(3);
      
      // Verify multiple password reset endpoints
      expect(app.auth.passwordResetEndpoints?.length).toBe(2);
      
      // Verify multiple sign-up endpoints
      expect(app.auth.signUpEndpoints?.length).toBe(2);
    });

    it('should handle interaction with existing annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            'x-uigen-active-server': true
          } as any
        ],
        paths: {
          '/auth/reset': {
            post: {
              'x-uigen-password-reset': true,
              'x-uigen-ignore': false,
              summary: 'Reset password',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: {
                          type: 'string',
                          'x-uigen-label': 'Email Address'
                        } as any
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // New annotations should work
      expect(app.activeServer).toBeDefined();
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      
      // Existing annotations should still work
      const endpoint = app.auth.passwordResetEndpoints?.[0];
      expect(endpoint?.requestBodySchema).toBeDefined();
      
      // x-uigen-label should be applied
      const emailField = endpoint?.requestBodySchema?.children?.find(c => c.key === 'email');
      expect(emailField?.label).toBe('Email Address');
    });

    it('should handle complete IR structure with all fields populated', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Complete API',
          version: '2.0.0',
          description: 'A complete test API'
        },
        servers: [
          {
            url: 'https://api.example.com/v2',
            description: 'Production server',
            'x-uigen-active-server': true
          } as any
        ],
        paths: {
          '/auth/reset-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset user password',
              description: 'Allows users to reset their password via email',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email'],
                      properties: {
                        email: {
                          type: 'string',
                          format: 'email',
                          description: 'User email address'
                        },
                        token: {
                          type: 'string',
                          description: 'Reset token'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Password reset email sent'
                },
                '404': {
                  description: 'User not found'
                }
              }
            } as any
          },
          '/auth/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Register new user',
              description: 'Create a new user account',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['email', 'password'],
                      properties: {
                        email: {
                          type: 'string',
                          format: 'email'
                        },
                        password: {
                          type: 'string',
                          minLength: 8
                        },
                        firstName: {
                          type: 'string'
                        },
                        lastName: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'User created successfully',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Verify complete IR structure
      expect(app.meta.title).toBe('Complete API');
      expect(app.meta.version).toBe('2.0.0');
      expect(app.meta.description).toBe('A complete test API');
      
      // Verify activeServer with all fields
      expect(app.activeServer).toBeDefined();
      expect(app.activeServer?.url).toBe('https://api.example.com/v2');
      expect(app.activeServer?.description).toBe('Production server');
      
      // Verify password reset endpoint with all fields
      const resetEndpoint = app.auth.passwordResetEndpoints?.[0];
      expect(resetEndpoint).toBeDefined();
      expect(resetEndpoint?.path).toBe('/auth/reset-password');
      expect(resetEndpoint?.method).toBe('POST');
      expect(resetEndpoint?.description).toBe('Reset user password');
      expect(resetEndpoint?.requestBodySchema).toBeDefined();
      expect(resetEndpoint?.requestBodySchema?.type).toBe('object');
      expect(resetEndpoint?.requestBodySchema?.children?.length).toBe(2);
      
      // Verify sign-up endpoint with all fields
      const signUpEndpoint = app.auth.signUpEndpoints?.[0];
      expect(signUpEndpoint).toBeDefined();
      expect(signUpEndpoint?.path).toBe('/auth/register');
      expect(signUpEndpoint?.method).toBe('POST');
      expect(signUpEndpoint?.description).toBe('Register new user');
      expect(signUpEndpoint?.requestBodySchema).toBeDefined();
      expect(signUpEndpoint?.requestBodySchema?.type).toBe('object');
      expect(signUpEndpoint?.requestBodySchema?.children?.length).toBe(4);
    });

    it('should handle error cases gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            'x-uigen-active-server': 'invalid' // Invalid type
          } as any
        ],
        paths: {
          '/test': {
            post: {
              'x-uigen-password-reset': 123, // Invalid type
              'x-uigen-sign-up': null, // Invalid type
              summary: 'Test',
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should handle invalid values gracefully
      expect(app.activeServer).toBeUndefined();
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
      
      // Should not crash
      expect(app).toBeDefined();
      expect(app.meta).toBeDefined();
    });
  });

  /**
   * Test with real-world-style specs.
   * Requirement: 10.2
   */
  describe('Real-world spec scenarios', () => {
    it('should handle authentication-heavy spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Auth API', version: '1.0.0' },
        servers: [
          {
            url: 'https://auth.example.com',
            'x-uigen-active-server': true
          } as any
        ],
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': true,
              summary: 'Login',
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
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
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
            } as any
          },
          '/auth/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Register',
              responses: { '201': { description: 'Created' } }
            } as any
          },
          '/auth/reset-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset password',
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/forgot-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Forgot password',
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should have all auth endpoints
      expect(app.activeServer).toBeDefined();
      expect(app.auth.loginEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.length).toBe(2);
      expect(app.auth.signUpEndpoints?.length).toBe(1);
    });

    it('should handle minimal spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Minimal API', version: '1.0.0' },
        servers: [
          {
            url: 'http://localhost:3000',
            'x-uigen-active-server': true
          } as any
        ],
        paths: {
          '/reset': {
            post: {
              'x-uigen-password-reset': true,
              responses: { '200': { description: 'OK' } }
            } as any
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should work with minimal spec
      expect(app.activeServer?.url).toBe('http://localhost:3000');
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.[0].requestBodySchema).toBeUndefined();
      expect(app.auth.passwordResetEndpoints?.[0].description).toBeUndefined();
    });

    it('should handle Petstore-style spec with mixed resources and auth endpoints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Petstore API',
          version: '1.0.0',
          description: 'A sample Pet Store Server based on the OpenAPI 3.0 specification'
        },
        servers: [
          {
            url: 'https://petstore.swagger.io/api/v3',
            'x-uigen-active-server': true
          } as any,
          {
            url: 'https://petstore-staging.swagger.io/api/v3'
          }
        ],
        paths: {
          '/pet': {
            post: {
              summary: 'Add a new pet to the store',
              operationId: 'addPet',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['name'],
                      properties: {
                        name: { type: 'string' },
                        status: { type: 'string', enum: ['available', 'pending', 'sold'] }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': { description: 'Successful operation' }
              }
            }
          },
          '/pet/{petId}': {
            get: {
              summary: 'Find pet by ID',
              operationId: 'getPetById',
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer', format: 'int64' }
                }
              ],
              responses: {
                '200': { description: 'Successful operation' }
              }
            }
          },
          '/user/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Create user',
              operationId: 'createUser',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': { description: 'Successful operation' }
              }
            } as any
          },
          '/user/reset-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset user password',
              operationId: 'resetPassword',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string', format: 'email' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': { description: 'Password reset email sent' }
              }
            } as any
          },
          '/store/order': {
            post: {
              summary: 'Place an order for a pet',
              operationId: 'placeOrder',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        petId: { type: 'integer', format: 'int64' },
                        quantity: { type: 'integer', format: 'int32' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': { description: 'Successful operation' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Should have active server set
      expect(app.activeServer).toBeDefined();
      expect(app.activeServer?.url).toBe('https://petstore.swagger.io/api/v3');
      
      // Should have both servers in array
      expect(app.servers.length).toBe(2);
      
      // Should have auth endpoints extracted
      expect(app.auth.signUpEndpoints?.length).toBe(1);
      expect(app.auth.signUpEndpoints?.[0].path).toBe('/user/register');
      expect(app.auth.signUpEndpoints?.[0].description).toBe('Create user');
      
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.[0].path).toBe('/user/reset-password');
      expect(app.auth.passwordResetEndpoints?.[0].description).toBe('Reset user password');
      
      // Should still parse regular resource endpoints (not auth-related)
      expect(app.resources.length).toBeGreaterThan(0);
    });
  });
});
