import type { ReconcileResult } from './types';
import type { OverrideConfig } from '@uigen-dev/core';
import { overrideRegistry } from './registry';

/**
 * Determines which override mode applies to a given view.
 * 
 * Checks override enablement before applying registered overrides.
 * 
 * Priority order: component > render > useHooks > none
 * 
 * @param override - Override configuration from IR (optional)
 * @returns ReconcileResult with mode and optional override artifacts
 */
export function reconcile(override?: OverrideConfig): ReconcileResult {
  // No override configured
  if (!override) {
    return { mode: 'none' };
  }
  
  // Override is disabled
  if (override.enabled === false) {
    return { mode: 'none' };
  }
  
  // Look up override in registry using id
  const def = overrideRegistry.get(override.id);
  
  // No override registered (but annotation exists)
  if (!def) {
    // Check for similar targetIds to help with typos
    const allTargetIds = overrideRegistry.getAllTargetIds();
    
    const similar = allTargetIds.find((id) => {
      const idLower = id.toLowerCase();
      const overrideIdLower = override.id.toLowerCase();
      
      return (
        idLower === overrideIdLower ||
        idLower.includes(overrideIdLower) ||
        overrideIdLower.includes(idLower)
      );
    });

    if (similar && similar !== override.id) {
      console.warn(
        `[UIGen Override] No override found for "${override.id}". Did you mean "${similar}"?`
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
