import { describe, it, expect } from 'vitest';
import { GridLayoutStrategy } from '../layout-strategy.js';
import type { NodePosition } from '@uigen-dev/core';

/**
 * Unit tests for GridLayoutStrategy
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

describe('GridLayoutStrategy', () => {
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

  describe('first available slot calculation', () => {
    it('should place first card at top-left with padding', () => {
      const strategy = createStrategy();
      const position = strategy.calculatePosition(
        'users',
        {},
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      expect(position).toEqual({ x: 48, y: 48 });
    });

    it('should place second card in next column', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 }
      };

      const position = strategy.calculatePosition(
        'orders',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // x = padding + 1 * (cardWidth + gap) = 48 + 1 * (160 + 56) = 48 + 216 = 264
      expect(position).toEqual({ x: 264, y: 48 });
    });

    it('should place third card in next column', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      const position = strategy.calculatePosition(
        'products',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // x = padding + 2 * (cardWidth + gap) = 48 + 2 * 216 = 480
      expect(position).toEqual({ x: 480, y: 48 });
    });

    it('should place fourth card in last column of first row', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 }
      };

      const position = strategy.calculatePosition(
        'categories',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // x = padding + 3 * (cardWidth + gap) = 48 + 3 * 216 = 696
      expect(position).toEqual({ x: 696, y: 48 });
    });

    it('should wrap to next row after filling columns', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 },
        categories: { x: 696, y: 48 }
      };

      const position = strategy.calculatePosition(
        'reviews',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // x = padding (back to first column) = 48
      // y = padding + 1 * (cardHeight + gap) = 48 + 1 * (80 + 56) = 48 + 136 = 184
      expect(position).toEqual({ x: 48, y: 184 });
    });

    it('should find first available slot when there are gaps', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        // Gap at position (1, 0) - column 1, row 0
        products: { x: 480, y: 48 },
        categories: { x: 696, y: 48 }
      };

      const position = strategy.calculatePosition(
        'orders',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should fill the gap at column 1, row 0
      expect(position).toEqual({ x: 264, y: 48 });
    });
  });

  describe('non-overlapping placement', () => {
    it('should not overlap with existing cards', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      const position = strategy.calculatePosition(
        'products',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Verify no overlap with users card
      expect(position.x).toBeGreaterThanOrEqual(48 + CARD_WIDTH + GAP);
      
      // Verify no overlap with orders card
      expect(position.x).toBeGreaterThanOrEqual(264 + CARD_WIDTH + GAP);
    });

    it('should handle multiple rows without overlap', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        row1col1: { x: 48, y: 48 },
        row1col2: { x: 264, y: 48 },
        row1col3: { x: 480, y: 48 },
        row1col4: { x: 696, y: 48 },
        row2col1: { x: 48, y: 184 }
      };

      const position = strategy.calculatePosition(
        'row2col2',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should be in row 2, column 2
      expect(position).toEqual({ x: 264, y: 184 });
      
      // Verify vertical spacing from row 1
      expect(position.y).toBeGreaterThanOrEqual(48 + CARD_HEIGHT + GAP);
    });

    it('should maintain spacing between all cards', () => {
      const strategy = createStrategy();
      const positions: NodePosition[] = [];

      // Place 8 cards (2 rows)
      let existingPositions: Record<string, NodePosition> = {};
      for (let i = 0; i < 8; i++) {
        const position = strategy.calculatePosition(
          `card${i}`,
          existingPositions,
          { width: CARD_WIDTH, height: CARD_HEIGHT }
        );
        positions.push(position);
        existingPositions[`card${i}`] = position;
      }

      // Verify horizontal spacing in first row
      for (let i = 0; i < 3; i++) {
        const horizontalGap = positions[i + 1].x - positions[i].x;
        expect(horizontalGap).toBe(CARD_WIDTH + GAP);
      }

      // Verify vertical spacing between rows
      const verticalGap = positions[4].y - positions[0].y;
      expect(verticalGap).toBe(CARD_HEIGHT + GAP);
    });
  });

  describe('consistent spacing (56px gap, 48px padding)', () => {
    it('should apply 48px padding from top-left edge', () => {
      const strategy = createStrategy();
      const position = strategy.calculatePosition(
        'first',
        {},
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      expect(position.x).toBe(48);
      expect(position.y).toBe(48);
    });

    it('should maintain 56px gap between columns', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        col1: { x: 48, y: 48 }
      };

      const position = strategy.calculatePosition(
        'col2',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Gap = position.x - (existingPosition.x + cardWidth)
      const gap = position.x - (48 + CARD_WIDTH);
      expect(gap).toBe(56);
    });

    it('should maintain 56px gap between rows', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        row1col1: { x: 48, y: 48 },
        row1col2: { x: 264, y: 48 },
        row1col3: { x: 480, y: 48 },
        row1col4: { x: 696, y: 48 }
      };

      const position = strategy.calculatePosition(
        'row2col1',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Gap = position.y - (existingPosition.y + cardHeight)
      const gap = position.y - (48 + CARD_HEIGHT);
      expect(gap).toBe(56);
    });

    it('should use consistent spacing formula for all positions', () => {
      const strategy = createStrategy();
      let existingPositions: Record<string, NodePosition> = {};

      // Place cards in a 4x3 grid
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const position = strategy.calculatePosition(
            `r${row}c${col}`,
            existingPositions,
            { width: CARD_WIDTH, height: CARD_HEIGHT }
          );

          // Verify position matches formula: padding + index * (dimension + gap)
          const expectedX = PADDING + col * (CARD_WIDTH + GAP);
          const expectedY = PADDING + row * (CARD_HEIGHT + GAP);

          expect(position.x).toBe(expectedX);
          expect(position.y).toBe(expectedY);

          existingPositions[`r${row}c${col}`] = position;
        }
      }
    });
  });

  describe('world bounds clamping', () => {
    it('should clamp x coordinate to world bounds', () => {
      const strategy = createStrategy();
      
      // Create positions that would push next card beyond world bounds
      const existingPositions: Record<string, NodePosition> = {};
      const maxCol = Math.floor((WORLD_BOUNDS.width - PADDING) / (CARD_WIDTH + GAP));
      
      // Fill many rows to get a position near the edge
      for (let i = 0; i < maxCol * 50; i++) {
        const row = Math.floor(i / COLUMNS);
        const col = i % COLUMNS;
        existingPositions[`card${i}`] = {
          x: PADDING + col * (CARD_WIDTH + GAP),
          y: PADDING + row * (CARD_HEIGHT + GAP)
        };
      }

      const position = strategy.calculatePosition(
        'edge-card',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Position should not exceed world bounds minus card width
      expect(position.x).toBeLessThanOrEqual(WORLD_BOUNDS.width - CARD_WIDTH);
    });

    it('should clamp y coordinate to world bounds', () => {
      const strategy = createStrategy();
      
      // Create positions that would push next card beyond world bounds vertically
      const existingPositions: Record<string, NodePosition> = {};
      const maxRows = Math.floor((WORLD_BOUNDS.height - PADDING) / (CARD_HEIGHT + GAP));
      
      // Fill grid up to near the bottom
      for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          existingPositions[`r${row}c${col}`] = {
            x: PADDING + col * (CARD_WIDTH + GAP),
            y: PADDING + row * (CARD_HEIGHT + GAP)
          };
        }
      }

      const position = strategy.calculatePosition(
        'bottom-card',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Position should not exceed world bounds minus card height
      expect(position.y).toBeLessThanOrEqual(WORLD_BOUNDS.height - CARD_HEIGHT);
    });

    it('should handle edge case at exact world boundary', () => {
      const strategy = createStrategy();
      
      // Position that would be exactly at the boundary
      const existingPositions: Record<string, NodePosition> = {
        nearEdge: { x: WORLD_BOUNDS.width - CARD_WIDTH - 100, y: 48 }
      };

      const position = strategy.calculatePosition(
        'at-edge',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should be clamped to ensure card fits within bounds
      expect(position.x + CARD_WIDTH).toBeLessThanOrEqual(WORLD_BOUNDS.width);
      expect(position.y + CARD_HEIGHT).toBeLessThanOrEqual(WORLD_BOUNDS.height);
    });

    it('should ensure all positions are within valid world coordinates', () => {
      const strategy = createStrategy();
      let existingPositions: Record<string, NodePosition> = {};

      // Place many cards and verify all are within bounds
      for (let i = 0; i < 20; i++) {
        const position = strategy.calculatePosition(
          `card${i}`,
          existingPositions,
          { width: CARD_WIDTH, height: CARD_HEIGHT }
        );

        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(WORLD_BOUNDS.width - CARD_WIDTH);
        expect(position.y).toBeLessThanOrEqual(WORLD_BOUNDS.height - CARD_HEIGHT);

        existingPositions[`card${i}`] = position;
      }
    });
  });

  describe('full viewport handling (next row placement)', () => {
    it('should move to next row when current row is full', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        col1: { x: 48, y: 48 },
        col2: { x: 264, y: 48 },
        col3: { x: 480, y: 48 },
        col4: { x: 696, y: 48 }
      };

      const position = strategy.calculatePosition(
        'next-row',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should be at start of next row
      expect(position.x).toBe(48); // Back to first column
      expect(position.y).toBe(184); // Next row
    });

    it('should handle multiple full rows', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {};

      // Fill 2 complete rows (8 cards)
      for (let i = 0; i < 8; i++) {
        const row = Math.floor(i / COLUMNS);
        const col = i % COLUMNS;
        existingPositions[`card${i}`] = {
          x: PADDING + col * (CARD_WIDTH + GAP),
          y: PADDING + row * (CARD_HEIGHT + GAP)
        };
      }

      const position = strategy.calculatePosition(
        'third-row',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should be at start of third row
      expect(position.x).toBe(48);
      expect(position.y).toBe(320); // 48 + 2 * (80 + 56) = 48 + 272 = 320
    });

    it('should correctly calculate row transitions', () => {
      const strategy = createStrategy();
      let existingPositions: Record<string, NodePosition> = {};

      // Place cards and verify row transitions
      for (let i = 0; i < 12; i++) {
        const position = strategy.calculatePosition(
          `card${i}`,
          existingPositions,
          { width: CARD_WIDTH, height: CARD_HEIGHT }
        );

        const expectedRow = Math.floor(i / COLUMNS);
        const expectedCol = i % COLUMNS;
        const expectedX = PADDING + expectedCol * (CARD_WIDTH + GAP);
        const expectedY = PADDING + expectedRow * (CARD_HEIGHT + GAP);

        expect(position.x).toBe(expectedX);
        expect(position.y).toBe(expectedY);

        existingPositions[`card${i}`] = position;
      }
    });

    it('should handle viewport with exact column count', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {};

      // Fill exactly one row
      for (let col = 0; col < COLUMNS; col++) {
        existingPositions[`col${col}`] = {
          x: PADDING + col * (CARD_WIDTH + GAP),
          y: PADDING
        };
      }

      const position = strategy.calculatePosition(
        'overflow',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should wrap to next row at first column
      expect(position.x).toBe(PADDING);
      expect(position.y).toBe(PADDING + CARD_HEIGHT + GAP);
    });

    it('should handle sparse placement across multiple rows', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        // Row 0: columns 0, 2
        r0c0: { x: 48, y: 48 },
        r0c2: { x: 480, y: 48 },
        // Row 1: column 1
        r1c1: { x: 264, y: 184 },
        // Row 2: columns 0, 3
        r2c0: { x: 48, y: 320 },
        r2c3: { x: 696, y: 320 }
      };

      const position = strategy.calculatePosition(
        'fill-gap',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should find first available slot (row 0, column 1)
      expect(position).toEqual({ x: 264, y: 48 });
    });
  });

  describe('deterministic behavior', () => {
    it('should produce same result for same inputs', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      const position1 = strategy.calculatePosition(
        'products',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      const position2 = strategy.calculatePosition(
        'products',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      expect(position1).toEqual(position2);
    });

    it('should be independent of slug parameter', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 }
      };

      const position1 = strategy.calculatePosition(
        'orders',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      const position2 = strategy.calculatePosition(
        'products',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Same existing positions should yield same result regardless of slug
      expect(position1).toEqual(position2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty existing positions', () => {
      const strategy = createStrategy();
      const position = strategy.calculatePosition(
        'first',
        {},
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      expect(position).toEqual({ x: 48, y: 48 });
    });

    it('should handle single existing position', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        only: { x: 48, y: 48 }
      };

      const position = strategy.calculatePosition(
        'second',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      expect(position).toEqual({ x: 264, y: 48 });
    });

    it('should handle positions not on grid (snaps to nearest grid slot)', () => {
      const strategy = createStrategy();
      const existingPositions: Record<string, NodePosition> = {
        // Slightly off-grid position
        offGrid: { x: 50, y: 50 }
      };

      const position = strategy.calculatePosition(
        'next',
        existingPositions,
        { width: CARD_WIDTH, height: CARD_HEIGHT }
      );

      // Should still calculate based on grid, treating off-grid as occupying grid slot (0,0)
      // Next available should be (1,0)
      expect(position).toEqual({ x: 264, y: 48 });
    });
  });
});
