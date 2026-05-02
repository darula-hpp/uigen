/**
 * Core types for the Config Reconciliation System
 * 
 * The reconciliation system merges user-defined annotation overrides from
 * .uigen/config.yaml into OpenAPI/Swagger specifications at runtime without
 * modifying source files.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { RelationshipConfig } from '../config/types.js';

/**
 * Swagger 2.0 Document type
 * TODO: Import from swagger-types if available
 */
export interface Swagger2Document {
  swagger: string;
  info: {
    title: string;
    version: string;
    [key: string]: unknown;
  };
  paths: Record<string, unknown>;
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Options for configuring the reconciler behavior
 */
export interface ReconcilerOptions {
  /** Log level for reconciliation activity */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /** Whether to validate the reconciled spec (default: true) */
  validateOutput?: boolean;
  
  /** Fail on unresolved element paths (default: false) */
  strictMode?: boolean;
}

/**
 * Result of a reconciliation operation
 */
export interface ReconciledSpec {
  /** The reconciled specification with config annotations applied */
  spec: OpenAPIV3.Document | Swagger2Document;
  
  /** Number of annotations successfully applied */
  appliedAnnotations: number;
  
  /** Warnings generated during reconciliation */
  warnings: ReconciliationWarning[];

  /** Validated relationship declarations from config (empty array when none declared) */
  relationships: RelationshipConfig[];
}

/**
 * Warning generated during reconciliation
 */
export interface ReconciliationWarning {
  /** The element path that caused the warning */
  elementPath: string;
  
  /** Human-readable warning message */
  message: string;
  
  /** Optional suggestion for fixing the issue */
  suggestion?: string;
}

/**
 * Internal context passed between reconciler components
 */
export interface ReconciliationContext {
  /** The source OpenAPI/Swagger specification */
  sourceSpec: OpenAPIV3.Document | Swagger2Document;
  
  /** The config file with annotation overrides */
  config: {
    version: string;
    enabled: Record<string, boolean>;
    defaults: Record<string, Record<string, unknown>>;
    annotations: Record<string, Record<string, unknown>>;
  };
  
  /** Reconciler options */
  options: ReconcilerOptions;
  
  /** Logger instance */
  logger: Logger;
  
  /** Accumulated warnings */
  warnings: ReconciliationWarning[];
  
  /** Count of applied annotations */
  appliedCount: number;
}

/**
 * Logger interface for reconciliation activity
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Resolved element in the spec
 */
export interface ResolvedElement {
  /** Type of the resolved element */
  type: 'operation' | 'schema-property' | 'parameter' | 'response-body' | 'response-field';
  
  /** Location information for the element */
  location: ElementLocation;
  
  /** The actual spec object to modify */
  object: Record<string, unknown>;
}

/**
 * Location information for a resolved element
 */
export interface ElementLocation {
  /** JSON pointer or path description */
  path: string;
  
  /** Parent object for context (optional) */
  parent?: Record<string, unknown>;
}

/**
 * Result of an annotation merge operation
 */
export interface MergeResult {
  /** The modified spec with annotations applied */
  modifiedSpec: OpenAPIV3.Document | Swagger2Document;
  
  /** Number of annotations applied */
  appliedCount: number;
  
  /** Element paths that could not be resolved */
  skippedPaths: string[];
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /** Whether the spec is valid */
  valid: boolean;
  
  /** Validation errors (if any) */
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Path to the invalid element */
  path: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Error severity */
  severity: 'error' | 'warning';
}
