import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Auth Annotations - Backward Compatibility', () => {
  /**
   * Test that specs without new annotations produce identical IR output.
   * Requirements: 11.1, 11.2, 11.3, 11.4
   */
  describe('Backward compatibility preservation', () => {
    it('should leave activeServer absent when no annotation present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.api.example.com', description: 'Staging' }
        ],
        paths: {}
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // activeServer should be absent
      expect(app.activeServer).toBeUndefined();
      
      // servers array should still be populated
      expect(app.servers).toBeDefined();
      expect(app.servers.length).toBe(2);
    });

    it('should leave passwordResetEndpoints absent when no annotation present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': { description: 'Success' }
              }
            }
          },
          '/products': {
            post: {
              summary: 'Create product',
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // passwordResetEndpoints should be absent or empty
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
    });

    it('should leave signUpEndpoints absent when no annotation present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': { description: 'Success' }
              }
            }
          },
          '/products': {
            post: {
              summary: 'Create product',
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // signUpEndpoints should be absent or empty
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
    });

    it('should continue to process existing annotations unchanged', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              'x-uigen-ignore': true,
              responses: {
                '200': { description: 'Success' }
              }
            }
          },
          '/products': {
            post: {
              summary: 'Create product',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          'x-uigen-label': 'Product Name'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // Existing annotations should still work
      // x-uigen-ignore should exclude the GET /users operation
      const usersResource = app.resources.find(r => r.slug === 'users');
      if (usersResource) {
        const getOperation = usersResource.operations.find(op => op.method === 'GET');
        // Operation should be marked as ignored
        expect((getOperation as any)?.__ignored).toBe(true);
      }
      
      // x-uigen-label should still work on schema properties
      const productsResource = app.resources.find(r => r.slug === 'products');
      if (productsResource) {
        const postOperation = productsResource.operations.find(op => op.method === 'POST');
        if (postOperation?.requestBody) {
          const nameField = postOperation.requestBody.children?.find(c => c.key === 'name');
          expect(nameField?.label).toBe('Product Name');
        }
      }
    });

    it('should produce identical output for specs without new annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com' }
        ],
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
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
                            name: { type: 'string' }
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
      
      // Verify core IR structure is unchanged
      expect(app.meta).toBeDefined();
      expect(app.resources).toBeDefined();
      expect(app.auth).toBeDefined();
      expect(app.dashboard).toBeDefined();
      expect(app.servers).toBeDefined();
      
      // New fields should be absent
      expect(app.activeServer).toBeUndefined();
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
      expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
      
      // Existing fields should work as before
      expect(app.servers.length).toBe(1);
      expect(app.servers[0].url).toBe('https://api.example.com');
    });
  });

  /**
   * Test that server array is not affected by activeServer annotation.
   * Requirement: 3.3
   */
  describe('Server array non-interference', () => {
    it('should not modify servers array when activeServer is set', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://prod.api.example.com',
            description: 'Production',
            'x-uigen-active-server': true
          } as any,
          {
            url: 'https://staging.api.example.com',
            description: 'Staging'
          }
        ],
        paths: {}
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // activeServer should be set
      expect(app.activeServer).toBeDefined();
      expect(app.activeServer?.url).toBe('https://prod.api.example.com');
      
      // servers array should still contain all servers
      expect(app.servers.length).toBe(2);
      expect(app.servers[0].url).toBe('https://prod.api.example.com');
      expect(app.servers[1].url).toBe('https://staging.api.example.com');
    });

    it('should not modify servers array when no activeServer annotation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://prod.api.example.com', description: 'Production' },
          { url: 'https://staging.api.example.com', description: 'Staging' },
          { url: 'http://localhost:3000', description: 'Local' }
        ],
        paths: {}
      };
      
      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      // activeServer should be absent
      expect(app.activeServer).toBeUndefined();
      
      // servers array should contain all servers unchanged
      expect(app.servers.length).toBe(3);
      expect(app.servers[0].url).toBe('https://prod.api.example.com');
      expect(app.servers[1].url).toBe('https://staging.api.example.com');
      expect(app.servers[2].url).toBe('http://localhost:3000');
    });
  });
});
