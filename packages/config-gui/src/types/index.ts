/**
 * Type definitions for the Config GUI application
 */

// Re-export config file types from core package
export type { ConfigFile, ConfigValidationResult, ConfigValidationError, FieldType } from '@uigen-dev/core';

// Re-export spec parser types
export type { SpecStructure, ResourceNode, OperationNode, FieldNode } from '../lib/spec-parser.js';

// Re-export ignore state calculator types
export type { ElementType, IgnoreState, SpecNode } from '../lib/ignore-state-calculator.js';
export { IgnoreStateCalculator } from '../lib/ignore-state-calculator.js';

// Re-export annotation filter utilities
export { getApplicableAnnotations } from '../lib/annotation-filter.js';

// Import FieldType for use in AnnotationMetadata
import type { FieldType } from '@uigen-dev/core';

export interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
  parameterSchema: ParameterSchema;
  examples: Array<{ description: string; value: unknown }>;
  defaultValues?: Record<string, unknown>;
  applicableWhen?: {
    type?: FieldType;
    format?: string;
  };
}

export interface ParameterSchema {
  type: 'object' | 'string' | 'boolean' | 'number' | 'array';
  properties?: Record<string, PropertySchema>;
  required?: string[];
  items?: PropertySchema;
  description?: string;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface PropertySchema {
  type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
  description?: string;
  enum?: string[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}
