/**
 * Position Persistence Adapter Interface
 * 
 * Defines the contract for reading and writing node positions to storage.
 * This interface enables different storage backends (config file, local storage, etc.)
 * while keeping the PositionManager implementation agnostic to the storage mechanism.
 * 
 * @see ConfigFilePersistenceAdapter for the config file implementation
 */

import type { NodePosition } from '@uigen-dev/core';

/**
 * Interface for persisting canvas node positions to storage
 * 
 * Implementations should handle:
 * - Loading positions from storage (returning empty object if none exist)
 * - Saving positions to storage (with debouncing to avoid excessive writes)
 * - Graceful error handling (logging warnings, not throwing)
 * - Preserving other data in storage when saving positions
 */
export interface PositionPersistenceAdapter {
  /**
   * Load all saved node positions from storage
   * 
   * @returns Promise resolving to a map of resource slugs to positions
   *          Returns empty object if no positions are saved or on error
   * 
   * @example
   * const positions = await adapter.load();
   * // { "users": { x: 48, y: 48 }, "orders": { x: 264, y: 48 } }
   */
  load(): Promise<Record<string, NodePosition>>;

  /**
   * Save node positions to storage
   * 
   * Implementations should debounce this method to avoid excessive writes
   * during drag operations. Recommended debounce time is 500ms.
   * 
   * @param positions - Map of resource slugs to their positions
   * @returns Promise that resolves when save is complete
   * @throws Error if save fails (caller should handle gracefully)
   * 
   * @example
   * await adapter.save({
   *   "users": { x: 48, y: 48 },
   *   "orders": { x: 264, y: 48 }
   * });
   */
  save(positions: Record<string, NodePosition>): Promise<void>;

  /**
   * Save viewport pan offset (optional)
   * 
   * Stores the current pan position of the canvas viewport.
   * This allows restoring the user's view when they return to the canvas.
   * 
   * @param pan - Viewport pan offset with x and y coordinates
   * @returns Promise that resolves when save is complete
   * 
   * @example
   * await adapter.savePan?.({ x: -100, y: -50 });
   */
  savePan?(pan: { x: number; y: number }): Promise<void>;

  /**
   * Load viewport pan offset (optional)
   * 
   * Retrieves the saved pan position of the canvas viewport.
   * 
   * @returns Promise resolving to pan offset, or null if none saved
   * 
   * @example
   * const pan = await adapter.loadPan?.();
   * // { x: -100, y: -50 } or null
   */
  loadPan?(): Promise<{ x: number; y: number } | null>;
}
