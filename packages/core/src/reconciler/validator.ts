/**
 * Spec Validator
 * 
 * Validates reconciled OpenAPI/Swagger specifications to ensure they conform
 * to the schema and maintain $ref integrity.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { ValidationResult, ValidationError, Swagger2Document } from './types';

/**
 * Spec Validator
 * 
 * Validates OpenAPI/Swagger specifications for correctness.
 */
export class Validator {
  /**
   * Validate a spec
   * 
   * @param spec - The specification to validate
   * @returns Validation result with errors (if any)
   */
  validate(spec: OpenAPIV3.Document | Swagger2Document): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    this.validateRequiredFields(spec, errors);

    // Check $ref integrity
    this.validateRefIntegrity(spec, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    spec: OpenAPIV3.Document | Swagger2Document,
    errors: ValidationError[]
  ): void {
    // Check for OpenAPI/Swagger version
    if ('openapi' in spec) {
      if (!spec.openapi) {
        errors.push({
          path: 'openapi',
          message: 'Missing required field: openapi',
          severity: 'error',
        });
      }
    } else if ('swagger' in spec) {
      if (!spec.swagger) {
        errors.push({
          path: 'swagger',
          message: 'Missing required field: swagger',
          severity: 'error',
        });
      }
    } else {
      errors.push({
        path: '',
        message: 'Missing required field: openapi or swagger version',
        severity: 'error',
      });
    }

    // Check for info
    if (!spec.info) {
      errors.push({
        path: 'info',
        message: 'Missing required field: info',
        severity: 'error',
      });
    } else {
      if (!spec.info.title) {
        errors.push({
          path: 'info.title',
          message: 'Missing required field: info.title',
          severity: 'error',
        });
      }
      if (!spec.info.version) {
        errors.push({
          path: 'info.version',
          message: 'Missing required field: info.version',
          severity: 'error',
        });
      }
    }

    // Check for paths
    if (!spec.paths) {
      errors.push({
        path: 'paths',
        message: 'Missing required field: paths',
        severity: 'error',
      });
    }
  }

  /**
   * Validate $ref integrity
   */
  private validateRefIntegrity(
    spec: OpenAPIV3.Document | Swagger2Document,
    errors: ValidationError[]
  ): void {
    const refs = this.collectRefs(spec);

    for (const ref of refs) {
      if (!this.resolveRef(spec, ref.ref)) {
        errors.push({
          path: ref.path,
          message: `Broken $ref reference: ${ref.ref}`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Collect all $ref references in the spec
   */
  private collectRefs(
    obj: unknown,
    path = '',
    refs: Array<{ ref: string; path: string }> = []
  ): Array<{ ref: string; path: string }> {
    if (!obj || typeof obj !== 'object') {
      return refs;
    }

    if ('$ref' in obj && typeof obj.$ref === 'string') {
      refs.push({ ref: obj.$ref, path });
    }

    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      this.collectRefs(value, newPath, refs);
    }

    return refs;
  }

  /**
   * Resolve a $ref reference
   */
  private resolveRef(spec: OpenAPIV3.Document | Swagger2Document, ref: string): unknown {
    // Only handle internal references
    if (!ref.startsWith('#/')) {
      return null;
    }

    const path = ref.slice(2); // Remove '#/'
    const parts = path.split('/');

    let current: unknown = spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return current;
  }
}
