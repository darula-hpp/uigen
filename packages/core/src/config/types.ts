/**
 * Type definitions for UIGen configuration file system
 * 
 * The configuration file (.uigen/config.yaml) stores annotation settings
 * that control how UIGen processes OpenAPI/Swagger specs.
 */

/**
 * Configuration file structure
 * 
 * @property version - Config file format version (e.g., "1.0")
 * @property enabled - Map of annotation names to enabled/disabled state
 * @property defaults - Map of annotation names to default parameter values
 * @property annotations - Map of element paths to annotation configurations
 */
export interface ConfigFile {
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
}

/**
 * Validation result for config file structure
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

/**
 * Validation error details
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  value?: unknown;
}
