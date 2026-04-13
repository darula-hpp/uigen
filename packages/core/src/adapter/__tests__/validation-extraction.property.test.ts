import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../ir/types.js';

/**
 * Property-Based Tests for Validation Rule Extraction
 * 
 * **Validates: Requirements 3.7, 34.1-34.9**
 * 
 * These tests verify universal properties that should hold for all valid
 * validation constraint combinations in OpenAPI schemas.
 */

describe('Validation Rule Extraction - Property Tests', () => {
  /**
   * Property: All string constraints should be extracted
   * 
   * For any schema with string validation constraints (minLength, maxLength, pattern),
   * all constraints should be present in the extracted validation rules.
   */
  it('should extract all string validation constraints', () => {
    fc.assert(
      fc.property(
        fc.record({
          minLength: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          maxLength: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          pattern: fc.option(fc.constantFrom(
            '^[a-zA-Z]+$',
            '^\\d{3}-\\d{4}$',
            '^[a-z0-9_-]+$'
          ), { nil: undefined })
        }).filter(constraints => {
          // Ensure minLength <= maxLength when both are present
          if (constraints.minLength !== undefined && constraints.maxLength !== undefined) {
            return constraints.minLength <= constraints.maxLength;
          }
          return true;
        }),
        (constraints) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                              ...constraints
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          expect(field?.validations).toBeDefined();

          // Check that all defined constraints are extracted
          if (constraints.minLength !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'minLength');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.minLength);
            expect(rule?.message).toBeDefined();
          }

          if (constraints.maxLength !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'maxLength');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.maxLength);
            expect(rule?.message).toBeDefined();
          }

          if (constraints.pattern !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'pattern');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.pattern);
            expect(rule?.message).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All number constraints should be extracted
   * 
   * For any schema with number validation constraints (minimum, maximum),
   * all constraints should be present in the extracted validation rules.
   */
  it('should extract all number validation constraints', () => {
    fc.assert(
      fc.property(
        fc.record({
          minimum: fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: undefined }),
          maximum: fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: undefined })
        }).filter(constraints => {
          // Ensure minimum <= maximum when both are present
          if (constraints.minimum !== undefined && constraints.maximum !== undefined) {
            return constraints.minimum <= constraints.maximum;
          }
          return true;
        }),
        (constraints) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'number',
                              ...constraints
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          expect(field?.validations).toBeDefined();

          // Check that all defined constraints are extracted
          if (constraints.minimum !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'minimum');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.minimum);
            expect(rule?.message).toBeDefined();
          }

          if (constraints.maximum !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'maximum');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.maximum);
            expect(rule?.message).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All array constraints should be extracted
   * 
   * For any schema with array validation constraints (minItems, maxItems),
   * all constraints should be present in the extracted validation rules.
   */
  it('should extract all array validation constraints', () => {
    fc.assert(
      fc.property(
        fc.record({
          minItems: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
          maxItems: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
        }).filter(constraints => {
          // Ensure minItems <= maxItems when both are present
          if (constraints.minItems !== undefined && constraints.maxItems !== undefined) {
            return constraints.minItems <= constraints.maxItems;
          }
          return true;
        }),
        (constraints) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'array',
                              items: { type: 'string' },
                              ...constraints
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          expect(field?.validations).toBeDefined();

          // Check that all defined constraints are extracted
          if (constraints.minItems !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'minItems');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.minItems);
            expect(rule?.message).toBeDefined();
          }

          if (constraints.maxItems !== undefined) {
            const rule = field?.validations?.find(v => v.type === 'maxItems');
            expect(rule).toBeDefined();
            expect(rule?.value).toBe(constraints.maxItems);
            expect(rule?.message).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Format constraints should be extracted
   * 
   * For any schema with format constraints (email, uri),
   * the appropriate validation rule should be present.
   */
  it('should extract format validation constraints', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('email', 'uri'),
        (format) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                              format
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          expect(field?.validations).toBeDefined();

          // Check that format constraint is extracted
          const expectedType = format === 'email' ? 'email' : 'url';
          const rule = field?.validations?.find(v => v.type === expectedType);
          expect(rule).toBeDefined();
          expect(rule?.message).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation rules should have messages
   * 
   * For any extracted validation rule, it should have a non-empty message.
   */
  it('should generate messages for all validation rules', () => {
    fc.assert(
      fc.property(
        fc.record({
          minLength: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
          maxLength: fc.option(fc.integer({ min: 51, max: 200 }), { nil: undefined }),
          minimum: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          maximum: fc.option(fc.integer({ min: 101, max: 1000 }), { nil: undefined })
        }),
        (constraints) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            stringField: {
                              type: 'string',
                              minLength: constraints.minLength,
                              maxLength: constraints.maxLength
                            },
                            numberField: {
                              type: 'number',
                              minimum: constraints.minimum,
                              maximum: constraints.maximum
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

          const requestBody = result.resources[0].operations[0].requestBody;
          
          // Check all validation rules have messages
          const allFields = requestBody?.children || [];
          for (const field of allFields) {
            if (field.validations) {
              for (const rule of field.validations) {
                expect(rule.message).toBeDefined();
                expect(rule.message).not.toBe('');
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation count should match constraint count
   * 
   * For any schema with N validation constraints, the extracted validations
   * array should have exactly N validation rules (excluding format-based rules
   * which may add additional rules).
   */
  it('should extract correct number of validation rules', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasMinLength: fc.boolean(),
          hasMaxLength: fc.boolean(),
          hasPattern: fc.boolean(),
          hasMinimum: fc.boolean(),
          hasMaximum: fc.boolean()
        }),
        (flags) => {
          const stringConstraints: any = {};
          let expectedCount = 0;

          if (flags.hasMinLength) {
            stringConstraints.minLength = 5;
            expectedCount++;
          }
          if (flags.hasMaxLength) {
            stringConstraints.maxLength = 50;
            expectedCount++;
          }
          if (flags.hasPattern) {
            stringConstraints.pattern = '^[a-z]+$';
            expectedCount++;
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                              ...stringConstraints
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          expect(field?.validations?.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Nested schemas should preserve validation rules
   * 
   * For any nested object schema with validation constraints,
   * the constraints should be preserved at all nesting levels.
   */
  it('should preserve validation rules in nested schemas', () => {
    fc.assert(
      fc.property(
        fc.record({
          parentMin: fc.integer({ min: 1, max: 10 }),
          childMin: fc.integer({ min: 1, max: 10 })
        }),
        (constraints) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            parent: {
                              type: 'object',
                              properties: {
                                parentField: {
                                  type: 'string',
                                  minLength: constraints.parentMin
                                },
                                child: {
                                  type: 'object',
                                  properties: {
                                    childField: {
                                      type: 'string',
                                      minLength: constraints.childMin
                                    }
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

          const parent = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'parent'
          );

          const parentField = parent?.children?.find(c => c.key === 'parentField');
          const parentRule = parentField?.validations?.find(v => v.type === 'minLength');
          expect(parentRule?.value).toBe(constraints.parentMin);

          const child = parent?.children?.find(c => c.key === 'child');
          const childField = child?.children?.find(c => c.key === 'childField');
          const childRule = childField?.validations?.find(v => v.type === 'minLength');
          expect(childRule?.value).toBe(constraints.childMin);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Zero values should be handled correctly
   * 
   * For any constraint with a value of 0 (minimum: 0, minLength: 0, minItems: 0),
   * the constraint should still be extracted (0 is a valid constraint value).
   */
  it('should handle zero values correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('minimum', 'minLength', 'minItems'),
        (constraintType) => {
          let schema: any;
          
          if (constraintType === 'minimum') {
            schema = { type: 'number', minimum: 0 };
          } else if (constraintType === 'minLength') {
            schema = { type: 'string', minLength: 0 };
          } else {
            schema = { type: 'array', items: { type: 'string' }, minItems: 0 };
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/test': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            field: schema
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

          const field = result.resources[0].operations[0].requestBody?.children?.find(
            c => c.key === 'field'
          );

          const rule = field?.validations?.find(v => v.type === constraintType);
          expect(rule).toBeDefined();
          expect(rule?.value).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
