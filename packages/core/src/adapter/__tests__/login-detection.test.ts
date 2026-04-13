import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3';
import type { OpenAPIV3 } from 'openapi-types';

describe('Login Detection', () => {
  describe('path pattern matching', () => {
    it('detects /login path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toBeDefined();
      expect(app.auth.loginEndpoints!.length).toBe(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/login');
    });

    it('detects /auth/login path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('detects /signin path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/signin': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/signin');
    });

    it('detects /auth/signin path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/auth/signin': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/signin');
    });
  });

  describe('summary/description matching', () => {
    it('detects login by summary keyword', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
              summary: 'User login',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
    });

    it('detects authenticate by description keyword', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
              description: 'Authenticate user with credentials',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
    });
  });

  describe('request body field detection', () => {
    it('detects username and password fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
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
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
    });

    it('detects email and password fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
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
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(1);
    });
  });

  describe('token path detection', () => {
    it('detects top-level token field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
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

      expect(app.auth.loginEndpoints![0].tokenPath).toBe('token');
    });

    it('detects accessToken field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
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

      expect(app.auth.loginEndpoints![0].tokenPath).toBe('accessToken');
    });

    it('defaults to "token" when no token field found', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          user: { type: 'string' }
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

      expect(app.auth.loginEndpoints![0].tokenPath).toBe('token');
    });
  });

  describe('multiple login endpoints', () => {
    it('detects multiple login endpoints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          },
          '/auth/signin': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints!.length).toBe(2);
    });

    it('returns empty array when no login endpoints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints || []).toHaveLength(0);
    });
  });

  describe('refresh endpoint detection', () => {
    it('detects /refresh path', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/refresh': {
            post: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.refreshEndpoints!.length).toBe(1);
      expect(app.auth.refreshEndpoints![0].path).toBe('/refresh');
    });

    it('detects refresh token field in request body', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/token': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        refreshToken: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.refreshEndpoints!.length).toBe(1);
    });

    it('detects "refresh token" in description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/token': {
            post: {
              description: 'Refresh token endpoint',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.refreshEndpoints!.length).toBe(1);
    });
  });
});
