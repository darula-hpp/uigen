import type { OpenAPIV3 } from 'openapi-types';
import type {
  LoginEndpoint,
  SignUpEndpoint,
  RefreshEndpoint,
  PasswordResetEndpoint,
  SchemaNode
} from '../ir/types.js';
import type { AdapterUtils } from './annotations/index.js';
import type { AnnotationHandlerRegistry } from './annotations/registry.js';
import type { SchemaProcessor } from './schema-processor.js';

/**
 * Authentication_Detector Component
 * 
 * Orchestrates authentication endpoint detection across all strategies.
 * This component extracts authentication detection logic from OpenAPI3Adapter
 * into a dedicated, reusable component using the Strategy pattern.
 * 
 * Responsibilities:
 * - Coordinate authentication endpoint detection strategies
 * - Provide unified interface for OpenAPI3Adapter
 * - Manage shared utilities and helper methods
 * - Integrate with AnnotationHandlerRegistry
 * 
 * @see .kiro/specs/auth-detection-extraction/design.md for architecture details
 */
export class Authentication_Detector {
  private spec: OpenAPIV3.Document;
  private adapterUtils: AdapterUtils;
  private annotationRegistry: AnnotationHandlerRegistry;
  private schemaProcessor: SchemaProcessor;

  /**
   * Creates a new Authentication_Detector instance.
   * 
   * @param spec - The OpenAPI v3 document to analyze
   * @param adapterUtils - Utility methods for adapter operations
   * @param annotationRegistry - Registry for annotation handlers
   * @param schemaProcessor - Schema processor for converting OpenAPI schemas to SchemaNodes
   */
  constructor(
    spec: OpenAPIV3.Document,
    adapterUtils: AdapterUtils,
    annotationRegistry: AnnotationHandlerRegistry,
    schemaProcessor: SchemaProcessor
  ) {
    this.spec = spec;
    this.adapterUtils = adapterUtils;
    this.annotationRegistry = annotationRegistry;
    this.schemaProcessor = schemaProcessor;
  }

  /**
   * Detects login endpoints in the OpenAPI specification.
   * 
   * Uses LoginDetectionStrategy to identify endpoints that handle user authentication.
   * Supports both annotation-based detection (x-uigen-login) and automatic pattern matching.
   * 
   * @returns Array of detected login endpoints
   */
  detectLoginEndpoints(): LoginEndpoint[] {
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

        // Handle conflicting annotations
        if (loginAnnotation === true && signupAnnotation === true) {
          console.warn(
            `Conflicting authentication annotations on ${path}: both x-uigen-login and x-uigen-signup are true. Using login annotation.`
          );
          const endpoint = this.buildLoginEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue;
        }

        // Explicit exclusion
        if (loginAnnotation === false) {
          continue;
        }

        // Skip if explicitly marked as signup
        if (signupAnnotation === true) {
          continue;
        }

        // Explicit inclusion
        if (loginAnnotation === true) {
          const endpoint = this.buildLoginEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue;
        }
      }

      // Auto-detection only for POST operations without annotations
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      const loginAnnotation = this.extractLoginAnnotation(postOp);
      const signupAnnotation = this.extractSignupAnnotation(postOp);
      
      if (loginAnnotation === true || loginAnnotation === false) {
        continue;
      }

      if (signupAnnotation === true) {
        continue;
      }

      // Check signup pattern exclusion before login detection
      if (this.matchesSignupPattern(path, postOp)) {
        // Check if also matches login patterns for ambiguity warning
        const pathMatch = /\/(login|signin|auth\/login|auth\/signin)$/i.test(path);
        const descText = (postOp.summary || postOp.description || '').toLowerCase();
        const descMatch = descText.match(/\b(login|authenticate|sign\s*in)\b/) &&
          !descText.match(/\b(create|generate|get|retrieve|list)\b.*\b(login link|login url)\b/);
        
        if (pathMatch || descMatch) {
          this.logAmbiguousPattern(path);
        }
        
        continue;
      }

      // Auto-detection for operations without annotations
      const pathMatch = /\/(login|signin|auth\/login|auth\/signin)$/i.test(path);
      const descText = (postOp.summary || postOp.description || '').toLowerCase();
      const descMatch = descText.match(/\b(login|authenticate|sign\s*in)\b/) &&
        !descText.match(/\b(create|generate|get|retrieve|list)\b.*\b(login link|login url)\b/);

      const hasCredFields = this.hasCredentialFields(postOp);

      if (pathMatch || descMatch) {
        const endpoint = this.buildLoginEndpoint(path, postOp);
        autoDetectedEndpoints.push(endpoint);
      } else if (hasCredFields) {
        const pathLooksAuthRelated = /\/(auth|account|session|token|user|access)/.test(path);
        if (pathLooksAuthRelated) {
          const endpoint = this.buildLoginEndpoint(path, postOp);
          autoDetectedEndpoints.push(endpoint);
        }
      }
    }

    return [...annotatedEndpoints, ...autoDetectedEndpoints];
  }

  /**
   * Detects signup/registration endpoints in the OpenAPI specification.
   * 
   * Uses SignUpDetectionStrategy to identify endpoints that handle user registration.
   * Supports both annotation-based detection (x-uigen-signup) and automatic pattern matching.
   * 
   * @returns Array of detected signup endpoints
   */
  detectSignUpEndpoints(): SignUpEndpoint[] {
    const annotatedEndpoints: SignUpEndpoint[] = [];
    const autoDetectedEndpoints: SignUpEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Check all HTTP methods for x-uigen-signup annotation
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        const signupAnnotation = this.extractSignupAnnotation(operation);
        const loginAnnotation = this.extractLoginAnnotation(operation);

        // Handle conflicting annotations - login takes precedence
        if (loginAnnotation === true && signupAnnotation === true) {
          continue;
        }

        // Explicit exclusion
        if (signupAnnotation === false) {
          continue;
        }

        // Explicit inclusion
        if (signupAnnotation === true) {
          const endpoint = this.buildSignUpEndpoint(path, operation);
          annotatedEndpoints.push(endpoint);
          continue;
        }
      }

      // Auto-detection only for POST operations without annotations
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      const signupAnnotation = this.extractSignupAnnotation(postOp);
      
      if (signupAnnotation === true || signupAnnotation === false) {
        continue;
      }

      // Apply signup pattern matching for auto-detection
      if (this.matchesSignupPattern(path, postOp)) {
        const hasCredFields = this.hasCredentialFields(postOp);

        if (hasCredFields) {
          const endpoint = this.buildSignUpEndpoint(path, postOp);
          autoDetectedEndpoints.push(endpoint);
        }
      }
    }

    return [...annotatedEndpoints, ...autoDetectedEndpoints];
  }

  /**
   * Detects token refresh endpoints in the OpenAPI specification.
   * 
   * Uses RefreshTokenDetectionStrategy to identify endpoints that handle token refresh.
   * Uses automatic pattern matching only (no annotation support).
   * 
   * @returns Array of detected refresh endpoints
   */
  detectRefreshEndpoints(): RefreshEndpoint[] {
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
          requestBodySchema = this.schemaProcessor.processSchema('refreshRequest', content.schema);
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
   * Detects password reset endpoints in the OpenAPI specification.
   * 
   * Uses PasswordResetDetectionStrategy to identify endpoints that handle password reset.
   * Uses annotation-based detection only (x-uigen-password-reset).
   * 
   * @returns Array of detected password reset endpoints
   */
  detectPasswordResetEndpoints(): PasswordResetEndpoint[] {
    const endpoints: PasswordResetEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        const annotation = (operation as any)['x-uigen-password-reset'];

        if (annotation === false) {
          continue;
        }

        if (annotation === true) {
          const endpoint = this.buildPasswordResetEndpoint(path, operation);
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  /**
   * Extracts the request body schema from an operation.
   * 
   * @param operation - The OpenAPI operation object
   * @returns The extracted SchemaNode or undefined if no request body
   */
  extractRequestBodySchema(operation: OpenAPIV3.OperationObject): SchemaNode | undefined {
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        return this.schemaProcessor.processSchema('requestBody', content.schema);
      }
    }
    return undefined;
  }

  /**
   * Detects the token path in the response schema.
   * 
   * Searches for common token field names in 200/201 responses.
   * Returns 'token' as default if no token field is found.
   * 
   * @param operation - The OpenAPI operation object
   * @returns The path to the token field (e.g., 'token', 'data.token')
   */
  detectTokenPath(operation: OpenAPIV3.OperationObject): string {
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

  /**
   * Finds a token field in a schema object.
   * 
   * Recursively searches for common token field names:
   * - token
   * - accessToken / access_token
   * - bearerToken
   * 
   * @param schema - The OpenAPI schema object
   * @param prefix - The current path prefix for nested fields
   * @returns The path to the token field or null if not found
   */
  findTokenField(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, prefix = ''): string | null {
    if ('$ref' in schema) {
      const resolved = this.adapterUtils.resolveRef(schema.$ref);
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
          const resolved = this.adapterUtils.resolveRef((value as OpenAPIV3.ReferenceObject).$ref);
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

  /**
   * Gets the field names from a schema node.
   * 
   * @param schema - The schema node
   * @returns Array of field names (keys)
   */
  getSchemaFieldNames(schema: SchemaNode): string[] {
    if (schema.type === 'object' && schema.children) {
      return schema.children.map(child => child.key);
    }
    return [];
  }

  /**
   * Checks if an operation has credential fields (username/email + password).
   * 
   * @param operation - The OpenAPI operation object
   * @returns true if the operation has credential fields
   */
  hasCredentialFields(operation: OpenAPIV3.OperationObject): boolean {
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        const requestBodySchema = this.schemaProcessor.processSchema('credentials', content.schema);
        const fields = this.getSchemaFieldNames(requestBodySchema);
        return (fields.includes('username') || fields.includes('email')) && fields.includes('password');
      }
    }
    return false;
  }

  /**
   * Picks the best available content schema from a content map.
   * 
   * Prefers JSON, then form-encoded, then multipart, then the first available.
   * 
   * @param content - The content map from a request/response body
   * @returns The selected media type object or undefined
   */
  pickContent(content: Record<string, OpenAPIV3.MediaTypeObject> | undefined): OpenAPIV3.MediaTypeObject | undefined {
    if (!content) return undefined;
    return (
      content['application/json'] ||
      content['application/x-www-form-urlencoded'] ||
      content['multipart/form-data'] ||
      content['text/plain'] ||
      Object.values(content)[0]
    );
  }

  // Private helper methods

  private buildLoginEndpoint(path: string, operation: OpenAPIV3.OperationObject): LoginEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.schemaProcessor.processSchema('credentials', content.schema);
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

  private buildSignUpEndpoint(path: string, operation: OpenAPIV3.OperationObject): SignUpEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.schemaProcessor.processSchema('signUp', content.schema);
      }
    }

    return {
      path,
      method: 'POST',
      requestBodySchema,
      description: operation.summary || operation.description
    };
  }

  private buildPasswordResetEndpoint(path: string, operation: OpenAPIV3.OperationObject): PasswordResetEndpoint {
    let requestBodySchema: SchemaNode | undefined;
    
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = this.pickContent(operation.requestBody.content);
      if (content?.schema) {
        requestBodySchema = this.schemaProcessor.processSchema('passwordReset', content.schema);
      }
    }

    return {
      path,
      method: 'POST',
      requestBodySchema,
      description: operation.summary || operation.description
    };
  }

  private extractLoginAnnotation(operation: OpenAPIV3.OperationObject): boolean | undefined {
    const annotation = (operation as any)['x-uigen-login'];
    
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    return undefined;
  }

  private extractSignupAnnotation(operation: OpenAPIV3.OperationObject): boolean | undefined {
    const annotation = (operation as any)['x-uigen-signup'];
    
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    if (annotation !== undefined) {
      console.warn(`x-uigen-signup must be a boolean, found ${typeof annotation}`);
    }
    
    return undefined;
  }

  private matchesSignupPattern(path: string, operation: OpenAPIV3.OperationObject): boolean {
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

  private logAmbiguousPattern(path: string): void {
    console.warn(
      `Endpoint ${path} matches both login and signup patterns. ` +
      `Consider adding explicit x-uigen-login or x-uigen-signup annotation.`
    );
  }
}
