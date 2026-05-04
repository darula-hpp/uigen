import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { LayoutRegistry, type LayoutStrategy } from '../layout-registry';
import type { LayoutType, LayoutMetadata } from '@uigen-dev/core';

// Arbitraries

/** Generates a valid layout type identifier */
const layoutTypeArb = fc.oneof(
  fc.constantFrom('sidebar', 'centered', 'dashboard-grid'),
  fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
);

/** Generates layout metadata */
const layoutMetadataArb = fc.record({
  sidebarWidth: fc.option(fc.integer({ min: 100, max: 500 }), { nil: undefined }),
  maxWidth: fc.option(fc.integer({ min: 200, max: 1200 }), { nil: undefined }),
  gap: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
});

/** Generates a mock layout strategy with a given type */
const createMockStrategy = (type: LayoutType): LayoutStrategy => ({
  type,
  render: (children) => children,
  validate: () => true,
  getDefaults: () => ({}),
});

/** Generates a layout strategy with random type */
const layoutStrategyArb = fc
  .tuple(layoutTypeArb)
  .map(([type]) => createMockStrategy(type as LayoutType));

describe('LayoutRegistry - Property-Based Tests', () => {
  let registry: LayoutRegistry;

  beforeEach(() => {
    // Get fresh instance and clear it
    registry = LayoutRegistry.getInstance();
    registry.clear();
  });

  // Feature: layout-system, Property 2: Registry Registration and Retrieval Round-Trip
  it('Property 2: Registering a strategy and retrieving it by type returns the same instance', () => {
    // **Validates: Requirements 2.1, 2.2, 2.3, 11.1, 11.2, 11.3, 11.4, 11.5**
    fc.assert(
      fc.property(layoutStrategyArb, (strategy) => {
        // Register the strategy
        registry.register(strategy);
        
        // Retrieve by type
        const retrieved = registry.get(strategy.type);
        
        // Assert same instance returned
        expect(retrieved).toBe(strategy);
        expect(retrieved.type).toBe(strategy.type);
      }),
      { numRuns: 100 }
    );
  });

  // Additional property: Multiple strategies can be registered and retrieved independently
  it('Property: Multiple strategies can be registered and retrieved independently', () => {
    fc.assert(
      fc.property(
        fc.array(layoutTypeArb, { minLength: 1, maxLength: 10 }).chain(types => {
          // Ensure unique types
          const uniqueTypes = Array.from(new Set(types));
          return fc.constant(uniqueTypes.map(type => createMockStrategy(type as LayoutType)));
        }),
        (strategies) => {
          // Clear registry before each test iteration
          registry.clear();
          
          // Register all strategies
          for (const strategy of strategies) {
            registry.register(strategy);
          }
          
          // Retrieve each strategy and verify it's the same instance
          for (const strategy of strategies) {
            const retrieved = registry.get(strategy.type);
            expect(retrieved).toBe(strategy);
            expect(retrieved.type).toBe(strategy.type);
          }
          
          // Verify all types are registered
          const registeredTypes = registry.getRegisteredTypes();
          expect(registeredTypes.length).toBe(strategies.length);
          
          for (const strategy of strategies) {
            expect(registeredTypes).toContain(strategy.type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Registration is idempotent for the same type (last wins)
  it('Property: Registering the same type multiple times keeps the last registered instance', () => {
    fc.assert(
      fc.property(
        layoutTypeArb,
        fc.integer({ min: 2, max: 5 }),
        (type, count) => {
          const strategies: LayoutStrategy[] = [];
          
          // Register multiple strategies with the same type
          for (let i = 0; i < count; i++) {
            const strategy = createMockStrategy(type as LayoutType);
            strategies.push(strategy);
            registry.register(strategy);
          }
          
          // The last registered strategy should be retrieved
          const retrieved = registry.get(type as LayoutType);
          const lastStrategy = strategies[strategies.length - 1];
          
          expect(retrieved).toBe(lastStrategy);
          expect(retrieved.type).toBe(type);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Built-in and custom strategy types work identically
  it('Property: Built-in and custom strategy types work identically in the registry', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom('sidebar', 'centered', 'dashboard-grid'),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && !['sidebar', 'centered', 'dashboard-grid'].includes(s))
        ),
        (type) => {
          const strategy = createMockStrategy(type as LayoutType);
          
          // Register the strategy
          registry.register(strategy);
          
          // Retrieve by type
          const retrieved = registry.get(strategy.type);
          
          // Assert same instance returned regardless of whether it's built-in or custom
          expect(retrieved).toBe(strategy);
          expect(retrieved.type).toBe(type);
          
          // Verify it's in the registered types list
          const registeredTypes = registry.getRegisteredTypes();
          expect(registeredTypes).toContain(type);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Clearing the registry removes all strategies
  it('Property: Clearing the registry removes all registered strategies', () => {
    fc.assert(
      fc.property(
        fc.array(layoutTypeArb, { minLength: 1, maxLength: 10 }).chain(types => {
          const uniqueTypes = Array.from(new Set(types));
          return fc.constant(uniqueTypes.map(type => createMockStrategy(type as LayoutType)));
        }),
        (strategies) => {
          // Register all strategies
          for (const strategy of strategies) {
            registry.register(strategy);
          }
          
          // Verify strategies are registered
          expect(registry.getRegisteredTypes().length).toBe(strategies.length);
          
          // Clear the registry
          registry.clear();
          
          // Verify all strategies are removed
          expect(registry.getRegisteredTypes()).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: getRegisteredTypes returns all and only registered types
  it('Property: getRegisteredTypes returns exactly the set of registered strategy types', () => {
    fc.assert(
      fc.property(
        fc.array(layoutTypeArb, { minLength: 0, maxLength: 15 }).chain(types => {
          const uniqueTypes = Array.from(new Set(types));
          return fc.constant(uniqueTypes.map(type => createMockStrategy(type as LayoutType)));
        }),
        (strategies) => {
          // Clear registry before each test iteration
          registry.clear();
          
          // Register all strategies
          for (const strategy of strategies) {
            registry.register(strategy);
          }
          
          const registeredTypes = registry.getRegisteredTypes();
          const expectedTypes = strategies.map(s => s.type);
          
          // Same length
          expect(registeredTypes.length).toBe(expectedTypes.length);
          
          // Contains all expected types
          for (const type of expectedTypes) {
            expect(registeredTypes).toContain(type);
          }
          
          // Contains only expected types
          for (const type of registeredTypes) {
            expect(expectedTypes).toContain(type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
