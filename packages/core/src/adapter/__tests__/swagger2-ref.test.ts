import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal OpenAPI 3.x spec with a single POST /items operation whose
 * requestBody schema is the provided schema object.
 */
function makeOpenAPI3Spec(bodySchema: Record<string, unknown>) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          requestBody: {
            content: {
              'application/json': { schema: bodySchema }
            }
          },
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/**
 * Build a minimal Swagger 2.0 spec with a single POST /items operation whose
 * body parameter schema is the provided schema object.
 */
function makeSwagger2Spec(bodySchema: Record<string, unknown>) {
  return {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          parameters: [
            { name: 'body', in: 'body', required: true, schema: bodySchema }
          ],
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/** Adapt an OpenAPI 3.x spec and return the requestBody SchemaNode. */
function adaptOpenAPI3Body(bodySchema: Record<string, unknown>) {
  const adapter = new OpenAPI3Adapter(makeOpenAPI3Spec(bodySchema));
  const ir = adapter.adapt();
  return ir.resources[0].operations[0].requestBody!;
}

/** Adapt a Swagger 2.0 spec and return the requestBody SchemaNode. */
function adaptSwagger2Body(bodySchema: Record<string, unknown>) {
  const adapter = new Swagger2Adapter(makeSwagger2Spec(bodySchema));
  const ir = adapter.adapt();
  return ir.resources[0].operations[0].requestBody!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('swagger2-ref: x-uigen-ref pass-through', () => {
  describe('1. Top-level property with x-uigen-ref', () => {
    it('produces identical RefConfig on SchemaNode as the equivalent OpenAPI 3.x spec', () => {
      const refAnnotation = {
        resource: '/users',
        valueField: 'id',
        labelField: '{first_name} {last_name}',
        filter: { active: true }
      };

      const bodySchema = {
        type: 'object',
        properties: {
          assigned_to: {
            type: 'string',
            'x-uigen-ref': refAnnotation
          }
        }
      };

      const swagger2Body = adaptSwagger2Body(bodySchema);
      const openapi3Body = adaptOpenAPI3Body(bodySchema);

      const swagger2Field = swagger2Body.children?.find(c => c.key === 'assigned_to');
      const openapi3Field = openapi3Body.children?.find(c => c.key === 'assigned_to');

      expect(swagger2Field).toBeDefined();
      expect(openapi3Field).toBeDefined();

      // Both should have identical refConfig
      expect(swagger2Field!.refConfig).toBeDefined();
      expect(swagger2Field!.refConfig).toEqual(openapi3Field!.refConfig);

      // Verify the actual values
      expect(swagger2Field!.refConfig).toEqual({
        resource: '/users',
        valueField: 'id',
        labelField: '{first_name} {last_name}',
        filter: { active: true }
      });
    });

    it('produces RefConfig with empty filter when filter is absent', () => {
      const bodySchema = {
        type: 'object',
        properties: {
          category_id: {
            type: 'string',
            'x-uigen-ref': {
              resource: '/categories',
              valueField: 'id',
              labelField: 'name'
            }
          }
        }
      };

      const swagger2Body = adaptSwagger2Body(bodySchema);
      const openapi3Body = adaptOpenAPI3Body(bodySchema);

      const swagger2Field = swagger2Body.children?.find(c => c.key === 'category_id');
      const openapi3Field = openapi3Body.children?.find(c => c.key === 'category_id');

      expect(swagger2Field!.refConfig).toBeDefined();
      expect(swagger2Field!.refConfig).toEqual(openapi3Field!.refConfig);
      expect(swagger2Field!.refConfig!.filter).toEqual({});
    });
  });

  describe('2. Nested property with x-uigen-ref', () => {
    it('produces correct RefConfig on a nested SchemaNode', () => {
      const refAnnotation = {
        resource: '/departments',
        valueField: 'id',
        labelField: 'name'
      };

      const bodySchema = {
        type: 'object',
        properties: {
          employee: {
            type: 'object',
            properties: {
              department_id: {
                type: 'string',
                'x-uigen-ref': refAnnotation
              }
            }
          }
        }
      };

      const swagger2Body = adaptSwagger2Body(bodySchema);
      const openapi3Body = adaptOpenAPI3Body(bodySchema);

      const swagger2Employee = swagger2Body.children?.find(c => c.key === 'employee');
      const openapi3Employee = openapi3Body.children?.find(c => c.key === 'employee');

      const swagger2Field = swagger2Employee?.children?.find(c => c.key === 'department_id');
      const openapi3Field = openapi3Employee?.children?.find(c => c.key === 'department_id');

      expect(swagger2Field).toBeDefined();
      expect(openapi3Field).toBeDefined();

      expect(swagger2Field!.refConfig).toBeDefined();
      expect(swagger2Field!.refConfig).toEqual(openapi3Field!.refConfig);

      expect(swagger2Field!.refConfig).toEqual({
        resource: '/departments',
        valueField: 'id',
        labelField: 'name',
        filter: {}
      });
    });
  });
});
