/**
 * Position Manager for Canvas Node Positioning
 * 
 * This module provides centralized business logic for managing node positions
 * on the GraphCanvas. It encapsulates position storage, retrieval, validation,
 * and layout calculation, delegating to a LayoutStrategy for position algorithms
 * and a PersistenceAdapter for storage operations.
 * 
 * The PositionManager ensures:
 * - Positions are validated and clamped to world bounds
 * - New resources get non-overlapping default positions
 * - Orphaned positions (for deleted resources) are cleaned up
 * - All position operations are testable without file I/O or React
 */

import type { NodePosition } from '@uigen-dev/core';
import type { LayoutStrategy } from './layout-strategy';
import type { PositionPersistenceAdapter } from './position-persistence-adapter';

/**
 * Manages node positions with persistence and layout calculation
 * 
 * This class provides the core business logic for position management,
 * coordinating between the persistence layer (adapter) and layout
 * calculation (strategy). It handles validation, cleanup, and
 * initialization of positions.
 * 
 * @example
 * ```typescript
 * const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig);
 * const strategy = new GridLayoutStrategy(160, 80, 56, 48, 4, { width: 8000, height: 8000 });
 * const manager = new PositionManager(adapter, strategy, { width: 8000, height: 8000 });
 * 
 * // Initialize positions for resources
 * const positions = await manager.initializePositions(['users', 'orders', 'products']);
 * 
 * // Update a position
 * await manager.setPosition('users', { x: 100, y: 200 });
 * ```
 */
export class PositionManager {
  /**
   * Create a new PositionManager
   * 
   * @param adapter - Persistence adapter for reading/writing positions to storage
   * @param layoutStrategy - Strategy for calculating default positions for new resources
   * @param worldBounds - Maximum world dimensions (width and height in pixels)
   */
  constructor(
    private adapter: PositionPersistenceAdapter,
    private layoutStrategy: LayoutStrategy,
    private worldBounds: { width: number; height: number }
  ) {}

  /**
   * Get position for a resource slug
   * 
   * Returns the saved position if available, otherwise calculates a default
   * position using the layout strategy. This method ensures every resource
   * has a valid position.
   * 
   * @param slug - Unique identifier for the resource (e.g., 'users', 'orders')
   * @param allSlugs - Array of all current resource slugs (used for calculating defaults)
   * @returns Promise resolving to the position for the resource
   * 
   * @example
   * ```typescript
   * const position = await manager.getPosition('users', ['users', 'orders']);
   * // Returns: { x: 48, y: 48 } (saved or calculated)
   * ```
   */
  async getPosition(slug: string, allSlugs: string[]): Promise<NodePosition> {
    const savedPositions = await this.adapter.load();
    
    // If position exists, validate and return it
    if (savedPositions[slug]) {
      return this.validatePosition(savedPositions[slug]);
    }
    
    // Calculate default position for new resource
    return this.calculateDefaultPosition(slug, savedPositions);
  }

  /**
   * Set position for a resource slug
   * 
   * Validates the position (clamps to world bounds) and saves it via the
   * persistence adapter. The adapter handles debouncing to avoid excessive
   * writes during drag operations.
   * 
   * @param slug - Unique identifier for the resource
   * @param position - New position coordinates
   * @returns Promise that resolves when the position is saved
   * 
   * @example
   * ```typescript
   * await manager.setPosition('users', { x: 100, y: 200 });
   * ```
   */
  async setPosition(slug: string, position: NodePosition): Promise<void> {
    // Validate position before saving
    const validatedPosition = this.validatePosition(position);
    
    // Load current positions
    const positions = await this.adapter.load();
    
    // Update the position for this slug
    positions[slug] = validatedPosition;
    
    // Save all positions (adapter handles debouncing)
    await this.adapter.save(positions);
  }

  /**
   * Get all saved positions
   * 
   * Loads all positions from storage via the persistence adapter.
   * Returns an empty object if no positions are saved.
   * 
   * @returns Promise resolving to a map of resource slugs to positions
   * 
   * @example
   * ```typescript
   * const positions = await manager.getAllPositions();
   * // Returns: { "users": { x: 48, y: 48 }, "orders": { x: 264, y: 48 } }
   * ```
   */
  async getAllPositions(): Promise<Record<string, NodePosition>> {
    return await this.adapter.load();
  }

  /**
   * Calculate default position for a new resource
   * 
   * Uses the layout strategy to calculate a position that doesn't overlap
   * with existing resources. The strategy ensures consistent spacing and
   * respects world bounds.
   * 
   * @param slug - Unique identifier for the resource
   * @param existingPositions - Map of existing resource slugs to positions
   * @returns Calculated position for the new resource
   * 
   * @example
   * ```typescript
   * const existingPositions = {
   *   users: { x: 48, y: 48 },
   *   orders: { x: 264, y: 48 }
   * };
   * const position = manager.calculateDefaultPosition('products', existingPositions);
   * // Returns: { x: 480, y: 48 } (next available grid slot)
   * ```
   */
  calculateDefaultPosition(
    slug: string,
    existingPositions: Record<string, NodePosition>
  ): NodePosition {
    // Delegate to layout strategy for position calculation
    // Using standard card dimensions (160x80)
    return this.layoutStrategy.calculatePosition(
      slug,
      existingPositions,
      { width: 160, height: 80 }
    );
  }

  /**
   * Validate and clamp position to world bounds
   * 
   * Ensures position coordinates are valid numbers within the world bounds.
   * Non-numeric coordinates are replaced with 0. Out-of-bounds coordinates
   * are clamped to the valid range.
   * 
   * @param position - Position to validate
   * @returns Validated position with coordinates clamped to world bounds
   * 
   * @example
   * ```typescript
   * const validated = manager.validatePosition({ x: -100, y: 9000 });
   * // Returns: { x: 0, y: 8000 } (clamped to bounds)
   * ```
   */
  validatePosition(position: NodePosition): NodePosition {
    // Handle non-numeric coordinates
    let x = typeof position.x === 'number' && !isNaN(position.x) ? position.x : 0;
    let y = typeof position.y === 'number' && !isNaN(position.y) ? position.y : 0;
    
    // Clamp to world bounds
    x = Math.max(0, Math.min(x, this.worldBounds.width));
    y = Math.max(0, Math.min(y, this.worldBounds.height));
    
    // Log warning if position was invalid
    if (x !== position.x || y !== position.y) {
      console.warn(
        `Position clamped to world bounds: original (${position.x}, ${position.y}), ` +
        `clamped (${x}, ${y})`
      );
    }
    
    return { x, y };
  }

  /**
   * Clean up positions for resources that no longer exist
   * 
   * Removes positions for resource slugs that are not in the current
   * resource list. This prevents orphaned positions from accumulating
   * in the config file.
   * 
   * @param currentSlugs - Array of current resource slugs
   * @returns Promise that resolves when cleanup is complete
   * 
   * @example
   * ```typescript
   * await manager.cleanupOrphanedPositions(['users', 'orders']);
   * // Removes positions for any resources not in the list
   * ```
   */
  async cleanupOrphanedPositions(currentSlugs: string[]): Promise<void> {
    const positions = await this.adapter.load();
    const currentSlugSet = new Set(currentSlugs);
    
    // Filter out positions for resources that no longer exist
    const cleanedPositions: Record<string, NodePosition> = {};
    let hasOrphans = false;
    
    for (const [slug, position] of Object.entries(positions)) {
      if (currentSlugSet.has(slug)) {
        cleanedPositions[slug] = position;
      } else {
        hasOrphans = true;
        console.warn(`Removing orphaned position for resource: ${slug}`);
      }
    }
    
    // Only save if we found orphans to clean up
    if (hasOrphans) {
      await this.adapter.save(cleanedPositions);
    }
  }

  /**
   * Initialize positions for a list of resources
   * 
   * Loads saved positions and calculates defaults for new resources.
   * This method ensures every resource has a valid position, either
   * from saved data or calculated using the layout strategy.
   * 
   * @param slugs - Array of resource slugs to initialize positions for
   * @returns Promise resolving to a Map of resource slugs to positions
   * 
   * @example
   * ```typescript
   * const positions = await manager.initializePositions(['users', 'orders', 'products']);
   * // Returns: Map with positions for all three resources
   * ```
   */
  async initializePositions(slugs: string[]): Promise<Map<string, NodePosition>> {
    // Load saved positions
    const savedPositions = await this.adapter.load();
    
    // Initialize result map
    const positions = new Map<string, NodePosition>();
    
    // Build map of existing positions for layout calculation
    const existingPositions: Record<string, NodePosition> = {};
    
    // First pass: add saved positions (validated)
    for (const slug of slugs) {
      if (savedPositions[slug]) {
        const validatedPosition = this.validatePosition(savedPositions[slug]);
        positions.set(slug, validatedPosition);
        existingPositions[slug] = validatedPosition;
      }
    }
    
    // Second pass: calculate defaults for new resources
    for (const slug of slugs) {
      if (!positions.has(slug)) {
        const defaultPosition = this.calculateDefaultPosition(slug, existingPositions);
        positions.set(slug, defaultPosition);
        existingPositions[slug] = defaultPosition;
      }
    }
    
    return positions;
  }

  /**
   * Reset all positions to default grid layout
   * 
   * Clears all saved positions from storage and recalculates default
   * positions for all provided resources using the layout strategy.
   * This effectively restores the canvas to its initial grid layout.
   * 
   * @param slugs - Array of resource slugs to reset positions for
   * @returns Promise resolving to a Map of resource slugs to default positions
   * 
   * @example
   * ```typescript
   * const positions = await manager.resetToDefault(['users', 'orders', 'products']);
   * // Returns: Map with default grid positions for all resources
   * ```
   */
  async resetToDefault(slugs: string[]): Promise<Map<string, NodePosition>> {
    // Clear all saved positions by saving an empty object
    await this.adapter.save({});
    
    // Calculate default positions for all resources
    const positions = new Map<string, NodePosition>();
    const existingPositions: Record<string, NodePosition> = {};
    
    for (const slug of slugs) {
      const defaultPosition = this.calculateDefaultPosition(slug, existingPositions);
      positions.set(slug, defaultPosition);
      existingPositions[slug] = defaultPosition;
    }
    
    return positions;
  }
}
