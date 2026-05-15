/**
 * HTTP Method Override Reconciler
 * 
 * Handles transformation of HTTP methods in OpenAPI specifications based on
 * x-uigen-http-* annotations. This reconciler scans the spec after annotation
 * merging and transforms operations to use the correct HTTP methods.
 * 
 * Supported annotations:
 * - x-uigen-http-get: Forces operation to use GET method
 * - x-uigen-http-post: Forces operation to use POST method
 * - x-uigen-http-put: Forces operation to use PUT method
 * - x-uigen-http-delete: Forces operation to use DELETE method
 * - x-uigen-http-patch: Forces operation to use PATCH method
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from './types.js';
import { OperationMethodTransformer } from '../adapter/annotations/utils/operation-method-transformer.js';

/**
 * HTTP method types supported by OpenAPI
 */
type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

/**
 * HTTP method override annotation names
 */
const HTTP_METHOD_OVERRIDE_ANNOTATIONS = [
  'x-uigen-http-get',
  'x-uigen-http-post',
  'x-uigen-http-put',
  'x-uigen-http-delete',
  'x-uigen-http-patch',
] as const;

/**
 * Map annotation names to target HTTP methods
 */
const ANNOTATION_TO_METHOD: Record<string, HttpMethod> = {
  'x-uigen-http-get': 'get',
  'x-uigen-http-post': 'post',
  'x-uigen-http-put': 'put',
  'x-uigen-http-delete': 'delete',
  'x-uigen-http-patch': 'patch',
};

/**
 * Result of a single method override operation
 */
interface OverrideResult {
  /** Original path */
  path: string;
  
  /** Original HTTP method */
  originalMethod: HttpMethod;
  
  /** New HTTP method */
  newMethod: HttpMethod;
  
  /** Whether the override was successful */
  success: boolean;
  
  /** Error message if override failed */
  error?: string;
}

/**
 * Result of reconciliation operation
 */
export interface ReconcileResult {
  /** Updated OpenAPI spec with transformed methods */
  spec: OpenAPIV3.Document | Swagger2Document;
  
  /** Number of successful method overrides */
  overrideCount: number;
  
  /** Detailed results for each override attempt */
  results: OverrideResult[];
  
  /** Warnings encountered during reconciliation */
  warnings: string[];
}

/**
 * HTTP Method Override Reconciler
 * 
 * Transforms HTTP methods in OpenAPI specs based on override annotations.
 * 
 * Design Pattern: Strategy Pattern
 * - Each HTTP method override is a strategy for transforming operations
 * - The reconciler orchestrates the application of these strategies
 * 
 * Design Pattern: Command Pattern
 * - Each override operation is encapsulated as a command
 * - Commands can be executed, validated, and rolled back if needed
 */
export class HttpMethodOverrideReconciler {
  /**
   * Reconcile HTTP method overrides in the OpenAPI spec
   * 
   * Process:
   * 1. Scan all paths and operations for HTTP method override annotations
   * 2. Validate each override (check for conflicts, invalid values)
   * 3. Apply overrides using OperationMethodTransformer
   * 4. Collect results and warnings
   * 
   * @param spec - The OpenAPI/Swagger specification (after annotation merging)
   * @returns Reconciliation result with updated spec and metadata
   * 
   * Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2
   */
  reconcile(
    spec: OpenAPIV3.Document | Swagger2Document
  ): ReconcileResult {
    // Deep clone to avoid mutation
    const updatedSpec = JSON.parse(JSON.stringify(spec)) as OpenAPIV3.Document | Swagger2Document;
    
    const results: OverrideResult[] = [];
    const warnings: string[] = [];
    let overrideCount = 0;
    
    // Scan all paths and operations
    if (!updatedSpec.paths) {
      return {
        spec: updatedSpec,
        overrideCount: 0,
        results: [],
        warnings: [],
      };
    }
    
    // Collect all override operations first (to handle conflicts)
    const overrideOperations = this.collectOverrideOperations(updatedSpec);
    
    // Validate and apply overrides
    for (const operation of overrideOperations) {
      const result = this.applyOverride(
        updatedSpec,
        operation.path,
        operation.originalMethod,
        operation.newMethod,
        operation.annotationName
      );
      
      results.push(result);
      
      if (result.success) {
        overrideCount++;
      } else if (result.error) {
        warnings.push(result.error);
      }
    }
    
    return {
      spec: updatedSpec,
      overrideCount,
      results,
      warnings,
    };
  }
  
  /**
   * Collect all HTTP method override operations from the spec
   * 
   * Scans all paths and operations for override annotations and builds
   * a list of override operations to apply.
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @returns Array of override operations
   * 
   * Requirements: 1.1, 1.3, 1.4
   */
  private collectOverrideOperations(
    spec: OpenAPIV3.Document | Swagger2Document
  ): Array<{
    path: string;
    originalMethod: HttpMethod;
    newMethod: HttpMethod;
    annotationName: string;
  }> {
    const operations: Array<{
      path: string;
      originalMethod: HttpMethod;
      newMethod: HttpMethod;
      annotationName: string;
    }> = [];
    
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem || typeof pathItem !== 'object') {
        continue;
      }
      
      // Check each HTTP method in the path item
      const httpMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
      
      for (const method of httpMethods) {
        const operation = (pathItem as any)[method];
        
        if (!operation || typeof operation !== 'object') {
          continue;
        }
        
        // Check for HTTP method override annotations
        for (const annotationName of HTTP_METHOD_OVERRIDE_ANNOTATIONS) {
          const annotationValue = operation[annotationName];
          
          // Only process if annotation value is boolean true
          if (annotationValue === true) {
            const newMethod = ANNOTATION_TO_METHOD[annotationName];
            
            // Skip if already the target method
            if (method === newMethod) {
              continue;
            }
            
            operations.push({
              path,
              originalMethod: method,
              newMethod,
              annotationName,
            });
            
            // Only apply the first override annotation found
            break;
          }
        }
      }
    }
    
    return operations;
  }
  
  /**
   * Apply a single HTTP method override
   * 
   * Validates the override and uses OperationMethodTransformer to move
   * the operation to the new HTTP method.
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param path - The operation path
   * @param originalMethod - The original HTTP method
   * @param newMethod - The new HTTP method
   * @param annotationName - The annotation name (for logging)
   * @returns Override result with success status and error message
   * 
   * Requirements: 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3
   */
  private applyOverride(
    spec: OpenAPIV3.Document | Swagger2Document,
    path: string,
    originalMethod: HttpMethod,
    newMethod: HttpMethod,
    annotationName: string
  ): OverrideResult {
    // Validate the override
    const validation = OperationMethodTransformer.validate(
      spec,
      path,
      originalMethod,
      newMethod
    );
    
    if (!validation.valid) {
      return {
        path,
        originalMethod,
        newMethod,
        success: false,
        error: `${annotationName} on ${originalMethod.toUpperCase()}:${path}: ${validation.errors.join(', ')}`,
      };
    }
    
    // Apply the transformation
    const success = OperationMethodTransformer.transform(
      spec,
      path,
      originalMethod,
      newMethod
    );
    
    if (!success) {
      return {
        path,
        originalMethod,
        newMethod,
        success: false,
        error: `${annotationName} on ${originalMethod.toUpperCase()}:${path}: Transformation failed`,
      };
    }
    
    return {
      path,
      originalMethod,
      newMethod,
      success: true,
    };
  }
}
