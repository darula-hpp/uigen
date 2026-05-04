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
import type { RelationshipConfig } from '../config/types.js';
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
import { Parameter_Processor } from './parameter-processor.js';
import { Body_Processor } from './body-processor.js';
import { Operation_Processor } from './operation-processor.js';
import { LayoutParser } from './layout-parser.js';

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
  private parameterProcessor: Parameter_Processor;
  private bodyProcessor: Body_Processor;
  private operationProcessor: Operation_Processor;
  private layoutParser: LayoutParser;

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
    
    // Instantiate LayoutParser
    this.layoutParser = new LayoutParser();
    
    // Instantiate Resource_Extractor
    this.resourceExtractor = new Resource_Extractor(
      spec,
      this.adapterUtils,
      this.annotationRegistry,
      this.viewHintClassifier,
      this.relationshipDetector,
      this.paginationDetector,
      this.schemaProcessor,
      this.layoutParser
    );
    
    // Instantiate Parameter_Processor
    this.parameterProcessor = new Parameter_Processor(
      spec,
      this.adapterUtils,
      this.schemaProcessor,
      this.annotationRegistry
    );
    
    // Instantiate Body_Processor
    this.bodyProcessor = new Body_Processor(
      spec,
      this.adapterUtils,
      this.schemaProcessor,
      this.annotationRegistry,
      this.fileMetadataVisitor
    );
    
    // Instantiate Operation_Processor
    this.operationProcessor = new Operation_Processor(
      this.viewHintClassifier,
      this.parameterProcessor,
      this.bodyProcessor,
      this.annotationRegistry,
      this.adapterUtils
    );
  }

  adapt(configRelationships?: RelationshipConfig[]): UIGenApp {
    this.currentIR = {
      meta: this.extractMeta(),
      resources: [],
      auth: this.extractAuth(),
      dashboard: { enabled: true, widgets: [] },
      servers: this.extractServers(),
      parsingErrors: this.parsingErrors.length > 0 ? this.parsingErrors : undefined,
      layoutConfig: this.layoutParser.parseDocumentLayout(this.spec)
    };
    
    // Set currentIR on schemaProcessor so annotations can be processed
    this.schemaProcessor.setCurrentIR(this.currentIR);
    
    // Set currentIR on resourceExtractor so annotations can be processed
    this.resourceExtractor.setCurrentIR(this.currentIR);
    
    // Process server annotations after IR is initialized
    this.processServerAnnotations();
    
    // Delegate resource extraction to Resource_Extractor
    this.currentIR.resources = this.resourceExtractor.extractResources(
      this.adaptOperation.bind(this),
      configRelationships
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
  ): Operation | undefined {
    return this.operationProcessor.processOperation(method, path, operation, pathItem);
  }

  private adaptRequestBody(body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject): SchemaNode | undefined {
    return this.bodyProcessor.processRequestBody(body)?.schema;
  }

  private adaptResponses(responses: OpenAPIV3.ResponsesObject): Record<string, { description?: string; schema?: SchemaNode }> {
    return this.bodyProcessor.processResponses(responses);
  }

  private adaptSchema(key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited: Set<string> = new Set(), parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): SchemaNode {
    // Delegate to SchemaProcessor
    return this.schemaProcessor.processSchema(key, schema, visited, parentSchema);
  }

  private createPlaceholderSchema(key: string): SchemaNode {
    return { type: 'object', key, label: this.humanize(key), required: false, children: [] };
  }

  private humanize(str: string): string {
    return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
