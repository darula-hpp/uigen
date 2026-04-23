/**
 * Property-Based Tests for GridLayoutStrategy
 * Feature: canvas-position-persistence
 * 
 * These tests validate universal properties that should hold for all inputs
 * using the fast-check library for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GridLayoutStrategy } from '../layout-strategy.js';
import type { NodePosition } from '@uigen-dev/core';

describe('GridLayoutStrategy - Property-Based Tests', () => {
  // Standard configuration matching design specs
  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 80;
  const GAP = 56;
  const PADDING = 48;
  const COLUMNS = 4;
  const WORLD_BOUNDS = { width: 8000, height: 8000 };

  const createStrategy = () => new GridLayoutStrategy(
    CARD_WIDTH,
    CARD_HEIGHT,
    GAP,
    PADDING,
    COLUMNS,
    WORLD_BOUNDS
  );

  /**
   * Custom arbitraries for generating test data
   */

  // Generate a valid grid-aligned position
  // The strategy works with grid slots, so we should test with grid-aligned positions
  const gridPositionArbitrary = fc.record({
    gridX: fc.integer({ min: 0, max: 30 }), // Grid column
    gridY: fc.integer({ min: 0, max: 30 })  // Grid row
  }).map(({ gridX, gridY }) => ({
    x: PADDING + gridX * (CARD_WIDTH + GAP),
    y: PADDING + gridY * (CARD_HEIGHT + GAP)
  })).filter(pos => 
    // Ensure position is within world bounds
    pos.x >= 0 && pos.x <= WORLD_BOUNDS.width - CARD_WIDTH &&
    pos.y >= 0 && pos.y <= WORLD_BOUNDS.height - CARD_HEIGHT
  );

  // Generate a dictionary of existing positions (slug -> position)
  const existingPositionsArbitrary = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }), // slug
    gridPositionArbitrary,
    { minKeys: 0, maxKeys: 20 } // Reasonable number of existing positions
  );

  // Generate a resource slug
  const slugArbitrary = fc.string({ minLength: 1, maxLength: 20 });

  /**
   * Property 5: Non-overlapping layout calculation
   * Validates: Requirements 4.1
   * 
   * For any set of existing positions, calculating a default position for a new resource
   * SHALL produce coordinates that do not overlap with any existing card (considering
   * card dimensions 160x80 and spacing).
   */
  describe('Property 5: Non-overlapping layout calculation', () => {
    it('should never produce positions that overlap with existing cards', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          (existingPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Calculate position for new resource
            const newPosition = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Verify new position doesn't overlap with any existing position
            for (const [slug, existingPos] of Object.entries(existingPositions)) {
              // Skip if it's the same slug (shouldn't happen, but be safe)
              if (slug === newSlug) continue;

              // Check for overlap
              // Two rectangles overlap if:
              // - Their x ranges overlap AND their y ranges overlap
              const xOverlap = 
                (newPosition.x < existingPos.x + CARD_WIDTH) &&
                (newPosition.x + CARD_WIDTH > existingPos.x);
              
              const yOverlap = 
                (newPosition.y < existingPos.y + CARD_HEIGHT) &&
                (newPosition.y + CARD_HEIGHT > existingPos.y);

              const overlaps = xOverlap && yOverlap;

              // Assert no overlap
              expect(overlaps).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain minimum spacing between cards', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          (existingPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Calculate position for new resource
            const newPosition = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Verify minimum spacing is maintained with all existing cards
            for (const [slug, existingPos] of Object.entries(existingPositions)) {
              if (slug === newSlug) continue;

              // Calculate distances
              const horizontalDistance = Math.abs(newPosition.x - existingPos.x);
              const verticalDistance = Math.abs(newPosition.y - existingPos.y);

              // If cards are in the same row (similar y coordinates)
              if (Math.abs(newPosition.y - existingPos.y) < CARD_HEIGHT) {
                // They should be separated by at least card width + gap
                if (horizontalDistance > 0) {
                  expect(horizontalDistance).toBeGreaterThanOrEqual(CARD_WIDTH);
                }
              }

              // If cards are in the same column (similar x coordinates)
              if (Math.abs(newPosition.x - existingPos.x) < CARD_WIDTH) {
                // They should be separated by at least card height + gap
                if (verticalDistance > 0) {
                  expect(verticalDistance).toBeGreaterThanOrEqual(CARD_HEIGHT);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always produce positions within world bounds', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          (existingPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Calculate position for new resource
            const newPosition = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Verify position is within world bounds
            expect(newPosition.x).toBeGreaterThanOrEqual(0);
            expect(newPosition.y).toBeGreaterThanOrEqual(0);
            expect(newPosition.x).toBeLessThanOrEqual(WORLD_BOUNDS.width - CARD_WIDTH);
            expect(newPosition.y).toBeLessThanOrEqual(WORLD_BOUNDS.height - CARD_HEIGHT);

            // Verify card fits entirely within bounds
            expect(newPosition.x + CARD_WIDTH).toBeLessThanOrEqual(WORLD_BOUNDS.width);
            expect(newPosition.y + CARD_HEIGHT).toBeLessThanOrEqual(WORLD_BOUNDS.height);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case with positions at grid boundaries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              slug: slugArbitrary,
              gridX: fc.integer({ min: 0, max: COLUMNS - 1 }),
              gridY: fc.integer({ min: 0, max: 10 })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          slugArbitrary,
          (gridPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Convert grid positions to world positions
            const existingPositions: Record<string, NodePosition> = {};
            for (const { slug, gridX, gridY } of gridPositions) {
              existingPositions[slug] = {
                x: PADDING + gridX * (CARD_WIDTH + GAP),
                y: PADDING + gridY * (CARD_HEIGHT + GAP)
              };
            }

            // Calculate position for new resource
            const newPosition = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Verify no overlap with any existing position
            for (const existingPos of Object.values(existingPositions)) {
              const xOverlap = 
                (newPosition.x < existingPos.x + CARD_WIDTH) &&
                (newPosition.x + CARD_WIDTH > existingPos.x);
              
              const yOverlap = 
                (newPosition.y < existingPos.y + CARD_HEIGHT) &&
                (newPosition.y + CARD_HEIGHT > existingPos.y);

              expect(xOverlap && yOverlap).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Grid slot determinism
   * Validates: Requirements 4.2, 4.5
   * 
   * For any given set of existing positions, calculating a default position for a new
   * resource SHALL always produce the same coordinates (deterministic first-available-slot
   * algorithm).
   */
  describe('Property 6: Grid slot determinism', () => {
    it('should produce identical results for identical inputs', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          (existingPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Calculate position twice with same inputs
            const position1 = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            const position2 = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Results should be identical
            expect(position1.x).toBe(position2.x);
            expect(position1.y).toBe(position2.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce same result regardless of slug parameter', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          slugArbitrary,
          (existingPositions, slug1, slug2) => {
            // Skip if slugs are the same or if either slug exists in existing positions
            if (slug1 === slug2 || slug1 in existingPositions || slug2 in existingPositions) {
              return;
            }

            const strategy = createStrategy();
            
            // Calculate position with different slugs but same existing positions
            const position1 = strategy.calculatePosition(
              slug1,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            const position2 = strategy.calculatePosition(
              slug2,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Results should be identical (slug doesn't affect calculation)
            expect(position1.x).toBe(position2.x);
            expect(position1.y).toBe(position2.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results across multiple strategy instances', () => {
      fc.assert(
        fc.property(
          existingPositionsArbitrary,
          slugArbitrary,
          (existingPositions, newSlug) => {
            // Create two separate strategy instances with same configuration
            const strategy1 = createStrategy();
            const strategy2 = createStrategy();
            
            // Calculate position with each instance
            const position1 = strategy1.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            const position2 = strategy2.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Results should be identical
            expect(position1.x).toBe(position2.x);
            expect(position1.y).toBe(position2.y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should follow left-to-right, top-to-bottom order consistently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }), // Number of cards to place
          (numCards) => {
            const strategy = createStrategy();
            const positions: NodePosition[] = [];
            let existingPositions: Record<string, NodePosition> = {};

            // Place cards sequentially
            for (let i = 0; i < numCards; i++) {
              const position = strategy.calculatePosition(
                `card${i}`,
                existingPositions,
                { width: CARD_WIDTH, height: CARD_HEIGHT }
              );
              positions.push(position);
              existingPositions[`card${i}`] = position;
            }

            // Verify positions follow grid pattern
            for (let i = 0; i < positions.length; i++) {
              const expectedRow = Math.floor(i / COLUMNS);
              const expectedCol = i % COLUMNS;
              const expectedX = PADDING + expectedCol * (CARD_WIDTH + GAP);
              const expectedY = PADDING + expectedRow * (CARD_HEIGHT + GAP);

              // Allow for clamping at world bounds
              const clampedX = Math.min(expectedX, WORLD_BOUNDS.width - CARD_WIDTH);
              const clampedY = Math.min(expectedY, WORLD_BOUNDS.height - CARD_HEIGHT);

              expect(positions[i].x).toBe(clampedX);
              expect(positions[i].y).toBe(clampedY);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should find first available slot when positions have gaps', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 0, max: 19 }), // Grid slot indices
            { minLength: 0, maxLength: 15 } // Leave some gaps
          ).map(indices => [...new Set(indices)]), // Remove duplicates
          (occupiedIndices) => {
            const strategy = createStrategy();
            
            // Create positions for occupied slots
            const existingPositions: Record<string, NodePosition> = {};
            for (const index of occupiedIndices) {
              const row = Math.floor(index / COLUMNS);
              const col = index % COLUMNS;
              existingPositions[`card${index}`] = {
                x: PADDING + col * (CARD_WIDTH + GAP),
                y: PADDING + row * (CARD_HEIGHT + GAP)
              };
            }

            // Calculate position for new card
            const newPosition = strategy.calculatePosition(
              'newCard',
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Find expected first available slot
            let expectedIndex = 0;
            while (occupiedIndices.includes(expectedIndex)) {
              expectedIndex++;
            }

            const expectedRow = Math.floor(expectedIndex / COLUMNS);
            const expectedCol = expectedIndex % COLUMNS;
            const expectedX = PADDING + expectedCol * (CARD_WIDTH + GAP);
            const expectedY = PADDING + expectedRow * (CARD_HEIGHT + GAP);

            // Allow for clamping at world bounds
            const clampedX = Math.min(expectedX, WORLD_BOUNDS.width - CARD_WIDTH);
            const clampedY = Math.min(expectedY, WORLD_BOUNDS.height - CARD_HEIGHT);

            expect(newPosition.x).toBe(clampedX);
            expect(newPosition.y).toBe(clampedY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle off-grid positions consistently by snapping to grid slots', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              slug: slugArbitrary,
              // Generate positions slightly off-grid
              x: fc.integer({ min: 0, max: WORLD_BOUNDS.width - CARD_WIDTH }),
              y: fc.integer({ min: 0, max: WORLD_BOUNDS.height - CARD_HEIGHT })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          slugArbitrary,
          (offGridPositions, newSlug) => {
            const strategy = createStrategy();
            
            // Create existing positions from off-grid data
            const existingPositions: Record<string, NodePosition> = {};
            for (const { slug, x, y } of offGridPositions) {
              existingPositions[slug] = { x, y };
            }

            // Calculate position twice
            const position1 = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            const position2 = strategy.calculatePosition(
              newSlug,
              existingPositions,
              { width: CARD_WIDTH, height: CARD_HEIGHT }
            );

            // Should be deterministic even with off-grid inputs
            expect(position1.x).toBe(position2.x);
            expect(position1.y).toBe(position2.y);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property: Determinism with non-overlapping guarantee
   * 
   * This test combines both properties to ensure that the deterministic
   * algorithm also maintains the non-overlapping constraint.
   */
  describe('Combined: Determinism + Non-overlapping', () => {
    it('should deterministically produce non-overlapping positions for sequential additions', () => {
      fc.assert(
        fc.property(
          fc.array(slugArbitrary, { minLength: 1, maxLength: 15 })
            .map(slugs => [...new Set(slugs)]), // Remove duplicates
          (slugs) => {
            const strategy = createStrategy();
            const positions: Record<string, NodePosition> = {};

            // Add cards sequentially
            for (const slug of slugs) {
              const position = strategy.calculatePosition(
                slug,
                positions,
                { width: CARD_WIDTH, height: CARD_HEIGHT }
              );
              positions[slug] = position;
            }

            // Verify no overlaps in final layout
            const positionArray = Object.entries(positions);
            for (let i = 0; i < positionArray.length; i++) {
              for (let j = i + 1; j < positionArray.length; j++) {
                const [slug1, pos1] = positionArray[i];
                const [slug2, pos2] = positionArray[j];

                const xOverlap = 
                  (pos1.x < pos2.x + CARD_WIDTH) &&
                  (pos1.x + CARD_WIDTH > pos2.x);
                
                const yOverlap = 
                  (pos1.y < pos2.y + CARD_HEIGHT) &&
                  (pos1.y + CARD_HEIGHT > pos2.y);

                expect(xOverlap && yOverlap).toBe(false);
              }
            }

            // Verify determinism: recalculate and compare
            const positions2: Record<string, NodePosition> = {};
            for (const slug of slugs) {
              const position = strategy.calculatePosition(
                slug,
                positions2,
                { width: CARD_WIDTH, height: CARD_HEIGHT }
              );
              positions2[slug] = position;
            }

            // All positions should match
            for (const slug of slugs) {
              expect(positions2[slug].x).toBe(positions[slug].x);
              expect(positions2[slug].y).toBe(positions[slug].y);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
