/**
 * Layout Strategy for Canvas Position Calculation
 * 
 * This module defines the contract for position calculation algorithms
 * used to place resource cards on the GraphCanvas. Implementations
 * determine where new resources should appear to avoid overlapping
 * with existing cards.
 */

import type { NodePosition } from '@uigen-dev/core';

/**
 * Interface for position calculation algorithms
 * 
 * A LayoutStrategy calculates positions for new resources that don't
 * have saved positions. Implementations must ensure:
 * - Non-overlapping placement (considering card dimensions)
 * - Consistent spacing between cards
 * - Positions within world bounds (0-8000 for x and y)
 * 
 * @example
 * ```typescript
 * const strategy = new GridLayoutStrategy(160, 80, 56, 48, 4, { width: 8000, height: 8000 });
 * const position = strategy.calculatePosition('users', existingPositions, { width: 160, height: 80 });
 * ```
 */
export interface LayoutStrategy {
  /**
   * Calculate position for a new resource
   * 
   * This method determines where a new resource card should be placed
   * on the canvas. The implementation must avoid overlapping with
   * existing cards and maintain consistent spacing.
   * 
   * @param slug - Unique identifier for the resource (e.g., 'users', 'orders')
   * @param existingPositions - Map of resource slugs to their current positions
   * @param cardDimensions - Width and height of the card to be placed
   * @returns Position coordinates for the new card
   * 
   * @remarks
   * - The returned position must be within world bounds (0-8000)
   * - The position should not cause the card to overlap with existing cards
   * - Multiple calls with the same inputs should produce the same output (deterministic)
   * 
   * @example
   * ```typescript
   * const existingPositions = {
   *   users: { x: 48, y: 48 },
   *   orders: { x: 264, y: 48 }
   * };
   * const position = strategy.calculatePosition(
   *   'products',
   *   existingPositions,
   *   { width: 160, height: 80 }
   * );
   * // Returns: { x: 480, y: 48 } (next available grid slot)
   * ```
   */
  calculatePosition(
    slug: string,
    existingPositions: Record<string, NodePosition>,
    cardDimensions: { width: number; height: number }
  ): NodePosition;
}

/**
 * Grid-based layout strategy with consistent spacing
 * 
 * This implementation places cards in a grid pattern (left-to-right, top-to-bottom)
 * with consistent spacing between cards. It uses spatial hashing (Set-based occupancy map)
 * for O(1) overlap detection.
 * 
 * @example
 * ```typescript
 * const strategy = new GridLayoutStrategy(
 *   160,  // cardWidth
 *   80,   // cardHeight
 *   56,   // gap
 *   48,   // padding
 *   4,    // columns
 *   { width: 8000, height: 8000 }  // worldBounds
 * );
 * 
 * const position = strategy.calculatePosition(
 *   'users',
 *   {},
 *   { width: 160, height: 80 }
 * );
 * // Returns: { x: 48, y: 48 } (first grid slot)
 * ```
 */
export class GridLayoutStrategy implements LayoutStrategy {
  /**
   * Create a new GridLayoutStrategy
   * 
   * @param cardWidth - Width of each card in pixels
   * @param cardHeight - Height of each card in pixels
   * @param gap - Gap between cards in pixels
   * @param padding - Padding from canvas edges in pixels
   * @param columns - Number of columns in the grid
   * @param worldBounds - Maximum world dimensions (width and height)
   */
  constructor(
    private cardWidth: number,
    private cardHeight: number,
    private gap: number,
    private padding: number,
    private columns: number,
    private worldBounds: { width: number; height: number }
  ) {}

  /**
   * Calculate position for a new resource using grid layout
   * 
   * Algorithm:
   * 1. Build occupancy set from existing positions (spatial hashing)
   * 2. Find first available grid slot (left-to-right, top-to-bottom)
   * 3. Calculate world position from grid coordinates
   * 4. Clamp to world bounds
   * 
   * @param slug - Resource identifier (unused in grid layout, but required by interface)
   * @param existingPositions - Map of resource slugs to their current positions
   * @param cardDimensions - Width and height of the card to be placed
   * @returns Position coordinates for the new card
   */
  calculatePosition(
    slug: string,
    existingPositions: Record<string, NodePosition>,
    cardDimensions: { width: number; height: number }
  ): NodePosition {
    // Build occupancy set from existing positions using spatial hashing
    // This provides O(1) lookup for grid slot occupancy checks
    const occupied = new Set<string>();
    for (const pos of Object.values(existingPositions)) {
      const gridX = Math.floor((pos.x - this.padding) / (this.cardWidth + this.gap));
      const gridY = Math.floor((pos.y - this.padding) / (this.cardHeight + this.gap));
      occupied.add(`${gridX},${gridY}`);
    }

    // Find first available grid slot (left-to-right, top-to-bottom)
    let row = 0;
    let col = 0;
    while (occupied.has(`${col},${row}`)) {
      col++;
      if (col >= this.columns) {
        col = 0;
        row++;
      }
    }

    // Calculate world position from grid coordinates
    const x = this.padding + col * (this.cardWidth + this.gap);
    const y = this.padding + row * (this.cardHeight + this.gap);

    // Clamp to world bounds to ensure position is valid
    return {
      x: Math.min(x, this.worldBounds.width - this.cardWidth),
      y: Math.min(y, this.worldBounds.height - this.cardHeight)
    };
  }
}
