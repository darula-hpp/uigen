import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Authentication Scheme Extraction', () => {
  describe('Bearer Token Authentication', () => {
    it('should extract bearer token scheme', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0]).toEqual({
        type: 'bearer',
        name: 'bearerAuth',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      });
    });

    it('should extract bearer token without bearerFormat', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            simpleBearer: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0]).toEqual({
        type: 'bearer',
        name: 'simpleBearer',
        scheme: 'bearer',
        bearerFormat: undefined
      });
    });

    it('should not extract non-bearer HTTP schemes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            basicAuth: {
              type: 'http',
              scheme: 'basic'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Basic auth is now supported
      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].type).toBe('basic');
    });
  });

  describe('API Key Authentication', () => {
    it('should extract API key in header', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKeyHeader: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0]).toEqual({
        type: 'apiKey',
        name: 'apiKeyHeader',
        in: 'header'
      });
    });

    it('should extract API key in query', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKeyQuery: {
              type: 'apiKey',
              in: 'query',
              name: 'api_key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0]).toEqual({
        type: 'apiKey',
        name: 'apiKeyQuery',
        in: 'query'
      });
    });

    it('should extract API key in cookie', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKeyCookie: {
              type: 'apiKey',
              in: 'cookie',
              name: 'session_id'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0]).toEqual({
        type: 'apiKey',
        name: 'apiKeyCookie',
        in: 'cookie'
      });
    });
  });

  describe('Multiple Authentication Schemes', () => {
    it('should extract multiple different auth schemes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            },
            queryKeyAuth: {
              type: 'apiKey',
              in: 'query',
              name: 'api_key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(3);
      
      const bearerScheme = result.auth.schemes.find(s => s.name === 'bearerAuth');
      expect(bearerScheme?.type).toBe('bearer');
      
      const headerKeyScheme = result.auth.schemes.find(s => s.name === 'apiKeyAuth');
      expect(headerKeyScheme?.type).toBe('apiKey');
      expect(headerKeyScheme?.in).toBe('header');
      
      const queryKeyScheme = result.auth.schemes.find(s => s.name === 'queryKeyAuth');
      expect(queryKeyScheme?.type).toBe('apiKey');
      expect(queryKeyScheme?.in).toBe('query');
    });

    it('should preserve scheme order from spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            first: {
              type: 'http',
              scheme: 'bearer'
            },
            second: {
              type: 'apiKey',
              in: 'header',
              name: 'X-Key'
            },
            third: {
              type: 'apiKey',
              in: 'query',
              name: 'key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(3);
      expect(result.auth.schemes[0].name).toBe('first');
      expect(result.auth.schemes[1].name).toBe('second');
      expect(result.auth.schemes[2].name).toBe('third');
    });
  });

  describe('Global Security Requirements', () => {
    it('should detect global security when security is defined at root', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        security: [
          { bearerAuth: [] }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.globalRequired).toBe(true);
    });

    it('should not detect global security when security is not defined', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.globalRequired).toBe(false);
    });

    it('should not detect global security when security array is empty', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        security: [],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.globalRequired).toBe(false);
    });

    it('should detect global security with multiple schemes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        security: [
          { bearerAuth: [] },
          { apiKey: [] }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.globalRequired).toBe(true);
      expect(result.auth.schemes).toHaveLength(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing components section', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(0);
      expect(result.auth.globalRequired).toBe(false);
    });

    it('should handle missing securitySchemes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {},
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(0);
      expect(result.auth.globalRequired).toBe(false);
    });

    it('should handle empty securitySchemes object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {}
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(0);
      expect(result.auth.globalRequired).toBe(false);
    });

    it('should skip unsupported security scheme types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            oauth2Scheme: {
              type: 'oauth2',
              flows: {
                implicit: {
                  authorizationUrl: 'https://example.com/oauth/authorize',
                  scopes: {
                    'read': 'Read access',
                    'write': 'Write access'
                  }
                }
              }
            },
            openIdConnect: {
              type: 'openIdConnect',
              openIdConnectUrl: 'https://example.com/.well-known/openid-configuration'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // OAuth2 and OpenID Connect are not currently supported
      expect(result.auth.schemes).toHaveLength(0);
    });

    it('should handle malformed security scheme objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            validScheme: {
              type: 'http',
              scheme: 'bearer'
            },
            malformedScheme: {
              // Missing type field
              scheme: 'bearer'
            } as any,
            referenceScheme: {
              $ref: '#/components/securitySchemes/validScheme'
            } as any
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should only extract the valid scheme
      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].name).toBe('validScheme');
    });

    it('should handle security scheme with special characters in name', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            'bearer-auth-v2': {
              type: 'http',
              scheme: 'bearer'
            },
            'api_key_auth': {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(2);
      expect(result.auth.schemes[0].name).toBe('bearer-auth-v2');
      expect(result.auth.schemes[1].name).toBe('api_key_auth');
    });

    it('should handle API key with missing name field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            brokenApiKey: {
              type: 'apiKey',
              in: 'header'
              // Missing 'name' field
            } as any
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should still extract the scheme (name field is on the scheme definition, not in IR)
      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].type).toBe('apiKey');
    });

    it('should handle global security referencing non-existent scheme', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        security: [
          { nonExistentScheme: [] }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should still mark as globally required even if scheme doesn't exist
      expect(result.auth.globalRequired).toBe(true);
      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].name).toBe('bearerAuth');
    });
  });

  describe('AuthConfig Structure', () => {
    it('should always return AuthConfig with schemes array and globalRequired', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth).toBeDefined();
      expect(result.auth).toHaveProperty('schemes');
      expect(result.auth).toHaveProperty('globalRequired');
      expect(Array.isArray(result.auth.schemes)).toBe(true);
      expect(typeof result.auth.globalRequired).toBe('boolean');
    });

    it('should include auth in top-level IR structure', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify IR structure includes auth (Requirement 3.1)
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('dashboard');
      expect(result).toHaveProperty('servers');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle GitHub-style bearer token', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'GitHub API', version: '1.0.0' },
        components: {
          securitySchemes: {
            token: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
        security: [
          { token: [] }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].type).toBe('bearer');
      expect(result.auth.globalRequired).toBe(true);
    });

    it('should handle Stripe-style API key in header', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Stripe API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'Authorization'
            }
          }
        },
        security: [
          { apiKey: [] }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].type).toBe('apiKey');
      expect(result.auth.schemes[0].in).toBe('header');
      expect(result.auth.globalRequired).toBe(true);
    });

    it('should handle AWS-style API key in query', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'AWS API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKeyQuery: {
              type: 'apiKey',
              in: 'query',
              name: 'api_key'
            }
          }
        },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(1);
      expect(result.auth.schemes[0].type).toBe('apiKey');
      expect(result.auth.schemes[0].in).toBe('query');
    });

    it('should handle mixed auth with optional global security', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Mixed Auth API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        },
        // No global security - operations can define their own
        paths: {
          '/public': {
            get: {
              responses: { '200': { description: 'Public endpoint' } }
            }
          },
          '/protected': {
            get: {
              security: [
                { bearerAuth: [] }
              ],
              responses: { '200': { description: 'Protected endpoint' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(2);
      expect(result.auth.globalRequired).toBe(false);
    });
  });
});
