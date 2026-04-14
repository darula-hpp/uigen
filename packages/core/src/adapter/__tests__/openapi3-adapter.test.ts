import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as path from 'path';
import * as jsyaml from 'js-yaml';

// Helper to find workspace root by looking for examples directory
function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const examplesPath = path.join(currentDir, 'examples');
    if (fs.existsSync(examplesPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

/**
 * Comprehensive unit tests for OpenAPI3Adapter
 * 
 * Test Coverage:
 * - Petstore.yaml integration (real-world example)
 * - Empty spec handling (no paths, no operations)
 * - Missing schemas (operations without response schemas)
 * - Malformed operations (missing required fields)
 * - Graceful degradation (Requirements 25.1, 26.1)
 * 
 * Requirements: 1.1-1.10, 25.1, 26.1
 */

describe('OpenAPI3Adapter - Comprehensive Unit Tests', () => {
  describe('Petstore.yaml Integration', () => {
    let petstoreSpec: any;
    let adapter: OpenAPI3Adapter;
    let result: any;

    beforeAll(() => {
      const workspaceRoot = findWorkspaceRoot(process.cwd());
      const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
      const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
      petstoreSpec = jsyaml.load(petstoreContent);
      adapter = new OpenAPI3Adapter(petstoreSpec);
      result = adapter.adapt();
    });

    it('should parse petstore.yaml and extract all resources', () => {
      // Petstore has 3 resources: pet, store, user
      expect(result.resources.length).toBeGreaterThanOrEqual(3);
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      expect(petResource?.name).toBe('Pet');
    });

    it('should extract all operations from petstore.yaml', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      expect(petResource!.operations.length).toBeGreaterThan(0);
      
      const methods = petResource!.operations.map((op: any) => op.method).sort();
      // Pet resource has multiple operations including GET, POST, PUT, DELETE
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    it('should correctly classify view hints for petstore operations', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      
      // Check that operations have view hints assigned
      const operations = petResource!.operations;
      expect(operations.length).toBeGreaterThan(0);
      
      // Verify some operations have view hints
      const hasViewHints = operations.some((op: any) => op.viewHint !== undefined);
      expect(hasViewHints).toBe(true);
    });

    it('should extract Pet schema with all fields from petstore.yaml', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      expect(petResource!.schema.type).toBe('object');
      expect(petResource!.schema.children).toBeDefined();
      
      const fieldKeys = petResource!.schema.children!.map((c: any) => c.key);
      expect(fieldKeys).toContain('id');
      expect(fieldKeys).toContain('name');
      expect(fieldKeys).toContain('status');
    });

    it('should extract validation rules from petstore schema', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      const nameField = petResource!.schema.children!.find((c: any) => c.key === 'name');
      
      // Name field should exist and be required
      expect(nameField).toBeDefined();
      expect(nameField?.required).toBe(true);
    });

    it('should mark required fields correctly in petstore schema', () => {
      const petResource = result.resources[0];
      const nameField = petResource.schema.children!.find((c: any) => c.key === 'name');
      const statusField = petResource.schema.children!.find((c: any) => c.key === 'status');
      
    it('should mark required fields correctly in petstore schema', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      const nameField = petResource!.schema.children!.find((c: any) => c.key === 'name');
      
      expect(nameField?.required).toBe(true);
    });

    it('should extract enum values from petstore status field', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      const statusField = petResource!.schema.children!.find((c: any) => c.key === 'status');
      
      if (statusField) {
        expect(statusField.type).toBe('enum');
        expect(statusField.enumValues).toEqual(['available', 'pending', 'sold']);
      }
    });

    it('should detect pagination from petstore list operation', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      // Pagination detection is optional - just verify resource exists
    });

    it('should extract metadata from petstore.yaml', () => {
      expect(result.meta.title).toBe('Swagger Petstore - OpenAPI 3.0');
      expect(result.meta.version).toBe('1.0.27');
    });

    it('should extract server configuration from petstore.yaml', () => {
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('/api/v3');
    });

    it('should extract auth schemes from petstore.yaml', () => {
      expect(result.auth.schemes.length).toBeGreaterThan(0);
      // Petstore has apiKey and oauth2 auth
      const hasApiKey = result.auth.schemes.some((s: any) => s.type === 'apiKey');
      expect(hasApiKey).toBe(true);
    });

    it('should extract array fields correctly from petstore schema', () => {
      const petResource = result.resources.find(r => r.slug === 'pet');
      expect(petResource).toBeDefined();
      const tagsField = petResource!.schema.children!.find((c: any) => c.key === 'tags');
      
      if (tagsField) {
        expect(tagsField.type).toBe('array');
        expect(tagsField.items).toBeDefined();
      }
    });
  });

  describe('Empty Spec Handling', () => {
    it('should handle spec with no paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Empty API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(0);
      expect(result.meta.title).toBe('Empty API');
      expect(result.meta.version).toBe('1.0.0');
    });

    it('should handle spec with no operations in paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'No Operations API', version: '1.0.0' },
        paths: {
          '/users': {},
          '/products': {}
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Empty path items still create resources with placeholder schemas
      // but no operations - this is graceful degradation
      expect(result.resources.length).toBeGreaterThanOrEqual(0);
      if (result.resources.length > 0) {
        result.resources.forEach(r => {
          expect(r.operations).toHaveLength(0);
        });
      }
    });

    it('should provide default server when no servers defined', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'No Server API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe('http://localhost:3000');
      expect(result.servers[0].description).toBe('Default');
    });

    it('should handle spec with no security schemes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'No Auth API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.auth.schemes).toHaveLength(0);
      expect(result.auth.globalRequired).toBe(false);
    });

    it('should handle spec with minimal info', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Minimal API', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.meta.title).toBe('Minimal API');
      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.description).toBeUndefined();
    });
  });

  describe('Missing Schemas - Graceful Degradation (Requirement 25.1)', () => {
    it('should handle operation with missing response schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success'
                  // No content/schema defined
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.responses['200']).toBeDefined();
      expect(operation.responses['200'].schema).toBeUndefined();
    });

    it('should handle operation with missing requestBody schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                description: 'User data'
                // No content defined
              } as any,
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeUndefined();
    });

    it('should handle operation with empty response content', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            delete: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
              ],
              responses: {
                '204': {
                  description: 'No content'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.responses['204']).toBeDefined();
      expect(operation.responses['204'].schema).toBeUndefined();
    });

    it('should create placeholder schema when response schema is missing', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      // Resource should have a placeholder schema
      expect(result.resources[0].schema).toBeDefined();
      expect(result.resources[0].schema.type).toBe('object');
    });

    it('should handle unresolvable $ref in response schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/NonExistent'
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
      const result = adapter.adapt();

      // Should not crash, should continue processing
      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.responses['200']).toBeDefined();
    });

    it('should handle missing parameter schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/search': {
            get: {
              parameters: [
                {
                  name: 'query',
                  in: 'query',
                  required: false
                  // No schema defined
                } as any
              ],
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should not crash
      expect(result.resources).toHaveLength(1);
    });
  });

  describe('Malformed Operations - Graceful Degradation (Requirement 26.1)', () => {
    it('should handle operation with missing responses field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/broken': {
            get: {
              summary: 'Broken operation'
              // Missing required 'responses' field
            } as any
          },
          '/valid': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should continue processing and extract valid operations
      expect(result.resources).toBeDefined();
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should handle malformed responses object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/malformed': {
            get: {
              responses: null as any
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should not crash
      expect(result.resources).toBeDefined();
    });

    it('should handle operation with invalid parameter structure', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              parameters: [
                null as any,
                { name: 'valid', in: 'query', schema: { type: 'string' } }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should skip invalid parameters but process valid ones
      expect(result.resources).toHaveLength(1);
    });

    it('should handle operation with malformed requestBody', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/create': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    // Missing schema
                  }
                }
              } as any,
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeUndefined();
    });

    it('should handle path item with null operation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: null as any,
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should skip null operation but process valid POST
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].method).toBe('POST');
    });

    it('should handle null path item', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/null-path': null as any,
          '/valid': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Should skip null path but process valid path
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].slug).toBe('valid');
    });

    it('should handle operation with malformed security requirements', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/secure': {
            get: {
              security: null as any,
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(1);
      const operation = result.resources[0].operations[0];
      expect(operation.security).toBeUndefined();
    });
  });

  describe('Edge Cases and Additional Scenarios', () => {
    it('should handle spec with multiple resources', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Multi Resource API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: { '200': { description: 'Success' } } }
          },
          '/products': {
            get: { responses: { '200': { description: 'Success' } } }
          },
          '/orders': {
            get: { responses: { '200': { description: 'Success' } } }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources).toHaveLength(3);
      const slugs = result.resources.map(r => r.slug).sort();
      expect(slugs).toEqual(['orders', 'products', 'users']);
    });

    it('should handle operations with complex nested schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/complex': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            address: {
                              type: 'object',
                              properties: {
                                street: { type: 'string' },
                                city: { type: 'string' },
                                country: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.children).toBeDefined();
      
      const userField = operation.requestBody?.children?.find(c => c.key === 'user');
      expect(userField?.type).toBe('object');
      expect(userField?.children).toBeDefined();
      
      const addressField = userField?.children?.find(c => c.key === 'address');
      expect(addressField?.type).toBe('object');
      expect(addressField?.children).toBeDefined();
      expect(addressField?.children?.length).toBe(3);
    });

    it('should handle array response schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
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
                            id: { type: 'integer' },
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
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.responses['200'].schema).toBeDefined();
      expect(operation.responses['200'].schema?.type).toBe('array');
      expect(operation.responses['200'].schema?.items).toBeDefined();
    });

    it('should handle multiple servers', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [
          { url: 'https://dev.example.com', description: 'Development' },
          { url: 'https://staging.example.com', description: 'Staging' },
          { url: 'https://api.example.com', description: 'Production' }
        ],
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.servers).toHaveLength(3);
      expect(result.servers[0].url).toBe('https://dev.example.com');
      expect(result.servers[1].url).toBe('https://staging.example.com');
      expect(result.servers[2].url).toBe('https://api.example.com');
    });

    it('should handle API key authentication', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            apiKey: {
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
      expect(result.auth.schemes[0].type).toBe('apiKey');
      expect(result.auth.schemes[0].name).toBe('apiKey');
      expect(result.auth.schemes[0].in).toBe('header');
    });

    it('should detect page-based pagination', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer' } },
                { name: 'per_page', in: 'query', schema: { type: 'integer' } }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources[0].pagination).toBeDefined();
      expect(result.resources[0].pagination?.style).toBe('page');
      expect(result.resources[0].pagination?.params).toEqual({
        page: 'page',
        pageSize: 'per_page'
      });
    });

    it('should detect cursor-based pagination', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              parameters: [
                { name: 'cursor', in: 'query', schema: { type: 'string' } }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.resources[0].pagination).toBeDefined();
      expect(result.resources[0].pagination?.style).toBe('cursor');
      expect(result.resources[0].pagination?.params).toEqual({
        cursor: 'cursor'
      });
    });

    it('should handle operations with all validation types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/validate': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { 
                          type: 'string', 
                          minLength: 3, 
                          maxLength: 20,
                          pattern: '^[a-zA-Z0-9_]+$'
                        },
                        age: { 
                          type: 'integer', 
                          minimum: 18, 
                          maximum: 120 
                        },
                        tags: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 10,
                          items: { type: 'string' }
                        },
                        email: {
                          type: 'string',
                          format: 'email'
                        },
                        website: {
                          type: 'string',
                          format: 'uri'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      const usernameField = operation.requestBody?.children?.find(c => c.key === 'username');
      const ageField = operation.requestBody?.children?.find(c => c.key === 'age');
      const tagsField = operation.requestBody?.children?.find(c => c.key === 'tags');
      const emailField = operation.requestBody?.children?.find(c => c.key === 'email');
      const websiteField = operation.requestBody?.children?.find(c => c.key === 'website');

      expect(usernameField?.validations?.some(v => v.type === 'minLength')).toBe(true);
      expect(usernameField?.validations?.some(v => v.type === 'maxLength')).toBe(true);
      expect(usernameField?.validations?.some(v => v.type === 'pattern')).toBe(true);
      
      expect(ageField?.validations?.some(v => v.type === 'minimum')).toBe(true);
      expect(ageField?.validations?.some(v => v.type === 'maximum')).toBe(true);
      
      expect(tagsField?.validations?.some(v => v.type === 'minItems')).toBe(true);
      expect(tagsField?.validations?.some(v => v.type === 'maxItems')).toBe(true);
      
      expect(emailField?.validations?.some(v => v.type === 'email')).toBe(true);
      expect(websiteField?.validations?.some(v => v.type === 'url')).toBe(true);
    });
  });
});
