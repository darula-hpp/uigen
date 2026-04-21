/**
 * Type definitions for UIGen configuration file system
 * 
 * The configuration file (.uigen/config.yaml) stores annotation settings
 * that control how UIGen processes OpenAPI/Swagger specs.
 */

/**
 * A single relationship declaration in the config file.
 *
 * @property source - Slug of the source resource
 * @property target - Slug of the target resource
 * @property path   - API path string, e.g. /users/{id}/orders
 * @property type   - Explicit relationship type: 'hasMany' (one-to-many), 'belongsTo' (many-to-one), or 'manyToMany' (many-to-many).
 *                    This field determines how the adapter interprets the relationship instead of deriving it from path patterns.
 *                    When present, the adapter uses this type directly. When missing, the adapter falls back to path-based derivation for backward compatibility.
 * @property label  - Optional display label for config-gui
 */
export interface RelationshipConfig {
  source: string;
  target: string;
  path: string;
  type?: 'hasMany' | 'belongsTo' | 'manyToMany';
  label?: string;
}

/**
 * Configuration file structure
 *
 * @property version       - Config file format version (e.g., "1.0")
 * @property enabled       - Map of annotation names to enabled/disabled state
 * @property defaults      - Map of annotation names to default parameter values
 * @property annotations   - Map of element paths to annotation configurations
 * @property relationships - Optional array of explicit relationship declarations
 */
export interface ConfigFile {
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
  relationships?: RelationshipConfig[];
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
