/**
 * Property-Based Tests for ConfigFilePersistenceAdapter
 * Feature: canvas-position-persistence
 * 
 * These tests validate universal properties that should hold for all inputs
 * using the fast-check library for property-based testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ConfigFilePersistenceAdapter } from '../config-file-persistence-adapter.js';
import type { ConfigFile, NodePosition } from '@uigen-dev/core';

describe('ConfigFilePersistenceAdapter - Property-Based Tests', () => {
  /**
   * Custom arbitraries for generating test data
   */

  // Generate a valid position
  const positionArbitrary = fc.record({
    x: fc.float({ min: 0, max: 8000, noNaN: true }),
    y: fc.float({ min: 0, max: 8000, noNaN: true })
  });

  // Generate a dictionary of positions (slug -> position)
  const positionsArbitrary = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }), // slug
    positionArbitrary,
    { minKeys: 0, maxKeys: 20 }
  );

  // Generate a relationship config
  const relationshipArbitrary = fc.record({
    source: fc.string({ minLength: 1, maxLength: 20 }),
    target: fc.string({ minLength: 1, maxLength: 20 }),
    path: fc.string({ minLength: 1, maxLength: 50 })
  });

  // Generate annotations (arbitrary nested objects)
  const annotationValueArbitrary: fc.Arbitrary<any> = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.string(), { maxLength: 5 }),
    fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()), { maxKeys: 3 })
  );

  const annotationsArbitrary = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }), // resource slug
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }), // annotation key
      annotationValueArbitrary,
      { minKeys: 0, maxKeys: 5 }
    ),
    { minKeys: 0, maxKeys: 10 }
  );

  // Generate a complete ConfigFile with various fields
  const configFileArbitrary = fc.record({
    version: fc.constantFrom('1.0', '1.1', '2.0'),
    enabled: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.boolean(),
      { minKeys: 0, maxKeys: 5 }
    ),
    defaults: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { minKeys: 0, maxKeys: 3 }
      ),
      { minKeys: 0, maxKeys: 5 }
    ),
    annotations: annotationsArbitrary,
    relationships: fc.option(
      fc.array(relationshipArbitrary, { minLength: 0, maxLength: 10 }),
      { nil: undefined }
    )
  });

  /**
   * Property 2: Config field preservation on position updates
   * Validates: Requirement 2.4
   * 
   * For any ConfigFile with existing annotations, relationships, enabled, and defaults fields,
   * saving a position update SHALL preserve all other fields with identical values.
   */
  describe('Property 2: Config field preservation on position updates', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should preserve all config fields when saving positions', async () => {
      await fc.assert(
        fc.asyncProperty(
          configFileArbitrary,
          positionsArbitrary,
          async (originalConfig, newPositions) => {
            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(originalConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Save positions
            await adapter.save(newPositions);
            
            // Fast-forward past debounce delay
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Verify saveConfig was called
            expect(saveConfig).toHaveBeenCalledTimes(1);

            // Get the saved config
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;

            // Verify all original fields are preserved
            expect(savedConfig.version).toBe(originalConfig.version);
            expect(savedConfig.enabled).toEqual(originalConfig.enabled);
            expect(savedConfig.defaults).toEqual(originalConfig.defaults);
            expect(savedConfig.annotations).toEqual(originalConfig.annotations);
            expect(savedConfig.relationships).toEqual(originalConfig.relationships);

            // Verify positions were updated
            expect(savedConfig.canvasLayout?.positions).toEqual(newPositions);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve existing pan when saving positions', async () => {
      await fc.assert(
        fc.asyncProperty(
          configFileArbitrary,
          positionsArbitrary,
          fc.record({
            x: fc.float({ min: -1000, max: 1000, noNaN: true }),
            y: fc.float({ min: -1000, max: 1000, noNaN: true })
          }),
          async (originalConfig, newPositions, existingPan) => {
            // Add existing pan to config
            const configWithPan: ConfigFile = {
              ...originalConfig,
              canvasLayout: {
                positions: {},
                pan: existingPan
              }
            };

            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(configWithPan);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Save positions
            await adapter.save(newPositions);
            
            // Fast-forward past debounce delay
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Get the saved config
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;

            // Verify pan was preserved
            expect(savedConfig.canvasLayout?.pan).toEqual(existingPan);

            // Verify positions were updated
            expect(savedConfig.canvasLayout?.positions).toEqual(newPositions);

            // Verify other fields preserved
            expect(savedConfig.version).toBe(originalConfig.version);
            expect(savedConfig.enabled).toEqual(originalConfig.enabled);
            expect(savedConfig.defaults).toEqual(originalConfig.defaults);
            expect(savedConfig.annotations).toEqual(originalConfig.annotations);
            expect(savedConfig.relationships).toEqual(originalConfig.relationships);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve existing positions when saving pan', async () => {
      await fc.assert(
        fc.asyncProperty(
          configFileArbitrary,
          positionsArbitrary,
          fc.record({
            x: fc.float({ min: -1000, max: 1000, noNaN: true }),
            y: fc.float({ min: -1000, max: 1000, noNaN: true })
          }),
          async (originalConfig, existingPositions, newPan) => {
            // Add existing positions to config
            const configWithPositions: ConfigFile = {
              ...originalConfig,
              canvasLayout: {
                positions: existingPositions
              }
            };

            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(configWithPositions);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Save pan
            await adapter.savePan(newPan);

            // Get the saved config
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;

            // Verify positions were preserved
            expect(savedConfig.canvasLayout?.positions).toEqual(existingPositions);

            // Verify pan was updated
            expect(savedConfig.canvasLayout?.pan).toEqual(newPan);

            // Verify other fields preserved
            expect(savedConfig.version).toBe(originalConfig.version);
            expect(savedConfig.enabled).toEqual(originalConfig.enabled);
            expect(savedConfig.defaults).toEqual(originalConfig.defaults);
            expect(savedConfig.annotations).toEqual(originalConfig.annotations);
            expect(savedConfig.relationships).toEqual(originalConfig.relationships);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle configs with missing optional fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          positionsArbitrary,
          async (newPositions) => {
            // Minimal config with only required fields
            const minimalConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };

            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(minimalConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Save positions
            await adapter.save(newPositions);
            
            // Fast-forward past debounce delay
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Get the saved config
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;

            // Verify required fields are preserved
            expect(savedConfig.version).toBe('1.0');
            expect(savedConfig.enabled).toEqual({});
            expect(savedConfig.defaults).toEqual({});
            expect(savedConfig.annotations).toEqual({});

            // Verify relationships is still undefined (not added)
            expect(savedConfig.relationships).toBeUndefined();

            // Verify positions were added
            expect(savedConfig.canvasLayout?.positions).toEqual(newPositions);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve deeply nested annotation structures', async () => {
      await fc.assert(
        fc.asyncProperty(
          annotationsArbitrary,
          positionsArbitrary,
          async (annotations, newPositions) => {
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations
            };

            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(config);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Save positions
            await adapter.save(newPositions);
            
            // Fast-forward past debounce delay
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Get the saved config
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;

            // Verify annotations are deeply equal (not just reference equal)
            expect(savedConfig.annotations).toEqual(annotations);

            // Verify it's a proper deep copy by checking nested values
            for (const [resourceSlug, resourceAnnotations] of Object.entries(annotations)) {
              expect(savedConfig.annotations[resourceSlug]).toEqual(resourceAnnotations);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Debouncing prevents excessive writes
   * Validates: Requirements 2.2, 2.3, 9.2
   * 
   * For any sequence of position updates occurring within a 500ms window,
   * the system SHALL perform at most one config write after the last update.
   */
  describe('Property 3: Debouncing prevents excessive writes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should batch multiple rapid position updates into single write', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(positionsArbitrary, { minLength: 2, maxLength: 10 }),
          async (positionUpdates) => {
            // Setup mocks
            const mockConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };
            const loadConfig = vi.fn().mockResolvedValue(mockConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Simulate rapid updates (all within debounce window)
            for (const positions of positionUpdates) {
              await adapter.save(positions);
              // Advance time by less than debounce delay
              vi.advanceTimersByTime(10);
            }

            // Should not have saved yet (still within debounce window)
            expect(saveConfig).not.toHaveBeenCalled();

            // Fast-forward past debounce delay
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Should have saved exactly once
            expect(saveConfig).toHaveBeenCalledTimes(1);

            // Should have saved the last update
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
            expect(savedConfig.canvasLayout?.positions).toEqual(
              positionUpdates[positionUpdates.length - 1]
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow multiple writes if separated by debounce delay', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(positionsArbitrary, { minLength: 2, maxLength: 5 }),
          async (positionUpdates) => {
            // Setup mocks
            const mockConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };
            const loadConfig = vi.fn().mockResolvedValue(mockConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Simulate updates separated by debounce delay
            for (let i = 0; i < positionUpdates.length; i++) {
              await adapter.save(positionUpdates[i]);
              
              // Fast-forward past debounce delay
              vi.advanceTimersByTime(50);
              await vi.runAllTimersAsync();
            }

            // Should have saved once for each update
            expect(saveConfig).toHaveBeenCalledTimes(positionUpdates.length);

            // Verify each save had the correct positions
            for (let i = 0; i < positionUpdates.length; i++) {
              const savedConfig = saveConfig.mock.calls[i][0] as ConfigFile;
              expect(savedConfig.canvasLayout?.positions).toEqual(positionUpdates[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed rapid and delayed updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(positionsArbitrary, { minLength: 4, maxLength: 8 }),
          fc.integer({ min: 1, max: 3 }), // Split point for rapid vs delayed
          async (positionUpdates, splitIndex) => {
            // Ensure split is valid
            if (splitIndex >= positionUpdates.length - 1) {
              splitIndex = Math.floor(positionUpdates.length / 2);
            }

            // Setup mocks
            const mockConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };
            const loadConfig = vi.fn().mockResolvedValue(mockConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // First batch: rapid updates
            for (let i = 0; i <= splitIndex; i++) {
              await adapter.save(positionUpdates[i]);
              vi.advanceTimersByTime(10); // Less than debounce delay
            }

            // Complete first batch
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            const firstBatchSaves = saveConfig.mock.calls.length;
            expect(firstBatchSaves).toBe(1);

            // Second batch: rapid updates
            for (let i = splitIndex + 1; i < positionUpdates.length; i++) {
              await adapter.save(positionUpdates[i]);
              vi.advanceTimersByTime(10); // Less than debounce delay
            }

            // Complete second batch
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Should have saved twice total (once per batch)
            expect(saveConfig).toHaveBeenCalledTimes(2);

            // Verify first batch saved last update from first batch
            const firstSave = saveConfig.mock.calls[0][0] as ConfigFile;
            expect(firstSave.canvasLayout?.positions).toEqual(positionUpdates[splitIndex]);

            // Verify second batch saved last update from second batch
            const secondSave = saveConfig.mock.calls[1][0] as ConfigFile;
            expect(secondSave.canvasLayout?.positions).toEqual(
              positionUpdates[positionUpdates.length - 1]
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce at most one write per debounce window', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // Number of rapid updates
          positionsArbitrary,
          async (numUpdates, basePositions) => {
            // Setup mocks
            const mockConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };
            const loadConfig = vi.fn().mockResolvedValue(mockConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Generate variations of positions for each update
            const updates: Record<string, NodePosition>[] = [];
            for (let i = 0; i < numUpdates; i++) {
              const variation: Record<string, NodePosition> = {};
              for (const [slug, pos] of Object.entries(basePositions)) {
                variation[slug] = {
                  x: pos.x + i,
                  y: pos.y + i
                };
              }
              updates.push(variation);
            }

            // Simulate rapid updates (all within debounce window)
            // Advance by small amount that's always less than debounce delay
            const timeStep = Math.min(10, Math.floor(40 / numUpdates));
            for (const positions of updates) {
              await adapter.save(positions);
              // Advance by small amount (always less than 50ms debounce)
              vi.advanceTimersByTime(timeStep);
            }

            // Should not have saved yet (still within debounce window)
            expect(saveConfig).not.toHaveBeenCalled();

            // Complete the debounce window
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Should have saved exactly once despite many updates
            expect(saveConfig).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty position updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constant({}), { minLength: 2, maxLength: 5 }),
          async (emptyUpdates) => {
            // Setup mocks
            const mockConfig: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {}
            };
            const loadConfig = vi.fn().mockResolvedValue(mockConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Simulate rapid empty updates
            for (const positions of emptyUpdates) {
              await adapter.save(positions);
              vi.advanceTimersByTime(10);
            }

            // Complete debounce
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Should have saved once
            expect(saveConfig).toHaveBeenCalledTimes(1);

            // Should have saved empty positions
            const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
            expect(savedConfig.canvasLayout?.positions).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property: Field preservation with debouncing
   * 
   * This test combines both properties to ensure that debounced saves
   * still preserve all config fields correctly.
   */
  describe('Combined: Field preservation + Debouncing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should preserve config fields across multiple debounced saves', async () => {
      await fc.assert(
        fc.asyncProperty(
          configFileArbitrary,
          fc.array(positionsArbitrary, { minLength: 3, maxLength: 6 }),
          async (originalConfig, positionUpdates) => {
            // Setup mocks
            const loadConfig = vi.fn().mockResolvedValue(originalConfig);
            const saveConfig = vi.fn().mockResolvedValue(undefined);
            const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50);

            // Perform multiple batches of rapid updates
            for (let batch = 0; batch < positionUpdates.length; batch++) {
              await adapter.save(positionUpdates[batch]);
              
              if (batch < positionUpdates.length - 1) {
                // Complete this batch
                vi.advanceTimersByTime(50);
                await vi.runAllTimersAsync();
              }
            }

            // Complete final batch
            vi.advanceTimersByTime(50);
            await vi.runAllTimersAsync();

            // Verify all saves preserved config fields
            for (let i = 0; i < saveConfig.mock.calls.length; i++) {
              const savedConfig = saveConfig.mock.calls[i][0] as ConfigFile;
              
              expect(savedConfig.version).toBe(originalConfig.version);
              expect(savedConfig.enabled).toEqual(originalConfig.enabled);
              expect(savedConfig.defaults).toEqual(originalConfig.defaults);
              expect(savedConfig.annotations).toEqual(originalConfig.annotations);
              expect(savedConfig.relationships).toEqual(originalConfig.relationships);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
