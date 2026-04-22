/**
 * Property-based tests for Reset Layout functionality
 * 
 * Property 11: Reset restores default grid
 * Validates: Requirement 11.3
 * 
 * For any existing canvas layout, executing the reset action SHALL remove all
 * saved positions and restore the default grid layout with consistent spacing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PositionManager } from '../position-manager.js';
import { GridLayoutStrategy } from '../layout-strategy.js';
import type { NodePosition } from '@uigen-dev/core';
import type { PositionPersistenceAdapter } from '../position-persistence-adapter.js';

describe('Property 11: Reset restores default grid', () => {
  const WORLD_BOUNDS = { width: 8000, height: 8000 };
  const CARD_W = 160;
  const CARD_H = 80;
  const GAP = 56;
  const PAD = 48;
  const COLS = 4;

  let savedPositions: Record<string, NodePosition>;
  let mockAdapter: PositionPersistenceAdapter;
  let layoutStrategy: GridLayoutStrategy;

  beforeEach(() => {
    savedPositions = {};

    mockAdapter = {
      load: vi.fn(async () => savedPositions),
      save: vi.fn(async (positions: Record<string, NodePosition>) => {
        savedPositions = { ...positions };
      })
    };

    layoutStrategy = new GridLayoutStrategy(
      CARD_W,
      CARD_H,
      GAP,
      PAD,
      COLS,
      WORLD_BOUNDS
    );
  });

  /**
   * Arbitrary generator for resource slugs
   */
  const slugArbitrary = fc.string({
    minLength: 3,
    maxLength: 20,
    unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
    )
  });

  /**
   * Arbitrary generator for valid positions within world bounds
   */
  const positionArbitrary = fc.record({
    x: fc.integer({ min: 0, max: WORLD_BOUNDS.width }),
    y: fc.integer({ min: 0, max: WORLD_BOUNDS.height })
  });

  /**
   * Arbitrary generator for a canvas layout (map of slugs to positions)
   */
  const canvasLayoutArbitrary = fc.dictionary(
    slugArbitrary,
    positionArbitrary,
    { minKeys: 1, maxKeys: 20 }
  );

  it('should clear all saved positions and restore default grid layout', async () => {
    await fc.assert(
      fc.asyncProperty(
        canvasLayoutArbitrary,
        async (existingLayout) => {
          // Setup: save existing layout
          savedPositions = existingLayout;
          const slugs = Object.keys(existingLayout);

          const manager = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);

          // Execute: reset to default
          const resetPositions = await manager.resetToDefault(slugs);

          // Verify: saved positions were cleared
          expect(savedPositions).toEqual({});

          // Verify: all resources have positions
          expect(resetPositions.size).toBe(slugs.length);
          for (const slug of slugs) {
            expect(resetPositions.has(slug)).toBe(true);
          }

          // Verify: positions follow grid layout with consistent spacing
          const positionsArray = Array.from(resetPositions.entries());
          for (let i = 0; i < positionsArray.length; i++) {
            const [slug, pos] = positionsArray[i];
            
            // Calculate expected grid position
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const expectedX = PAD + col * (CARD_W + GAP);
            const expectedY = PAD + row * (CARD_H + GAP);

            // Verify position matches grid
            expect(pos.x).toBe(expectedX);
            expect(pos.y).toBe(expectedY);

            // Verify position is within world bounds
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.x).toBeLessThanOrEqual(WORLD_BOUNDS.width);
            expect(pos.y).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThanOrEqual(WORLD_BOUNDS.height);
          }

          // Verify: no overlapping positions
          const positionSet = new Set<string>();
          for (const [slug, pos] of resetPositions.entries()) {
            const key = `${pos.x},${pos.y}`;
            expect(positionSet.has(key)).toBe(false);
            positionSet.add(key);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistent spacing between cards after reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        canvasLayoutArbitrary,
        async (existingLayout) => {
          savedPositions = existingLayout;
          const slugs = Object.keys(existingLayout);

          const manager = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions = await manager.resetToDefault(slugs);

          // Verify: horizontal spacing between adjacent cards in same row
          const positionsArray = Array.from(resetPositions.values());
          for (let i = 0; i < positionsArray.length - 1; i++) {
            const currentRow = Math.floor(i / COLS);
            const nextRow = Math.floor((i + 1) / COLS);

            if (currentRow === nextRow) {
              // Same row - check horizontal spacing
              const horizontalGap = positionsArray[i + 1].x - positionsArray[i].x;
              expect(horizontalGap).toBe(CARD_W + GAP);
            }
          }

          // Verify: vertical spacing between rows
          if (positionsArray.length > COLS) {
            const firstRowY = positionsArray[0].y;
            const secondRowY = positionsArray[COLS].y;
            const verticalGap = secondRowY - firstRowY;
            expect(verticalGap).toBe(CARD_H + GAP);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle reset with varying number of resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (resourceCount) => {
          // Generate random existing layout
          const existingLayout: Record<string, NodePosition> = {};
          const slugs: string[] = [];
          
          for (let i = 0; i < resourceCount; i++) {
            const slug = `resource${i}`;
            slugs.push(slug);
            existingLayout[slug] = {
              x: Math.floor(Math.random() * WORLD_BOUNDS.width),
              y: Math.floor(Math.random() * WORLD_BOUNDS.height)
            };
          }

          savedPositions = existingLayout;

          const manager = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions = await manager.resetToDefault(slugs);

          // Verify: all resources have positions
          expect(resetPositions.size).toBe(resourceCount);

          // Verify: positions are in grid layout
          for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i];
            const pos = resetPositions.get(slug);
            expect(pos).toBeDefined();

            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const expectedX = PAD + col * (CARD_W + GAP);
            const expectedY = PAD + row * (CARD_H + GAP);

            expect(pos?.x).toBe(expectedX);
            expect(pos?.y).toBe(expectedY);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce deterministic results for same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        canvasLayoutArbitrary,
        async (existingLayout) => {
          const slugs = Object.keys(existingLayout);

          // Reset twice with same input
          savedPositions = existingLayout;
          const manager1 = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions1 = await manager1.resetToDefault(slugs);

          savedPositions = existingLayout;
          const manager2 = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions2 = await manager2.resetToDefault(slugs);

          // Verify: both resets produce identical results
          expect(resetPositions1.size).toBe(resetPositions2.size);
          for (const slug of slugs) {
            const pos1 = resetPositions1.get(slug);
            const pos2 = resetPositions2.get(slug);
            expect(pos1).toEqual(pos2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect world bounds after reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        canvasLayoutArbitrary,
        async (existingLayout) => {
          savedPositions = existingLayout;
          const slugs = Object.keys(existingLayout);

          const manager = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions = await manager.resetToDefault(slugs);

          // Verify: all positions are within world bounds
          for (const [slug, pos] of resetPositions.entries()) {
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.x).toBeLessThanOrEqual(WORLD_BOUNDS.width);
            expect(pos.y).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThanOrEqual(WORLD_BOUNDS.height);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should start grid from padding offset', async () => {
    await fc.assert(
      fc.asyncProperty(
        canvasLayoutArbitrary,
        async (existingLayout) => {
          savedPositions = existingLayout;
          const slugs = Object.keys(existingLayout);

          if (slugs.length === 0) return; // Skip empty layouts

          const manager = new PositionManager(mockAdapter, layoutStrategy, WORLD_BOUNDS);
          const resetPositions = await manager.resetToDefault(slugs);

          // Verify: first card is at padding offset
          const firstSlug = slugs[0];
          const firstPos = resetPositions.get(firstSlug);
          expect(firstPos?.x).toBe(PAD);
          expect(firstPos?.y).toBe(PAD);
        }
      ),
      { numRuns: 100 }
    );
  });
});
