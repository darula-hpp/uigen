import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Integration tests for many-to-many library pattern detection in OpenAPI3Adapter
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5, 5.1, 5.3
 */
describe('OpenAPI3Adapter - Many-to-Many Integration', () => {
  it('should detect manyToMany relationships and mark library resources', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/meetings': {
          get: {
            summary: 'List meetings',
            responses: { '200': { description: 'Success' } }
          },
          post: {
            summary: 'Create meeting',
            responses: { '201': { description: 'Created' } }
          }
        },
        '/meetings/{id}': {
          get: {
            summary: 'Get meeting',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          }
        },
        '/meetings/{id}/templates': {
          get: {
            summary: 'List meeting templates',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            summary: 'Add template to meeting',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '201': { description: 'Created' } }
          }
        },
        '/templates': {
          get: {
            summary: 'List templates',
            responses: { '200': { description: 'Success' } }
          },
          post: {
            summary: 'Create template',
            responses: { '201': { description: 'Created' } }
          }
        },
        '/templates/{id}': {
          get: {
            summary: 'Get template',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    // Find meetings and templates resources
    const meetings = result.resources.find(r => r.slug === 'meetings');
    const templates = result.resources.find(r => r.slug === 'templates');

    expect(meetings).toBeDefined();
    expect(templates).toBeDefined();

    // Verify manyToMany relationship is detected
    const manyToManyRel = meetings?.relationships.find(
      r => r.type === 'manyToMany' && r.target === 'templates'
    );
    expect(manyToManyRel).toBeDefined();
    expect(manyToManyRel?.path).toBe('/meetings/{id}/templates');
    expect(manyToManyRel?.isReadOnly).toBe(false);

    // Verify templates is marked as a library resource
    expect(templates?.isLibrary).toBe(true);
  });

  it('should mark relationship as read-only when only GET operation exists', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/orders': {
          get: {
            summary: 'List orders',
            responses: { '200': { description: 'Success' } }
          },
          post: {
            summary: 'Create order',
            responses: { '201': { description: 'Created' } }
          }
        },
        '/orders/{id}/products': {
          get: {
            summary: 'List order products',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          }
        },
        '/products': {
          get: {
            summary: 'List products',
            responses: { '200': { description: 'Success' } }
          },
          post: {
            summary: 'Create product',
            responses: { '201': { description: 'Created' } }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const orders = result.resources.find(r => r.slug === 'orders');
    const manyToManyRel = orders?.relationships.find(
      r => r.type === 'manyToMany' && r.target === 'products'
    );

    expect(manyToManyRel).toBeDefined();
    expect(manyToManyRel?.isReadOnly).toBe(true);
  });

  it('should handle multiple library resources', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/articles': {
          get: { responses: { '200': { description: 'Success' } } },
          post: { responses: { '201': { description: 'Created' } } }
        },
        '/articles/{id}/tags': {
          get: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '201': { description: 'Created' } }
          }
        },
        '/articles/{id}/categories': {
          get: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '201': { description: 'Created' } }
          }
        },
        '/tags': {
          get: { responses: { '200': { description: 'Success' } } },
          post: { responses: { '201': { description: 'Created' } } }
        },
        '/categories': {
          get: { responses: { '200': { description: 'Success' } } },
          post: { responses: { '201': { description: 'Created' } } }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const articles = result.resources.find(r => r.slug === 'articles');
    const tags = result.resources.find(r => r.slug === 'tags');
    const categories = result.resources.find(r => r.slug === 'categories');

    // Verify both manyToMany relationships are detected
    expect(articles?.relationships.filter(r => r.type === 'manyToMany')).toHaveLength(2);
    
    // Verify both library resources are marked
    expect(tags?.isLibrary).toBe(true);
    expect(categories?.isLibrary).toBe(true);
  });

  it('should not mark resource as library if it lacks standalone endpoints', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/meetings': {
          get: { responses: { '200': { description: 'Success' } } },
          post: { responses: { '201': { description: 'Created' } } }
        },
        '/meetings/{id}/notes': {
          get: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Success' } }
          },
          post: {
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '201': { description: 'Created' } }
          }
        }
      }
    };

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    const meetings = result.resources.find(r => r.slug === 'meetings');
    
    // Should not detect manyToMany because notes resource doesn't have standalone endpoints
    const manyToManyRel = meetings?.relationships.find(r => r.type === 'manyToMany');
    expect(manyToManyRel).toBeUndefined();
  });
});
