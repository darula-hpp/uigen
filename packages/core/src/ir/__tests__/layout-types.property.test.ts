import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type {
  LayoutConfig,
  LayoutType,
  LayoutMetadata,
  ResponsiveColumns,
} from '../types.js';

// Arbitraries for generating random layout configurations

/**
 * Generate valid layout type strings
 */
const layoutTypeArbitrary = fc.oneof(
  fc.constantFrom<LayoutType>('sidebar', 'centered', 'dashboard-grid'),
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '')
);

/**
 * Generate responsive column configurations
 */
const responsiveColumnsArbitrary: fc.Arbitrary<ResponsiveColumns> = fc.record({
  mobile: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
  tablet: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
  desktop: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
});

/**
 * Generate breakpoint configurations
 */
const breakpointsArbitrary = fc.record({
  mobile: fc.option(fc.integer({ min: 320, max: 768 }), { nil: undefined }),
  tablet: fc.option(fc.integer({ min: 640, max: 1024 }), { nil: undefined }),
  desktop: fc.option(fc.integer({ min: 1024, max: 1920 }), { nil: undefined }),
});

/**
 * Generate layout metadata with various configurations
 */
const layoutMetadataArbitrary: fc.Arbitrary<LayoutMetadata> = fc.oneof(
  // Sidebar metadata
  fc.record({
    sidebarWidth: fc.option(fc.integer({ min: 200, max: 400 }), { nil: undefined }),
    sidebarCollapsible: fc.option(fc.boolean(), { nil: undefined }),
    sidebarDefaultCollapsed: fc.option(fc.boolean(), { nil: undefined }),
  }),
  // Centered metadata
  fc.record({
    maxWidth: fc.option(fc.integer({ min: 300, max: 1200 }), { nil: undefined }),
    showHeader: fc.option(fc.boolean(), { nil: undefined }),
    verticalCenter: fc.option(fc.boolean(), { nil: undefined }),
  }),
  // Dashboard grid metadata
  fc.record({
    columns: fc.option(responsiveColumnsArbitrary, { nil: undefined }),
    gap: fc.option(fc.integer({ min: 0, max: 64 }), { nil: undefined }),
  }),
  // Metadata with breakpoints
  fc.record({
    breakpoints: fc.option(breakpointsArbitrary, { nil: undefined }),
  }),
  // Mixed metadata (combining multiple layout types)
  fc.record({
    sidebarWidth: fc.option(fc.integer({ min: 200, max: 400 }), { nil: undefined }),
    maxWidth: fc.option(fc.integer({ min: 300, max: 1200 }), { nil: undefined }),
    columns: fc.option(responsiveColumnsArbitrary, { nil: undefined }),
    gap: fc.option(fc.integer({ min: 0, max: 64 }), { nil: undefined }),
    breakpoints: fc.option(breakpointsArbitrary, { nil: undefined }),
  }),
  // Empty metadata
  fc.constant({}),
  // Custom metadata with arbitrary properties
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    )
  )
);

/**
 * Generate complete LayoutConfig objects
 */
const layoutConfigArbitrary: fc.Arbitrary<LayoutConfig> = fc.record({
  type: layoutTypeArbitrary,
  metadata: fc.option(layoutMetadataArbitrary, { nil: undefined }),
});

describe('Layout Types - Property-Based Tests', () => {
  // Feature: layout-system, Property 1: LayoutConfig Serialization Round-Trip
  describe('Property 1: LayoutConfig Serialization Round-Trip', () => {
    /**
     * **Validates: Requirements 1.5**
     * 
     * For any valid LayoutConfig object, serializing it to JSON and then 
     * deserializing it back should produce an equivalent LayoutConfig object 
     * with the same type and metadata.
     */
    it('should preserve LayoutConfig through JSON serialization round-trip', () => {
      fc.assert(
        fc.property(
          layoutConfigArbitrary,
          (config) => {
            // Serialize to JSON
            const serialized = JSON.stringify(config);
            
            // Deserialize back
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            // Assert equality
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe(config.type);
            
            if (config.metadata !== undefined) {
              expect(deserialized.metadata).toEqual(config.metadata);
            } else {
              expect(deserialized.metadata).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sidebar layout metadata through serialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant<LayoutType>('sidebar'),
            metadata: fc.option(
              fc.record({
                sidebarWidth: fc.option(fc.integer({ min: 200, max: 400 }), { nil: undefined }),
                sidebarCollapsible: fc.option(fc.boolean(), { nil: undefined }),
                sidebarDefaultCollapsed: fc.option(fc.boolean(), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }),
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe('sidebar');
            
            if (config.metadata) {
              expect(deserialized.metadata?.sidebarWidth).toBe(config.metadata.sidebarWidth);
              expect(deserialized.metadata?.sidebarCollapsible).toBe(config.metadata.sidebarCollapsible);
              expect(deserialized.metadata?.sidebarDefaultCollapsed).toBe(config.metadata.sidebarDefaultCollapsed);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve centered layout metadata through serialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant<LayoutType>('centered'),
            metadata: fc.option(
              fc.record({
                maxWidth: fc.option(fc.integer({ min: 300, max: 1200 }), { nil: undefined }),
                showHeader: fc.option(fc.boolean(), { nil: undefined }),
                verticalCenter: fc.option(fc.boolean(), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }),
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe('centered');
            
            if (config.metadata) {
              expect(deserialized.metadata?.maxWidth).toBe(config.metadata.maxWidth);
              expect(deserialized.metadata?.showHeader).toBe(config.metadata.showHeader);
              expect(deserialized.metadata?.verticalCenter).toBe(config.metadata.verticalCenter);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve dashboard grid layout metadata through serialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant<LayoutType>('dashboard-grid'),
            metadata: fc.option(
              fc.record({
                columns: fc.option(responsiveColumnsArbitrary, { nil: undefined }),
                gap: fc.option(fc.integer({ min: 0, max: 64 }), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }),
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe('dashboard-grid');
            
            if (config.metadata) {
              expect(deserialized.metadata?.columns).toEqual(config.metadata.columns);
              expect(deserialized.metadata?.gap).toBe(config.metadata.gap);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve custom layout types through serialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
            metadata: fc.option(
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.oneof(fc.string(), fc.integer(), fc.boolean())
              ),
              { nil: undefined }
            ),
          }),
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe(config.type);
            expect(deserialized.metadata).toEqual(config.metadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve responsive columns through serialization', () => {
      fc.assert(
        fc.property(
          responsiveColumnsArbitrary,
          (columns) => {
            const serialized = JSON.stringify(columns);
            const deserialized = JSON.parse(serialized) as ResponsiveColumns;
            
            expect(deserialized).toEqual(columns);
            expect(deserialized.mobile).toBe(columns.mobile);
            expect(deserialized.tablet).toBe(columns.tablet);
            expect(deserialized.desktop).toBe(columns.desktop);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve breakpoints through serialization', () => {
      fc.assert(
        fc.property(
          breakpointsArbitrary,
          (breakpoints) => {
            const serialized = JSON.stringify(breakpoints);
            const deserialized = JSON.parse(serialized);
            
            expect(deserialized).toEqual(breakpoints);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: empty metadata', () => {
      fc.assert(
        fc.property(
          layoutTypeArbitrary,
          (type) => {
            const config: LayoutConfig = { type, metadata: {} };
            
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            expect(deserialized.type).toBe(type);
            expect(deserialized.metadata).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: undefined metadata', () => {
      fc.assert(
        fc.property(
          layoutTypeArbitrary,
          (type) => {
            const config: LayoutConfig = { type };
            
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized.type).toBe(type);
            expect(deserialized.metadata).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: nested metadata structures', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: layoutTypeArbitrary,
            metadata: fc.option(
              fc.record({
                columns: fc.option(responsiveColumnsArbitrary, { nil: undefined }),
                breakpoints: fc.option(breakpointsArbitrary, { nil: undefined }),
                gap: fc.option(fc.integer({ min: 0, max: 64 }), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }),
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            expect(deserialized).toEqual(config);
            
            if (config.metadata?.columns) {
              expect(deserialized.metadata?.columns).toEqual(config.metadata.columns);
            }
            
            if (config.metadata?.breakpoints) {
              expect(deserialized.metadata?.breakpoints).toEqual(config.metadata.breakpoints);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve type information for all layout types', () => {
      fc.assert(
        fc.property(
          layoutConfigArbitrary,
          (config) => {
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            // Type should always be preserved
            expect(typeof deserialized.type).toBe('string');
            expect(deserialized.type).toBe(config.type);
            expect(deserialized.type.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle metadata with all optional fields undefined', () => {
      fc.assert(
        fc.property(
          layoutTypeArbitrary,
          (type) => {
            const config: LayoutConfig = {
              type,
              metadata: {
                sidebarWidth: undefined,
                sidebarCollapsible: undefined,
                maxWidth: undefined,
                columns: undefined,
                gap: undefined,
              },
            };
            
            const serialized = JSON.stringify(config);
            const deserialized = JSON.parse(serialized) as LayoutConfig;
            
            // JSON.stringify removes undefined values, so metadata becomes {}
            expect(deserialized.type).toBe(type);
            expect(deserialized.metadata).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
