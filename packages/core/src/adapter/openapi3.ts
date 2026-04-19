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
  LoginEndpoint,
  RefreshEndpoint,
  PasswordResetEndpoint,
  SignUpEndpoint
} from '../ir/types.js';
import { SchemaResolver } from './schema-resolver.js';
import { ViewHintClassifier } from './view-hint-classifier.js';
import { FileTypeDetector } from './file-type-detector.js';
import { RelationshipDetector } from './relationship-detector.js';
import { PaginationDetector } from './pagination-detector.js';
import { AnnotationHandlerRegistry, createOperationContext, createSchemaContext, createServerContext } from './annotations/index.js';
import type { AdapterUtils } from './annotations/index.js';

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
    this.resolver = new SchemaResolver(spec, this.adaptSchema.bind(this));
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

    const loginEndpoints = this.detectLoginEndpoints();
    const refreshEndpoints = this.detectRefreshEndpoints();
    const passwordResetEndpoints = this.detectPasswordResetEndpoints();
    const signUpEndpoints = this.detectSignUpEndpoints();

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
   * Extract x-uigen-login annotation from an operation.
   * Returns true for x-uigen-login: true, false for x-uigen-login: false,
   * and undefined for absent or non-boolean values.
   */
  private extractLoginAnnotation(operation: OpenAPIV3.OperationObject): boolean | undefined {
    const annotation = (operation as any)['x-uigen-login'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Treat non-boolean values as absent
    return undefined;
  }

  /**
   * Extract x-uigen-signup annotation from an operation.
   * Returns true for x-uigen-signup: true, false for x-uigen-signup: false,
   * and undefined for absent or non-boolean values.
   * 
   * Requirements: 1.4, 2.2
   */
  private extractSignupAnnotation(operation: OpenAPIV3.OperationObject): boolean | undefined {
    const annotation = (operation as any)['x-uigen-signup'];
    
    // Validate annotation is boolean type
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning if invalid (non-boolean and not undefined)
    if (annotation !== undefined) {
      console.warn(`x-uigen-signup must be a boolean, found ${typeof annotation}`);
    }
    
    // Return undefined for absent or invalid values
    return undefined;
  }

  /**
   * Log warning when an endpoint matches both login and signup patterns.
   * Suggests using explicit annotations to resolve the ambiguity.
   * 
   * Requirements: 7.1
   */
  private logAmbiguousPattern(path: string): void {
    console.warn(
      `Endpoint ${path} matches both login and signup patterns. ` +
      `Consider adding explicit x-uigen-login or x-uigen-signup annotation.`
    );
  }

  /**
   * Check if a path and operation match signup patterns.
   * Returns true if either the path or description matches signup patterns.
   * 
   * Path patterns (case-insensitive):
   * - /register, /signup, /sign-up, /registration
   * - /auth/register, /auth/signup, /auth/sign-up, /auth/registration
   * 
   * Description keywords (case-insensitive):
   * - register, signup, sign up, registration, create account
   * 
   * Requirements: 1.1, 1.2
   */
  private matchesSignupPattern(path: string, operation: OpenAPIV3.OperationObject): boolean {
    // Check path patterns (case-insensitive)
    const signupPathPatterns = [
      /\/register$/i,
      /\/signup$/i,
      /\/sign-up$/i,
      /\/registration$/i,
      /\/auth\/register$/i,
      /\/auth\/signup$/i,
      /\/auth\/sign-up$/i,
      /\/auth\/registration$/i,
    ];

    for (const pattern of signupPathPatterns) {
      if (pattern.test(path)) {
        return true;
      }
    }

    // Check description keywords (case-insensitive)
    const description = (operation.summary || '' + ' ' + operation.description || '').toLowerCase();
    const signupKeywords = [
      'register',
      'signup',
      'sign up',
      'registration',
      'create account',
    ];

    for (const keyword of signupKeywords) {
      if (description.includes(keyword)) {
        return true;
      }
    }

    return false;
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
   * Determine if a schema should be ignored based on element-level and parent-level annotations.
   * Element-level annotation takes precedence over parent-level annotation.
   * 
   * Precedence rules:
   * - Schema has x-uigen-ignore: true → ignore
   * - Schema has x-uigen-ignore: false → include (overrides parent-level)
   * - Parent has x-uigen-ignore: true → ignore
   * - Parent has x-uigen-ignore: false → include
   * - Neither has annotation → include (default behavior)
   * 
   * @param schema - The schema object to check
   * @param parent - Optional parent schema object for precedence checking
   * @returns true if the schema should be ignored, false otherwise
   */
  private shouldIgnoreSchema(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    parent?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): boolean {
    // Check element-level annotation first
    const schemaAnnotation = (schema as any)['x-uigen-ignore'];
    
    // Only accept boolean values
    if (typeof schemaAnnotation === 'boolean') {
      return schemaAnnotation;
    }
    
    // Warn about non-boolean values
    if (schemaAnnotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof schemaAnnotation}`);
    }
    
    // Check parent-level annotation if present
    if (parent) {
      const parentAnnotation = (parent as any)['x-uigen-ignore'];
      
      if (typeof parentAnnotation === 'boolean') {
        return parentAnnotation;
      }
      
      if (parentAnnotation !== undefined) {
        console.warn(`x-uigen-ignore must be a boolean, found ${typeof parentAnnotation}`);
      }
    }
    
    // Default: do not ignore
    return false;
  }

  /**
   * Check if a schema property should be ignored based on x-uigen-ignore annotation.
   * This is a convenience wrapper around shouldIgnoreSchema() for property checking.
   */
  private shouldIgnoreProperty(
    property: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): boolean {
    return this.shouldIgnoreSchema(property);
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

  /**
   * Build a LoginEndpoint object from a path and operation.
   * Extracts request body schema, detects token path, and captures metadata.
   */
  private buildLoginEndpoint(path: string, operation: OpenAPIV3.OperationObject): LoginEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.adaptSchema('credentials', content.schema);
      }
    }

    const tokenPath = this.detectTokenPath(operation);

    return {
      path,
      method: 'POST',
      requestBodySchema: requestBodySchema!,
      tokenPath,
      description: operation.summary || operation.description
    };
  }

  private detectLoginEndpoints(): LoginEndpoint[] {
    const annotatedEndpoints: LoginEndpoint[] = [];
    const autoDetectedEndpoints: LoginEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Check all HTTP methods for x-uigen-login annotation
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        // Extract annotations
        const loginAnnotation = this.extractLoginAnnotation(operation);
        const signupAnnotation = this.extractSignupAnnotation(operation);

        // Handle conflicting annotations (Requirements: 2.3, 7.2)
        if (loginAnnotation === true && signupAnnotation === true) {
          console.warn(
            `Conflicting authentication annotations on ${path}: both x-uigen-login and x-uigen-signup are true. Using login annotation.`
          );
          const endpoint = this.buildLoginEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue;
        }

        // Explicit exclusion: skip operations with x-uigen-login: false
        if (loginAnnotation === false) {
          continue;
        }

        // Skip if explicitly marked as signup (Requirements: 1.4, 2.1)
        if (signupAnnotation === true) {
          continue;
        }

        // Explicit inclusion: add operations with x-uigen-login: true
        if (loginAnnotation === true) {
          const endpoint = this.buildLoginEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue; // Skip auto-detection for annotated endpoints
        }
      }

      // Auto-detection only for POST operations without annotations
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      // Skip if already processed as annotated
      const loginAnnotation = this.extractLoginAnnotation(postOp);
      const signupAnnotation = this.extractSignupAnnotation(postOp);
      
      if (loginAnnotation === true || loginAnnotation === false) {
        continue;
      }

      // Skip if explicitly marked as signup (Requirements: 1.4, 2.1)
      if (signupAnnotation === true) {
        continue;
      }

      // Check signup pattern exclusion before login detection (Requirements: 1.3, 1.5, 7.1)
      if (this.matchesSignupPattern(path, postOp)) {
        // Check if also matches login patterns for ambiguity warning
        const pathMatch = /\/(login|signin|auth\/login|auth\/signin)$/i.test(path);
        const descText = (postOp.summary || postOp.description || '').toLowerCase();
        const descMatch = descText.match(/\b(login|authenticate|sign\s*in)\b/) &&
          !descText.match(/\b(create|generate|get|retrieve|list)\b.*\b(login link|login url)\b/);
        
        if (pathMatch || descMatch) {
          this.logAmbiguousPattern(path);
        }
        
        // Skip endpoint - signup exclusion takes precedence
        continue;
      }

      // Auto-detection for operations without annotations (annotation is undefined)
      const pathMatch = /\/(login|signin|auth\/login|auth\/signin)$/i.test(path);
      const descText = (postOp.summary || postOp.description || '').toLowerCase();
      const descMatch = descText.match(/\b(login|authenticate|sign\s*in)\b/) &&
        !descText.match(/\b(create|generate|get|retrieve|list)\b.*\b(login link|login url)\b/);

      let hasCredentialFields = false;

      if (postOp.requestBody && 'content' in postOp.requestBody) {
        const content = this.pickContent(postOp.requestBody.content);
        if (content?.schema) {
          const requestBodySchema = this.adaptSchema('credentials', content.schema);
          const fields = this.getSchemaFieldNames(requestBodySchema);
          hasCredentialFields =
            (fields.includes('username') || fields.includes('email')) &&
            fields.includes('password');
        }
      }

      if (pathMatch || descMatch) {
        const endpoint = this.buildLoginEndpoint(path, postOp);
        autoDetectedEndpoints.push(endpoint);
      } else if (hasCredentialFields) {
        const pathLooksAuthRelated = /\/(auth|account|session|token|user|access)/.test(path);
        if (pathLooksAuthRelated) {
          const endpoint = this.buildLoginEndpoint(path, postOp);
          autoDetectedEndpoints.push(endpoint);
        }
      }
    }

    // Return concatenated array with annotated endpoints first
    return [...annotatedEndpoints, ...autoDetectedEndpoints];
  }

  private detectTokenPath(operation: OpenAPIV3.OperationObject): string {
    const responses = operation.responses;
    for (const statusCode of ['200', '201']) {
      const response = responses[statusCode];
      if (!response || !('content' in response)) continue;
      const content = this.pickContent(response.content);
      if (!content?.schema) continue;
      const tokenPath = this.findTokenField(content.schema);
      if (tokenPath) return tokenPath;
    }
    return 'token';
  }

  private findTokenField(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, prefix = ''): string | null {
    if ('$ref' in schema) {
      const resolved = this.resolveRef(schema.$ref);
      if (resolved) return this.findTokenField(resolved, prefix);
      return null;
    }
    if ('properties' in schema && schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const fieldName = key.toLowerCase();
        if (['token', 'accesstoken', 'access_token', 'bearertoken'].includes(fieldName)) {
          return prefix ? `${prefix}.${key}` : key;
        }
        if (!prefix && '$ref' in value) {
          const resolved = this.resolveRef((value as OpenAPIV3.ReferenceObject).$ref);
          if (resolved && 'properties' in resolved) {
            const nested = this.findTokenField(resolved, key);
            if (nested) return nested;
          }
        } else if (!prefix && 'properties' in value) {
          const nested = this.findTokenField(value as OpenAPIV3.SchemaObject, key);
          if (nested) return nested;
        }
      }
    }
    return null;
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

  private detectRefreshEndpoints(): RefreshEndpoint[] {
    const refreshEndpoints: RefreshEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      const pathMatch = /\/(refresh|auth\/refresh|token\/refresh)$/i.test(path);
      const descMatch = (postOp.summary || postOp.description || '').toLowerCase().includes('refresh token');

      let hasRefreshTokenField = false;
      let requestBodySchema: SchemaNode | undefined;

      if (postOp.requestBody && 'content' in postOp.requestBody) {
        const content = this.pickContent(postOp.requestBody.content);
        if (content?.schema) {
          requestBodySchema = this.adaptSchema('refreshRequest', content.schema);
          const fields = this.getSchemaFieldNames(requestBodySchema);
          hasRefreshTokenField = fields.includes('refreshToken') || fields.includes('refresh_token') || fields.includes('refresh');
        }
      }

      if (pathMatch || descMatch || hasRefreshTokenField) {
        refreshEndpoints.push({ path, method: 'POST', requestBodySchema: requestBodySchema! });
      }
    }

    return refreshEndpoints;
  }

  /**
   * Detect password reset endpoints based on x-uigen-password-reset annotations.
   * Only processes annotated endpoints (no auto-detection).
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  private detectPasswordResetEndpoints(): PasswordResetEndpoint[] {
    const endpoints: PasswordResetEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Check all HTTP methods for x-uigen-password-reset annotation
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        // Extract annotation from operation (read directly from spec)
        const annotation = (operation as any)['x-uigen-password-reset'];

        // Explicit exclusion: skip operations with x-uigen-password-reset: false
        if (annotation === false) {
          continue;
        }

        // Explicit inclusion: add operations with x-uigen-password-reset: true
        if (annotation === true) {
          const endpoint = this.buildPasswordResetEndpoint(path, operation);
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  /**
   * Build a PasswordResetEndpoint from an operation.
   * Extracts request body schema and description.
   * 
   * Requirements: 6.3, 6.4, 6.5
   */
  private buildPasswordResetEndpoint(path: string, operation: OpenAPIV3.OperationObject): PasswordResetEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.adaptSchema('passwordReset', content.schema);
      }
    }

    return {
      path,
      method: 'POST',
      requestBodySchema,
      description: operation.summary || operation.description
    };
  }

  /**
   * Detect sign-up endpoints based on x-uigen-signup annotations and auto-detection.
   * Processes both annotated endpoints and applies pattern matching for auto-detection.
   * 
   * Requirements: 1.1, 1.2, 1.4, 2.2, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  private detectSignUpEndpoints(): SignUpEndpoint[] {
    const annotatedEndpoints: SignUpEndpoint[] = [];
    const autoDetectedEndpoints: SignUpEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Check all HTTP methods for x-uigen-signup annotation
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        // Extract annotations from operation
        const signupAnnotation = this.extractSignupAnnotation(operation);
        const loginAnnotation = this.extractLoginAnnotation(operation);

        // Handle conflicting annotations (Requirements: 2.3, 7.2)
        // If both are true, login takes precedence - skip adding to signupEndpoints
        if (loginAnnotation === true && signupAnnotation === true) {
          continue; // Already handled in detectLoginEndpoints
        }

        // Explicit exclusion: skip operations with x-uigen-signup: false
        if (signupAnnotation === false) {
          continue;
        }

        // Explicit inclusion: add operations with x-uigen-signup: true
        if (signupAnnotation === true) {
          const endpoint = this.buildSignUpEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue; // Skip auto-detection for annotated endpoints
        }
      }

      // Auto-detection only for POST operations without annotations
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      // Skip if already processed as annotated
      const signupAnnotation = this.extractSignupAnnotation(postOp);
      
      if (signupAnnotation === true || signupAnnotation === false) {
        continue;
      }

      // Apply signup pattern matching for auto-detection (Requirements: 1.1, 1.2)
      if (this.matchesSignupPattern(path, postOp)) {
        // Verify endpoint has credential fields (username/email + password)
        let hasCredentialFields = false;

        if (postOp.requestBody && 'content' in postOp.requestBody) {
          const content = this.pickContent(postOp.requestBody.content);
          if (content?.schema) {
            const requestBodySchema = this.adaptSchema('credentials', content.schema);
            const fields = this.getSchemaFieldNames(requestBodySchema);
            hasCredentialFields =
              (fields.includes('username') || fields.includes('email')) &&
              fields.includes('password');
          }
        }

        // Only add to signupEndpoints if it has credential fields
        if (hasCredentialFields) {
          const endpoint = this.buildSignUpEndpoint(path, postOp);
          autoDetectedEndpoints.push(endpoint);
        }
      }
    }

    // Return concatenated array with annotated endpoints first
    return [...annotatedEndpoints, ...autoDetectedEndpoints];
  }

  /**
   * Build a SignUpEndpoint from an operation.
   * Extracts request body schema and description.
   * 
   * Requirements: 8.3, 8.4, 8.5
   */
  private buildSignUpEndpoint(path: string, operation: OpenAPIV3.OperationObject): SignUpEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.adaptSchema('signUp', content.schema);
      }
    }

    return {
      path,
      method: 'POST',
      requestBodySchema,
      description: operation.summary || operation.description
    };
  }

  private getSchemaFieldNames(schema: SchemaNode): string[] {
    if (schema.type === 'object' && schema.children) {
      return schema.children.map(child => child.key);
    }
    return [];
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
    for (const resource of resourcesWithOperations) {
      resource.relationships = this.detectRelationships(resource, resourceMap);
      resource.pagination = this.detectPagination(resource);
    }

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

  private resolveLabel(key: string, schema: object, resolvedTarget?: SchemaNode): string {
    const ext = (schema as Record<string, unknown>)['x-uigen-label'];
    if (typeof ext === 'string' && ext.trim() !== '') return ext;
    if (resolvedTarget && resolvedTarget.label !== this.humanize(resolvedTarget.key)) {
      return resolvedTarget.label;
    }
    return this.humanize(key);
  }

  private adaptSchema(key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited: Set<string> = new Set(), parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): SchemaNode {
    if (!schema) return this.createPlaceholderSchema(key);

    // Don't do early pruning here - we need to process properties to allow child overrides
    // The ignore annotation will be applied after processing children

    if ('$ref' in schema) {
      const resolved = this.resolver.resolve(schema.$ref, visited);
      if (!resolved) return this.createPlaceholderSchema(key);
      
      // Check if the $ref itself has x-uigen-ignore annotation
      // Note: We check the schema (the $ref object), not the resolved schema
      if (this.shouldIgnoreSchema(schema)) {
        const placeholder = this.createPlaceholderSchema(key);
        (placeholder as any).__shouldIgnore = true;
        return placeholder;
      }
      
      const node = { ...resolved, key, label: this.resolveLabel(key, schema, resolved) };
      
      // Process annotations using the registry for $ref properties
      if (this.currentIR) {
        const context = createSchemaContext(
          schema,
          key,
          this.adapterUtils,
          this.currentIR,
          parentSchema,
          node
        );
        this.annotationRegistry.processAnnotations(context);
      }
      
      return node;
    }

    const type = this.mapType(schema.type, schema.format, schema);
    const node: SchemaNode = {
      type,
      key,
      label: this.resolveLabel(key, schema),
      required: false,
      description: schema.description,
      default: schema.default
    };

    if (schema.enum) {
      node.type = 'enum';
      node.enumValues = schema.enum as string[];
    }

    if (type === 'object' && schema.properties) {
      // Process all properties (including ignored ones) so annotations can mark them
      node.children = Object.entries(schema.properties)
        .map(([k, v]) =>
          this.adaptSchema(k, v as OpenAPIV3.SchemaObject, visited, schema)
        );
      
      // Check if this schema has x-uigen-ignore: true
      // If so, mark all children without explicit annotations as ignored
      const schemaIgnoreAnnotation = (schema as any)['x-uigen-ignore'];
      if (schemaIgnoreAnnotation === true && node.children) {
        for (const child of node.children) {
          const childSchema = (schema.properties as any)[child.key];
          const childIgnoreAnnotation = (childSchema as any)?.['x-uigen-ignore'];
          
          // If child doesn't have an explicit annotation, it inherits from parent
          if (childIgnoreAnnotation === undefined) {
            (child as any).__shouldIgnore = true;
          }
        }
      }
      
      if (schema.required) {
        schema.required.forEach(reqKey => {
          const child = node.children?.find(c => c.key === reqKey);
          if (child) child.required = true;
        });
      }
    }

    if (type === 'array' && 'items' in schema && schema.items) {
      node.items = this.adaptSchema('item', schema.items as OpenAPIV3.SchemaObject, visited, schema);
      
      // Detect array of binary files for multiple file upload
      const itemsSchema = schema.items as OpenAPIV3.SchemaObject;
      if (itemsSchema && itemsSchema.format === 'binary' && node.items) {
        const itemFileMetadata = this.extractFileMetadata(itemsSchema);
        if (itemFileMetadata) {
          node.items.fileMetadata = { ...itemFileMetadata, multiple: true };
        }
      }
    }

    // Extract file metadata for binary format fields
    if (type === 'file') {
      node.fileMetadata = this.extractFileMetadata(schema);
    }

    node.validations = this.extractValidations(schema);
    node.format = schema.format;
    node.readOnly = schema.readOnly;
    node.writeOnly = schema.writeOnly;
    node.nullable = schema.nullable;
    node.deprecated = schema.deprecated;

    // Process annotations using the registry
    if (this.currentIR) {
      const context = createSchemaContext(
        schema,
        key,
        this.adapterUtils,
        this.currentIR,
        parentSchema,
        node
      );
      this.annotationRegistry.processAnnotations(context);
    }

    return node;
  }

  private mapType(type: string | undefined, format: string | undefined, schema?: OpenAPIV3.SchemaObject): SchemaNode['type'] {
    if (format === 'date' || format === 'date-time') return 'date';
    if (format === 'binary') return 'file';
    
    // Also detect file type from contentMediaType for octet-stream
    if (schema && (schema as any).contentMediaType === 'application/octet-stream') {
      return 'file';
    }
    
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'integer': return 'integer';
      case 'boolean': return 'boolean';
      case 'object': return 'object';
      case 'array': return 'array';
      default: return 'string';
    }
  }

  private extractValidations(schema: OpenAPIV3.SchemaObject) {
    const rules = [];
    if (schema.minLength !== undefined) rules.push({ type: 'minLength' as const, value: schema.minLength, message: `Must be at least ${schema.minLength} characters` });
    if (schema.maxLength !== undefined) rules.push({ type: 'maxLength' as const, value: schema.maxLength, message: `Must be at most ${schema.maxLength} characters` });
    if (schema.pattern) rules.push({ type: 'pattern' as const, value: schema.pattern, message: `Must match pattern: ${schema.pattern}` });
    if (schema.minimum !== undefined) rules.push({ type: 'minimum' as const, value: schema.minimum, message: `Must be at least ${schema.minimum}` });
    if (schema.maximum !== undefined) rules.push({ type: 'maximum' as const, value: schema.maximum, message: `Must be at most ${schema.maximum}` });
    if (schema.minItems !== undefined) rules.push({ type: 'minItems' as const, value: schema.minItems, message: `Must have at least ${schema.minItems} item${schema.minItems !== 1 ? 's' : ''}` });
    if (schema.maxItems !== undefined) rules.push({ type: 'maxItems' as const, value: schema.maxItems, message: `Must have at most ${schema.maxItems} item${schema.maxItems !== 1 ? 's' : ''}` });
    if (schema.format === 'email') rules.push({ type: 'email' as const, value: '', message: 'Must be a valid email address' });
    if (schema.format === 'uri') rules.push({ type: 'url' as const, value: '', message: 'Must be a valid URL' });
    return rules;
  }

  /**
   * Extract file metadata from a schema with format: binary
   * Extracts contentMediaType, x-uigen-file-types, and x-uigen-max-file-size
   */
  /**
   * Check if a schema contains file fields (including nested objects and arrays)
   * @param schema - The schema node to check
   * @returns True if the schema contains any file fields
   */
  private hasFileFields(schema: SchemaNode): boolean {
    // Direct file field
    if (schema.type === 'file') {
      return true;
    }
    
    // Check children in object schemas
    if (schema.type === 'object' && schema.children) {
      return schema.children.some(child => this.hasFileFields(child));
    }
    
    // Check items in array schemas
    if (schema.type === 'array' && schema.items) {
      return this.hasFileFields(schema.items);
    }
    
    return false;
  }

  private extractFileMetadata(schema: OpenAPIV3.SchemaObject): import('../ir/types.js').FileMetadata | undefined {
    // Only extract metadata for binary format fields
    if (schema.format !== 'binary') {
      return undefined;
    }

    const allowedMimeTypes: string[] = [];
    
    // Extract from x-uigen-file-types extension
    const xUigenFileTypes = (schema as any)['x-uigen-file-types'];
    if (Array.isArray(xUigenFileTypes)) {
      allowedMimeTypes.push(...xUigenFileTypes.filter((t: any) => typeof t === 'string'));
    }
    
    // Extract from contentMediaType property
    const contentMediaType = (schema as any).contentMediaType;
    if (typeof contentMediaType === 'string' && contentMediaType.trim() !== '') {
      if (!allowedMimeTypes.includes(contentMediaType)) {
        allowedMimeTypes.push(contentMediaType);
      }
    }
    
    // Default to accepting all files if no MIME types specified
    if (allowedMimeTypes.length === 0) {
      allowedMimeTypes.push('*/*');
    }
    
    // Detect file type category
    const fileType = FileTypeDetector.detectFileType(allowedMimeTypes);
    
    // Extract max file size from x-uigen-max-file-size extension
    const xUigenMaxFileSize = (schema as any)['x-uigen-max-file-size'];
    const maxSizeBytes = typeof xUigenMaxFileSize === 'number' && xUigenMaxFileSize > 0
      ? xUigenMaxFileSize
      : 10 * 1024 * 1024; // Default 10MB
    
    // Generate HTML accept attribute from allowed MIME types
    const accept = allowedMimeTypes.join(',');
    
    return {
      allowedMimeTypes,
      maxSizeBytes,
      multiple: false, // Will be set to true for array schemas
      accept,
      fileType
    };
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
