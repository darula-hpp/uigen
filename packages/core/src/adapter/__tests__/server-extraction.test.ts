import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Server Configuration Extraction', () => {
  describe('Single Server', () => {
    it('should extract server with URL and description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com/v1',
            description: 'Production server'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'https://api.example.com/v1',
        description: 'Production server'
      });
    });

    it('should extract server with URL only (no description)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'https://api.example.com',
        description: undefined
      });
    });

    it('should extract server with empty description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: ''
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'https://api.example.com',
        description: ''
      });
    });
  });

  describe('Multiple Servers', () => {
    it('should extract all servers in order', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production'
          },
          {
            url: 'https://staging.example.com',
            description: 'Staging'
          },
          {
            url: 'http://localhost:3000',
            description: 'Development'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(3);
      expect(result.servers[0]).toEqual({
        url: 'https://api.example.com',
        description: 'Production'
      });
      expect(result.servers[1]).toEqual({
        url: 'https://staging.example.com',
        description: 'Staging'
      });
      expect(result.servers[2]).toEqual({
        url: 'http://localhost:3000',
        description: 'Development'
      });
    });

    it('should preserve server order from spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://first.com', description: 'First' },
          { url: 'https://second.com', description: 'Second' },
          { url: 'https://third.com', description: 'Third' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers.map(s => s.description)).toEqual(['First', 'Second', 'Third']);
    });

    it('should handle mix of servers with and without descriptions', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com' },
          { url: 'http://localhost:3000', description: 'Local' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(3);
      expect(result.servers[0].description).toBe('Production');
      expect(result.servers[1].description).toBeUndefined();
      expect(result.servers[2].description).toBe('Local');
    });
  });

  describe('Missing or Empty Servers', () => {
    it('should provide default server when servers array is missing', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'http://localhost:3000',
        description: 'Default'
      });
    });

    it('should provide default server when servers array is empty', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'http://localhost:3000',
        description: 'Default'
      });
    });

    it('should provide default server when servers is null', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: null as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'http://localhost:3000',
        description: 'Default'
      });
    });

    it('should provide default server when servers is undefined', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: undefined,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'http://localhost:3000',
        description: 'Default'
      });
    });
  });

  describe('Server URL Formats', () => {
    it('should handle HTTPS URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://secure.example.com' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://secure.example.com');
    });

    it('should handle HTTP URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'http://insecure.example.com' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('http://insecure.example.com');
    });

    it('should handle URLs with ports', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com:8443' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://api.example.com:8443');
    });

    it('should handle URLs with paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com/v1/api' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://api.example.com/v1/api');
    });

    it('should handle URLs with trailing slashes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com/' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://api.example.com/');
    });

    it('should handle localhost URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'http://localhost:8080' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('http://localhost:8080');
    });

    it('should handle IP address URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'http://192.168.1.100:3000' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('http://192.168.1.100:3000');
    });

    it('should handle relative URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: '/api/v1' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('/api/v1');
    });

    it('should handle root-relative URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: '/' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('/');
    });
  });

  describe('Server Variables (Edge Case)', () => {
    it('should extract server URL with variables as-is', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://{environment}.example.com',
            description: 'Templated server',
            variables: {
              environment: {
                default: 'api',
                enum: ['api', 'staging', 'dev']
              }
            }
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should extract the URL as-is (variable substitution is not in scope for this task)
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('https://{environment}.example.com');
      expect(result.servers[0].description).toBe('Templated server');
    });

    it('should handle multiple server variables', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://{subdomain}.{domain}:{port}/{basePath}',
            variables: {
              subdomain: { default: 'api' },
              domain: { default: 'example.com' },
              port: { default: '443' },
              basePath: { default: 'v1' }
            }
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://{subdomain}.{domain}:{port}/{basePath}');
    });
  });

  describe('Malformed Server Data', () => {
    it('should handle server with missing URL gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            description: 'Server without URL'
          } as any
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should extract the server even with missing URL
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBeUndefined();
      expect(result.servers[0].description).toBe('Server without URL');
    });

    it('should handle server with empty URL string', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: '',
            description: 'Empty URL'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('');
      expect(result.servers[0].description).toBe('Empty URL');
    });

    it('should handle server with whitespace-only URL', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: '   ',
            description: 'Whitespace URL'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('   ');
    });

    it('should handle server with null description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: null as any
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('https://api.example.com');
      expect(result.servers[0].description).toBeNull();
    });
  });

  describe('Special Characters in Descriptions', () => {
    it('should handle descriptions with special characters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production (US-East) - High Availability'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].description).toBe('Production (US-East) - High Availability');
    });

    it('should handle descriptions with unicode characters', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production 🚀 Server'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].description).toBe('Production 🚀 Server');
    });

    it('should handle descriptions with newlines', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: 'Production\nServer'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].description).toBe('Production\nServer');
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.example.com',
            description: longDescription
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].description).toBe(longDescription);
      expect(result.servers[0].description?.length).toBe(500);
    });
  });

  describe('IR Structure Validation', () => {
    it('should include servers in top-level IR structure', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify IR structure includes servers (Requirement 3.1)
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('dashboard');
      expect(result).toHaveProperty('servers');
    });

    it('should always return servers array', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(Array.isArray(result.servers)).toBe(true);
      expect(result.servers.length).toBeGreaterThan(0);
    });

    it('should return ServerConfig objects with correct structure', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      result.servers.forEach(server => {
        expect(server).toHaveProperty('url');
        expect(server).toHaveProperty('description');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle Petstore-style server configuration', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Petstore API', version: '1.0.0' },
        servers: [
          {
            url: 'https://petstore3.swagger.io/api/v3',
            description: 'Production server'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0]).toEqual({
        url: 'https://petstore3.swagger.io/api/v3',
        description: 'Production server'
      });
    });

    it('should handle multi-environment setup', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Enterprise API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.production.example.com',
            description: 'Production - US East'
          },
          {
            url: 'https://api.staging.example.com',
            description: 'Staging Environment'
          },
          {
            url: 'https://api.dev.example.com',
            description: 'Development'
          },
          {
            url: 'http://localhost:3000',
            description: 'Local Development'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(4);
      expect(result.servers[0].description).toBe('Production - US East');
      expect(result.servers[1].description).toBe('Staging Environment');
      expect(result.servers[2].description).toBe('Development');
      expect(result.servers[3].description).toBe('Local Development');
    });

    it('should handle GitHub-style API server', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'GitHub API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.github.com',
            description: 'GitHub REST API'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('https://api.github.com');
    });

    it('should handle Stripe-style versioned API', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Stripe API', version: '1.0.0' },
        servers: [
          {
            url: 'https://api.stripe.com/v1',
            description: 'Stripe API v1'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers[0].url).toBe('https://api.stripe.com/v1');
    });

    it('should handle microservices with multiple base URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Microservices API', version: '1.0.0' },
        servers: [
          {
            url: 'https://users.api.example.com',
            description: 'User Service'
          },
          {
            url: 'https://orders.api.example.com',
            description: 'Order Service'
          },
          {
            url: 'https://payments.api.example.com',
            description: 'Payment Service'
          }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(3);
      expect(result.servers.map(s => s.description)).toEqual([
        'User Service',
        'Order Service',
        'Payment Service'
      ]);
    });
  });
});
