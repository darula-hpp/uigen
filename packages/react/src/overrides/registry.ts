import type { OverrideDefinition } from './types';

/**
 * Singleton registry that stores and retrieves override definitions by target ID.
 * Uses a Map for O(1) lookup performance.
 */
export class OverrideRegistry {
  private map: Map<string, OverrideDefinition> = new Map();

  /**
   * Register an override definition.
   * Validates targetId and mode fields, logs warnings for invalid definitions.
   * Replaces existing override if targetId already registered.
   */
  register(def: OverrideDefinition): void {
    // Validate targetId is non-empty
    if (!def.targetId || def.targetId.trim() === '') {
      console.warn(
        '[UIGen Override] Override registered with empty targetId - this override will never match'
      );
      return;
    }

    // Validate at least one mode is defined
    if (!def.component && !def.render && !def.useHooks) {
      console.warn(
        `[UIGen Override] Override "${def.targetId}" has no component, render, or useHooks field - this override will have no effect`
      );
      return;
    }

    // Warn if replacing existing override
    if (this.map.has(def.targetId)) {
      console.warn(
        `[UIGen Override] Replacing existing override for "${def.targetId}"`
      );
    }

    this.map.set(def.targetId, def);
  }

  /**
   * Retrieve an override definition by uigenId.
   * Returns undefined if no override registered for the given ID.
   */
  get(uigenId: string): OverrideDefinition | undefined {
    return this.map.get(uigenId);
  }

  /**
   * Check if an override exists for the given uigenId.
   */
  has(uigenId: string): boolean {
    return this.map.has(uigenId);
  }

  /**
   * Remove all registered overrides.
   * Useful for testing and cleanup.
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get all registered target IDs.
   * Useful for debugging and reconciliation warnings.
   */
  getAllTargetIds(): string[] {
    return Array.from(this.map.keys());
  }
}

/**
 * Module-level singleton instance.
 * Overrides must be registered before React renders.
 */
export const overrideRegistry = new OverrideRegistry();
