import type { OpenAPIV3 } from 'openapi-types';

/**
 * Swagger 2.0 specification document type
 */
interface Swagger2Document {
  swagger: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, any>;
  [key: string]: any;
}

/**
 * Validation result for method transformation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Transforms operation HTTP methods in OpenAPI specs.
 * Handles moving operations between method locations while preserving properties.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */
export class OperationMethodTransformer {
  /**
   * Transform an operation's HTTP method.
   * Moves the operation from the original method location to the new method location,
   * preserving all operation properties.
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param path - The operation path (e.g., "/api/v1/users")
   * @param originalMethod - The original HTTP method (e.g., "post")
   * @param newMethod - The new HTTP method (e.g., "get")
   * @returns true if transformation succeeded, false otherwise
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  static transform(
    spec: OpenAPIV3.Document | Swagger2Document,
    path: string,
    originalMethod: string,
    newMethod: string
  ): boolean {
    // Validate transformation
    const validation = this.validate(spec, path, originalMethod, newMethod);
    if (!validation.valid) {
      console.warn(
        `Cannot transform ${originalMethod.toUpperCase()}:${path} to ${newMethod.toUpperCase()}: ${validation.errors.join(', ')}`
      );
      return false;
    }
    
    // Extract operation from original location
    const pathItem = spec.paths[path] as any;
    const operation = pathItem[originalMethod];
    
    // Move operation to new location
    pathItem[newMethod] = operation;
    delete pathItem[originalMethod];
    
    return true;
  }
  
  /**
   * Validate that a method transformation is possible.
   * Checks that:
   * - The path exists in the spec
   * - The original method exists at the path
   * - The target method doesn't already exist at the path
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param path - The operation path
   * @param originalMethod - The original HTTP method
   * @param newMethod - The new HTTP method
   * @returns Validation result with errors if any
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  static validate(
    spec: OpenAPIV3.Document | Swagger2Document,
    path: string,
    originalMethod: string,
    newMethod: string
  ): ValidationResult {
    const errors: string[] = [];
    
    // Check that path exists
    if (!spec.paths || !spec.paths[path]) {
      errors.push(`Path ${path} not found in spec`);
      return { valid: false, errors };
    }
    
    const pathItem = spec.paths[path] as any;
    
    // Check that original method exists
    if (!pathItem[originalMethod]) {
      errors.push(`Method ${originalMethod.toUpperCase()} not found at ${path}`);
      return { valid: false, errors };
    }
    
    // Check that target method doesn't already exist
    if (pathItem[newMethod]) {
      errors.push(`Method ${newMethod.toUpperCase()} already exists at ${path}`);
      return { valid: false, errors };
    }
    
    return { valid: true, errors: [] };
  }
}
