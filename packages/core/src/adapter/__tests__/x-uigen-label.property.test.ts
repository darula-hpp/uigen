import { describe, it } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';
import fc from 'fast-check';
import { expect } from 'vitest';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** humanize() mirrors the private method in OpenAPI3Adapter */
function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Valid identifier: starts with a letter, contains only [a-z0-9_] */
const validKey = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-z][a-z0-9_]*$/.test(s));

/**
 * Build a minimal OpenAPI 3.x spec with a single POST /items operation whose
 * requestBody is an object with one property `key` having the given schema.
 */
function makeOpenAPI3Spec(key: string, propSchema: Record<string, unknown>) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { [key]: propSchema }
                }
              }
            }
          },
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/** Adapt an OpenAPI 3.x spec and return the child SchemaNode for `key`. */
function adaptOpenAPI3Field(key: string, propSchema: Record<string, unknown>) {
  const adapter = new OpenAPI3Adapter(makeOpenAPI3Spec(key, propSchema));
  const ir = adapter.adapt();
  const body = ir.resources[0].operations[0].requestBody!;
  return body.children?.find(c => c.key === key)!;
}

/**
 * Build a minimal Swagger 2.0 spec with a single POST /items operation whose
 * body parameter schema is an object with one property `key`.
 */
function makeSwagger2Spec(key: string, propSchema: Record<string, unknown>) {
  return {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          parameters: [
            {
              name: 'body',
              in: 'body',
              required: true,
              schema: {
                type: 'object',
                properties: { [key]: propSchema }
              }
            }
          ],
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/** Adapt a Swagger 2.0 spec and return the child SchemaNode for `key`. */
function adaptSwagger2Field(key: string, propSchema: Record<string, unknown>) {
  const adapter = new Swagger2Adapter(makeSwagger2Spec(key, propSchema));
  const ir = adapter.adapt();
  const body = ir.resources[0].operations[0].requestBody!;
  return body.children?.find(c => c.key === key)!;
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('x-uigen-label — Property-Based Tests', () => {
  // -------------------------------------------------------------------------
  // Property 1: Valid x-uigen-label is used as the label
  // Feature: x-uigen-label, Property 1: Valid x-uigen-label is used as the label
  // -------------------------------------------------------------------------
  it('Property 1: valid x-uigen-label is used as SchemaNode.label', () => {
    // **Validates: Requirements 1.1**
    fc.assert(
      fc.property(
        fc.tuple(validKey, fc.string({ minLength: 1 }).filter(s => s.trim() !== '')),
        ([key, label]) => {
          const node = adaptOpenAPI3Field(key, { type: 'string', 'x-uigen-label': label });
          expect(node).toBeDefined();
          expect(node.label).toBe(label);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Absent x-uigen-label falls back to humanize(key)
  // Feature: x-uigen-label, Property 2: Absent x-uigen-label falls back to humanize(key)
  // -------------------------------------------------------------------------
  it('Property 2: absent x-uigen-label falls back to humanize(key)', () => {
    // **Validates: Requirements 1.2**
    fc.assert(
      fc.property(
        validKey,
        (key) => {
          const node = adaptOpenAPI3Field(key, { type: 'string' });
          expect(node).toBeDefined();
          expect(node.label).toBe(humanize(key));
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Invalid x-uigen-label values fall back to humanize(key) without throwing
  // Feature: x-uigen-label, Property 3: Invalid x-uigen-label values fall back to humanize(key)
  // -------------------------------------------------------------------------
  it('Property 3: invalid x-uigen-label values fall back to humanize(key) without throwing', () => {
    // **Validates: Requirements 1.3, 1.4**
    fc.assert(
      fc.property(
        fc.tuple(
          validKey,
          fc.oneof(
            fc.constant(''),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant({})
          )
        ),
        ([key, invalidLabel]) => {
          expect(() => {
            const node = adaptOpenAPI3Field(key, { type: 'string', 'x-uigen-label': invalidLabel });
            expect(node).toBeDefined();
            expect(node.label).toBe(humanize(key));
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Label override propagates to any depth in the schema tree
  // Feature: x-uigen-label, Property 4: Label override propagates to any depth in the schema tree
  // -------------------------------------------------------------------------
  it('Property 4: x-uigen-label propagates to any depth in the schema tree', () => {
    // **Validates: Requirements 1.5**
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z][a-z0-9_]*$/.test(s)),
            { minLength: 1, maxLength: 4 }
          ),
          fc.string({ minLength: 1 }).filter(s => s.trim() !== '')
        ),
        ([path, label]) => {
          // Build a nested schema: path[0] -> path[1] -> ... -> path[n-1] with x-uigen-label at deepest
          // e.g. path = ['a', 'b', 'c'] builds:
          //   { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { c: { type: 'string', 'x-uigen-label': label } } } } } } }
          function buildNested(keys: string[], leafLabel: string): Record<string, unknown> {
            if (keys.length === 1) {
              return { type: 'string', 'x-uigen-label': leafLabel };
            }
            return {
              type: 'object',
              properties: {
                [keys[1]]: buildNested(keys.slice(1), leafLabel)
              }
            };
          }

          const rootKey = path[0];
          const innerSchema = buildNested(path, label);

          // The root property is the first key; its schema is innerSchema
          const spec = {
            openapi: '3.0.0',
            info: { title: 'Test', version: '1.0.0' },
            paths: {
              '/items': {
                post: {
                  operationId: 'createItem',
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: { [rootKey]: innerSchema }
                        }
                      }
                    }
                  },
                  responses: { '201': { description: 'Created' } }
                }
              }
            }
          } as any;

          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();
          const body = ir.resources[0].operations[0].requestBody!;

          // Navigate to the deepest node
          let node = body.children?.find(c => c.key === rootKey);
          expect(node).toBeDefined();

          for (let i = 1; i < path.length; i++) {
            node = node!.children?.find(c => c.key === path[i]);
            expect(node).toBeDefined();
          }

          // The deepest node should have the label
          expect(node!.label).toBe(label);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: x-uigen-label on a $ref property overrides the resolved label
  // Feature: x-uigen-label, Property 5: x-uigen-label on a $ref property overrides the resolved label
  // -------------------------------------------------------------------------
  it('Property 5: x-uigen-label on a $ref property overrides the resolved label', () => {
    // **Validates: Requirements 3.1, 3.3**
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1 }).filter(s => s.trim() !== '')
        ).filter(([propLabel, targetLabel]) => propLabel !== targetLabel),
        ([propLabel, targetLabel]) => {
          const spec = {
            openapi: '3.0.0',
            info: { title: 'Test', version: '1.0.0' },
            components: {
              schemas: {
                SharedType: {
                  type: 'string',
                  'x-uigen-label': targetLabel
                }
              }
            },
            paths: {
              '/items': {
                post: {
                  operationId: 'createItem',
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            myfield: {
                              $ref: '#/components/schemas/SharedType',
                              'x-uigen-label': propLabel
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
          } as any;

          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();
          const body = ir.resources[0].operations[0].requestBody!;
          const node = body.children?.find(c => c.key === 'myfield');

          expect(node).toBeDefined();
          expect(node!.label).toBe(propLabel);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: x-uigen-label on a $ref target is applied when the referencing property has none
  // Feature: x-uigen-label, Property 6: x-uigen-label on a $ref target is applied when the referencing property has none
  // -------------------------------------------------------------------------
  it('Property 6: x-uigen-label on a $ref target is applied when the referencing property has none', () => {
    // **Validates: Requirements 3.2**
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (targetLabel) => {
          const spec = {
            openapi: '3.0.0',
            info: { title: 'Test', version: '1.0.0' },
            components: {
              schemas: {
                SharedType: {
                  type: 'string',
                  'x-uigen-label': targetLabel
                }
              }
            },
            paths: {
              '/items': {
                post: {
                  operationId: 'createItem',
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            myfield: {
                              $ref: '#/components/schemas/SharedType'
                              // no x-uigen-label on the referencing property
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
          } as any;

          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();
          const body = ir.resources[0].operations[0].requestBody!;
          const node = body.children?.find(c => c.key === 'myfield');

          expect(node).toBeDefined();
          expect(node!.label).toBe(targetLabel);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: x-uigen-label does not affect any other SchemaNode field
  // Feature: x-uigen-label, Property 7: x-uigen-label does not affect any other SchemaNode field
  // -------------------------------------------------------------------------
  it('Property 7: x-uigen-label does not affect any other SchemaNode field', () => {
    // **Validates: Requirements 4.1**
    fc.assert(
      fc.property(
        fc.tuple(validKey, fc.string({ minLength: 1 }).filter(s => s.trim() !== '')),
        ([key, label]) => {
          const withLabel = adaptOpenAPI3Field(key, { type: 'string', 'x-uigen-label': label });
          const withoutLabel = adaptOpenAPI3Field(key, { type: 'string' });

          expect(withLabel).toBeDefined();
          expect(withoutLabel).toBeDefined();

          // label should differ
          expect(withLabel.label).toBe(label);
          expect(withoutLabel.label).toBe(humanize(key));

          // All other fields must be identical
          expect(withLabel.type).toBe(withoutLabel.type);
          expect(withLabel.key).toBe(withoutLabel.key);
          expect(withLabel.required).toBe(withoutLabel.required);
          expect(withLabel.description).toBe(withoutLabel.description);
          expect(withLabel.format).toBe(withoutLabel.format);
          expect(withLabel.readOnly).toBe(withoutLabel.readOnly);
          expect(withLabel.writeOnly).toBe(withoutLabel.writeOnly);
          expect(withLabel.nullable).toBe(withoutLabel.nullable);
          expect(withLabel.deprecated).toBe(withoutLabel.deprecated);
          expect(withLabel.enumValues).toEqual(withoutLabel.enumValues);
          expect(withLabel.children).toEqual(withoutLabel.children);
          expect(withLabel.items).toEqual(withoutLabel.items);
          expect(withLabel.validations).toEqual(withoutLabel.validations);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 8: Swagger 2.0 x-uigen-label survives conversion and produces the correct label
  // Feature: x-uigen-label, Property 8: Swagger 2.0 x-uigen-label survives conversion and produces the correct label
  // -------------------------------------------------------------------------
  it('Property 8: Swagger 2.0 x-uigen-label survives conversion and produces the correct label', () => {
    // **Validates: Requirements 2.1, 2.2**
    fc.assert(
      fc.property(
        fc.tuple(validKey, fc.string({ minLength: 1 }).filter(s => s.trim() !== '')),
        ([key, label]) => {
          const node = adaptSwagger2Field(key, { type: 'string', 'x-uigen-label': label });
          expect(node).toBeDefined();
          expect(node.label).toBe(label);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 9: Swagger 2.0 schemas without x-uigen-label produce the same labels as equivalent OpenAPI 3.x schemas
  // Feature: x-uigen-label, Property 9: Swagger 2.0 schemas without x-uigen-label produce the same labels as equivalent OpenAPI 3.x schemas
  // -------------------------------------------------------------------------
  it('Property 9: Swagger 2.0 without x-uigen-label produces the same label as OpenAPI 3.x', () => {
    // **Validates: Requirements 2.3**
    fc.assert(
      fc.property(
        validKey,
        (key) => {
          const swagger2Node = adaptSwagger2Field(key, { type: 'string' });
          const openapi3Node = adaptOpenAPI3Field(key, { type: 'string' });

          expect(swagger2Node).toBeDefined();
          expect(openapi3Node).toBeDefined();

          // Both should produce humanize(key)
          expect(swagger2Node.label).toBe(humanize(key));
          expect(openapi3Node.label).toBe(humanize(key));

          // And they should be equal to each other
          expect(swagger2Node.label).toBe(openapi3Node.label);
        }
      ),
      { numRuns: 100 }
    );
  });
});
