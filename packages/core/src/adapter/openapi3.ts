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
import { Resource_Extractor } from './resource-extractor.js';

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
  private resourceExtractor: Resource_Extractor;

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
    
    // Instantiate Resource_Extractor
    this.resourceExtractor = new Resource_Extractor(
      spec,
      this.adapterUtils,
      this.annotationRegistry,
      this.viewHintClassifier,
      this.relationshipDetector,
      this.paginationDetector,
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
    
    // Set currentIR on resourceExtractor so annotations can be processed
    this.resourceExtractor.setCurrentIR(this.currentIR);
    
    // Process server annotations after IR is initialized
    this.processServerAnnotations();
    
    // Delegate resource extraction to Resource_Extractor
    this.currentIR.resources = this.resourceExtractor.extractResources(
      this.adaptOperation.bind(this)
    );
    
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

  private resolveParameterRef(_ref: string): Parameter {
    return { name: 'unknown', in: 'query', required: false, schema: this.createPlaceholderSchema('unknown') };
  }

  private createPlaceholderSchema(key: string): SchemaNode {
    return { type: 'object', key, label: this.humanize(key), required: false, children: [] };
  }

  private humanize(str: string): string {
    return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
