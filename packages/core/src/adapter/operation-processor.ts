import type { OpenAPIV3 } from 'openapi-types';
import type { Operation, HttpMethod, Parameter, SchemaNode } from '../ir/types.js';
import type { AdapterUtils } from './annotations/index.js';
import type { AnnotationHandlerRegistry } from './annotations/registry.js';
import type { ViewHintClassifier } from './view-hint-classifier.js';
import type { Parameter_Processor } from './parameter-processor.js';
import type { Body_Processor } from './body-processor.js';

/**
 * Operation_Processor Component
 * 
 * Handles operation-level processing logic extracted from OpenAPI3Adapter.
 * This component processes OpenAPI operations and constructs Operation IR objects.
 * 
 * Responsibilities:
 * - Process operations and construct Operation IR objects
 * - Coordinate parameter processing with Parameter_Processor
 * - Coordinate request body processing with Body_Processor
 * - Coordinate response processing with Body_Processor
 * - Coordinate view hint classification with ViewHintClassifier
 * - Handle operation-level annotations (x-uigen-ignore, x-uigen-id)
 * - Apply annotation precedence rules (operation-level overrides path-level)
 * - Extract operation IDs (from operationId or generate)
 * - Extract security requirements
 * - Determine request content types
 * 
 * @see .kiro/specs/operation-processing-extraction/design.md for architecture details
 */
export class Operation_Processor {
  private viewHintClassifier: ViewHintClassifier;
  private parameterProcessor: Parameter_Processor;
  private bodyProcessor: Body_Processor;
  private annotationRegistry: AnnotationHandlerRegistry;
  private adapterUtils: AdapterUtils;

  /**
   * Creates a new Operation_Processor instance.
   * 
   * @param viewHintClassifier - Classifier for determining operation view hints
   * @param parameterProcessor - Processor for handling operation parameters
   * @param bodyProcessor - Processor for handling request bodies and responses
   * @param annotationRegistry - Registry for annotation handlers
   * @param adapterUtils - Utility methods for adapter operations
   */
  constructor(
    viewHintClassifier: ViewHintClassifier,
    parameterProcessor: Parameter_Processor,
    bodyProcessor: Body_Processor,
    annotationRegistry: AnnotationHandlerRegistry,
    adapterUtils: AdapterUtils
  ) {
    this.viewHintClassifier = viewHintClassifier;
    this.parameterProcessor = parameterProcessor;
    this.bodyProcessor = bodyProcessor;
    this.annotationRegistry = annotationRegistry;
    this.adapterUtils = adapterUtils;
  }

  /**
   * Process an operation and construct an Operation IR object.
   * 
   * This is the main entry point for operation processing. It:
   * 1. Checks x-uigen-ignore annotations (operation-level and path-level)
   * 2. Returns undefined if operation should be ignored
   * 3. Delegates parameter processing to Parameter_Processor
   * 4. Delegates request body processing to Body_Processor
   * 5. Delegates response processing to Body_Processor
   * 6. Delegates view hint classification to ViewHintClassifier
   * 7. Extracts operation ID (from operationId or generates)
   * 8. Extracts x-uigen-id vendor extension
   * 9. Determines request content type
   * 10. Extracts security requirements
   * 11. Constructs and returns complete Operation IR object
   * 
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param path - API path (e.g., /users, /users/{id})
   * @param operation - The OpenAPI operation object
   * @param pathItem - The path item object (optional, for path-level parameters and annotations)
   * @returns Operation IR object, or undefined if operation should be ignored
   * 
   * @example
   * ```typescript
   * const operation = processor.processOperation(
   *   'GET',
   *   '/users/{id}',
   *   operationObject,
   *   pathItemObject
   * );
   * ```
   */
  processOperation(
    method: HttpMethod,
    path: string,
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): Operation | undefined {
    // Check if operation should be ignored based on annotations
    if (pathItem && this.shouldIgnoreOperation(pathItem, operation)) {
      console.info(`Operation ${method} ${path} ignored due to x-uigen-ignore annotation`);
      return undefined;
    }

    // Delegate parameter processing to Parameter_Processor
    const pathParams = pathItem?.parameters;
    const parameters = this.parameterProcessor.processParameters(
      operation.parameters || [],
      pathParams
    );

    // Delegate request body processing to Body_Processor
    const requestBodyResult = operation.requestBody
      ? this.bodyProcessor.processRequestBody(operation.requestBody)
      : undefined;
    
    const requestBody = requestBodyResult?.schema;
    const requestBodySchemaName = requestBodyResult?.schemaName;

    // Determine request content type
    const requestContentType = this.determineRequestContentType(operation, requestBody);

    // Delegate response processing to Body_Processor
    const responses = this.bodyProcessor.processResponses(operation.responses);

    // Delegate view hint classification to ViewHintClassifier
    const viewHint = this.viewHintClassifier.classify(method, path, parameters, requestBody);

    // Extract operation ID
    const operationId = this.extractOperationId(method, path, operation);

    // Extract x-uigen-id vendor extension
    const uigenId = this.extractUigenId(operation, operationId);

    // Extract security requirements
    const security = this.extractSecurityRequirements(operation);

    // Construct and return Operation IR object
    return {
      id: operationId,
      uigenId: uigenId,
      method,
      path,
      summary: operation.summary,
      description: operation.description,
      parameters,
      requestBody,
      requestBodySchemaName,
      requestContentType,
      responses,
      viewHint,
      security
    };
  }

  /**
   * Extract x-uigen-ignore annotation from a path item or operation.
   * 
   * Validates that the annotation is a boolean type. Non-boolean values
   * are treated as undefined and trigger a warning.
   * 
   * @param obj - Path item or operation object
   * @returns true if ignored, false if explicitly not ignored, undefined if absent or invalid
   * 
   * @example
   * ```typescript
   * const ignored = this.extractIgnoreAnnotation(operation);
   * if (ignored === true) {
   *   // Operation should be ignored
   * }
   * ```
   */
  private extractIgnoreAnnotation(
    obj: OpenAPIV3.PathItemObject | OpenAPIV3.OperationObject
  ): boolean | undefined {
    const annotation = (obj as any)['x-uigen-ignore'];

    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }

    // Treat non-boolean values as absent
    if (annotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof annotation}`);
    }

    return undefined;
  }

  /**
   * Determine if an operation should be ignored based on annotations.
   * 
   * Applies annotation precedence rules:
   * 1. Operation-level x-uigen-ignore: true → ignore
   * 2. Operation-level x-uigen-ignore: false → process (overrides path-level)
   * 3. Path-level x-uigen-ignore: true → ignore
   * 4. Path-level x-uigen-ignore: false → process
   * 5. Neither has annotation → process (default behavior)
   * 
   * @param pathItem - The path item object
   * @param operation - The operation object
   * @returns true if operation should be ignored, false otherwise
   * 
   * @example
   * ```typescript
   * if (this.shouldIgnoreOperation(pathItem, operation)) {
   *   return undefined; // Skip this operation
   * }
   * ```
   */
  private shouldIgnoreOperation(
    pathItem: OpenAPIV3.PathItemObject,
    operation: OpenAPIV3.OperationObject
  ): boolean {
    const operationAnnotation = this.extractIgnoreAnnotation(operation);

    // Operation-level annotation takes precedence
    if (operationAnnotation !== undefined) {
      return operationAnnotation;
    }

    // Fall back to path-level annotation
    const pathAnnotation = this.extractIgnoreAnnotation(pathItem);
    if (pathAnnotation !== undefined) {
      return pathAnnotation;
    }

    // Default: do not ignore
    return false;
  }

  /**
   * Extract or generate an operation ID.
   * 
   * Uses the operationId field if present, otherwise generates an ID
   * in the format "{method}_{path}" with slashes replaced by underscores.
   * 
   * @param method - HTTP method
   * @param path - API path
   * @param operation - The operation object
   * @returns Operation ID string
   * 
   * @example
   * ```typescript
   * // With operationId
   * const id = this.extractOperationId('GET', '/users', { operationId: 'listUsers' });
   * // Returns: 'listUsers'
   * 
   * // Without operationId
   * const id = this.extractOperationId('GET', '/users', {});
   * // Returns: 'get_users'
   * ```
   */
  private extractOperationId(
    method: HttpMethod,
    path: string,
    operation: OpenAPIV3.OperationObject
  ): string {
    return operation.operationId || `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
  }

  /**
   * Extract x-uigen-id vendor extension or fall back to operationId.
   * 
   * Uses x-uigen-id if present and non-empty, otherwise falls back to operationId.
   * Handles numeric x-uigen-id by converting to string.
   * 
   * @param operation - The operation object
   * @param operationId - The operation ID (fallback value)
   * @returns UigenId string
   * 
   * @example
   * ```typescript
   * // With x-uigen-id
   * const uigenId = this.extractUigenId({ 'x-uigen-id': 'custom-list-users' }, 'listUsers');
   * // Returns: 'custom-list-users'
   * 
   * // Without x-uigen-id
   * const uigenId = this.extractUigenId({}, 'listUsers');
   * // Returns: 'listUsers'
   * ```
   */
  private extractUigenId(
    operation: OpenAPIV3.OperationObject,
    operationId: string
  ): string {
    const vendorExtension = (operation as any)['x-uigen-id'];

    // Handle numeric x-uigen-id by converting to string
    if (typeof vendorExtension === 'number') {
      return String(vendorExtension);
    }

    // Use x-uigen-id if present and non-empty, otherwise fall back to operationId
    return vendorExtension && vendorExtension !== '' ? vendorExtension : operationId;
  }

  /**
   * Determine the appropriate request content type.
   * 
   * Delegates to Body_Processor.determineRequestContentType() when a request body
   * with content exists. Returns undefined for operations without request bodies.
   * 
   * @param operation - The operation object
   * @param requestBody - The processed request body schema
   * @returns Content type string, or undefined if no request body
   * 
   * @example
   * ```typescript
   * const contentType = this.determineRequestContentType(operation, requestBody);
   * // Returns: 'multipart/form-data' (if file fields present)
   * // Returns: 'application/json' (default for JSON APIs)
   * // Returns: undefined (if no request body)
   * ```
   */
  private determineRequestContentType(
    operation: OpenAPIV3.OperationObject,
    requestBody: SchemaNode | undefined
  ): string | undefined {
    if (operation.requestBody && 'content' in operation.requestBody) {
      return this.bodyProcessor.determineRequestContentType(
        operation.requestBody.content,
        requestBody
      );
    }
    return undefined;
  }

  /**
   * Extract security requirements from an operation.
   * 
   * Converts OpenAPI security requirements to IR format by extracting
   * scheme names and scopes from security objects.
   * 
   * @param operation - The operation object
   * @returns Array of security requirements, or undefined if none
   * 
   * @example
   * ```typescript
   * // With security requirements
   * const security = this.extractSecurityRequirements({
   *   security: [
   *     { bearerAuth: ['read', 'write'] },
   *     { apiKey: [] }
   *   ]
   * });
   * // Returns: [
   * //   { name: 'bearerAuth', scopes: ['read', 'write'] },
   * //   { name: 'apiKey', scopes: [] }
   * // ]
   * 
   * // Without security requirements
   * const security = this.extractSecurityRequirements({});
   * // Returns: undefined
   * ```
   */
  private extractSecurityRequirements(
    operation: OpenAPIV3.OperationObject
  ): Array<{ name: string; scopes: string[] }> | undefined {
    return operation.security?.map(s => ({
      name: Object.keys(s)[0],
      scopes: Object.values(s)[0]
    }));
  }
}
