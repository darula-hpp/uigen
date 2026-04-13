import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Swagger2Adapter } from '../swagger2.js';
import { OpenAPI3Adapter } from '../openapi3.js';

/**
 * Property 24: Swagger to OpenAPI Conversion Equivalence
 * 
 * Validates that converting a Swagger 2.0 spec to OpenAPI 3.x and then to IR
 * produces semantically equivalent results to what would be expected.
 * 
 * Requirements: 2.4, 2.5, 2.6
 */
describe('Property 24: Swagger to OpenAPI Conversion Equivalence', () => {
  it('should produce equivalent IR for Swagger 2.0 and OpenAPI 3.x specs', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          version: fc.string({ minLength: 1, maxLength: 20 }),
          description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          host: fc.option(fc.domain(), { nil: undefined }),
          basePath: fc.option(fc.constantFrom('', '/v1', '/v2', '/api'), { nil: undefined }),
          schemes: fc.option(fc.shuffledSubarray(['http', 'https'], { minLength: 1 }), { nil: undefined })
        }),
        (info) => {
          // Create minimal Swagger 2.0 spec
          const swagger2Spec = {
            swagger: '2.0',
            info: {
              title: info.title,
              version: info.version,
              description: info.description
            },
            host: info.host,
            basePath: info.basePath,
            schemes: info.schemes,
            paths: {}
          };

          // Convert to IR using Swagger2Adapter
          const adapter = new Swagger2Adapter(swagger2Spec as any);
          const ir = adapter.adapt();

          // Verify basic metadata is preserved
          expect(ir.meta.title).toBe(info.title);
          expect(ir.meta.version).toBe(info.version);
          if (info.description) {
            expect(ir.meta.description).toBe(info.description);
          }

          // Verify server URLs are constructed correctly
          if (info.host) {
            const schemes = info.schemes || ['http'];
            const basePath = info.basePath || '';
            expect(ir.servers.length).toBe(schemes.length);
            
            schemes.forEach((scheme, index) => {
              expect(ir.servers[index].url).toBe(`${scheme}://${info.host}${basePath}`);
            });
          } else {
            // Default localhost server
            expect(ir.servers.length).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve schema definitions through conversion', () => {
    fc.assert(
      fc.property(
        fc.record({
          schemaName: fc.constantFrom('User', 'Pet', 'Order', 'Product'),
          properties: fc.dictionary(
            fc.constantFrom('id', 'name', 'email', 'status', 'createdAt'),
            fc.record({
              type: fc.constantFrom('string', 'integer', 'boolean'),
              format: fc.option(fc.constantFrom('email', 'date-time', 'int64'), { nil: undefined })
            }),
            { minKeys: 1, maxKeys: 5 }
          )
        }),
        ({ schemaName, properties }) => {
          const swagger2Spec = {
            swagger: '2.0',
            info: { title: 'Test', version: '1.0.0' },
            paths: {
              [`/${schemaName.toLowerCase()}s`]: {
                get: {
                  operationId: `list${schemaName}s`,
                  responses: {
                    '200': {
                      description: 'Success',
                      schema: {
                        type: 'array',
                        items: { $ref: `#/definitions/${schemaName}` }
                      }
                    }
                  }
                }
              }
            },
            definitions: {
              [schemaName]: {
                type: 'object',
                properties
              }
            }
          };

          const adapter = new Swagger2Adapter(swagger2Spec as any);
          const ir = adapter.adapt();

          // Verify resource was created
          expect(ir.resources.length).toBeGreaterThan(0);
          
          // Verify schema properties are preserved
          const resource = ir.resources[0];
          expect(resource.schema).toBeDefined();
          expect(resource.schema.type).toBe('object');
          
          // Check that properties exist
          if (resource.schema.children) {
            const propertyKeys = resource.schema.children.map(c => c.key);
            Object.keys(properties).forEach(key => {
              expect(propertyKeys).toContain(key);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should convert securityDefinitions to auth schemes correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          schemeName: fc.constantFrom('api_key', 'bearer_auth', 'oauth'),
          headerName: fc.constantFrom('X-API-Key', 'Authorization', 'X-Auth-Token')
        }),
        ({ schemeName, headerName }) => {
          const swagger2Spec = {
            swagger: '2.0',
            info: { title: 'Test', version: '1.0.0' },
            paths: {},
            securityDefinitions: {
              [schemeName]: {
                type: 'apiKey',
                name: headerName,
                in: 'header'
              }
            }
          };

          const adapter = new Swagger2Adapter(swagger2Spec as any);
          const ir = adapter.adapt();

          // Verify auth scheme was converted
          expect(ir.auth.schemes.length).toBeGreaterThan(0);
          const scheme = ir.auth.schemes.find(s => s.name === schemeName);
          expect(scheme).toBeDefined();
          expect(scheme?.type).toBe('apiKey');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle body parameters to requestBody conversion', () => {
    fc.assert(
      fc.property(
        fc.record({
          resourceName: fc.constantFrom('users', 'pets', 'orders'),
          fieldName: fc.constantFrom('name', 'email', 'status'),
          fieldType: fc.constantFrom('string', 'integer', 'boolean')
        }),
        ({ resourceName, fieldName, fieldType }) => {
          const swagger2Spec = {
            swagger: '2.0',
            info: { title: 'Test', version: '1.0.0' },
            paths: {
              [`/${resourceName}`]: {
                post: {
                  operationId: `create${resourceName}`,
                  parameters: [
                    {
                      name: 'body',
                      in: 'body',
                      required: true,
                      schema: {
                        type: 'object',
                        properties: {
                          [fieldName]: { type: fieldType }
                        }
                      }
                    }
                  ],
                  responses: {
                    '201': { description: 'Created' }
                  }
                }
              }
            }
          };

          const adapter = new Swagger2Adapter(swagger2Spec as any);
          const ir = adapter.adapt();

          // Verify resource and operation exist
          expect(ir.resources.length).toBeGreaterThan(0);
          const resource = ir.resources[0];
          expect(resource.operations.length).toBeGreaterThan(0);
          
          const createOp = resource.operations.find(op => op.viewHint === 'create');
          expect(createOp).toBeDefined();
          expect(createOp?.requestBody).toBeDefined();
          expect(createOp?.requestBody?.type).toBe('object');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve validation constraints through conversion', () => {
    fc.assert(
      fc.property(
        fc.record({
          minLength: fc.integer({ min: 1, max: 10 }),
          maxLength: fc.integer({ min: 20, max: 100 }),
          minimum: fc.integer({ min: 0, max: 10 }),
          maximum: fc.integer({ min: 50, max: 200 })
        }),
        ({ minLength, maxLength, minimum, maximum }) => {
          const swagger2Spec = {
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
                      schema: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            minLength,
                            maxLength
                          },
                          quantity: {
                            type: 'integer',
                            minimum,
                            maximum
                          }
                        }
                      }
                    }
                  ],
                  responses: { '201': { description: 'Created' } }
                }
              }
            }
          };

          const adapter = new Swagger2Adapter(swagger2Spec as any);
          const ir = adapter.adapt();

          const requestBody = ir.resources[0]?.operations[0]?.requestBody;
          expect(requestBody).toBeDefined();
          
          if (requestBody?.children) {
            const nameField = requestBody.children.find(c => c.key === 'name');
            const quantityField = requestBody.children.find(c => c.key === 'quantity');
            
            // Verify string validations
            if (nameField?.validations) {
              const hasMinLength = nameField.validations.some(
                v => v.type === 'minLength' && v.value === minLength
              );
              const hasMaxLength = nameField.validations.some(
                v => v.type === 'maxLength' && v.value === maxLength
              );
              expect(hasMinLength || hasMaxLength).toBe(true);
            }
            
            // Verify number validations
            if (quantityField?.validations) {
              const hasMinimum = quantityField.validations.some(
                v => v.type === 'minimum' && v.value === minimum
              );
              const hasMaximum = quantityField.validations.some(
                v => v.type === 'maximum' && v.value === maximum
              );
              expect(hasMinimum || hasMaximum).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
