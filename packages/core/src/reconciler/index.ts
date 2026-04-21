/**
 * Config Reconciliation System
 * 
 * Exports all public types and interfaces for the reconciliation system.
 */

export type {
  ReconcilerOptions,
  ReconciledSpec,
  ReconciliationWarning,
  ReconciliationContext,
  Logger,
  ResolvedElement,
  ElementLocation,
  MergeResult,
  ValidationResult,
  ValidationError,
  Swagger2Document,
} from './types.js';

export { Reconciler } from './reconciler.js';
export { ElementPathResolver } from './path-resolver.js';
export { AnnotationMerger } from './merger.js';
export { Validator } from './validator.js';
export { deepClone, levenshteinDistance } from './utils.js';
export { validateRelationships, validateRelationshipType } from './relationship-validator.js';
export type { RelationshipValidationResult } from './relationship-validator.js';
