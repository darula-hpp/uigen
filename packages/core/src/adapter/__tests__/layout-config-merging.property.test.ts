import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { LayoutConfig, LayoutType, LayoutMetadata, ResponsiveColumns } from '../../ir/types.js';
import { mergeLayoutConfigs } from '../layout-config-merger.js';

/**
 * Property-Based Tests for Layout Configuration Merging
 * 
 * Feature: layout-system, Property 5: Layout Configuration Merging
 * 
 * **Validates: Requirements 12.5**
 * 
 * These tests verify that layout configuration merging correctly handles
 * operation-level overrides of document-level defaults.
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

const responsiveColumns = fc.record({
  mobile: fc.option(fc.integer({ min: 1, max: 6 }), { nil: undefined }),
  tablet: fc.option(fc.integer({ min: 1, max: 8 }), { nil: undefined }),
  desktop: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined })
}) as fc.Arbitrary<ResponsiveColumns>;

const breakpoints = fc.record({
  mobile: fc.option(positiveNumber, { nil: undefined }),
  tablet: fc.option(positiveNumber, { nil: undefined }),
  desktop: fc.option(positiveNumber, { nil: undefined })
});

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
  columns: fc.option(responsiveColumns, { nil: undefined }),
  gap: fc.option(positiveNumber, { nil: undefined }),
  
  // Breakpoints
  breakpoints: fc.option(breakpoints, { nil: undefined })
}) as fc.Arbitrary<LayoutMetadata>;

const layoutConfig = fc.record({
  type: layoutType,
  metadata: fc.option(layoutMetadata, { nil: undefined })
}) as fc.Arbitrary<LayoutConfig>;

describe('Layout Configuration Merging - Property-Based Tests', () => {
  describe('Property 5: Layout Configuration Merging', () => {
    /**
     * **Validates: Requirements 12.5**
     * 
     * For any document-level and operation-level configs,
     * operation-level type SHALL override document-level type.
     */
    it('should override document type with operation type', () => {
      fc.assert(
        fc.property(
          layoutConfig,
          layoutConfig,
          (documentConfig, operationConfig) => {
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // Operation type should override document type
            expect(merged?.type).toBe(operationConfig.type);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When operation config has metadata with defined values,
     * those values SHALL override document metadata.
     */
    it('should override document metadata with operation metadata when both exist', () => {
      fc.assert(
        fc.property(
          layoutConfig.filter(c => c.metadata !== undefined),
          layoutConfig.filter(c => c.metadata !== undefined),
          (documentConfig, operationConfig) => {
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // For each key in operation metadata with a defined value, merged should have operation value
            for (const key in operationConfig.metadata) {
              const opValue = operationConfig.metadata[key];
              
              // Only check defined values (undefined means "not specified")
              if (opValue === undefined) {
                continue;
              }
              
              const docValue = documentConfig.metadata?.[key];
              
              // If both values are objects, check deep merge
              if (
                opValue !== null &&
                typeof opValue === 'object' &&
                !Array.isArray(opValue) &&
                docValue !== null &&
                typeof docValue === 'object' &&
                !Array.isArray(docValue)
              ) {
                // Deep merge - operation values should be present for defined nested keys
                const mergedValue = merged?.metadata?.[key] as Record<string, unknown>;
                for (const nestedKey in opValue as Record<string, unknown>) {
                  const nestedOpValue = (opValue as Record<string, unknown>)[nestedKey];
                  if (nestedOpValue !== undefined) {
                    expect(mergedValue?.[nestedKey]).toBe(nestedOpValue);
                  }
                }
              } else {
                // Simple override
                expect(merged?.metadata?.[key]).toBe(opValue);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When operation config does not have certain metadata fields,
     * document metadata fields SHALL be preserved.
     */
    it('should preserve document metadata when not overridden by operation', () => {
      fc.assert(
        fc.property(
          layoutConfig.filter(c => c.metadata !== undefined),
          layoutType,
          (documentConfig, operationType) => {
            // Create operation config with only type (no metadata)
            const operationConfig: LayoutConfig = {
              type: operationType
            };
            
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // Document metadata should be preserved
            expect(merged?.metadata).toEqual(documentConfig.metadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When operation config has partial metadata,
     * document metadata SHALL be preserved for non-overridden fields (deep merge).
     */
    it('should deep merge partial operation metadata with document metadata', () => {
      fc.assert(
        fc.property(
          layoutConfig.filter(c => c.metadata !== undefined && c.metadata.sidebarWidth !== undefined),
          layoutType,
          fc.integer({ min: 1, max: 1000 }),
          (documentConfig, operationType, newMaxWidth) => {
            // Create operation config with partial metadata
            const operationConfig: LayoutConfig = {
              type: operationType,
              metadata: {
                maxWidth: newMaxWidth
              }
            };
            
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // Operation metadata should be present
            expect(merged?.metadata?.maxWidth).toBe(newMaxWidth);
            
            // Document metadata should be preserved for non-overridden fields
            expect(merged?.metadata?.sidebarWidth).toBe(documentConfig.metadata?.sidebarWidth);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When only document config exists,
     * merged config SHALL equal document config.
     */
    it('should return document config when no operation config', () => {
      fc.assert(
        fc.property(
          layoutConfig,
          (documentConfig) => {
            const merged = mergeLayoutConfigs(documentConfig, undefined);
            
            expect(merged).toEqual(documentConfig);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When only operation config exists,
     * merged config SHALL equal operation config.
     */
    it('should return operation config when no document config', () => {
      fc.assert(
        fc.property(
          layoutConfig,
          (operationConfig) => {
            const merged = mergeLayoutConfigs(undefined, operationConfig);
            
            expect(merged).toEqual(operationConfig);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * When neither config exists,
     * merged config SHALL be undefined.
     */
    it('should return undefined when both configs are undefined', () => {
      const merged = mergeLayoutConfigs(undefined, undefined);
      
      expect(merged).toBeUndefined();
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * Deep merge of nested objects (e.g., columns, breakpoints)
     * SHALL preserve document values for non-overridden nested fields.
     */
    it('should deep merge nested objects like columns and breakpoints', () => {
      fc.assert(
        fc.property(
          layoutType,
          responsiveColumns,
          responsiveColumns,
          (type, docColumns, opColumns) => {
            const documentConfig: LayoutConfig = {
              type: 'dashboard-grid',
              metadata: {
                columns: docColumns
              }
            };
            
            const operationConfig: LayoutConfig = {
              type,
              metadata: {
                columns: opColumns
              }
            };
            
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // Operation columns should override document columns
            const mergedColumns = merged?.metadata?.columns as ResponsiveColumns;
            
            // Check each column property
            if (opColumns.mobile !== undefined) {
              expect(mergedColumns?.mobile).toBe(opColumns.mobile);
            } else if (docColumns.mobile !== undefined) {
              expect(mergedColumns?.mobile).toBe(docColumns.mobile);
            }
            
            if (opColumns.tablet !== undefined) {
              expect(mergedColumns?.tablet).toBe(opColumns.tablet);
            } else if (docColumns.tablet !== undefined) {
              expect(mergedColumns?.tablet).toBe(docColumns.tablet);
            }
            
            if (opColumns.desktop !== undefined) {
              expect(mergedColumns?.desktop).toBe(opColumns.desktop);
            } else if (docColumns.desktop !== undefined) {
              expect(mergedColumns?.desktop).toBe(docColumns.desktop);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * Merging SHALL be idempotent:
     * merge(merge(doc, op), op) === merge(doc, op)
     */
    it('should be idempotent when merging same configs multiple times', () => {
      fc.assert(
        fc.property(
          layoutConfig,
          layoutConfig,
          (documentConfig, operationConfig) => {
            const merged1 = mergeLayoutConfigs(documentConfig, operationConfig);
            const merged2 = mergeLayoutConfigs(merged1, operationConfig);
            
            expect(merged2).toEqual(merged1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * Merging SHALL preserve all metadata keys from both configs.
     */
    it('should preserve all metadata keys from both document and operation configs', () => {
      fc.assert(
        fc.property(
          layoutConfig.filter(c => c.metadata !== undefined),
          layoutConfig.filter(c => c.metadata !== undefined),
          (documentConfig, operationConfig) => {
            const merged = mergeLayoutConfigs(documentConfig, operationConfig);
            
            // Get all keys from both configs
            const docKeys = Object.keys(documentConfig.metadata || {});
            const opKeys = Object.keys(operationConfig.metadata || {});
            const allKeys = new Set([...docKeys, ...opKeys]);
            
            // All keys should be present in merged config
            for (const key of allKeys) {
              expect(merged?.metadata).toHaveProperty(key);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 12.5**
     * 
     * Merging SHALL never throw exceptions,
     * even with edge cases like empty metadata or undefined values.
     */
    it('should never throw exceptions during merge', () => {
      fc.assert(
        fc.property(
          fc.option(layoutConfig, { nil: undefined }),
          fc.option(layoutConfig, { nil: undefined }),
          (documentConfig, operationConfig) => {
            expect(() => {
              mergeLayoutConfigs(documentConfig, operationConfig);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
