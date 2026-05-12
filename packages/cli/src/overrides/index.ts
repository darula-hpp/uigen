/**
 * CLI Override System
 * 
 * This module provides the CLI-side infrastructure for the UIGen override system.
 * It handles discovery, transpilation, validation, and injection of override files
 * from the src/ directory into the browser via window.__UIGEN_OVERRIDES__.
 * 
 * @module @uigen-dev/cli/overrides
 * 
 * @example
 * ```typescript
 * import {
 *   discoverOverrides,
 *   transpileOverrides,
 *   validateOverrides,
 *   createInjectionScript
 * } from '@uigen-dev/cli/overrides';
 * 
 * // Discover override files
 * const files = await discoverOverrides({
 *   srcDir: '/path/to/src',
 *   verbose: true
 * });
 * 
 * // Transpile to browser-compatible code
 * const result = await transpileOverrides({
 *   files,
 *   mode: 'development',
 *   verbose: true
 * });
 * 
 * // Validate override definitions
 * const validation = validateOverrides({
 *   code: result.code,
 *   files,
 *   verbose: true
 * });
 * 
 * // Create injection script for HTML
 * const script = createInjectionScript({
 *   code: result.code,
 *   mode: 'development'
 * });
 * ```
 */

// ============================================================================
// Discovery Module
// ============================================================================

export {
  discoverOverrides,
  type DiscoveryOptions,
  type DiscoveredOverride,
} from './discovery.js';

// ============================================================================
// Transpilation Module
// ============================================================================

export {
  transpileOverrides,
  type TranspileOptions,
  type TranspileResult,
  type TranspileError,
  type TranspileWarning,
} from './transpiler.js';

// ============================================================================
// Validation Module
// ============================================================================

export {
  validateOverrides,
  type ValidationOptions,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validator.js';

// ============================================================================
// Injection Module
// ============================================================================

export {
  createInjectionScript,
  type InjectionOptions,
} from './injector.js';

// ============================================================================
// Cache Module (Internal - not exported)
// ============================================================================

// Note: Cache module (getCached, setCached) is internal and not exported
// as it's only used by the transpiler module for performance optimization.
