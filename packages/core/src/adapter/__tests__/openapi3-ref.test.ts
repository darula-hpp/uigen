import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal OpenAPI 3.x spec with a single POST /items operation whose
 * requestBody schema is the provided schema object.
 */
function makeSpec(bodySchema: Record<string, unknown>) {
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

/** Adapt a spec and return the requestBody SchemaNode of the first operation. */
function adaptBody(bodySchema: Record<string, unknown>) {
  const adapter = new OpenAPI3Adapter(makeSpec(bodySchema));
  const ir = adapter.adapt();
  return ir.resources[0].operations[0].requestBody!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('openapi3-ref: x-uigen-ref annotation integration', () => {
  // -------------------------------------------------------------------------
  // 1. Full x-uigen-ref with all fields produces correct refConfig
  // -------------------------------------------------------------------------
  describe('1. Full x-uigen-ref produces correct refConfig on SchemaNode', () => {
    it('sets all refConfig fields: resource, valueField, labelField, filter', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          assigned_to: {
            type: 'string',
            'x-uigen-ref': {
              resource: '/users',
              valueField: 'id',
              labelField: 'name',
              filter: { active: true }
            }
          }
        }
      });

      const field = body.children?.find(c => c.key === 'assigned_to');
      expect(field).toBeDefined();
      expect(field!.refConfig).toEqual({
        resource: '/users',
        valueField: 'id',
        labelField: 'name',
        filter: { active: true }
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. x-uigen-ref without filter produces refConfig with filter: {}
  // -------------------------------------------------------------------------
  describe('2. x-uigen-ref without filter produces refConfig with filter: {}', () => {
    it('normalises absent filter to an empty object', () => {
      const body = adaptBody({
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
      });

      const field = body.children?.find(c => c.key === 'category_id');
      expect(field).toBeDefined();
      expect(field!.refConfig).toBeDefined();
      expect(field!.refConfig!.filter).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // 3. x-uigen-ref takes precedence over *_id heuristic auto-detection
  // -------------------------------------------------------------------------
  describe('3. x-uigen-ref annotation takes precedence over *_id heuristic', () => {
    it('uses refConfig from annotation, not auto-detection, for a *_id field', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            'x-uigen-ref': {
              resource: '/accounts',
              valueField: 'uuid',
              labelField: 'display_name'
            }
          }
        }
      });

      const field = body.children?.find(c => c.key === 'user_id');
      expect(field).toBeDefined();
      // The annotation-provided refConfig must be used
      expect(field!.refConfig).toBeDefined();
      expect(field!.refConfig!.resource).toBe('/accounts');
      expect(field!.refConfig!.valueField).toBe('uuid');
      expect(field!.refConfig!.labelField).toBe('display_name');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Fields WITHOUT x-uigen-ref still receive auto-detection as before
  // -------------------------------------------------------------------------
  describe('4. Fields without x-uigen-ref are unaffected', () => {
    it('a field named user_id without the annotation has no refConfig set by the handler', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          user_id: {
            type: 'string'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'user_id');
      expect(field).toBeDefined();
      // No annotation means no refConfig from the handler
      expect(field!.refConfig).toBeUndefined();
    });

    it('a plain string field without the annotation has no refConfig', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          title: { type: 'string' }
        }
      });

      const field = body.children?.find(c => c.key === 'title');
      expect(field).toBeDefined();
      expect(field!.refConfig).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Invalid x-uigen-ref (missing required field) leaves refConfig undefined
  // -------------------------------------------------------------------------
  describe('5. Invalid x-uigen-ref (missing required field) leaves refConfig undefined', () => {
    it('does not set refConfig when resource is missing', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            owner_id: {
              type: 'string',
              'x-uigen-ref': {
                valueField: 'id',
                labelField: 'name'
                // resource is missing
              }
            }
          }
        });

        const field = body.children?.find(c => c.key === 'owner_id');
        expect(field).toBeDefined();
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });

    it('does not set refConfig when valueField is missing', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            owner_id: {
              type: 'string',
              'x-uigen-ref': {
                resource: '/users',
                labelField: 'name'
                // valueField is missing
              }
            }
          }
        });

        const field = body.children?.find(c => c.key === 'owner_id');
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });

    it('does not set refConfig when labelField is missing', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            owner_id: {
              type: 'string',
              'x-uigen-ref': {
                resource: '/users',
                valueField: 'id'
                // labelField is missing
              }
            }
          }
        });

        const field = body.children?.find(c => c.key === 'owner_id');
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Invalid x-uigen-ref (non-object value) leaves refConfig undefined
  // -------------------------------------------------------------------------
  describe('6. Invalid x-uigen-ref (non-object value) leaves refConfig undefined', () => {
    it('does not set refConfig when x-uigen-ref is a string', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            ref_field: {
              type: 'string',
              'x-uigen-ref': '/users'
            }
          }
        });

        const field = body.children?.find(c => c.key === 'ref_field');
        expect(field).toBeDefined();
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });

    it('does not set refConfig when x-uigen-ref is a number', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            ref_field: {
              type: 'string',
              'x-uigen-ref': 42
            }
          }
        });

        const field = body.children?.find(c => c.key === 'ref_field');
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });

    it('does not set refConfig when x-uigen-ref is null', () => {
      expect(() => {
        const body = adaptBody({
          type: 'object',
          properties: {
            ref_field: {
              type: 'string',
              'x-uigen-ref': null
            }
          }
        });

        const field = body.children?.find(c => c.key === 'ref_field');
        expect(field!.refConfig).toBeUndefined();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 7. x-uigen-ref on a nested property produces correct refConfig
  // -------------------------------------------------------------------------
  describe('7. x-uigen-ref on a nested property', () => {
    it('produces correct refConfig on the nested SchemaNode', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          employee: {
            type: 'object',
            properties: {
              department_id: {
                type: 'string',
                'x-uigen-ref': {
                  resource: '/departments',
                  valueField: 'id',
                  labelField: 'name'
                }
              }
            }
          }
        }
      });

      const employeeField = body.children?.find(c => c.key === 'employee');
      expect(employeeField).toBeDefined();

      const deptField = employeeField!.children?.find(c => c.key === 'department_id');
      expect(deptField).toBeDefined();
      expect(deptField!.refConfig).toEqual({
        resource: '/departments',
        valueField: 'id',
        labelField: 'name',
        filter: {}
      });
    });
  });

  // -------------------------------------------------------------------------
  // 8. x-uigen-ref with a template labelField is stored as-is
  // -------------------------------------------------------------------------
  describe('8. x-uigen-ref with a template labelField', () => {
    it('stores the template string as-is on refConfig.labelField', () => {
      const body = adaptBody({
        type: 'object',
        properties: {
          author_id: {
            type: 'string',
            'x-uigen-ref': {
              resource: '/authors',
              valueField: 'id',
              labelField: '{first_name} {last_name}'
            }
          }
        }
      });

      const field = body.children?.find(c => c.key === 'author_id');
      expect(field).toBeDefined();
      expect(field!.refConfig).toBeDefined();
      expect(field!.refConfig!.labelField).toBe('{first_name} {last_name}');
    });
  });
});
