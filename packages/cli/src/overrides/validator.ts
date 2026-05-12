import type { DiscoveredOverride } from './discovery.js';

/**
 * Options for validating override files
 */
export interface ValidationOptions {
  /**
   * Transpiled code containing override definitions
   */
  code: string;
  /**
   * Array of discovered override files
   */
  files: DiscoveredOverride[];
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Validation error for an override
 */
export interface ValidationError {
  /**
   * File path where the error occurred
   */
  filePath: string;
  /**
   * Error message
   */
  message: string;
  /**
   * Target ID (if available)
   */
  targetId?: string;
}

/**
 * Validation warning for an override
 */
export interface ValidationWarning {
  /**
   * File path where the warning occurred
   */
  filePath: string;
  /**
   * Warning message
   */
  message: string;
  /**
   * Target ID (if available)
   */
  targetId?: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /**
   * Whether all overrides are valid
   */
  valid: boolean;
  /**
   * Array of validation errors
   */
  errors: ValidationError[];
  /**
   * Array of validation warnings
   */
  warnings: ValidationWarning[];
  /**
   * Map of duplicate targetIds to file paths
   */
  duplicates: Map<string, string[]>;
}

/**
 * Validates override definitions to ensure they meet requirements.
 * 
 * Validation rules:
 * 1. Each override must have a `targetId` property
 * 2. Each override must have at least one of: `component`, `render`, `useHooks`
 * 3. Warns on duplicate `targetId` values (last one wins)
 * 
 * Validation errors are non-fatal - the CLI should continue processing
 * valid overrides even if some fail validation.
 * 
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and duplicate detection
 * 
 * @example
 * ```typescript
 * const result = validateOverrides({
 *   code: transpiledCode,
 *   files: discoveredFiles,
 *   verbose: true
 * });
 * 
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * 
 * if (result.duplicates.size > 0) {
 *   console.warn('Duplicate targetIds found:', result.duplicates);
 * }
 * ```
 */
export function validateOverrides(
  options: ValidationOptions
): ValidationResult {
  const { code, files, verbose = false } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const duplicates = new Map<string, string[]>();
  const seenTargetIds = new Map<string, string>();

  // If no code to validate, return valid result
  if (!code || code.trim() === '') {
    if (verbose) {
      console.log('[UIGen Overrides] No code to validate');
    }
    return {
      valid: true,
      errors: [],
      warnings: [],
      duplicates,
    };
  }

  if (verbose) {
    console.log(`[UIGen Overrides] Validating ${files.length} override file(s)...`);
  }

  // Execute the code to extract override definitions
  // The transpiled code should be IIFE format that returns override definitions
  let overrideDefinitions: any[] = [];
  
  try {
    // Create a mock window object for Node.js validation
    // The transpiled code expects window.React to be available
    const mockWindow = {
      React: {
        useState: () => [null, () => {}],
        useEffect: () => {},
        useRef: () => ({ current: null }),
        createElement: () => null,
        Fragment: null,
      },
    };
    
    // Create a safe execution context with mock window
    // The transpiled code is IIFE format, so we need to evaluate it
    const wrappedCode = `
      (function() {
        const window = ${JSON.stringify(mockWindow)};
        return ${code};
      })()
    `;
    
    const result = eval(wrappedCode);
    
    // The result could be:
    // 1. A single override definition object
    // 2. An array of override definitions
    // 3. Undefined (if the code doesn't export anything)
    
    if (result === undefined || result === null) {
      // No exports found - this is an error
      errors.push({
        filePath: files.length > 0 ? files[0].filePath : 'unknown',
        message: 'No override definitions exported from transpiled code',
      });
      
      if (verbose) {
        console.error('[UIGen Overrides] No override definitions found in transpiled code');
      }
      
      return {
        valid: false,
        errors,
        warnings,
        duplicates,
      };
    }
    
    // Normalize to array
    if (Array.isArray(result)) {
      overrideDefinitions = result;
    } else if (typeof result === 'object') {
      overrideDefinitions = [result];
    } else {
      errors.push({
        filePath: files.length > 0 ? files[0].filePath : 'unknown',
        message: `Invalid override format: expected object or array, got ${typeof result}`,
      });
      
      if (verbose) {
        console.error('[UIGen Overrides] Invalid override format');
      }
      
      return {
        valid: false,
        errors,
        warnings,
        duplicates,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    errors.push({
      filePath: files.length > 0 ? files[0].filePath : 'unknown',
      message: `Failed to execute transpiled code: ${errorMessage}`,
    });
    
    if (verbose) {
      console.error('[UIGen Overrides] Failed to execute transpiled code:', errorMessage);
    }
    
    return {
      valid: false,
      errors,
      warnings,
      duplicates,
    };
  }

  // Validate each override definition
  for (let i = 0; i < overrideDefinitions.length; i++) {
    const override = overrideDefinitions[i];
    const filePath = files[i]?.filePath || `override-${i}`;

    // Validate it's an object
    if (typeof override !== 'object' || override === null) {
      errors.push({
        filePath,
        message: `Override must be an object, got ${typeof override}`,
      });
      
      if (verbose) {
        console.error(`[UIGen Overrides] Invalid override in ${filePath}: not an object`);
      }
      
      continue;
    }

    // Validate targetId exists
    if (!override.targetId) {
      errors.push({
        filePath,
        message: 'Override must have a targetId property',
      });
      
      if (verbose) {
        console.error(`[UIGen Overrides] Invalid override in ${filePath}: missing targetId`);
      }
      
      continue;
    }

    // Validate targetId is a string
    if (typeof override.targetId !== 'string') {
      errors.push({
        filePath,
        message: `targetId must be a string, got ${typeof override.targetId}`,
        targetId: String(override.targetId),
      });
      
      if (verbose) {
        console.error(`[UIGen Overrides] Invalid override in ${filePath}: targetId is not a string`);
      }
      
      continue;
    }

    // Validate at least one override mode exists
    const hasComponent = 'component' in override && override.component !== undefined;
    const hasRender = 'render' in override && override.render !== undefined;
    const hasUseHooks = 'useHooks' in override && override.useHooks !== undefined;

    if (!hasComponent && !hasRender && !hasUseHooks) {
      errors.push({
        filePath,
        message: 'Override must have at least one of: component, render, useHooks',
        targetId: override.targetId,
      });
      
      if (verbose) {
        console.error(
          `[UIGen Overrides] Invalid override in ${filePath} (${override.targetId}): ` +
          'missing component, render, or useHooks'
        );
      }
      
      continue;
    }

    // Check for duplicate targetIds
    if (seenTargetIds.has(override.targetId)) {
      const previousFile = seenTargetIds.get(override.targetId)!;
      
      // Add to duplicates map
      if (!duplicates.has(override.targetId)) {
        duplicates.set(override.targetId, [previousFile]);
      }
      duplicates.get(override.targetId)!.push(filePath);
      
      warnings.push({
        filePath,
        message: `Duplicate targetId "${override.targetId}" (previous: ${previousFile}). Last one will be used.`,
        targetId: override.targetId,
      });
      
      if (verbose) {
        console.warn(
          `[UIGen Overrides] Duplicate targetId "${override.targetId}" in ${filePath} ` +
          `(previous: ${previousFile}). Last one will be used.`
        );
      }
    }
    
    // Track this targetId
    seenTargetIds.set(override.targetId, filePath);

    if (verbose) {
      console.log(`[UIGen Overrides] Validated override: ${override.targetId} (${filePath})`);
    }
  }

  const valid = errors.length === 0;

  if (verbose) {
    if (valid) {
      console.log(
        `[UIGen Overrides] Validation complete: ${overrideDefinitions.length} override(s) valid` +
        (warnings.length > 0 ? ` (${warnings.length} warning(s))` : '')
      );
    } else {
      console.error(
        `[UIGen Overrides] Validation failed: ${errors.length} error(s), ${warnings.length} warning(s)`
      );
    }
  }

  return {
    valid,
    errors,
    warnings,
    duplicates,
  };
}
