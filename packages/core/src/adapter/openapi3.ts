import type { OpenAPIV3 } from 'openapi-types';
import type {
  UIGenApp,
  Resource,
  Operation,
  SchemaNode,
  HttpMethod,
  Parameter,
  AuthScheme,
  ServerConfig,
  Relationship,
  PaginationHint,
  ParsingError,
} from '../ir/types.js';
import { SchemaResolver } from './schema-resolver.js';
import { ViewHintClassifier } from './view-hint-classifier.js';
import { RelationshipDetector } from './relationship-detector.js';
import { PaginationDetector } from './pagination-detector.js';
import { AnnotationHandlerRegistry, createOperationContext, createSchemaContext, createServerContext } from './annotations/index.js';
import type { AdapterUtils } from './annotations/index.js';
import { SchemaProcessor } from './schema-processor.js';
import { DefaultFileMetadataVisitor } from './visitors/file-metadata-visitor.js';
import { Authentication_Detector } from './auth-detector.js';

export class OpenAPI3Adapter {
  private spec: OpenAPIV3.Document;
  private resolver: SchemaResolver;
  private viewHintClassifier: ViewHintClassifier;
  private relationshipDetector: RelationshipDetector;
  private paginationDetector: PaginationDetector;
  private parsingErrors: ParsingError[] = [];
  private annotationRegistry: AnnotationHandlerRegistry;
  private adapterUtils: AdapterUtils;
  private currentIR?: UIGenApp;
  private schemaProcessor: SchemaProcessor;
  private fileMetadataVisitor: DefaultFileMetadataVisitor;
  private authDetector: Authentication_Detector;

  /**
   * Pick the best available content schema from a content map.
   * Prefers JSON, then form-encoded, then multipart, then the first available.
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

  constructor(spec: OpenAPIV3.Document) {
    this.spec = spec;
    this.viewHintClassifier = new ViewHintClassifier();
    this.relationshipDetector = new RelationshipDetector();
    this.paginationDetector = new PaginationDetector();
    this.annotationRegistry = AnnotationHandlerRegistry.getInstance();
    
    // Create adapter utils for annotation handlers
    this.adapterUtils = {
      humanize: this.humanize.bind(this),
      resolveRef: (ref: string) => this.resolveRef(ref),
      logError: (error: ParsingError) => this.parsingErrors.push(error),
      logWarning: (message: string) => console.warn(message)
    };
    
    // Instantiate SchemaProcessor
    this.schemaProcessor = new SchemaProcessor(
      spec,
      this.adapterUtils,
      this.annotationRegistry
    );
    
    // Create SchemaResolver with schemaProcessor.processSchema as the callback
    this.resolver = new SchemaResolver(spec, this.schemaProcessor.processSchema.bind(this.schemaProcessor));
    
    // Instantiate FileMetadataVisitor for hasFileFields delegation
    this.fileMetadataVisitor = new DefaultFileMetadataVisitor();
    
    // Instantiate Authentication_Detector
    this.authDetector = new Authentication_Detector(
      spec,
      this.adapterUtils,
      this.annotationRegistry,
      this.schemaProcessor
    );
  }

  adapt(): UIGenApp {
    this.currentIR = {
      meta: this.extractMeta(),
      resources: [],
      auth: this.extractAuth(),
      dashboard: { enabled: true, widgets: [] },
      servers: this.extractServers(),
      parsingErrors: this.parsingErrors.length > 0 ? this.parsingErrors : undefined
    };
    
    // Set currentIR on schemaProcessor so annotations can be processed
    this.schemaProcessor.setCurrentIR(this.currentIR);
    
    // Process server annotations after IR is initialized
    this.processServerAnnotations();
    
    // Extract resources after IR is initialized
    this.currentIR.resources = this.extractResources();
    
    return this.currentIR;
  }

  private extractMeta() {
    return {
      title: this.spec.info.title,
      version: this.spec.info.version,
      description: this.spec.info.description
    };
  }

  private extractServers(): ServerConfig[] {
    if (!this.spec.servers || this.spec.servers.length === 0) {
      return [{ url: 'http://localhost:3000', description: 'Default' }];
    }
    return this.spec.servers.map(s => ({
      url: s.url,
      description: s.description
    }));
  }

  /**
   * Process annotations on server objects.
   * This must be called after the IR is initialized with servers.
   */
  private processServerAnnotations(): void {
    if (!this.spec.servers || this.spec.servers.length === 0) {
      return;
    }

    // Process annotations for each server
    this.spec.servers.forEach((server) => {
      const context = createServerContext(
        server,
        this.adapterUtils,
        this.currentIR!
      );
      this.annotationRegistry.processAnnotations(context);
    });
  }

  private extractAuth() {
    const schemes: AuthScheme[] = [];
    const securitySchemes = this.spec.components?.securitySchemes || {};

    for (const [name, scheme] of Object.entries(securitySchemes)) {
      if ('type' in scheme) {
        if (scheme.type === 'http' && scheme.scheme === 'bearer') {
          schemes.push({ type: 'bearer', name, scheme: 'bearer', bearerFormat: scheme.bearerFormat });
        } else if (scheme.type === 'http' && scheme.scheme === 'basic') {
          schemes.push({ type: 'basic', name, scheme: 'basic' });
        } else if (scheme.type === 'apiKey') {
          schemes.push({ type: 'apiKey', name, in: scheme.in as 'header' | 'query' | 'cookie' });
        }
      }
    }

    // Delegate to Authentication_Detector
    const loginEndpoints = this.authDetector.detectLoginEndpoints();
    const refreshEndpoints = this.authDetector.detectRefreshEndpoints();
    const passwordResetEndpoints = this.authDetector.detectPasswordResetEndpoints();
    const signUpEndpoints = this.authDetector.detectSignUpEndpoints();

    return {
      schemes,
      globalRequired: !!this.spec.security && this.spec.security.length > 0,
      loginEndpoints,
      refreshEndpoints,
      passwordResetEndpoints: passwordResetEndpoints.length > 0 ? passwordResetEndpoints : undefined,
      signUpEndpoints: signUpEndpoints.length > 0 ? signUpEndpoints : undefined
    };
  }




  /**
   * Extract x-uigen-ignore annotation from a path item or operation.
   * Returns true for x-uigen-ignore: true, false for x-uigen-ignore: false,
   * and undefined for absent or non-boolean values.
   */
  private extractIgnoreAnnotation(obj: OpenAPIV3.PathItemObject | OpenAPIV3.OperationObject): boolean | undefined {
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
   * Determine if an operation should be ignored based on path-level and operation-level annotations.
   * Operation-level annotation takes precedence over path-level annotation.
   * 
   * Precedence rules:
   * - Operation has x-uigen-ignore: true → ignore
   * - Operation has x-uigen-ignore: false → include (overrides path-level)
   * - Path has x-uigen-ignore: true → ignore
   * - Path has x-uigen-ignore: false → include
   * - Neither has annotation → include (default behavior)
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
   * Check if a schema property should be ignored based on x-uigen-ignore annotation.
   * This is a convenience wrapper for property checking.
   * Delegates to SchemaProcessor.shouldIgnoreSchema().
   */
  private shouldIgnoreProperty(
    property: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): boolean {
    return this.schemaProcessor.shouldIgnoreSchema(property);
  }

  /**
   * Check if a schema contains file fields (including nested objects and arrays).
   * Delegates to FileMetadataVisitor.hasFileFields().
   * @param schema - The schema node to check
   * @returns True if the schema contains any file fields
   */
  private hasFileFields(schema: SchemaNode): boolean {
    return this.fileMetadataVisitor.hasFileFields(schema);
  }

  /**
   * Check if a parameter should be ignored based on x-uigen-ignore annotation.
   * Handles precedence: operation-level parameter > path-level parameter.
   * 
   * @param param - The parameter object to check
   * @param pathParams - Optional array of path-level parameters for precedence checking
   * @returns true if the parameter should be ignored, false otherwise
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
    
    // Check if there's a path-level parameter with the same name
    if (pathParams) {
      const pathParam = pathParams.find(p => p.name === param.name && p.in === param.in);
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

  
  

 

  private resolveRef(ref: string): OpenAPIV3.SchemaObject | null {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let current: any = this.spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current as OpenAPIV3.SchemaObject;
  }

  private extractResources(): Resource[] {
    const resourceMap = new Map<string, Resource>();

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      const resourceName = this.inferResourceName(path);
      if (!resourceName) continue;

      if (!resourceMap.has(resourceName)) {
        // Extract x-uigen-id vendor extension from path item if present, fall back to slug
        const vendorExtension = (pathItem as any)['x-uigen-id'];
        const uigenId = vendorExtension || resourceName;
        
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

      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        try {
          const op = this.adaptOperation(method.toUpperCase() as HttpMethod, path, operation, pathItem);
          
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
          
          // Check if operation should be ignored (set by IgnoreHandler)
          if ((op as any).__shouldIgnore) {
            console.log(`Ignoring operation: ${method.toUpperCase()} ${path}`);
            continue;
          }

          resource.operations.push(op);

          // Extract schema name from response for deterministic path resolution
          if (!resource.schemaName) {
            const responseSchema = op.responses['200']?.schema || op.responses['201']?.schema;
            if (responseSchema) {
              const schemaName = this.extractSchemaNameFromResponse(operation, method);
              if (schemaName) {
                resource.schemaName = schemaName;
              }
            }
          }

          if (op.viewHint === 'detail' || op.viewHint === 'list') {
            const responseSchema = op.responses['200']?.schema || op.responses['201']?.schema;
            if (responseSchema) resource.schema = this.mergeSchemas(resource.schema, responseSchema);
          }

          if (op.viewHint === 'create' || op.viewHint === 'update') {
            if (op.requestBody) resource.schema = this.mergeSchemas(resource.schema, op.requestBody);
            const responseSchema = op.responses['200']?.schema || op.responses['201']?.schema;
            if (responseSchema) resource.schema = this.mergeSchemas(resource.schema, responseSchema);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Failed to parse operation ${method.toUpperCase()} ${path}:`, errorMessage);
          this.parsingErrors.push({ path, method: method.toUpperCase(), error: errorMessage });
        }
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
    
    for (const resource of resourcesWithOperations) {
      resource.relationships = this.detectRelationships(resource, resourceMap);
      
      // Collect all relationships for library resource marking
      allRelationships.push(...resource.relationships);
      
      resource.pagination = this.detectPagination(resource);
    }
    
    // Detect many-to-many relationships across all resources
    // This needs to be done separately because operations for /consumer/{id}/library
    // are added to the library resource, not the consumer resource
    for (const resource of resourcesWithOperations) {
      const manyToManyRelationships = this.detectManyToManyAcrossResources(
        resource,
        resourcesWithOperations,
        resourceMap
      );
      
      // Merge many-to-many relationships with existing relationships
      resource.relationships = [
        ...resource.relationships,
        ...manyToManyRelationships
      ];
      
      // Collect all relationships for library resource marking
      allRelationships.push(...manyToManyRelationships);
    }
    
    // Mark library resources after all relationships are detected
    this.relationshipDetector.markLibraryResources(resourceMap, allRelationships);

    // Ensure operation IDs are unique
    const usedIds = new Set<string>();
    for (const resource of resourcesWithOperations) {
      for (const operation of resource.operations) {
        let uniqueId = operation.id;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
          uniqueId = `${operation.id}_${counter}`;
          counter++;
        }
        operation.id = uniqueId;
        usedIds.add(uniqueId);
      }
    }

    return resourcesWithOperations;
  }

  private adaptOperation(
    method: HttpMethod,
    path: string,
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): Operation {
    const pathParams = pathItem?.parameters;
    const parameters = this.adaptParameters(operation.parameters || [], pathParams);
    const requestBody = operation.requestBody ? this.adaptRequestBody(operation.requestBody) : undefined;

    let requestContentType: string | undefined;
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = operation.requestBody.content;
      const hasFileFields = requestBody ? this.hasFileFields(requestBody) : false;
      
      // Prefer multipart/form-data when file fields are present
      if (hasFileFields && content['multipart/form-data']) {
        requestContentType = 'multipart/form-data';
      }
      // Preserve explicit multipart/form-data from spec
      else if (content['multipart/form-data']) {
        requestContentType = 'multipart/form-data';
      }
      // Set multipart/form-data when file fields are present but not explicitly specified
      else if (hasFileFields) {
        requestContentType = 'multipart/form-data';
      }
      // Fall back to existing logic for non-file operations
      else if (content['application/json']) {
        requestContentType = 'application/json';
      }
      else if (content['application/x-www-form-urlencoded']) {
        requestContentType = 'application/x-www-form-urlencoded';
      }
      else {
        requestContentType = Object.keys(content)[0];
      }
    }

    const responses = this.adaptResponses(operation.responses);
    const viewHint = this.viewHintClassifier.classify(method, path, parameters, requestBody);

    const operationId = operation.operationId || `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
    
    // Extract x-uigen-id vendor extension from operation if present
    const vendorExtension = (operation as any)['x-uigen-id'];
    const uigenId = vendorExtension || operationId;

    return {
      id: operationId,
      uigenId: uigenId,
      method,
      path,
      summary: operation.summary,
      description: operation.description,
      parameters,
      requestBody,
      requestContentType,
      responses,
      viewHint,
      security: operation.security?.map(s => ({ name: Object.keys(s)[0], scopes: Object.values(s)[0] }))
    };
  }

  private adaptParameters(
    params: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[],
    pathParams?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]
  ): Parameter[] {
    // Resolve all references first
    const resolvedPathParams = (pathParams || [])
      .filter(p => p != null)
      .map(p => '$ref' in p ? this.resolveParameterRef(p.$ref) : p)
      .filter((p): p is OpenAPIV3.ParameterObject => p != null);

    const resolvedOperationParams = params
      .filter(p => p != null)
      .map(p => '$ref' in p ? this.resolveParameterRef(p.$ref) : p)
      .filter((p): p is OpenAPIV3.ParameterObject => p != null);

    // Merge path-level and operation-level parameters
    // Operation-level parameters override path-level parameters with the same name and 'in' location
    const mergedParams: OpenAPIV3.ParameterObject[] = [];
    const operationParamKeys = new Set(
      resolvedOperationParams.map(p => `${p.name}:${p.in}`)
    );

    // Add path-level parameters that are not overridden
    for (const pathParam of resolvedPathParams) {
      const key = `${pathParam.name}:${pathParam.in}`;
      if (!operationParamKeys.has(key)) {
        mergedParams.push(pathParam);
      }
    }

    // Add all operation-level parameters
    mergedParams.push(...resolvedOperationParams);

    // Filter out ignored parameters and map to Parameter objects
    return mergedParams
      .filter(p => !this.shouldIgnoreParameter(p, resolvedPathParams))
      .map(p => ({
        name: p.name,
        in: p.in as 'path' | 'query' | 'header' | 'cookie',
        required: p.required || false,
        schema: p.schema ? this.adaptSchema(p.name, p.schema as OpenAPIV3.SchemaObject) : this.createPlaceholderSchema(p.name),
        description: p.description
      }));
  }

  private adaptRequestBody(body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject): SchemaNode | undefined {
    // Check if the request body object itself has x-uigen-ignore: true
    const bodyIgnoreAnnotation = (body as any)['x-uigen-ignore'];
    
    // Validate and apply ignore annotation on the request body object
    if (typeof bodyIgnoreAnnotation === 'boolean') {
      if (bodyIgnoreAnnotation) {
        // Pruning behavior: return undefined and don't process schema
        console.info('Request body ignored due to x-uigen-ignore annotation');
        return undefined;
      }
    } else if (bodyIgnoreAnnotation !== undefined) {
      // Warn about non-boolean values
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof bodyIgnoreAnnotation}`);
    }
    
    if ('$ref' in body) {
      // For $ref request bodies, we need to check the raw object before resolving
      // Use resolveRef to get the raw request body object
      const rawRequestBody = this.resolveRequestBodyRef(body.$ref);
      
      if (rawRequestBody) {
        const refIgnoreAnnotation = (rawRequestBody as any)['x-uigen-ignore'];
        
        if (typeof refIgnoreAnnotation === 'boolean') {
          if (refIgnoreAnnotation) {
            // Pruning behavior: return undefined for ignored $ref target
            console.info(`Request body $ref target ignored: ${body.$ref}`);
            return undefined;
          }
        } else if (refIgnoreAnnotation !== undefined) {
          console.warn(`x-uigen-ignore must be a boolean, found ${typeof refIgnoreAnnotation}`);
        }
      }
      
      const resolved = this.resolver.resolve(body.$ref);
      return resolved || undefined;
    }
    
    const content = this.pickContent(body.content);
    if (!content?.schema) return undefined;
    
    // Process the schema - adaptSchema will handle ignore annotations and precedence
    return this.adaptSchema('body', content.schema as OpenAPIV3.SchemaObject);
  }
  
  /**
   * Resolves a $ref to a request body object (not a SchemaNode).
   * Similar to resolveRef but for request bodies.
   */
  private resolveRequestBodyRef(ref: string): OpenAPIV3.RequestBodyObject | null {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let current: any = this.spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current as OpenAPIV3.RequestBodyObject;
  }

  /**
   * Resolves a $ref to a response object (not a SchemaNode).
   * Similar to resolveRef but for responses.
   */
  private resolveResponseRef(ref: string): OpenAPIV3.ResponseObject | null {
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let current: any = this.spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current as OpenAPIV3.ResponseObject;
  }

  private adaptResponses(responses: OpenAPIV3.ResponsesObject): Record<string, { description?: string; schema?: SchemaNode }> {
    const result: Record<string, { description?: string; schema?: SchemaNode }> = {};
    if (!responses || typeof responses !== 'object') return result;

    for (const [code, response] of Object.entries(responses)) {
      // Check if the response object itself has x-uigen-ignore: true
      const responseIgnoreAnnotation = (response as any)['x-uigen-ignore'];
      
      // Validate and apply ignore annotation on the response object
      if (typeof responseIgnoreAnnotation === 'boolean') {
        if (responseIgnoreAnnotation) {
          // Pruning behavior: skip this response and don't process schema
          console.info(`Response ${code} ignored due to x-uigen-ignore annotation`);
          continue;
        }
      } else if (responseIgnoreAnnotation !== undefined) {
        // Warn about non-boolean values
        console.warn(`x-uigen-ignore must be a boolean, found ${typeof responseIgnoreAnnotation}`);
      }
      
      // Handle $ref responses
      if ('$ref' in response) {
        // For $ref responses, we need to check the raw object before resolving
        const rawResponse = this.resolveResponseRef(response.$ref);
        
        if (rawResponse) {
          const refIgnoreAnnotation = (rawResponse as any)['x-uigen-ignore'];
          
          if (typeof refIgnoreAnnotation === 'boolean') {
            if (refIgnoreAnnotation) {
              // Pruning behavior: skip this response for ignored $ref target
              console.info(`Response ${code} $ref target ignored: ${response.$ref}`);
              continue;
            }
          } else if (refIgnoreAnnotation !== undefined) {
            console.warn(`x-uigen-ignore must be a boolean, found ${typeof refIgnoreAnnotation}`);
          }
        }
        
        // If not ignored, skip processing for now (existing behavior)
        continue;
      }
      
      const content = this.pickContent(response.content);
      
      // Process the schema - adaptSchema will handle ignore annotations and precedence
      result[code] = {
        description: response.description,
        schema: content?.schema ? this.adaptSchema('response', content.schema as OpenAPIV3.SchemaObject) : undefined
      };
    }
    return result;
  }

  private adaptSchema(key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited: Set<string> = new Set(), parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): SchemaNode {
    // Delegate to SchemaProcessor
    return this.schemaProcessor.processSchema(key, schema, visited, parentSchema);
  }

  private inferResourceName(path: string): string | null {
    const segments = path.split('/').filter(s => s && !s.startsWith('{'));

    // Skip version prefix (v1, v2, etc.)
    const versionPrefixPattern = /^v\d+$/i;
    if (segments.length > 0 && versionPrefixPattern.test(segments[0])) {
      segments.shift();
    }

    if (segments.length === 0) return null;

    // Use the deepest static segment as the resource name.
    // This correctly separates sub-resources:
    //   /v1/Services              -> Services
    //   /v1/Services/{sid}        -> Services
    //   /v1/Services/{sid}/AlphaSenders -> AlphaSenders
    //   /v1/Services/{sid}/AlphaSenders/{sid} -> AlphaSenders
    return segments[segments.length - 1];
  }

  private detectRelationships(resource: Resource, allResources: Map<string, Resource>): Relationship[] {
    const relationships: Relationship[] = [];
    const pathRelationships = this.relationshipDetector.detectFromPaths(resource, allResources);
    relationships.push(...pathRelationships);
    const schemaRelationships = this.relationshipDetector.detectFromSchema(resource.schema, allResources);
    relationships.push(...schemaRelationships);
    return relationships;
  }

  /**
   * Detect many-to-many relationships by looking at operations across all resources.
   * This is necessary because the OpenAPI3Adapter creates separate resources for sub-resources,
   * so operations for /consumer/{id}/library are added to the library resource, not the consumer resource.
   * 
   * @param consumerResource - The potential consumer resource
   * @param allResources - Array of all resources
   * @param resourceMap - Map of all resources by slug
   * @returns Array of detected many-to-many relationships
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

  private detectPagination(resource: Resource): PaginationHint | undefined {
    const listOp = resource.operations.find(op => op.viewHint === 'list' || op.viewHint === 'search');
    if (!listOp) return undefined;
    return this.paginationDetector.detect(listOp.parameters) || undefined;
  }

  private resolveParameterRef(_ref: string): Parameter {
    return { name: 'unknown', in: 'query', required: false, schema: this.createPlaceholderSchema('unknown') };
  }

  private createPlaceholderSchema(key: string): SchemaNode {
    return { type: 'object', key, label: this.humanize(key), required: false, children: [] };
  }

  /**
   * Extract the schema name from a response $ref
   * e.g., "#/components/schemas/Template" -> "Template"
   */
  private extractSchemaNameFromResponse(operation: OpenAPIV3.OperationObject, method: string): string | null {
    // Check 200 and 201 responses
    const response200 = operation.responses?.['200'] as OpenAPIV3.ResponseObject | undefined;
    const response201 = operation.responses?.['201'] as OpenAPIV3.ResponseObject | undefined;
    const response = response200 || response201;
    
    if (!response) return null;
    
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
   * Extract schema name from a $ref string
   * e.g., "#/components/schemas/Template" -> "Template"
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

  private mergeSchemas(base: SchemaNode, update: SchemaNode): SchemaNode {
    if (update.type === 'array' && update.items) return this.mergeSchemas(base, update.items);
    if (base.type === 'object' && (!base.children || base.children.length === 0)) return update;
    if (update.type !== 'object' || !update.children || update.children.length === 0) return base;

    const mergedChildren = [...(base.children || [])];
    const existingKeys = new Set(mergedChildren.map(c => c.key));

    for (const updateChild of update.children) {
      if (!existingKeys.has(updateChild.key)) {
        mergedChildren.push(updateChild);
      } else {
        const existingIndex = mergedChildren.findIndex(c => c.key === updateChild.key);
        const existing = mergedChildren[existingIndex];
        if (existing.type === 'object' && updateChild.type === 'object' && existing.children && updateChild.children) {
          mergedChildren[existingIndex] = this.mergeSchemas(existing, updateChild);
        } else if (this.hasMoreDetails(updateChild, existing)) {
          mergedChildren[existingIndex] = updateChild;
        }
      }
    }

    return { ...base, children: mergedChildren };
  }

  private hasMoreDetails(a: SchemaNode, b: SchemaNode): boolean {
    const score = (n: SchemaNode) => (n.validations?.length || 0) + (n.description ? 1 : 0) + (n.format ? 1 : 0) + (n.enumValues?.length || 0);
    return score(a) > score(b);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private humanize(str: string): string {
    return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
