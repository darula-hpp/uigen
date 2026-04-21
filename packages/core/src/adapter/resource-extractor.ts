import type { OpenAPIV3 } from 'openapi-types';
import type {
  UIGenApp,
  Resource,
  Operation,
  SchemaNode,
  HttpMethod,
  Relationship,
  PaginationHint,
  ViewHint,
} from '../ir/types.js';
import type { RelationshipConfig } from '../config/types.js';
import type { AdapterUtils } from './annotations/index.js';
import { AnnotationHandlerRegistry, createOperationContext } from './annotations/index.js';
import { ViewHintClassifier } from './view-hint-classifier.js';
import { RelationshipDetector } from './relationship-detector.js';
import { PaginationDetector } from './pagination-detector.js';
import { SchemaProcessor } from './schema-processor.js';
import { deriveRelationshipType } from './relationship-type-deriver.js';

/**
 * Callback type for adapting OpenAPI operations to IR operations.
 * This allows Resource_Extractor to delegate operation construction
 * back to OpenAPI3Adapter without creating circular dependencies.
 * 
 * Returns undefined if the operation should be ignored (e.g., due to x-uigen-ignore annotation).
 */
export type OperationAdapter = (
  method: HttpMethod,
  path: string,
  operation: OpenAPIV3.OperationObject,
  pathItem?: OpenAPIV3.PathItemObject
) => Operation | undefined;

/**
 * Resource_Extractor handles resource inference and extraction from OpenAPI specifications.
 * 
 * Responsibilities:
 * - Infer resource names from API paths
 * - Group operations by resource
 * - Extract and merge schemas from operations
 * - Detect relationships between resources
 * - Detect pagination strategies
 * - Ensure unique operation IDs
 * 
 * This component is part of the adapter refactoring (Phase 3) to separate
 * resource extraction logic from the main OpenAPI3Adapter class.
 * 
 * @example
 * ```typescript
 * const extractor = new Resource_Extractor(
 *   spec,
 *   adapterUtils,
 *   annotationRegistry,
 *   viewHintClassifier,
 *   relationshipDetector,
 *   paginationDetector,
 *   schemaProcessor
 * );
 * extractor.setCurrentIR(ir);
 * const resources = extractor.extractResources(adaptOperation);
 * ```
 */
export class Resource_Extractor {
  private spec: OpenAPIV3.Document;
  private adapterUtils: AdapterUtils;
  private annotationRegistry: AnnotationHandlerRegistry;
  private viewHintClassifier: ViewHintClassifier;
  private relationshipDetector: RelationshipDetector;
  private paginationDetector: PaginationDetector;
  private schemaProcessor: SchemaProcessor;
  private currentIR?: UIGenApp;

  /**
   * Creates a new Resource_Extractor instance.
   * 
   * @param spec - The OpenAPI 3.x document to extract resources from
   * @param adapterUtils - Utility methods (humanize, resolveRef, logError, logWarning)
   * @param annotationRegistry - Registry for processing vendor extensions (x-uigen-*)
   * @param viewHintClassifier - Classifier for determining operation view hints
   * @param relationshipDetector - Detector for resource relationships
   * @param paginationDetector - Detector for pagination strategies
   * @param schemaProcessor - Processor for converting OpenAPI schemas to IR SchemaNodes
   */
  constructor(
    spec: OpenAPIV3.Document,
    adapterUtils: AdapterUtils,
    annotationRegistry: AnnotationHandlerRegistry,
    viewHintClassifier: ViewHintClassifier,
    relationshipDetector: RelationshipDetector,
    paginationDetector: PaginationDetector,
    schemaProcessor: SchemaProcessor
  ) {
    this.spec = spec;
    this.adapterUtils = adapterUtils;
    this.annotationRegistry = annotationRegistry;
    this.viewHintClassifier = viewHintClassifier;
    this.relationshipDetector = relationshipDetector;
    this.paginationDetector = paginationDetector;
    this.schemaProcessor = schemaProcessor;
  }

  /**
   * Set the current IR being built.
   * 
   * The annotation registry and other components need access to the UIGenApp IR object.
   * This method allows the OpenAPI3Adapter to pass the IR after it has been initialized.
   * 
   * @param ir - The UIGenApp IR object currently being built
   */
  setCurrentIR(ir: UIGenApp): void {
    this.currentIR = ir;
  }

  /**
   * Extract all resources from the OpenAPI specification.
   * 
   * This is the main entry point for resource extraction. It:
   * 1. Infers resource names from API paths
   * 2. Groups operations by resource
   * 3. Extracts and merges schemas from operations
   * 4. Detects relationships between resources (config-driven or heuristic)
   * 5. Detects pagination strategies
   * 6. Ensures unique operation IDs
   * 
   * @param adaptOperation       - Callback to adapt OpenAPI operations to IR operations
   * @param configRelationships  - Optional explicit relationship declarations from config.
   *                               When non-empty, heuristic detection is skipped entirely.
   * @returns Array of extracted resources with operations, schemas, and relationships
   */
  extractResources(adaptOperation: OperationAdapter, configRelationships?: RelationshipConfig[]): Resource[] {
    // Group operations by resource
    const resourceMap = this.groupOperationsByResource(adaptOperation);
    
    // Extract and merge schemas from operations
    for (const resource of resourceMap.values()) {
      for (const operation of resource.operations) {
        // Extract schema from operation based on view hint
        const schema = this.extractSchemaFromOperation(operation, operation.viewHint);
        
        // Merge schema into resource schema
        if (schema) {
          resource.schema = this.mergeSchemas(resource.schema, schema);
        }
        
        // For create and update operations, also merge response schema
        if (operation.viewHint === 'create' || operation.viewHint === 'update') {
          const responseSchema = operation.responses['200']?.schema || operation.responses['201']?.schema;
          if (responseSchema) {
            resource.schema = this.mergeSchemas(resource.schema, responseSchema);
          }
        }
      }
      
      // Extract schema name from operations
      for (const operation of resource.operations) {
        // Find the corresponding OpenAPI operation to extract schema name
        for (const [path, pathItem] of Object.entries(this.spec.paths)) {
          if (!pathItem) continue;
          
          for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
            const opObj = pathItem[method] as OpenAPIV3.OperationObject | undefined;
            if (!opObj) continue;
            
            const opId = opObj.operationId || `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
            if (operation.id === opId || operation.id.startsWith(opId)) {
              const schemaName = this.extractSchemaNameFromResponse(opObj, method);
              if (schemaName) {
                resource.schemaName = schemaName;
                break;
              }
            }
          }
          
          if (resource.schemaName) break;
        }
        
        if (resource.schemaName) break;
      }
    }
    
    // Filter out resources with no operations
    const resourcesWithOperations = Array.from(resourceMap.values()).filter(r => r.operations.length > 0);
    
    // Log warning if all resources were filtered out
    if (resourcesWithOperations.length === 0 && resourceMap.size > 0) {
      console.warn('All operations were ignored - no resources will be generated');
    }
    
    // Detect relationships and pagination
    const allRelationships: Relationship[] = [];

    const useConfigRelationships = Array.isArray(configRelationships) && configRelationships.length > 0;

    if (useConfigRelationships) {
      // Config-driven path: map each RelationshipConfig to IR Relationship, skip heuristics
      for (const resource of resourcesWithOperations) {
        const resourceEntries = configRelationships!.filter(
          (e) => e.source === resource.slug
        );

        const irRelationships: Relationship[] = [];

        for (const entry of resourceEntries) {
          // Validate that the target resource exists
          if (!resourceMap.has(entry.target)) {
            console.warn(
              `[Resource_Extractor] Relationship config references unknown target slug ` +
                `"${entry.target}" (source: "${entry.source}"). Omitting relationship.`
            );
            continue;
          }

          // Use explicit type if present, otherwise derive from path
          let type: 'hasMany' | 'belongsTo' | 'manyToMany';
          
          if (entry.type) {
            // Explicit type provided - use directly
            type = entry.type;
          } else {
            // Fallback to path-based derivation for backward compatibility
            console.warn(
              `[Resource_Extractor] Relationship ${entry.source} -> ${entry.target} missing explicit type. ` +
              `Deriving from path. Consider adding an explicit type field.`
            );
            type = deriveRelationshipType(
              entry.path,
              entry.source,
              entry.target,
              configRelationships!
            );
          }

          // isReadOnly: true when no write operations exist on the path
          const hasWriteOp = resourcesWithOperations.some((r) =>
            r.operations.some(
              (op) =>
                op.path === entry.path &&
                (op.method === 'POST' || op.method === 'PUT' || op.method === 'PATCH' || op.method === 'DELETE')
            )
          );

          irRelationships.push({
            target: entry.target,
            type,
            path: entry.path,
            isReadOnly: !hasWriteOp,
          });
        }

        resource.relationships = irRelationships;
        allRelationships.push(...irRelationships);

        // Detect pagination for each resource
        resource.pagination = this.detectPagination(resource);
      }
    } else {
      // Heuristic path (backward compatibility)
      for (const resource of resourcesWithOperations) {
        // Detect relationships for each resource
        resource.relationships = this.detectRelationships(resource, resourceMap);

        // Collect all relationships for library resource marking
        allRelationships.push(...resource.relationships);

        // Detect pagination for each resource
        resource.pagination = this.detectPagination(resource);
      }

      // Detect many-to-many relationships across all resources
      for (const resource of resourcesWithOperations) {
        const manyToManyRelationships = this.detectManyToManyAcrossResources(
          resource,
          resourcesWithOperations,
          resourceMap
        );

        // Merge many-to-many relationships with existing relationships
        resource.relationships = [
          ...resource.relationships,
          ...manyToManyRelationships,
        ];

        // Collect all relationships for library resource marking
        allRelationships.push(...manyToManyRelationships);
      }
    }
    
    // Mark library resources after all relationships are detected
    this.relationshipDetector.markLibraryResources(resourceMap, allRelationships);
    
    // Ensure operation IDs are unique across all resources
    this.ensureUniqueOperationIds(resourcesWithOperations);
    
    return resourcesWithOperations;
  }

  /**
   * Group operations by their inferred resource name.
   * 
   * This method:
   * 1. Iterates through all paths in the OpenAPI spec
   * 2. Infers resource name for each path
   * 3. Creates resource objects for each unique resource name
   * 4. Adapts operations using the provided callback
   * 5. Processes annotations for each operation
   * 6. Filters out ignored operations
   * 7. Groups operations by resource
   * 
   * @param adaptOperation - Callback to adapt OpenAPI operations to IR operations
   * @returns Map of resource slug to Resource object
   */
  private groupOperationsByResource(adaptOperation: OperationAdapter): Map<string, Resource> {
    const resourceMap = new Map<string, Resource>();

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      const resourceName = this.inferResourceName(path);
      if (!resourceName) continue;

      // Create resource if it doesn't exist
      if (!resourceMap.has(resourceName)) {
        // Extract x-uigen-id vendor extension from path item if present, fall back to slug
        const vendorExtension = (pathItem as any)['x-uigen-id'];
        
        // Handle numeric x-uigen-id by converting to string
        let uigenId: string;
        if (typeof vendorExtension === 'number') {
          uigenId = String(vendorExtension);
        } else {
          uigenId = vendorExtension || resourceName;
        }
        
        resourceMap.set(resourceName, {
          name: this.capitalize(resourceName),
          slug: resourceName,
          uigenId: uigenId,
          operations: [],
          schema: this.createPlaceholderSchema(resourceName),
          relationships: [],
          pagination: undefined
        });
      }

      const resource = resourceMap.get(resourceName)!;

      // Process each HTTP method for this path
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        try {
          // Adapt the operation using the callback
          const op = adaptOperation(method.toUpperCase() as HttpMethod, path, operation, pathItem);
          
          // Skip if operation should be ignored (returns undefined)
          if (!op) {
            console.log(`Ignoring operation: ${method.toUpperCase()} ${path}`);
            continue;
          }
          
          // Process annotations using the registry
          if (this.currentIR) {
            const context = createOperationContext(
              operation,
              pathItem,
              path,
              method.toUpperCase() as HttpMethod,
              this.adapterUtils,
              this.currentIR,
              resource,
              op
            );
            this.annotationRegistry.processAnnotations(context);
          }

          // Add operation to resource
          resource.operations.push(op);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Failed to parse operation ${method.toUpperCase()} ${path}:`, errorMessage);
          this.adapterUtils.logError({ 
            path, 
            method: method.toUpperCase(), 
            error: errorMessage 
          });
        }
      }
    }

    return resourceMap;
  }

  /**
   * Infer resource name from an API path.
   * 
   * Algorithm:
   * 1. Split path by '/' and filter out empty segments and path parameters
   * 2. Skip version prefix (v1, v2, etc.) if present
   * 3. Return the deepest (last) static segment as the resource name
   * 
   * Examples:
   * - /v1/Services → Services
   * - /v1/Services/{sid} → Services
   * - /v1/Services/{sid}/AlphaSenders → AlphaSenders
   * - /{id} → null
   * 
   * @param path - The API path to analyze
   * @returns The inferred resource name, or null if no static segments exist
   */
  private inferResourceName(path: string): string | null {
    // Split path by '/' and filter out empty segments and path parameters (starting with '{')
    const segments = path.split('/').filter(s => s && !s.startsWith('{'));

    // Skip version prefix (v1, v2, etc.)
    const versionPrefixPattern = /^v\d+$/i;
    if (segments.length > 0 && versionPrefixPattern.test(segments[0])) {
      segments.shift();
    }

    // Return null if no static segments remain
    if (segments.length === 0) return null;

    // Use the deepest static segment as the resource name.
    // This correctly separates sub-resources:
    //   /v1/Services              -> Services
    //   /v1/Services/{sid}        -> Services
    //   /v1/Services/{sid}/AlphaSenders -> AlphaSenders
    //   /v1/Services/{sid}/AlphaSenders/{sid} -> AlphaSenders
    return segments[segments.length - 1];
  }

  /**
   * Extract schema from an operation based on its view hint.
   * 
   * This method extracts schemas from operation responses and request bodies:
   * - For 'detail' and 'list' operations: extract from response (200, 201)
   * - For 'create' and 'update' operations: extract from both request body and response
   * 
   * The extracted schema is used to build the complete resource schema by merging
   * schemas from multiple operations.
   * 
   * @param operation - The IR Operation object with responses and requestBody
   * @param viewHint - The classified view hint for this operation
   * @returns The extracted SchemaNode, or undefined if no schema found
   * 
   * @example
   * ```typescript
   * const schema = this.extractSchemaFromOperation(operation, 'detail');
   * if (schema) {
   *   resource.schema = this.mergeSchemas(resource.schema, schema);
   * }
   * ```
   */
  private extractSchemaFromOperation(operation: Operation, viewHint: ViewHint): SchemaNode | undefined {
    // For detail and list operations, extract from response
    if (viewHint === 'detail' || viewHint === 'list') {
      return operation.responses['200']?.schema || operation.responses['201']?.schema;
    }
    
    // For create and update operations, we'll merge both request body and response
    // The caller should handle merging both schemas
    if (viewHint === 'create' || viewHint === 'update') {
      // Return request body schema first, caller will also merge response schema
      return operation.requestBody;
    }
    
    return undefined;
  }

  /**
   * Extract the schema name from a response $ref.
   * 
   * This method looks at the response schemas (200, 201) and extracts the schema name
   * from $ref paths. The schema name is used for deterministic resource identification.
   * 
   * Handles:
   * - Direct $ref in response schema: `{ $ref: "#/components/schemas/User" }`
   * - Array items with $ref: `{ type: "array", items: { $ref: "#/components/schemas/User" } }`
   * 
   * @param operation - The OpenAPI operation object
   * @param method - The HTTP method (for logging purposes)
   * @returns The extracted schema name (e.g., "User"), or null if not found
   * 
   * @example
   * ```typescript
   * const schemaName = this.extractSchemaNameFromResponse(operation, 'get');
   * if (schemaName) {
   *   resource.schemaName = schemaName;
   * }
   * ```
   */
  private extractSchemaNameFromResponse(operation: OpenAPIV3.OperationObject, method: string): string | null {
    // Check 200 and 201 responses
    const response200 = operation.responses?.['200'] as OpenAPIV3.ResponseObject | undefined;
    const response201 = operation.responses?.['201'] as OpenAPIV3.ResponseObject | undefined;
    const response = response200 || response201;
    
    if (!response) return null;
    
    // Get content using the same logic as OpenAPI3Adapter
    const content = this.pickContent(response.content);
    if (!content?.schema) return null;
    
    const schema = content.schema;
    
    // Handle direct $ref
    if ('$ref' in schema && typeof schema.$ref === 'string') {
      return this.extractSchemaNameFromRef(schema.$ref);
    }
    
    // Handle array of $ref
    if ('type' in schema && schema.type === 'array' && schema.items) {
      const items = schema.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
      if ('$ref' in items && typeof items.$ref === 'string') {
        return this.extractSchemaNameFromRef(items.$ref);
      }
    }
    
    return null;
  }

  /**
   * Extract schema name from a $ref string.
   * 
   * Supports both OpenAPI 3.x and Swagger 2.0 formats:
   * - OpenAPI 3.x: `#/components/schemas/SchemaName` → `SchemaName`
   * - Swagger 2.0: `#/definitions/SchemaName` → `SchemaName`
   * 
   * @param ref - The $ref string to parse
   * @returns The extracted schema name, or null if format not recognized
   * 
   * @example
   * ```typescript
   * const name = this.extractSchemaNameFromRef("#/components/schemas/Template");
   * // Returns: "Template"
   * ```
   */
  private extractSchemaNameFromRef(ref: string): string | null {
    // Handle #/components/schemas/SchemaName
    const componentsMatch = ref.match(/#\/components\/schemas\/([^/]+)$/);
    if (componentsMatch) {
      return componentsMatch[1];
    }
    
    // Handle #/definitions/SchemaName (Swagger 2.0)
    const definitionsMatch = ref.match(/#\/definitions\/([^/]+)$/);
    if (definitionsMatch) {
      return definitionsMatch[1];
    }
    
    return null;
  }

  /**
   * Pick the appropriate content type from response content.
   * 
   * Prefers application/json, falls back to first available content type.
   * This matches the logic in OpenAPI3Adapter.
   * 
   * @param content - The response content object
   * @returns The selected media type object, or undefined if no content
   */
  private pickContent(content?: { [media: string]: OpenAPIV3.MediaTypeObject }): OpenAPIV3.MediaTypeObject | undefined {
    if (!content) return undefined;
    
    // Prefer application/json
    if (content['application/json']) {
      return content['application/json'];
    }
    
    // Fall back to first available content type
    const firstKey = Object.keys(content)[0];
    return firstKey ? content[firstKey] : undefined;
  }

  /**
   * Merge two schemas by combining their fields.
   * 
   * Algorithm:
   * 1. Unwrap array schemas before merging (merge array items)
   * 2. If base schema is empty object, return update schema
   * 3. If update is not an object or has no children, return base schema
   * 4. Merge object schemas by combining children
   * 5. Preserve existing fields from base schema
   * 6. Add new fields from update schema
   * 7. Recursively merge nested object schemas
   * 8. Use hasMoreDetails() to decide which field to keep when both exist
   * 
   * @param base - The base schema to merge into
   * @param update - The schema to merge from
   * @returns The merged schema
   * 
   * @example
   * ```typescript
   * const base = { type: 'object', key: 'user', children: [{ key: 'id', type: 'string' }] };
   * const update = { type: 'object', key: 'user', children: [{ key: 'name', type: 'string' }] };
   * const merged = this.mergeSchemas(base, update);
   * // Result: { type: 'object', key: 'user', children: [{ key: 'id' }, { key: 'name' }] }
   * ```
   */
  private mergeSchemas(base: SchemaNode, update: SchemaNode): SchemaNode {
    // Handle array unwrapping: if update schema is array, unwrap to merge items
    if (update.type === 'array' && update.items) {
      return this.mergeSchemas(base, update.items);
    }
    
    // Handle empty base schema: return update schema
    if (base.type === 'object' && (!base.children || base.children.length === 0)) {
      return update;
    }
    
    // Handle type mismatches: return base schema if update is not object
    if (update.type !== 'object' || !update.children || update.children.length === 0) {
      return base;
    }

    // Merge object schemas by combining children
    const mergedChildren = [...(base.children || [])];
    const existingKeys = new Set(mergedChildren.map(c => c.key));

    for (const updateChild of update.children) {
      if (!existingKeys.has(updateChild.key)) {
        // Add new fields from update schema
        mergedChildren.push(updateChild);
      } else {
        // Field exists in both schemas
        const existingIndex = mergedChildren.findIndex(c => c.key === updateChild.key);
        const existing = mergedChildren[existingIndex];
        
        // Recursively merge nested object schemas
        if (existing.type === 'object' && updateChild.type === 'object' && existing.children && updateChild.children) {
          mergedChildren[existingIndex] = this.mergeSchemas(existing, updateChild);
        } else if (this.hasMoreDetails(updateChild, existing)) {
          // Use hasMoreDetails() to decide which field to keep
          mergedChildren[existingIndex] = updateChild;
        }
      }
    }

    return { ...base, children: mergedChildren };
  }

  /**
   * Determine if one schema node has more details than another.
   * 
   * Detail scoring algorithm:
   * - +1 for each validation rule
   * - +1 for description presence
   * - +1 for format presence
   * - +1 for each enum value
   * 
   * @param a - First schema node
   * @param b - Second schema node
   * @returns True if first schema has more details than second
   * 
   * @example
   * ```typescript
   * const detailed = { type: 'string', key: 'email', format: 'email', description: 'User email' };
   * const simple = { type: 'string', key: 'email' };
   * this.hasMoreDetails(detailed, simple); // Returns: true
   * ```
   */
  private hasMoreDetails(a: SchemaNode, b: SchemaNode): boolean {
    const score = (n: SchemaNode) => 
      (n.validations?.length || 0) + 
      (n.description ? 1 : 0) + 
      (n.format ? 1 : 0) + 
      (n.enumValues?.length || 0);
    return score(a) > score(b);
  }

  /**
   * Create a placeholder schema node for resources with no schema information.
   * 
   * @param key - The schema key name
   * @returns A minimal SchemaNode with type 'object' and empty children
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

  /**
   * Ensure operation IDs are unique across all resources.
   * 
   * This method tracks used operation IDs and appends a counter (_1, _2, etc.)
   * to make duplicate IDs unique.
   * 
   * @param resources - Array of all resources with operations
   * 
   * @example
   * ```typescript
   * this.ensureUniqueOperationIds(resources);
   * // If "getUsers" appears twice, the second becomes "getUsers_1"
   * ```
   */
  private ensureUniqueOperationIds(resources: Resource[]): void {
    const usedIds = new Set<string>();
    
    for (const resource of resources) {
      for (const operation of resource.operations) {
        let uniqueId = operation.id;
        let counter = 1;
        
        // Keep appending counter until we find a unique ID
        while (usedIds.has(uniqueId)) {
          uniqueId = `${operation.id}_${counter}`;
          counter++;
        }
        
        // Update operation ID with unique value
        operation.id = uniqueId;
        usedIds.add(uniqueId);
      }
    }
  }

  /**
   * Detect pagination strategy for a resource.
   * 
   * This method finds the list operation for the resource and delegates to
   * PaginationDetector to analyze the operation parameters for pagination patterns.
   * 
   * @param resource - The resource to detect pagination for
   * @returns PaginationHint if pagination detected, undefined otherwise
   * 
   * @example
   * ```typescript
   * const pagination = this.detectPagination(userResource);
   * // Returns: { type: 'offset', limitParam: 'limit', offsetParam: 'offset' }
   * ```
   */
  private detectPagination(resource: Resource): PaginationHint | undefined {
    // Find list operation for the resource
    const listOp = resource.operations.find(op => op.viewHint === 'list' || op.viewHint === 'search');
    if (!listOp) return undefined;
    
    // Call PaginationDetector with list operation parameters
    return this.paginationDetector.detect(listOp.parameters) || undefined;
  }

  /**
   * Detect relationships for a resource.
   * 
   * This method combines path-based and schema-based relationship detection:
   * - Path-based: Detects relationships from URL patterns (e.g., /users/{id}/posts)
   * - Schema-based: Detects relationships from schema references (e.g., userId field)
   * 
   * @param resource - The resource to detect relationships for
   * @param resourceMap - Map of all resources by slug
   * @returns Array of detected relationships
   * 
   * @example
   * ```typescript
   * const relationships = this.detectRelationships(userResource, resourceMap);
   * // Returns: [{ target: 'posts', type: 'oneToMany', path: '/users/{id}/posts' }]
   * ```
   */
  private detectRelationships(resource: Resource, resourceMap: Map<string, Resource>): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Detect path-based relationships
    const pathRelationships = this.relationshipDetector.detectFromPaths(resource, resourceMap);
    relationships.push(...pathRelationships);
    
    // Detect schema-based relationships
    const schemaRelationships = this.relationshipDetector.detectFromSchema(resource.schema, resourceMap);
    relationships.push(...schemaRelationships);
    
    return relationships;
  }

  /**
   * Detect many-to-many relationships by looking at operations across all resources.
   * 
   * This is necessary because the OpenAPI3Adapter creates separate resources for sub-resources,
   * so operations for /consumer/{id}/library are added to the library resource, not the consumer resource.
   * 
   * Algorithm:
   * 1. For each resource (consumer), scan ALL resources for operations matching /consumerSlug/{id}/targetSlug
   * 2. Verify target resource exists (with slug normalization for singular/plural)
   * 3. Verify target has standalone collection endpoint (GET /targetSlug)
   * 4. Verify target has standalone creation endpoint (POST /targetSlug)
   * 5. Verify association endpoint has GET operation (list associations)
   * 6. Check for POST or DELETE operations on association endpoint
   * 7. Mark relationship as read-only if no POST or DELETE operations exist
   * 8. Avoid duplicate relationships
   * 
   * @param consumerResource - The potential consumer resource
   * @param allResources - Array of all resources
   * @param resourceMap - Map of all resources by slug
   * @returns Array of detected many-to-many relationships
   * 
   * @example
   * ```typescript
   * const relationships = this.detectManyToManyAcrossResources(
   *   projectResource,
   *   allResources,
   *   resourceMap
   * );
   * // Returns: [{ target: 'tags', type: 'manyToMany', path: '/projects/{id}/tags', isReadOnly: false }]
   * ```
   */
  private detectManyToManyAcrossResources(
    consumerResource: Resource,
    allResources: Resource[],
    resourceMap: Map<string, Resource>
  ): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Look for operations in ANY resource that match /consumerSlug/{id}/targetSlug
    const escapedSlug = consumerResource.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^/${escapedSlug}/\\{[^}]+\\}/([^/]+)$`);
    
    for (const resource of allResources) {
      // Group operations by path
      const pathOperations = new Map<string, Operation[]>();
      for (const op of resource.operations) {
        const existing = pathOperations.get(op.path) || [];
        existing.push(op);
        pathOperations.set(op.path, existing);
      }
      
      // Check each path for many-to-many pattern
      for (const [path, operations] of pathOperations.entries()) {
        const match = path.match(pattern);
        if (!match) continue;
        
        const targetSlug = match[1];
        
        // Verify the target resource exists
        let targetResource: Resource | undefined = resourceMap.get(targetSlug);
        let actualTargetSlug = targetSlug;
        
        // If not found directly, try to find by normalized slug
        if (!targetResource) {
          for (const [slug, res] of resourceMap.entries()) {
            if (this.relationshipDetector.slugsMatch(targetSlug, slug)) {
              targetResource = res;
              actualTargetSlug = slug;
              break;
            }
          }
        }
        
        if (!targetResource) continue;
        
        // Verify target resource has standalone collection endpoint (GET /targetSlug)
        const hasCollectionEndpoint = targetResource.operations.some(
          op => op.path === `/${actualTargetSlug}` && op.method === 'GET'
        );
        if (!hasCollectionEndpoint) continue;
        
        // Verify target resource has standalone creation endpoint (POST /targetSlug)
        const hasCreationEndpoint = targetResource.operations.some(
          op => op.path === `/${actualTargetSlug}` && op.method === 'POST'
        );
        if (!hasCreationEndpoint) continue;
        
        // Check for GET operation on association endpoint (list associations)
        const hasGetOperation = operations.some(op => op.method === 'GET');
        if (!hasGetOperation) continue;
        
        // Check for POST or DELETE operations on association endpoint
        const hasPostOperation = operations.some(op => op.method === 'POST');
        const hasDeleteOperation = operations.some(op => op.method === 'DELETE');
        const isReadOnly = !hasPostOperation && !hasDeleteOperation;
        
        // Avoid duplicates
        const exists = relationships.some(
          r => r.target === actualTargetSlug && r.type === 'manyToMany'
        );
        
        if (!exists) {
          relationships.push({
            target: actualTargetSlug,
            type: 'manyToMany',
            path: path,
            isReadOnly: isReadOnly
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Capitalize the first letter of a string.
   * 
   * @param str - The string to capitalize
   * @returns The capitalized string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
