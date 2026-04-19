import type { OpenAPIV3 } from 'openapi-types';
import type { Parameter, SchemaNode } from '../ir/types.js';
import type { AdapterUtils } from './annotations/index.js';
import type { AnnotationHandlerRegistry } from './annotations/registry.js';
import type { SchemaProcessor } from './schema-processor.js';

/**
 * Parameter_Processor Component
 * 
 * Handles parameter processing logic extracted from OpenAPI3Adapter.
 * This component processes OpenAPI parameters and converts them to IR format.
 * 
 * Responsibilities:
 * - Resolve parameter references ($ref handling)
 * - Merge path-level and operation-level parameters
 * - Filter parameters based on x-uigen-ignore annotations
 * - Convert parameter schemas to SchemaNode IR
 * - Apply parameter precedence rules (operation-level overrides path-level)
 * - Validate parameter locations
 * - Handle required fields and descriptions
 * 
 * @see .kiro/specs/parameter-processing-extraction/design.md for architecture details
 */
export class Parameter_Processor {
  private spec: OpenAPIV3.Document;
  private adapterUtils: AdapterUtils;
  private schemaProcessor: SchemaProcessor;
  private annotationRegistry: AnnotationHandlerRegistry;

  /**
   * Creates a new Parameter_Processor instance.
   * 
   * @param spec - The OpenAPI v3 document to process parameters from
   * @param adapterUtils - Utility methods for adapter operations
   * @param schemaProcessor - Schema processor for converting OpenAPI schemas to SchemaNodes
   * @param annotationRegistry - Registry for annotation handlers
   */
  constructor(
    spec: OpenAPIV3.Document,
    adapterUtils: AdapterUtils,
    schemaProcessor: SchemaProcessor,
    annotationRegistry: AnnotationHandlerRegistry
  ) {
    this.spec = spec;
    this.adapterUtils = adapterUtils;
    this.schemaProcessor = schemaProcessor;
    this.annotationRegistry = annotationRegistry;
  }

  /**
   * Process parameters from an operation, merging with path-level parameters.
   * 
   * This is the main entry point for parameter processing. It:
   * 1. Filters out null/undefined parameters
   * 2. Resolves all $ref references
   * 3. Merges path-level and operation-level parameters (operation-level takes precedence)
   * 4. Filters out parameters with x-uigen-ignore: true
   * 5. Converts parameter schemas to SchemaNode IR
   * 6. Returns array of processed Parameter objects
   * 
   * @param operationParams - Parameters defined at the operation level
   * @param pathParams - Parameters defined at the path level (optional)
   * @returns Array of processed Parameter objects
   * 
   * @example
   * ```typescript
   * const parameters = processor.processParameters(
   *   operation.parameters || [],
   *   pathItem?.parameters
   * );
   * ```
   */
  processParameters(
    operationParams: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[],
    pathParams?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]
  ): Parameter[] {
    // Resolve all references first
    const resolvedPathParams = (pathParams || [])
      .filter(p => p != null)
      .map(p => '$ref' in p ? this.resolveParameterRef(p.$ref) : p)
      .filter((p): p is OpenAPIV3.ParameterObject => p != null);

    const resolvedOperationParams = operationParams
      .filter(p => p != null)
      .map(p => '$ref' in p ? this.resolveParameterRef(p.$ref) : p)
      .filter((p): p is OpenAPIV3.ParameterObject => p != null);

    // Merge path-level and operation-level parameters
    const mergedParams = this.mergeParameters(resolvedOperationParams, resolvedPathParams);

    // Filter out ignored parameters and map to Parameter objects
    return mergedParams
      .filter(p => !this.shouldIgnoreParameter(p, resolvedPathParams))
      .map(p => ({
        name: p.name,
        in: p.in as 'path' | 'query' | 'header' | 'cookie',
        required: p.required || false,
        schema: p.schema 
          ? this.schemaProcessor.processSchema(p.name, p.schema as OpenAPIV3.SchemaObject) 
          : this.createPlaceholderSchema(p.name),
        description: p.description
      }));
  }

  /**
   * Resolve a parameter reference ($ref) to its actual definition.
   * 
   * Supports both OpenAPI 3.x and Swagger 2.0 reference formats:
   * - OpenAPI 3.x: #/components/parameters/ParameterName
   * - Swagger 2.0: #/parameters/ParameterName
   * 
   * @param ref - The $ref string to resolve
   * @returns The resolved parameter object, or null if resolution fails
   * 
   * @example
   * ```typescript
   * const param = this.resolveParameterRef('#/components/parameters/UserId');
   * ```
   */
  private resolveParameterRef(ref: string): OpenAPIV3.ParameterObject | null {
    if (!ref.startsWith('#/')) {
      console.warn(`Invalid parameter reference format: ${ref}`);
      return null;
    }

    const parts = ref.slice(2).split('/');
    let current: any = this.spec;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        console.warn(`Could not resolve parameter reference: ${ref}`);
        return null;
      }
    }

    return current as OpenAPIV3.ParameterObject;
  }

  /**
   * Merge path-level and operation-level parameters.
   * 
   * Operation-level parameters take precedence over path-level parameters
   * with the same name AND location. Parameters are identified by a key
   * in the format "name:location" (e.g., "userId:path").
   * 
   * Algorithm:
   * 1. Create Set of operation-level parameter keys for O(1) lookup
   * 2. Add path-level parameters that are NOT overridden by operation-level
   * 3. Add all operation-level parameters
   * 4. Result: merged array with operation-level precedence
   * 
   * @param operationParams - Resolved operation-level parameters
   * @param pathParams - Resolved path-level parameters
   * @returns Merged array of parameters
   * 
   * @example
   * ```typescript
   * const merged = this.mergeParameters(operationParams, pathParams);
   * // Operation-level "userId:path" overrides path-level "userId:path"
   * // But "userId:query" and "userId:path" are both included (different locations)
   * ```
   */
  private mergeParameters(
    operationParams: OpenAPIV3.ParameterObject[],
    pathParams: OpenAPIV3.ParameterObject[]
  ): OpenAPIV3.ParameterObject[] {
    const mergedParams: OpenAPIV3.ParameterObject[] = [];

    // Create Set of operation-level parameter keys for O(1) lookup
    const operationParamKeys = new Set(
      operationParams.map(p => `${p.name}:${p.in}`)
    );

    // Add path-level parameters that are not overridden
    for (const pathParam of pathParams) {
      const key = `${pathParam.name}:${pathParam.in}`;
      if (!operationParamKeys.has(key)) {
        mergedParams.push(pathParam);
      }
    }

    // Add all operation-level parameters
    mergedParams.push(...operationParams);

    return mergedParams;
  }

  /**
   * Determine if a parameter should be ignored based on x-uigen-ignore annotations.
   * 
   * Annotation precedence rules:
   * 1. Operation-level x-uigen-ignore (highest priority)
   * 2. Path-level x-uigen-ignore (fallback)
   * 3. Default: false (include parameter)
   * 
   * Validation:
   * - x-uigen-ignore MUST be boolean type
   * - Non-boolean values trigger warning and are treated as undefined
   * - Undefined values fall through to next precedence level
   * 
   * @param param - The parameter to check
   * @param pathParams - Path-level parameters for precedence checking
   * @returns true if parameter should be ignored, false otherwise
   * 
   * @example
   * ```typescript
   * if (this.shouldIgnoreParameter(param, pathParams)) {
   *   // Skip this parameter
   * }
   * ```
   */
  private shouldIgnoreParameter(
    param: OpenAPIV3.ParameterObject,
    pathParams?: OpenAPIV3.ParameterObject[]
  ): boolean {
    // Check operation-level annotation first (most specific)
    const paramAnnotation = (param as any)['x-uigen-ignore'];

    // Only accept boolean values
    if (typeof paramAnnotation === 'boolean') {
      return paramAnnotation;
    }

    // Warn about non-boolean values
    if (paramAnnotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof paramAnnotation}`);
    }

    // Check if there's a path-level parameter with the same name AND location
    if (pathParams) {
      const pathParam = pathParams.find(
        p => p.name === param.name && p.in === param.in
      );

      if (pathParam) {
        const pathAnnotation = (pathParam as any)['x-uigen-ignore'];

        if (typeof pathAnnotation === 'boolean') {
          return pathAnnotation;
        }

        if (pathAnnotation !== undefined) {
          console.warn(`x-uigen-ignore must be a boolean, found ${typeof pathAnnotation}`);
        }
      }
    }

    // Default: do not ignore
    return false;
  }

  /**
   * Create a placeholder schema node for parameters without schema definitions.
   * 
   * @param key - The parameter name to use as the schema key
   * @returns A minimal SchemaNode with type 'object' and empty children
   * 
   * @example
   * ```typescript
   * const schema = this.createPlaceholderSchema('userId');
   * // Returns: { type: 'object', key: 'userId', label: 'User Id', required: false, children: [] }
   * ```
   */
  private createPlaceholderSchema(key: string): SchemaNode {
    return {
      type: 'object',
      key,
      label: this.adapterUtils.humanize(key),
      required: false,
      children: []
    };
  }
}
