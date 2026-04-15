import type { ReconcileResult } from './types';
import { overrideRegistry } from './registry';

/**
 * Determines which override mode applies to a given view.
 * 
 * Priority order: component > render > useHooks > none
 * 
 * @param uigenId - Stable identifier for the view (e.g., "users.list")
 * @returns ReconcileResult with mode and optional override artifacts
 */
export function reconcile(uigenId: string): ReconcileResult {
  const def = overrideRegistry.get(uigenId);

  // No override registered
  if (!def) {
    // Check for similar targetIds to help with typos
    const allTargetIds = overrideRegistry.getAllTargetIds();
    
    // Find similar matches (case-insensitive, partial matches, or contains)
    const similar = allTargetIds.find((id) => {
      const idLower = id.toLowerCase();
      const uigenIdLower = uigenId.toLowerCase();
      
      return (
        idLower === uigenIdLower || // Case-insensitive exact match
        idLower.includes(uigenIdLower) || // uigenId is substring of registered ID
        uigenIdLower.includes(idLower) // Registered ID is substring of uigenId
      );
    });

    if (similar && similar !== uigenId) {
      console.warn(
        `[UIGen Override] No override found for "${uigenId}". Did you mean "${similar}"?`
      );
    }

    return { mode: 'none' };
  }

  // Component mode (highest priority)
  if (def.component) {
    return {
      mode: 'component',
      overrideComponent: def.component,
    };
  }

  // Render mode (middle priority)
  if (def.render) {
    return {
      mode: 'render',
      renderFn: def.render,
    };
  }

  // Hooks mode (lowest priority)
  if (def.useHooks) {
    return {
      mode: 'hooks',
    };
  }

  // Fallback (should not reach here due to validation in register)
  return { mode: 'none' };
}
