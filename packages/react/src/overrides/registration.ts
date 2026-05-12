import { overrideRegistry } from './registry';
import type { OverrideDefinition } from './types';

/**
 * Registers injected overrides from window.__UIGEN_OVERRIDES__.
 * 
 * This function is called during SPA initialization to load and register
 * override definitions that were injected by the CLI. The CLI discovers
 * override files in the src/ directory, transpiles them using esbuild,
 * and injects them into the HTML via window.__UIGEN_OVERRIDES__.
 * 
 * The injected code is an IIFE (Immediately Invoked Function Expression)
 * that exports override definitions. This function executes the code and
 * registers each override in the overrideRegistry.
 * 
 * Error Handling:
 * - All errors are non-fatal and logged to console
 * - If window.__UIGEN_OVERRIDES__ is missing, silently returns
 * - If code execution fails, logs error and continues
 * - If individual registration fails, logs error and continues with others
 * - Never blocks app rendering due to override errors
 * 
 * @example
 * ```typescript
 * // In main.tsx:
 * import { registerInjectedOverrides } from './overrides';
 * 
 * // Call before rendering the app
 * registerInjectedOverrides();
 * 
 * // Then render
 * ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
 * ```
 */
export function registerInjectedOverrides(): void {
  // Check if running in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Check if overrides were injected
  const injected = window.__UIGEN_OVERRIDES__;
  
  if (!injected || !injected.code) {
    // No overrides injected, nothing to do
    return;
  }

  // Empty code means no overrides to register
  if (injected.code.trim() === '') {
    return;
  }

  try {
    // The injected code should be structured by the CLI to return an array
    // of OverrideDefinition objects. The expected format is:
    //
    // (function() {
    //   // ... transpiled override code ...
    //   return [override1, override2, ...];
    // })()
    //
    // We execute this code using the Function constructor which is safer
    // than eval and provides better error handling.
    
    // Execute the code and get the result
    // The code should be a complete expression that returns an array
    let overrides: any;
    
    try {
      // Use Function constructor to execute the code
      // This is safer than eval as it doesn't have access to local scope
      // eslint-disable-next-line no-new-func
      const executeCode = new Function(`return (${injected.code})`);
      overrides = executeCode();
    } catch (executeError) {
      // If the code is not a valid expression, try executing it as statements
      // and look for a return value or global variable
      console.warn('[UIGen] Failed to execute override code as expression, trying alternative approach');
      
      // Try executing as statements and checking for a global variable
      // eslint-disable-next-line no-new-func
      const executeStatements = new Function(injected.code + '; return window.__UIGEN_OVERRIDE_EXPORTS__;');
      overrides = executeStatements();
    }
    
    // Validate the result
    if (!Array.isArray(overrides)) {
      console.error('[UIGen] Invalid override format: expected array, got', typeof overrides);
      return;
    }
    
    if (overrides.length === 0) {
      console.log('[UIGen] No overrides found in injected code');
      return;
    }
    
    // Register each override
    let successCount = 0;
    let failCount = 0;
    
    for (const override of overrides) {
      try {
        if (isValidOverride(override)) {
          overrideRegistry.register(override);
          successCount++;
        } else {
          console.warn('[UIGen] Skipping invalid override (missing targetId or override mode):', override);
          failCount++;
        }
      } catch (error) {
        const targetId = override?.targetId || 'unknown';
        console.error(
          `[UIGen] Failed to register override for ${targetId}:`,
          error
        );
        failCount++;
      }
    }
    
    // Log summary
    if (successCount > 0) {
      console.log(`[UIGen] Registered ${successCount} override(s)` + 
        (failCount > 0 ? ` (${failCount} failed)` : ''));
    } else {
      console.warn('[UIGen] No overrides were successfully registered');
    }
    
  } catch (error) {
    console.error('[UIGen] Failed to load overrides:', error);
    // Log additional context in development mode
    if (injected.mode === 'development') {
      console.error('[UIGen] Injected code preview:', injected.code.substring(0, 200) + '...');
    }
  }
}

/**
 * Validates that an object is a valid OverrideDefinition.
 * 
 * @param obj - Object to validate
 * @returns true if valid, false otherwise
 */
function isValidOverride(obj: any): obj is OverrideDefinition {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  // Must have targetId
  if (!obj.targetId || typeof obj.targetId !== 'string') {
    return false;
  }
  
  // Must have at least one override mode
  if (!obj.component && !obj.render && !obj.useHooks) {
    return false;
  }
  
  return true;
}
