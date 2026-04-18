/**
 * Configuration file system for UIGen
 * 
 * Provides loading and management of .uigen/config.yaml files
 * that control annotation behavior.
 */

export { ConfigLoader } from './loader.js';
export type { ConfigLoaderOptions } from './loader.js';
export type {
  ConfigFile,
  ConfigValidationResult,
  ConfigValidationError
} from './types.js';
