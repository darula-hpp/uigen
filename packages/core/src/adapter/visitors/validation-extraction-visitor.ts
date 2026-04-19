import type { OpenAPIV3 } from 'openapi-types';
import type { ValidationRule } from '../../ir/types.js';

/**
 * Extracts validation rules from OpenAPI schemas.
 * 
 * Implements the Visitor pattern for validation extraction operations.
 * Preserves all existing validation extraction behavior from OpenAPI3Adapter.
 * 
 * Extraction rules:
 * - minLength → minLength validation
 * - maxLength → maxLength validation
 * - pattern → pattern validation
 * - minimum → minimum validation
 * - maximum → maximum validation
 * - minItems → minItems validation
 * - maxItems → maxItems validation
 * - format: 'email' → email validation
 * - format: 'uri' → url validation
 * 
 * Requirements: 3.1-3.12
 */
export interface ValidationExtractionVisitor {
  /**
   * Extract all validation rules from a schema.
   * 
   * @param schema - OpenAPI schema object
   * @returns Array of validation rules
   */
  extractValidations(schema: OpenAPIV3.SchemaObject): ValidationRule[];
}

/**
 * Default implementation of ValidationExtractionVisitor.
 * Preserves all existing validation extraction behavior from OpenAPI3Adapter.
 */
export class DefaultValidationExtractionVisitor implements ValidationExtractionVisitor {
  extractValidations(schema: OpenAPIV3.SchemaObject): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Extract minLength validation
    if (schema.minLength !== undefined) {
      rules.push({
        type: 'minLength',
        value: schema.minLength,
        message: `Must be at least ${schema.minLength} characters`
      });
    }

    // Extract maxLength validation
    if (schema.maxLength !== undefined) {
      rules.push({
        type: 'maxLength',
        value: schema.maxLength,
        message: `Must be at most ${schema.maxLength} characters`
      });
    }

    // Extract pattern validation
    if (schema.pattern) {
      rules.push({
        type: 'pattern',
        value: schema.pattern,
        message: `Must match pattern: ${schema.pattern}`
      });
    }

    // Extract minimum validation
    if (schema.minimum !== undefined) {
      rules.push({
        type: 'minimum',
        value: schema.minimum,
        message: `Must be at least ${schema.minimum}`
      });
    }

    // Extract maximum validation
    if (schema.maximum !== undefined) {
      rules.push({
        type: 'maximum',
        value: schema.maximum,
        message: `Must be at most ${schema.maximum}`
      });
    }

    // Extract minItems validation
    if (schema.minItems !== undefined) {
      rules.push({
        type: 'minItems',
        value: schema.minItems,
        message: `Must have at least ${schema.minItems} item${schema.minItems !== 1 ? 's' : ''}`
      });
    }

    // Extract maxItems validation
    if (schema.maxItems !== undefined) {
      rules.push({
        type: 'maxItems',
        value: schema.maxItems,
        message: `Must have at most ${schema.maxItems} item${schema.maxItems !== 1 ? 's' : ''}`
      });
    }

    // Extract email format validation
    if (schema.format === 'email') {
      rules.push({
        type: 'email',
        value: '',
        message: 'Must be a valid email address'
      });
    }

    // Extract URL format validation
    if (schema.format === 'uri') {
      rules.push({
        type: 'url',
        value: '',
        message: 'Must be a valid URL'
      });
    }

    return rules;
  }
}
