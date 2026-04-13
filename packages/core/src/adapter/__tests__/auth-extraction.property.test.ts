import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import fc from 'fast-check';

describe('Authentication Extraction - Property Tests', () => {
  describe('Property: AuthConfig Structure Invariants', () => {
    it('should always return AuthConfig with schemes array and globalRequired boolean', () => {
      fc.assert(
        fc.property(
          fc.record({
            openapi: fc.constant('3.0.0'),
            info: fc.record({
              title: fc.string({ minLength: 1 }),
              version: fc.string({ minLength: 1 })
            }),
            components: fc.option(
              fc.record({
                securitySchemes: fc.option(
                  fc.dictionary(
                    fc.string({ minLength: 1 }),
                    fc.oneof(
                      fc.record({
                        type: fc.constant('http' as const),
                        scheme: fc.constant('bearer'),
                        bearerFormat: fc.option(fc.string(), { nil: undefined })
                      }),
                      fc.record({
                        type: fc.constant('apiKey' as const),
                        in: fc.constantFrom('header', 'query', 'cookie'),
                        name: fc.string({ minLength: 1 })
                      })
                    )
                  ),
                  { nil: undefined }
                )
              }),
              { nil: undefined }
            ),
            security: fc.option(
              fc.array(
                fc.dictionary(fc.string({ minLength: 1 }), fc.constant([]))
              ),
              { nil: undefined }
            ),
            paths: fc.constant({})
          }),
          (spec) => {
            const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6, 3.1**
            expect(result.auth).toBeDefined();
            expect(result.auth).toHaveProperty('schemes');
            expect(result.auth).toHaveProperty('globalRequired');
            expect(Array.isArray(result.auth.schemes)).toBe(true);
            expect(typeof result.auth.globalRequired).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Bearer Token Extraction', () => {
    it('should extract all bearer token schemes from securitySchemes', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.record({
              type: fc.constant('http' as const),
              scheme: fc.constant('bearer'),
              bearerFormat: fc.option(
                fc.constantFrom('JWT', 'Bearer', 'Token'),
                { nil: undefined }
              )
            }),
            { minKeys: 1, maxKeys: 5 }
          ),
          (securitySchemes) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            // All bearer schemes should be extracted
            expect(result.auth.schemes.length).toBe(Object.keys(securitySchemes).length);
            
            // All extracted schemes should be bearer type
            result.auth.schemes.forEach(scheme => {
              expect(scheme.type).toBe('bearer');
              expect(scheme.scheme).toBe('bearer');
              expect(Object.keys(securitySchemes)).toContain(scheme.name);
            });

            // Scheme names should match the keys
            const extractedNames = result.auth.schemes.map(s => s.name).sort();
            const expectedNames = Object.keys(securitySchemes).sort();
            expect(extractedNames).toEqual(expectedNames);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: API Key Extraction', () => {
    it('should extract all API key schemes with correct location', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.record({
              type: fc.constant('apiKey' as const),
              in: fc.constantFrom('header', 'query', 'cookie'),
              name: fc.string({ minLength: 1, maxLength: 30 })
            }),
            { minKeys: 1, maxKeys: 5 }
          ),
          (securitySchemes) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            // All API key schemes should be extracted
            expect(result.auth.schemes.length).toBe(Object.keys(securitySchemes).length);
            
            // All extracted schemes should be apiKey type with correct location
            result.auth.schemes.forEach(scheme => {
              expect(scheme.type).toBe('apiKey');
              expect(['header', 'query', 'cookie']).toContain(scheme.in);
              expect(Object.keys(securitySchemes)).toContain(scheme.name);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Mixed Authentication Schemes', () => {
    it('should extract all supported schemes regardless of mix', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 3 }), // Number of bearer schemes
            fc.integer({ min: 0, max: 3 })  // Number of API key schemes
          ).chain(([bearerCount, apiKeyCount]) => {
            return fc.record({
              bearerSchemes: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 15 }),
                  bearerFormat: fc.option(fc.string(), { nil: undefined })
                }),
                { minLength: bearerCount, maxLength: bearerCount }
              ),
              apiKeySchemes: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 15 }),
                  in: fc.constantFrom('header', 'query', 'cookie'),
                  keyName: fc.string({ minLength: 1, maxLength: 20 })
                }),
                { minLength: apiKeyCount, maxLength: apiKeyCount }
              )
            });
          }),
          ({ bearerSchemes, apiKeySchemes }) => {
            // Skip if no schemes
            if (bearerSchemes.length === 0 && apiKeySchemes.length === 0) {
              return;
            }

            const securitySchemes: Record<string, any> = {};
            const usedNames = new Set<string>();
            
            // Add bearer schemes with unique names
            bearerSchemes.forEach(({ name, bearerFormat }, index) => {
              const uniqueName = usedNames.has(name) ? `${name}_${index}` : name;
              usedNames.add(uniqueName);
              securitySchemes[uniqueName] = {
                type: 'http',
                scheme: 'bearer',
                bearerFormat
              };
            });

            // Add API key schemes with unique names
            apiKeySchemes.forEach(({ name, in: location, keyName }, index) => {
              const uniqueName = usedNames.has(name) ? `${name}_${index}` : name;
              usedNames.add(uniqueName);
              securitySchemes[uniqueName] = {
                type: 'apiKey',
                in: location,
                name: keyName
              };
            });

            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            // The actual number of schemes should match the number of unique keys
            const actualSchemeCount = Object.keys(securitySchemes).length;
            expect(result.auth.schemes.length).toBe(actualSchemeCount);

            // Count extracted schemes by type
            const bearerCountInSchemes = Object.values(securitySchemes).filter((s: any) => s.type === 'http').length;
            const apiKeyCountInSchemes = Object.values(securitySchemes).filter((s: any) => s.type === 'apiKey').length;
            
            const extractedBearerCount = result.auth.schemes.filter(s => s.type === 'bearer').length;
            const extractedApiKeyCount = result.auth.schemes.filter(s => s.type === 'apiKey').length;

            expect(extractedBearerCount).toBe(bearerCountInSchemes);
            expect(extractedApiKeyCount).toBe(apiKeyCountInSchemes);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Global Security Detection', () => {
    it('should set globalRequired to true when security array is non-empty', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.constant([])
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (security) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              security,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6, 3.1**
            expect(result.auth.globalRequired).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should set globalRequired to false when security is undefined or empty', () => {
      fc.assert(
        fc.property(
          fc.option(
            fc.constant([]),
            { nil: undefined }
          ),
          (security) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              security,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6, 3.1**
            expect(result.auth.globalRequired).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Scheme Name Preservation', () => {
    it('should preserve exact scheme names from securitySchemes keys', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.oneof(
              fc.record({
                type: fc.constant('http' as const),
                scheme: fc.constant('bearer')
              }),
              fc.record({
                type: fc.constant('apiKey' as const),
                in: fc.constantFrom('header', 'query', 'cookie'),
                name: fc.string({ minLength: 1 })
              })
            ),
            { minKeys: 1, maxKeys: 10 }
          ),
          (securitySchemes) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            const extractedNames = new Set(result.auth.schemes.map(s => s.name));
            const expectedNames = new Set(Object.keys(securitySchemes));

            expect(extractedNames).toEqual(expectedNames);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Empty/Missing Components Handling', () => {
    it('should return empty schemes array when components or securitySchemes is missing', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant({}),
            fc.constant({ securitySchemes: undefined }),
            fc.constant({ securitySchemes: {} })
          ),
          (components) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: components as any,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6, 3.1**
            expect(result.auth.schemes).toEqual([]);
            expect(result.auth.globalRequired).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Unsupported Scheme Filtering', () => {
    it('should filter out unsupported security scheme types', () => {
      fc.assert(
        fc.property(
          fc.record({
            supportedSchemes: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.oneof(
                fc.record({
                  type: fc.constant('http' as const),
                  scheme: fc.constant('bearer')
                }),
                fc.record({
                  type: fc.constant('http' as const),
                  scheme: fc.constant('basic')
                }),
                fc.record({
                  type: fc.constant('apiKey' as const),
                  in: fc.constantFrom('header', 'query', 'cookie'),
                  name: fc.string({ minLength: 1 })
                })
              ),
              { minKeys: 0, maxKeys: 3 }
            ),
            unsupportedSchemes: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.oneof(
                fc.record({
                  type: fc.constant('oauth2' as const),
                  flows: fc.constant({})
                }),
                fc.record({
                  type: fc.constant('openIdConnect' as const),
                  openIdConnectUrl: fc.constant('https://example.com')
                })
              ),
              { minKeys: 0, maxKeys: 3 }
            )
          }),
          ({ supportedSchemes, unsupportedSchemes }) => {
            const securitySchemes = { ...supportedSchemes, ...unsupportedSchemes };

            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            // Should only extract supported schemes
            expect(result.auth.schemes.length).toBe(Object.keys(supportedSchemes).length);
            
            // All extracted scheme names should be from supported schemes
            result.auth.schemes.forEach(scheme => {
              expect(Object.keys(supportedSchemes)).toContain(scheme.name);
              expect(Object.keys(unsupportedSchemes)).not.toContain(scheme.name);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Scheme Order Preservation', () => {
    it('should preserve the order of schemes from the spec', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              scheme: fc.oneof(
                fc.record({
                  type: fc.constant('http' as const),
                  scheme: fc.constant('bearer')
                }),
                fc.record({
                  type: fc.constant('apiKey' as const),
                  in: fc.constantFrom('header', 'query', 'cookie'),
                  name: fc.string({ minLength: 1 })
                })
              )
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (schemeArray) => {
            // Create securitySchemes object preserving order
            const securitySchemes: Record<string, any> = {};
            schemeArray.forEach(({ name, scheme }) => {
              securitySchemes[name] = scheme;
            });

            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              components: { securitySchemes },
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.6**
            const extractedNames = result.auth.schemes.map(s => s.name);
            const expectedNames = Object.keys(securitySchemes);

            expect(extractedNames).toEqual(expectedNames);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
