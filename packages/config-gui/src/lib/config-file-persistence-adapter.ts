/**
 * Config File Persistence Adapter
 * 
 * Implementation of PositionPersistenceAdapter that reads and writes node positions
 * to the config file (.uigen/config.yaml). This adapter handles:
 * - Loading positions from config.canvasLayout.positions
 * - Debounced saving to avoid excessive writes during drag operations
 * - Preserving all other config fields when saving positions
 * - Graceful error handling with console warnings
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2
 */

import type { ConfigFile, NodePosition } from '@uigen-dev/core';
import type { PositionPersistenceAdapter } from './position-persistence-adapter';
import { debounce } from './debounce';

/**
 * Persistence adapter for reading/writing positions to config file
 * 
 * This adapter uses debouncing to batch rapid position updates into a single
 * config write operation, preventing excessive I/O during drag operations.
 * 
 * @example
 * ```typescript
 * const adapter = new ConfigFilePersistenceAdapter(
 *   loadConfig,
 *   saveConfig,
 *   500 // debounce delay in ms
 * );
 * 
 * // Load positions
 * const positions = await adapter.load();
 * 
 * // Save positions (debounced)
 * await adapter.save({ "users": { x: 48, y: 48 } });
 * ```
 */
export class ConfigFilePersistenceAdapter implements PositionPersistenceAdapter {
  private debouncedSave: (positions: Record<string, NodePosition>) => void;

  /**
   * Create a new ConfigFilePersistenceAdapter
   * 
   * @param loadConfig - Function to load the current config file
   * @param saveConfig - Function to save the config file
   * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
   */
  constructor(
    private loadConfig: () => Promise<ConfigFile>,
    private saveConfig: (config: ConfigFile) => Promise<void>,
    debounceMs: number = 500
  ) {
    // Create debounced version of saveInternal
    // Wrap in try-catch to handle errors gracefully
    this.debouncedSave = debounce(
      (positions: Record<string, NodePosition>) => {
        this.saveInternal(positions).catch((error) => {
          // Error is already logged in saveInternal, just prevent unhandled rejection
        });
      },
      debounceMs
    );
  }

  /**
   * Load all saved node positions from config file
   * 
   * Returns empty object if:
   * - Config file doesn't have canvasLayout field
   * - Config file is missing or corrupted
   * - Load operation fails
   * 
   * @returns Promise resolving to map of resource slugs to positions
   */
  async load(): Promise<Record<string, NodePosition>> {
    try {
      const config = await this.loadConfig();
      return config.canvasLayout?.positions ?? {};
    } catch (error) {
      console.warn('Failed to load canvas positions:', error);
      return {};
    }
  }

  /**
   * Save node positions to config file (debounced)
   * 
   * This method is debounced to avoid excessive writes during drag operations.
   * Multiple rapid calls within the debounce window will be batched into a
   * single write operation.
   * 
   * @param positions - Map of resource slugs to their positions
   * @returns Promise that resolves when save is queued (not when write completes)
   */
  async save(positions: Record<string, NodePosition>): Promise<void> {
    // Debounced save - returns immediately, actual save happens after delay
    this.debouncedSave(positions);
  }

  /**
   * Internal save implementation (called by debounced wrapper)
   * 
   * Merges positions into config file while preserving all other fields:
   * - version
   * - enabled
   * - defaults
   * - annotations
   * - relationships
   * - canvasLayout.pan (if present)
   * 
   * @param positions - Map of resource slugs to their positions
   */
  private async saveInternal(positions: Record<string, NodePosition>): Promise<void> {
    try {
      const config = await this.loadConfig();
      
      // Merge positions into config, preserving all other fields
      const updated: ConfigFile = {
        ...config,
        canvasLayout: {
          ...config.canvasLayout,
          positions,
          // Preserve existing pan if present
          ...(config.canvasLayout?.pan && { pan: config.canvasLayout.pan })
        }
      };
      
      await this.saveConfig(updated);
    } catch (error) {
      console.error('Failed to save canvas positions:', error);
      throw error;
    }
  }

  /**
   * Save viewport pan offset
   * 
   * Stores the current pan position of the canvas viewport.
   * Preserves existing positions when saving pan.
   * 
   * @param pan - Viewport pan offset with x and y coordinates
   * @returns Promise that resolves when save is complete
   */
  async savePan(pan: { x: number; y: number }): Promise<void> {
    try {
      const config = await this.loadConfig();
      
      const updated: ConfigFile = {
        ...config,
        canvasLayout: {
          positions: config.canvasLayout?.positions ?? {},
          pan
        }
      };
      
      await this.saveConfig(updated);
    } catch (error) {
      console.error('Failed to save canvas pan:', error);
      throw error;
    }
  }

  /**
   * Load viewport pan offset
   * 
   * Retrieves the saved pan position of the canvas viewport.
   * 
   * @returns Promise resolving to pan offset, or null if none saved
   */
  async loadPan(): Promise<{ x: number; y: number } | null> {
    try {
      const config = await this.loadConfig();
      return config.canvasLayout?.pan ?? null;
    } catch (error) {
      console.warn('Failed to load canvas pan:', error);
      return null;
    }
  }
}
