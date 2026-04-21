import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../ir/types.js';
import type { AdapterUtils } from './annotations/index.js';
import type { AnnotationHandlerRegistry } from './annotations/registry.js';
import type { SchemaProcessor } from './schema-processor.js';
import type { DefaultFileMetadataVisitor } from './visitors/file-metadata-visitor.js';

/**
 * Body_Processor Component
 * 
 * Handles request/response body processing logic extracted from OpenAPI3Adapter.
 * This component processes OpenAPI request and response bodies and converts them to IR format.
 * 
 * Responsibilities:
 * - Process request body objects and extract schemas
 * - Process response objects and extract schemas
 * - Resolve $ref references in request bodies and responses
 * - Select appropriate content types from multiple options
 * - Handle x-uigen-ignore annotations on bodies and responses
 * - Detect file fields in request body schemas
 * - Determine request content types (with multipart/form-data override for file uploads)
 * 
 * Content Type Prioritization:
 * - application/json (highest priority)
 * - application/x-www-form-urlencoded
 * - multipart/form-data
 * - text/plain
 * - First available type (fallback)
 * 
 * Special handling for file uploads:
 * - Automatically prefers multipart/form-data when file fields are detected
 * - Overrides content type to multipart/form-data even if not explicitly specified
 * 
 * @see .kiro/specs/body-processing-extraction/design.md for architecture details
 */
export class Body_Processor {
  private document: OpenAPIV3.Document;
  private adapterUtils: AdapterUtils;
  private schemaProcessor: SchemaProcessor;
  private annotationRegistry: AnnotationHandlerRegistry;
  private fileMetadataVisitor: DefaultFileMetadataVisitor;

  /**
   * Creates a new Body_Processor instance.
   * 
   * @param document - The OpenAPI v3 document to process bodies from
   * @param adapterUtils - Utility methods for adapter operations
   * @param schemaProcessor - Schema processor for converting OpenAPI schemas to SchemaNodes
   * @param annotationRegistry - Registry for annotation handlers
   * @param fileMetadataVisitor - Visitor for detecting file fields in schemas
   */
  constructor(
    document: OpenAPIV3.Document,
    adapterUtils: AdapterUtils,
    schemaProcessor: SchemaProcessor,
    annotationRegistry: AnnotationHandlerRegistry,
    fileMetadataVisitor: DefaultFileMetadataVisitor
  ) {
    this.document = document;
    this.adapterUtils = adapterUtils;
    this.schemaProcessor = schemaProcessor;
    this.annotationRegistry = annotationRegistry;
    this.fileMetadataVisitor = fileMetadataVisitor;
  }

  /**
   * Selects the most appropriate content type from available options.
   * 
   * Implements a prioritization strategy to choose the best content type
   * when multiple options are available in a request body or response.
   * 
   * Priority order:
   * 1. application/json - Most common modern API format, preferred for structured data
   * 2. application/x-www-form-urlencoded - Common for simple form submissions
   * 3. multipart/form-data - Required for file uploads and mixed data types
   * 4. text/plain - Simple text data
   * 5. First available type - Fallback for uncommon content types
   * 
   * @param content - Record mapping content type strings to MediaTypeObjects
   * @returns The selected MediaTypeObject, or undefined if no content is available
   * 
   * @example
   * ```typescript
   * const content = {
   *   'application/json': { schema: { type: 'object' } },
   *   'text/plain': { schema: { type: 'string' } }
   * };
   * const selected = pickContent(content);
   * // Returns the application/json MediaTypeObject
   * ```
   */
  private pickContent(content: Record<string, OpenAPIV3.MediaTypeObject> | undefined): OpenAPIV3.MediaTypeObject | undefined {
    if (!content) return undefined;
    return (
      content['application/json'] ||
      content['application/x-www-form-urlencoded'] ||
      content['multipart/form-data'] ||
      content['text/plain'] ||
      Object.values(content)[0]
    );
  }

  /**
   * Resolves a $ref reference to a request body object.
   * 
   * Parses the $ref path and navigates through the document structure to find
   * the referenced request body definition. Follows JSON Reference (RFC 6901) specification.
   * 
   * @param ref - The $ref string (must start with #/)
   * @returns The resolved RequestBodyObject, or null if reference cannot be resolved
   * 
   * @example
   * ```typescript
   * const resolved = resolveRequestBodyRef('#/components/requestBodies/UserRequest');
   * // Returns the RequestBodyObject from spec.components.requestBodies.UserRequest
   * ```
   * 
   * Handles edge cases:
   * - Malformed $ref paths (not starting with #/) return null
   * - Missing references return null and log warning
   * - Invalid paths return null
   */
  private resolveRequestBodyRef(ref: string): OpenAPIV3.RequestBodyObject | null {
    if (!ref.startsWith('#/')) {
      this.adapterUtils.logWarning(`Malformed $ref path for request body: ${ref}`);
      return null;
    }
    const parts = ref.slice(2).split('/');
    let current: any = this.document;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        this.adapterUtils.logWarning(`Cannot resolve request body reference: ${ref}`);
        return null;
      }
    }
    return current as OpenAPIV3.RequestBodyObject;
  }

  /**
   * Resolves a $ref reference to a response object.
   * 
   * Parses the $ref path and navigates through the document structure to find
   * the referenced response definition. Follows JSON Reference (RFC 6901) specification.
   * 
   * @param ref - The $ref string (must start with #/)
   * @returns The resolved ResponseObject, or null if reference cannot be resolved
   * 
   * @example
   * ```typescript
   * const resolved = resolveResponseRef('#/components/responses/SuccessResponse');
   * // Returns the ResponseObject from spec.components.responses.SuccessResponse
   * ```
   * 
   * Handles edge cases:
   * - Malformed $ref paths (not starting with #/) return null
   * - Missing references return null and log warning
   * - Invalid paths return null
   */
  private resolveResponseRef(ref: string): OpenAPIV3.ResponseObject | null {
    if (!ref.startsWith('#/')) {
      this.adapterUtils.logWarning(`Malformed $ref path for response: ${ref}`);
      return null;
    }
    const parts = ref.slice(2).split('/');
    let current: any = this.document;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        this.adapterUtils.logWarning(`Cannot resolve response reference: ${ref}`);
        return null;
      }
    }
    return current as OpenAPIV3.ResponseObject;
  }

  /**
   * Checks and validates x-uigen-ignore annotation on an object.
   * 
   * Extracts the x-uigen-ignore property and validates it is a boolean type.
   * Non-boolean values are treated as undefined and trigger a warning.
   * 
   * @param obj - Any object that may contain x-uigen-ignore annotation
   * @returns true if ignored, false if explicitly not ignored, undefined if absent or invalid
   * 
   * @example
   * ```typescript
   * const body = { content: {...}, 'x-uigen-ignore': true };
   * const ignored = checkIgnoreAnnotation(body);
   * // Returns true
   * 
   * const body2 = { content: {...}, 'x-uigen-ignore': 'yes' };
   * const ignored2 = checkIgnoreAnnotation(body2);
   * // Logs warning and returns undefined
   * ```
   * 
   * Validation rules:
   * - Boolean true: Object should be ignored (pruned)
   * - Boolean false: Object should be processed (explicit override)
   * - Undefined: Object should be processed (default behavior)
   * - Non-boolean: Treated as undefined with warning logged
   */
  private checkIgnoreAnnotation(obj: any): boolean | undefined {
    const annotation = obj['x-uigen-ignore'];
    
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
   * Processes a request body object and extracts its schema.
   * 
   * Handles both inline request bodies and $ref request bodies. Checks x-uigen-ignore
   * annotations on both the body object and resolved $ref targets. Selects appropriate
   * content type and delegates schema conversion to SchemaProcessor.
   * 
   * Processing flow:
   * 1. Check x-uigen-ignore annotation on body object
   * 2. If body is a $ref, resolve it and check annotation on target
   * 3. Select content type using pickContent()
   * 4. Extract schema from selected content
   * 5. Delegate to SchemaProcessor.processSchema() with "body" as key
   * 
   * @param body - The request body object (inline or $ref)
   * @returns Object with schema and schemaName, or undefined if body should be ignored
   * 
   * @example
   * ```typescript
   * const body = {
   *   content: {
   *     'application/json': {
   *       schema: { $ref: '#/components/schemas/CreateUserRequest' }
   *     }
   *   }
   * };
   * const result = processRequestBody(body);
   * // Returns { schema: SchemaNode, schemaName: 'CreateUserRequest' }
   * ```
   * 
   * Returns undefined when:
   * - Body has x-uigen-ignore: true
   * - $ref target has x-uigen-ignore: true
   * - Body has no content
   * - Body has content but no schema
   * - $ref cannot be resolved
   */
  processRequestBody(
    body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject
  ): { schema: SchemaNode; schemaName?: string } | undefined {
    // Check x-uigen-ignore annotation on the body object itself
    const bodyIgnoreAnnotation = this.checkIgnoreAnnotation(body);
    
    if (bodyIgnoreAnnotation === true) {
      console.info('Request body ignored due to x-uigen-ignore annotation');
      return undefined;
    }
    
    // Handle $ref request bodies
    if ('$ref' in body) {
      const rawRequestBody = this.resolveRequestBodyRef(body.$ref);
      
      if (rawRequestBody) {
        const refIgnoreAnnotation = this.checkIgnoreAnnotation(rawRequestBody);
        
        if (refIgnoreAnnotation === true) {
          console.info(`Request body $ref target ignored: ${body.$ref}`);
          return undefined;
        }
        
        // Process the resolved request body
        const content = this.pickContent(rawRequestBody.content);
        if (!content?.schema) return undefined;
        
        // Extract schema name from $ref if present in content
        let schemaName: string | undefined;
        if ('$ref' in content.schema) {
          schemaName = this.extractSchemaNameFromRef(content.schema.$ref);
        }
        
        const schema = this.schemaProcessor.processSchema('body', content.schema as OpenAPIV3.SchemaObject);
        return { schema, schemaName };
      }
      
      // If reference cannot be resolved, return undefined
      return undefined;
    }
    
    // Handle inline request bodies
    const content = this.pickContent(body.content);
    if (!content?.schema) return undefined;
    
    // Extract schema name from $ref if present
    let schemaName: string | undefined;
    if ('$ref' in content.schema) {
      schemaName = this.extractSchemaNameFromRef(content.schema.$ref);
    }
    
    const schema = this.schemaProcessor.processSchema('body', content.schema as OpenAPIV3.SchemaObject);
    return { schema, schemaName };
  }

  /**
   * Extracts the schema name from a $ref string.
   * 
   * @param ref - The $ref string (e.g., '#/components/schemas/User')
   * @returns The schema name (e.g., 'User'), or undefined if invalid
   */
  private extractSchemaNameFromRef(ref: string): string | undefined {
    if (!ref.startsWith('#/components/schemas/') && !ref.startsWith('#/definitions/')) {
      return undefined;
    }
    
    const parts = ref.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Processes a ResponsesObject and extracts schemas for all responses.
   * 
   * Iterates over all status codes in the ResponsesObject, checking x-uigen-ignore
   * annotations on both response objects and resolved $ref targets. Selects appropriate
   * content types and delegates schema conversion to SchemaProcessor.
   * 
   * Processing flow for each response:
   * 1. Check x-uigen-ignore annotation on response object
   * 2. If response is a $ref, resolve it and check annotation on target
   * 3. Select content type using pickContent()
   * 4. Extract schema from selected content
   * 5. Delegate to SchemaProcessor.processSchema() with "response" as key
   * 6. Preserve response description
   * 
   * @param responses - The ResponsesObject containing all responses
   * @returns Record mapping status codes to response objects with description and schema
   * 
   * @example
   * ```typescript
   * const responses = {
   *   '200': {
   *     description: 'Success',
   *     content: {
   *       'application/json': {
   *         schema: { type: 'object', properties: { id: { type: 'string' } } }
   *       }
   *     }
   *   },
   *   '404': { description: 'Not found' }
   * };
   * const processed = processResponses(responses);
   * // Returns { '200': { description: 'Success', schema: SchemaNode }, '404': { description: 'Not found' } }
   * ```
   * 
   * Behavior:
   * - Skips responses with x-uigen-ignore: true
   * - Skips responses with unresolvable $ref
   * - Preserves descriptions even when schema is undefined
   * - Continues processing other responses when one is ignored
   * - Returns empty object for invalid or empty ResponsesObject
   */
  processResponses(
    responses: OpenAPIV3.ResponsesObject
  ): Record<string, { description?: string; schema?: SchemaNode }> {
    const result: Record<string, { description?: string; schema?: SchemaNode }> = {};
    
    // Handle invalid or empty ResponsesObject
    if (!responses || typeof responses !== 'object') return result;

    for (const [code, response] of Object.entries(responses)) {
      // Check x-uigen-ignore annotation on the response object itself
      const responseIgnoreAnnotation = this.checkIgnoreAnnotation(response);
      
      if (responseIgnoreAnnotation === true) {
        console.info(`Response ${code} ignored due to x-uigen-ignore annotation`);
        continue;
      }
      
      // Handle $ref responses
      if ('$ref' in response) {
        const rawResponse = this.resolveResponseRef(response.$ref);
        
        if (rawResponse) {
          const refIgnoreAnnotation = this.checkIgnoreAnnotation(rawResponse);
          
          if (refIgnoreAnnotation === true) {
            console.info(`Response ${code} $ref target ignored: ${response.$ref}`);
            continue;
          }
          
          // Process the resolved response
          const content = this.pickContent(rawResponse.content);
          
          result[code] = {
            description: rawResponse.description,
            schema: content?.schema ? this.schemaProcessor.processSchema('response', content.schema as OpenAPIV3.SchemaObject) : undefined
          };
        }
        
        // If reference cannot be resolved, skip this response
        continue;
      }
      
      // Handle inline responses
      const content = this.pickContent(response.content);
      
      result[code] = {
        description: response.description,
        schema: content?.schema ? this.schemaProcessor.processSchema('response', content.schema as OpenAPIV3.SchemaObject) : undefined
      };
    }
    
    return result;
  }

  /**
   * Checks if a schema contains file fields.
   * 
   * Delegates to FileMetadataVisitor to detect file upload fields in the schema.
   * File fields are typically indicated by format: 'binary' or type: 'string' with
   * contentMediaType, or other file-related patterns.
   * 
   * @param schema - The SchemaNode to check for file fields
   * @returns true if schema contains file fields, false otherwise
   * 
   * @example
   * ```typescript
   * const schema = {
   *   key: 'body',
   *   type: 'object',
   *   children: [
   *     { key: 'avatar', type: 'string', fileMetadata: { ... } }
   *   ]
   * };
   * const hasFiles = hasFileFields(schema);
   * // Returns true
   * ```
   */
  hasFileFields(schema: SchemaNode): boolean {
    return this.fileMetadataVisitor.hasFileFields(schema);
  }

  /**
   * Determines the appropriate content type for a request body.
   * 
   * Implements special handling for file uploads by preferring multipart/form-data
   * when file fields are detected. Falls back to standard content type prioritization
   * for non-file operations.
   * 
   * Priority logic:
   * 1. If schema has file fields AND multipart/form-data is available → multipart/form-data
   * 2. If multipart/form-data is explicitly in content → multipart/form-data
   * 3. If schema has file fields but multipart/form-data not available → multipart/form-data (override)
   * 4. If application/json is available → application/json
   * 5. If application/x-www-form-urlencoded is available → application/x-www-form-urlencoded
   * 6. First available content type (fallback)
   * 
   * @param content - Record of content types to MediaTypeObjects
   * @param schema - The request body schema (used for file field detection)
   * @returns The determined content type string, or undefined if no content
   * 
   * @example
   * ```typescript
   * const content = {
   *   'application/json': { schema: {...} },
   *   'multipart/form-data': { schema: {...} }
   * };
   * const schema = { key: 'body', type: 'object', fileMetadata: {...} };
   * const contentType = determineRequestContentType(content, schema);
   * // Returns 'multipart/form-data' because schema has file fields
   * ```
   */
  determineRequestContentType(
    content: Record<string, OpenAPIV3.MediaTypeObject> | undefined,
    schema: SchemaNode | undefined
  ): string | undefined {
    if (!content) return undefined;
    
    const hasFileFields = schema ? this.hasFileFields(schema) : false;
    
    // Prefer multipart/form-data when file fields are present
    if (hasFileFields && content['multipart/form-data']) {
      return 'multipart/form-data';
    }
    // Preserve explicit multipart/form-data from spec
    else if (content['multipart/form-data']) {
      return 'multipart/form-data';
    }
    // Set multipart/form-data when file fields are present but not explicitly specified
    else if (hasFileFields) {
      return 'multipart/form-data';
    }
    // Fall back to existing logic for non-file operations
    else if (content['application/json']) {
      return 'application/json';
    }
    else if (content['application/x-www-form-urlencoded']) {
      return 'application/x-www-form-urlencoded';
    }
    else {
      return Object.keys(content)[0];
    }
  }
}
