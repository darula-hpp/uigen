import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { LayoutParser } from '../layout-parser.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { LayoutConfig, LayoutType, LayoutMetadata } from '../../ir/types.js';

/**
 * Property-Based Tests for LayoutParser
 * 
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
 * 
 * These tests verify universal properties of the LayoutParser using property-based testing.
 * Each test generates random inputs and verifies that certain properties hold for all inputs.
 */

// Arbitraries for generating test data
const validLayoutType = fc.constantFrom<LayoutType>(
  'sidebar',
  'centered',
  'dashboard-grid'
);

const customLayoutType = fc.string({ minLength: 1, maxLength: 30 }).filter(s => 
  s.trim().length > 0 && /^[a-z][a-z0-9-]*$/i.test(s)
);

const layoutType = fc.oneof(validLayoutType, customLayoutType);

const positiveNumber = fc.integer({ min: 1, max: 10000 });

const layoutMetadata = fc.record({
  // Sidebar options
  sidebarWidth: fc.option(positiveNumber, { nil: undefined }),
  sidebarCollapsible: fc.option(fc.boolean(), { nil: undefined }),
  sidebarDefaultCollapsed: fc.option(fc.boolean(), { nil: undefined }),
  
  // Centered options
  maxWidth: fc.option(positiveNumber, { nil: undefined }),
  showHeader: fc.option(fc.boolean(), { nil: undefined }),
  verticalCenter: fc.option(fc.boolean(), { nil: undefined }),
  
  // Dashboard grid options
  columns: fc.option(
    fc.record({
      mobile: fc.option(fc.integer({ min: 1, max: 6 }), { nil: undefined }),
      tablet: fc.option(fc.integer({ min: 1, max: 8 }), { nil: undefined }),
      desktop: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined })
    }),
    { nil: undefined }
  ),
  gap: fc.option(positiveNumber, { nil: undefined }),
  
  // Breakpoints
  breakpoints: fc.option(
    fc.record({
      mobile: fc.option(positiveNumber, { nil: undefined }),
      tablet: fc.option(positiveNumber, { nil: undefined }),
      desktop: fc.option(positiveNumber, { nil: undefined })
    }),
    { nil: undefined }
  )
}) as fc.Arbitrary<LayoutMetadata>;

const validLayoutConfig = fc.record({
  type: layoutType,
  metadata: fc.option(layoutMetadata, { nil: undefined })
}) as fc.Arbitrary<LayoutConfig>;

describe('LayoutParser - Property-Based Tests', () => {
  const parser = new LayoutParser();

  describe('Property 4: Layout Parser Extraction and Validation', () => {
    /**
     * **Validates: Requirements 12.1, 12.2, 12.3**
     * 
     * For any valid layout annotation with type and optional metadata,
     * the parser SHALL successfully extract a LayoutConfig that matches the annotation.
     */
    it('should extract valid layout annotations correctly', () => {
      fc.assert(
        fc.property(
          validLayoutConfig,
          (layoutConfig) => {
            // Create a spec with the layout annotation
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': layoutConfig
            } as any;

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeDefined();
            expect(result?.type).toBe(layoutConfig.type);
            
            if (layoutConfig.metadata !== undefined) {
              expect(result?.metadata).toEqual(layoutConfig.metadata);
            } else {
              expect(result?.metadata).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.2, 12.3**
     * 
     * For any valid layout annotation at the operation level,
     * the parser SHALL successfully extract a LayoutConfig that matches the annotation.
     */
    it('should extract valid operation-level layout annotations correctly', () => {
      fc.assert(
        fc.property(
          validLayoutConfig,
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.startsWith('/')),
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          (layoutConfig, path, method) => {
            // Create an operation with the layout annotation
            const operation: OpenAPIV3.OperationObject = {
              responses: {},
              'x-uigen-layout': layoutConfig
            } as any;

            // Parse operation-level layout
            const result = parser.parseOperationLayout(operation, path, method);

            // Assertions
            expect(result).toBeDefined();
            expect(result?.type).toBe(layoutConfig.type);
            
            if (layoutConfig.metadata !== undefined) {
              expect(result?.metadata).toEqual(layoutConfig.metadata);
            } else {
              expect(result?.metadata).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.3, 12.4**
     * 
     * For any invalid annotation (missing type field),
     * the parser SHALL return undefined and log a warning.
     */
    it('should reject annotations missing the type field', () => {
      fc.assert(
        fc.property(
          fc.record({
            metadata: fc.option(layoutMetadata, { nil: undefined }),
            // Intentionally omit 'type' field
            otherField: fc.option(fc.string(), { nil: undefined })
          }),
          (invalidAnnotation) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': invalidAnnotation
            } as any;

            // Spy on console.warn
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeUndefined();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('missing or invalid \'type\' field')
            );

            // Cleanup
            consoleWarnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.3, 12.4**
     * 
     * For any invalid annotation (wrong structure - not an object),
     * the parser SHALL return undefined and log a warning.
     */
    it('should reject annotations with wrong structure', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.array(fc.anything())
          ),
          (invalidValue) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': invalidValue
            } as any;

            // Spy on console.warn
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeUndefined();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('must be an object')
            );

            // Cleanup
            consoleWarnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.3, 12.4**
     * 
     * For any annotation with invalid type field (not a string),
     * the parser SHALL return undefined and log a warning.
     */
    it('should reject annotations with non-string type field', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.array(fc.string()),
            fc.object()
          ),
          (invalidType) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': {
                type: invalidType,
                metadata: {}
              }
            } as any;

            // Spy on console.warn
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeUndefined();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('missing or invalid \'type\' field')
            );

            // Cleanup
            consoleWarnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.3, 12.4**
     * 
     * For any annotation with invalid metadata (not an object),
     * the parser SHALL return a LayoutConfig with type only (no metadata) and log a warning.
     */
    it('should handle invalid metadata gracefully', () => {
      fc.assert(
        fc.property(
          layoutType,
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.array(fc.anything())
          ),
          (type, invalidMetadata) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': {
                type,
                metadata: invalidMetadata
              }
            } as any;

            // Spy on console.warn
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeDefined();
            expect(result?.type).toBe(type);
            expect(result?.metadata).toBeUndefined();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('\'metadata\' must be an object')
            );

            // Cleanup
            consoleWarnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.1, 12.2**
     * 
     * When no x-uigen-layout annotation is present,
     * the parser SHALL return undefined (not an error).
     */
    it('should return undefined when annotation is not present', () => {
      fc.assert(
        fc.property(
          fc.constant(undefined),
          () => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {}
            };

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.1, 12.2, 12.3**
     * 
     * For any valid layout config, parsing should be idempotent:
     * parsing the same annotation multiple times should yield the same result.
     */
    it('should be idempotent - parsing same annotation yields same result', () => {
      fc.assert(
        fc.property(
          validLayoutConfig,
          (layoutConfig) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': layoutConfig
            } as any;

            // Parse multiple times
            const result1 = parser.parseDocumentLayout(spec);
            const result2 = parser.parseDocumentLayout(spec);
            const result3 = parser.parseDocumentLayout(spec);

            // Assertions - all results should be equal
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.1, 12.2, 12.3**
     * 
     * For any valid layout config with metadata,
     * the extracted config should preserve all metadata fields.
     */
    it('should preserve all metadata fields during extraction', () => {
      fc.assert(
        fc.property(
          layoutType,
          layoutMetadata,
          (type, metadata) => {
            const layoutConfig = { type, metadata };
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test', version: '1.0.0' },
              paths: {},
              'x-uigen-layout': layoutConfig
            } as any;

            // Parse document-level layout
            const result = parser.parseDocumentLayout(spec);

            // Assertions
            expect(result).toBeDefined();
            expect(result?.type).toBe(type);
            expect(result?.metadata).toEqual(metadata);
            
            // Verify all metadata keys are preserved
            if (metadata) {
              const metadataKeys = Object.keys(metadata);
              const resultKeys = Object.keys(result?.metadata || {});
              expect(resultKeys.sort()).toEqual(metadataKeys.sort());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
     * 
     * Exception safety: The parser should never throw exceptions,
     * even with malformed or unexpected input.
     */
    it('should never throw exceptions for any input', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value) => {
            expect(() => {
              const spec: OpenAPIV3.Document = {
                openapi: '3.0.0',
                info: { title: 'Test', version: '1.0.0' },
                paths: {},
                'x-uigen-layout': value
              } as any;

              // Suppress console warnings for this test
              const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
              
              parser.parseDocumentLayout(spec);
              
              consoleWarnSpy.mockRestore();
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.2, 12.3, 12.4**
     * 
     * Exception safety for operation-level parsing:
     * The parser should never throw exceptions for any operation input.
     */
    it('should never throw exceptions for any operation input', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.string(),
          fc.string(),
          (value, path, method) => {
            expect(() => {
              const operation: OpenAPIV3.OperationObject = {
                responses: {},
                'x-uigen-layout': value
              } as any;

              // Suppress console warnings for this test
              const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
              
              parser.parseOperationLayout(operation, path, method);
              
              consoleWarnSpy.mockRestore();
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
