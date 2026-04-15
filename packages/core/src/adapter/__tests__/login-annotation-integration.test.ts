import { describe, it, expect } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import * as jsyaml from 'js-yaml';

// Helper to find workspace root by looking for examples directory
function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== dirname(currentDir)) {
    const examplesPath = join(currentDir, 'examples');
    if (existsSync(examplesPath)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

describe('Task 3.1: detectLoginEndpoints Integration', () => {
  describe('Annotation and auto-detection integration', () => {
    it('should prioritize annotated endpoints over auto-detected ones', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/authenticate': {
            post: {
              'x-uigen-login': true,
              summary: 'Custom authentication endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: { type: 'string' },
                        pass: { type: 'string' }
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
            }
          },
          '/auth/login': {
            post: {
              summary: 'Standard login endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
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
                          accessToken: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(2);
      
      // Annotated endpoint should come first
      expect(app.auth.loginEndpoints![0].path).toBe('/api/authenticate');
      expect(app.auth.loginEndpoints![0].description).toBe('Custom authentication endpoint');
      
      // Auto-detected endpoint should come second
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/login');
      expect(app.auth.loginEndpoints![1].description).toBe('Standard login endpoint');
    });

    it('should exclude endpoints with x-uigen-login: false even if they match auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': false,
              summary: 'This is NOT a login endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
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
          },
          '/api/signin': {
            post: {
              summary: 'Real login endpoint',
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
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Only the /api/signin endpoint should be detected
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/signin');
    });

    it('should include annotated endpoints regardless of path or description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/v1/user/verify-credentials': {
            post: {
              'x-uigen-login': true,
              summary: 'Verify user credentials',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        secret: { type: 'string' }
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
                          accessToken: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/v1/user/verify-credentials');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('accessToken');
    });

    it('should handle multiple annotated endpoints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login/username': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with username',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
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
            }
          },
          '/auth/login/email': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with email',
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
            }
          },
          '/auth/login/phone': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with phone',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        phone: { type: 'string' },
                        otp: { type: 'string' }
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
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(3);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login/username');
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/login/email');
      expect(app.auth.loginEndpoints![2].path).toBe('/auth/login/phone');
    });

    it('should maintain backward compatibility when no annotations are present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
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
            }
          },
          '/api/signin': {
            post: {
              summary: 'Sign in to the application',
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
                          accessToken: { type: 'string' }
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
      const app = adapter.adapt();

      // Both endpoints should be auto-detected
      expect(app.auth.loginEndpoints).toHaveLength(2);
      expect(app.auth.loginEndpoints!.map(e => e.path)).toContain('/auth/login');
      expect(app.auth.loginEndpoints!.map(e => e.path)).toContain('/api/signin');
    });

    it('should ignore non-boolean annotation values and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': 'yes' as any,
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
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
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });
  });

  describe('Real-world spec examples', () => {
    it('should handle Swagger 2.0 Petstore spec with x-uigen-login annotations', () => {
      const workspaceRoot = findWorkspaceRoot(process.cwd());
      const specPath = join(workspaceRoot, 'examples', 'swagger2-petstore-with-login.yaml');
      const specContent = readFileSync(specPath, 'utf-8');
      const spec = jsyaml.load(specContent) as any;

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();

      // Should detect annotated endpoints
      expect(app.auth.loginEndpoints).toBeDefined();
      expect(app.auth.loginEndpoints!.length).toBeGreaterThanOrEqual(2);

      // Should prioritize annotated endpoints
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/authenticate');
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/phone-login');

      // Should exclude /user/login (marked with x-uigen-login: false)
      const excludedEndpoint = app.auth.loginEndpoints!.find(e => e.path === '/user/login');
      expect(excludedEndpoint).toBeUndefined();
    });
  });

  describe('Badly written API with non-standard login endpoint', () => {
    it('should detect login endpoint with unusual path when annotated', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Badly Written API', version: '1.0.0' },
        paths: {
          '/api/v1/user/verify-credentials': {
            post: {
              'x-uigen-login': true,
              summary: 'Verify user credentials',
              description: 'This endpoint verifies user credentials and returns a session token',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        secret: { type: 'string' }
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
            }
          },
          '/api/v1/data/fetch': {
            post: {
              summary: 'Fetch data',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        query: { type: 'string' }
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
      const app = adapter.adapt();

      // Should detect the annotated endpoint despite non-standard path
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/v1/user/verify-credentials');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('token');
      expect(app.auth.loginEndpoints![0].description).toBe('Verify user credentials');
    });

    it('should detect login endpoint with misleading description when annotated', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Confusing API', version: '1.0.0' },
        paths: {
          '/api/sessions': {
            post: {
              'x-uigen-login': true,
              summary: 'Create a new session',
              description: 'Creates a new user session',
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
                '201': {
                  description: 'Session created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          data: {
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
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should detect the annotated endpoint
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/sessions');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('data.token');
    });
  });

  describe('API with multiple login methods', () => {
    it('should handle API with username, email, and phone login methods', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Multi-Auth API', version: '1.0.0' },
        paths: {
          '/auth/login/username': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with username',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
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
            }
          },
          '/auth/login/email': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with email',
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
                          accessToken: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/auth/login/phone': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with phone',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        phone: { type: 'string' },
                        otp: { type: 'string' }
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
                          bearerToken: { type: 'string' }
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
      const app = adapter.adapt();

      // Should detect all three login methods
      expect(app.auth.loginEndpoints).toHaveLength(3);
      
      // Verify each method
      const usernameLogin = app.auth.loginEndpoints![0];
      expect(usernameLogin.path).toBe('/auth/login/username');
      expect(usernameLogin.requestBodySchema.children!.some(c => c.key === 'username')).toBe(true);
      expect(usernameLogin.tokenPath).toBe('token');

      const emailLogin = app.auth.loginEndpoints![1];
      expect(emailLogin.path).toBe('/auth/login/email');
      expect(emailLogin.requestBodySchema.children!.some(c => c.key === 'email')).toBe(true);
      expect(emailLogin.tokenPath).toBe('accessToken');

      const phoneLogin = app.auth.loginEndpoints![2];
      expect(phoneLogin.path).toBe('/auth/login/phone');
      expect(phoneLogin.requestBodySchema.children!.some(c => c.key === 'phone')).toBe(true);
      expect(phoneLogin.requestBodySchema.children!.some(c => c.key === 'otp')).toBe(true);
      expect(phoneLogin.tokenPath).toBe('bearerToken');
    });
  });

  describe('API with login endpoint that looks like a different operation', () => {
    it('should detect login endpoint that looks like a session creation endpoint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Session API', version: '1.0.0' },
        paths: {
          '/api/sessions': {
            post: {
              'x-uigen-login': true,
              summary: 'Create session',
              description: 'Creates a new user session',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        credentials: {
                          type: 'object',
                          properties: {
                            username: { type: 'string' },
                            password: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Session created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          session: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              token: { type: 'string' }
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
      const app = adapter.adapt();

      // Should detect the annotated endpoint
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/sessions');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('session.token');
    });

    it('should detect login endpoint that looks like a token generation endpoint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Token API', version: '1.0.0' },
        paths: {
          '/api/tokens': {
            post: {
              'x-uigen-login': true,
              summary: 'Generate token',
              description: 'Generates an access token',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        clientId: { type: 'string' },
                        clientSecret: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Token generated',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          access_token: { type: 'string' },
                          token_type: { type: 'string' },
                          expires_in: { type: 'integer' }
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
      const app = adapter.adapt();

      // Should detect the annotated endpoint
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/tokens');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('access_token');
    });
  });

  describe('End-to-end flow from spec parsing to IR generation', () => {
    it('should complete full flow: parse spec → detect login → extract schemas → generate IR', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { 
          title: 'E2E Test API', 
          version: '2.0.0',
          description: 'API for testing end-to-end flow'
        },
        servers: [
          { url: 'https://api.example.com/v2', description: 'Production' }
        ],
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': true,
              summary: 'User login',
              description: 'Authenticate user and return access token',
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
                          format: 'email',
                          description: 'User email address'
                        },
                        password: { 
                          type: 'string', 
                          minLength: 8,
                          description: 'User password'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Login successful',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' }
                            }
                          },
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                '401': {
                  description: 'Invalid credentials'
                }
              }
            }
          },
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
                            id: { type: 'string' },
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
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Verify complete IR structure
      expect(app.meta.title).toBe('E2E Test API');
      expect(app.meta.version).toBe('2.0.0');
      expect(app.meta.description).toBe('API for testing end-to-end flow');

      // Verify servers
      expect(app.servers).toHaveLength(1);
      expect(app.servers[0].url).toBe('https://api.example.com/v2');

      // Verify login endpoint detection
      expect(app.auth.loginEndpoints).toHaveLength(1);
      const loginEndpoint = app.auth.loginEndpoints![0];
      
      expect(loginEndpoint.path).toBe('/auth/login');
      expect(loginEndpoint.method).toBe('POST');
      expect(loginEndpoint.description).toBe('User login');
      expect(loginEndpoint.tokenPath).toBe('accessToken');

      // Verify request body schema extraction
      expect(loginEndpoint.requestBodySchema).toBeDefined();
      expect(loginEndpoint.requestBodySchema.type).toBe('object');
      expect(loginEndpoint.requestBodySchema.children).toHaveLength(2);

      const emailField = loginEndpoint.requestBodySchema.children!.find(c => c.key === 'email');
      expect(emailField).toBeDefined();
      expect(emailField!.type).toBe('string');
      expect(emailField!.required).toBe(true);
      expect(emailField!.format).toBe('email');

      const passwordField = loginEndpoint.requestBodySchema.children!.find(c => c.key === 'password');
      expect(passwordField).toBeDefined();
      expect(passwordField!.type).toBe('string');
      expect(passwordField!.required).toBe(true);
      expect(passwordField!.validations?.some(v => v.type === 'minLength' && v.value === 8)).toBe(true);

      // Verify resources are extracted
      expect(app.resources.length).toBeGreaterThan(0);
    });
  });

  describe('Swagger 2.0 to OpenAPI 3.x conversion with annotations', () => {
    it('should preserve x-uigen-login: true through conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': true,
              summary: 'User login',
              consumes: ['application/json'],
              produces: ['application/json'],
              parameters: [
                {
                  in: 'body',
                  name: 'body',
                  required: true,
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

      const adapter = new Swagger2Adapter(swagger2Spec);
      const app = adapter.adapt();

      // Should detect the annotated login endpoint
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
      expect(app.auth.loginEndpoints![0].method).toBe('POST');
      expect(app.auth.loginEndpoints![0].tokenPath).toBe('token');
    });

    it('should preserve x-uigen-login: false through conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': false,
              summary: 'This is NOT a login endpoint',
              consumes: ['application/json'],
              produces: ['application/json'],
              parameters: [
                {
                  in: 'body',
                  name: 'body',
                  required: true,
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
          },
          '/api/signin': {
            post: {
              summary: 'Real login endpoint',
              consumes: ['application/json'],
              produces: ['application/json'],
              parameters: [
                {
                  in: 'body',
                  name: 'body',
                  required: true,
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
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

      const adapter = new Swagger2Adapter(swagger2Spec);
      const app = adapter.adapt();

      // Should exclude /auth/login and only detect /api/signin
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/signin');
    });

    it('should handle multiple annotated endpoints in Swagger 2.0', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Multi-Auth API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/auth/username-login': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with username',
              consumes: ['application/json'],
              produces: ['application/json'],
              parameters: [
                {
                  in: 'body',
                  name: 'body',
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
          '/auth/email-login': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with email',
              consumes: ['application/json'],
              produces: ['application/json'],
              parameters: [
                {
                  in: 'body',
                  name: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
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

      const adapter = new Swagger2Adapter(swagger2Spec);
      const app = adapter.adapt();

      // Should detect both annotated endpoints
      expect(app.auth.loginEndpoints).toHaveLength(2);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/username-login');
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/email-login');
    });
  });
});
