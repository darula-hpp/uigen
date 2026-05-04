/**
 * Property-based tests for layout preferences persistence
 * Feature: layout-system, Property 3: Layout Preferences Persistence Round-Trip
 * Tests Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveLayoutPreferences,
  loadLayoutPreferences,
  clearLayoutPreferences,
  type LayoutPreferences,
} from '../layout-preferences';

describe('Layout Preferences Persistence - Property-Based Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });

  // Feature: layout-system, Property 3: Layout Preferences Persistence Round-Trip
  describe('Property 3: Layout Preferences Persistence Round-Trip', () => {
    /**
     * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
     * 
     * For any valid layout preferences object, saving it to localStorage
     * and then loading it back should produce an equivalent preferences
     * object with the same values.
     * 
     * This property ensures preferences are correctly saved and restored
     * without data loss.
     */
    it('should preserve preferences through save and load round-trip', () => {
      // Arbitrary for LayoutType
      const layoutTypeArb = fc.oneof(
        fc.constant('sidebar'),
        fc.constant('centered'),
        fc.constant('dashboard-grid'),
        fc.string({ minLength: 1, maxLength: 20 }) // Custom layout types
      );

      // Arbitrary for LayoutPreferences
      const layoutPreferencesArb = fc.record({
        sidebarCollapsed: fc.option(fc.boolean(), { nil: undefined }),
        selectedLayoutType: fc.option(layoutTypeArb, { nil: undefined }),
        metadata: fc.option(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.constant(null)
            )
          ),
          { nil: undefined }
        ),
      });

      // Arbitrary for app ID
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(appIdArb, layoutPreferencesArb, (appId, preferences) => {
          // Save preferences
          saveLayoutPreferences(appId, preferences);

          // Load preferences
          const loaded = loadLayoutPreferences(appId);

          // Assert loaded preferences equal original preferences
          expect(loaded).toEqual(preferences);

          // Clean up
          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.5**
     * 
     * For any two different app IDs, preferences saved for one app
     * should not affect preferences for another app.
     * 
     * This property ensures preferences are correctly scoped per application.
     */
    it('should isolate preferences between different applications', () => {
      const layoutPreferencesArb = fc.record({
        sidebarCollapsed: fc.option(fc.boolean(), { nil: undefined }),
        selectedLayoutType: fc.option(
          fc.oneof(
            fc.constant('sidebar'),
            fc.constant('centered'),
            fc.constant('dashboard-grid')
          ),
          { nil: undefined }
        ),
      });

      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(
          appIdArb,
          appIdArb,
          layoutPreferencesArb,
          layoutPreferencesArb,
          (appId1, appId2, prefs1, prefs2) => {
            // Skip if app IDs are the same
            fc.pre(appId1 !== appId2);

            // Save preferences for both apps
            saveLayoutPreferences(appId1, prefs1);
            saveLayoutPreferences(appId2, prefs2);

            // Load preferences for both apps
            const loaded1 = loadLayoutPreferences(appId1);
            const loaded2 = loadLayoutPreferences(appId2);

            // Assert each app's preferences are preserved independently
            expect(loaded1).toEqual(prefs1);
            expect(loaded2).toEqual(prefs2);

            // Clean up
            clearLayoutPreferences(appId1);
            clearLayoutPreferences(appId2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.3**
     * 
     * For any boolean value representing sidebar collapsed state,
     * saving and loading should preserve the exact boolean value.
     */
    it('should preserve sidebar collapsed state through round-trip', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });
      const sidebarCollapsedArb = fc.boolean();

      fc.assert(
        fc.property(appIdArb, sidebarCollapsedArb, (appId, sidebarCollapsed) => {
          const preferences: LayoutPreferences = {
            sidebarCollapsed,
          };

          saveLayoutPreferences(appId, preferences);
          const loaded = loadLayoutPreferences(appId);

          expect(loaded?.sidebarCollapsed).toBe(sidebarCollapsed);

          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.4**
     * 
     * For any layout type string, saving and loading should preserve
     * the exact layout type value.
     */
    it('should preserve selected layout type through round-trip', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });
      const layoutTypeArb = fc.oneof(
        fc.constant('sidebar'),
        fc.constant('centered'),
        fc.constant('dashboard-grid'),
        fc.string({ minLength: 1, maxLength: 30 })
      );

      fc.assert(
        fc.property(appIdArb, layoutTypeArb, (appId, layoutType) => {
          const preferences: LayoutPreferences = {
            selectedLayoutType: layoutType as any,
          };

          saveLayoutPreferences(appId, preferences);
          const loaded = loadLayoutPreferences(appId);

          expect(loaded?.selectedLayoutType).toBe(layoutType);

          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.1, 10.2**
     * 
     * For any preferences object with complex metadata,
     * saving and loading should preserve the entire structure.
     */
    it('should preserve complex metadata through round-trip', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });
      const metadataArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.integer()),
          fc.record({
            nested: fc.string(),
            value: fc.integer(),
          })
        )
      );

      fc.assert(
        fc.property(appIdArb, metadataArb, (appId, metadata) => {
          const preferences: LayoutPreferences = {
            metadata,
          };

          saveLayoutPreferences(appId, preferences);
          const loaded = loadLayoutPreferences(appId);

          expect(loaded?.metadata).toEqual(metadata);

          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.1, 10.2**
     * 
     * For any empty preferences object, saving and loading
     * should preserve the empty object.
     */
    it('should preserve empty preferences through round-trip', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(appIdArb, (appId) => {
          const preferences: LayoutPreferences = {};

          saveLayoutPreferences(appId, preferences);
          const loaded = loadLayoutPreferences(appId);

          expect(loaded).toEqual(preferences);

          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.1, 10.2**
     * 
     * For any preferences with all fields populated,
     * saving and loading should preserve all fields.
     */
    it('should preserve all fields through round-trip', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });
      const fullPreferencesArb = fc.record({
        sidebarCollapsed: fc.boolean(),
        selectedLayoutType: fc.oneof(
          fc.constant('sidebar'),
          fc.constant('centered'),
          fc.constant('dashboard-grid')
        ),
        metadata: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
      });

      fc.assert(
        fc.property(appIdArb, fullPreferencesArb, (appId, preferences) => {
          saveLayoutPreferences(appId, preferences);
          const loaded = loadLayoutPreferences(appId);

          expect(loaded).toEqual(preferences);
          expect(loaded?.sidebarCollapsed).toBe(preferences.sidebarCollapsed);
          expect(loaded?.selectedLayoutType).toBe(preferences.selectedLayoutType);
          expect(loaded?.metadata).toEqual(preferences.metadata);

          clearLayoutPreferences(appId);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 10.5**
     * 
     * Clearing preferences for one app should not affect
     * preferences for other apps.
     */
    it('should not affect other apps when clearing preferences', () => {
      const appIdArb = fc.string({ minLength: 1, maxLength: 50 });
      const preferencesArb = fc.record({
        sidebarCollapsed: fc.boolean(),
      });

      fc.assert(
        fc.property(
          appIdArb,
          appIdArb,
          preferencesArb,
          preferencesArb,
          (appId1, appId2, prefs1, prefs2) => {
            fc.pre(appId1 !== appId2);

            saveLayoutPreferences(appId1, prefs1);
            saveLayoutPreferences(appId2, prefs2);

            clearLayoutPreferences(appId1);

            expect(loadLayoutPreferences(appId1)).toBeUndefined();
            expect(loadLayoutPreferences(appId2)).toEqual(prefs2);

            clearLayoutPreferences(appId2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
