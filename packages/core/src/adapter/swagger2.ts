import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp } from '../ir/types.js';
import { OpenAPI3Adapter } from './openapi3.js';

/**
 * Swagger 2.0 specification types
 */
interface Swagger2Document {
  swagger: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, Swagger2PathItem>;
  definitions?: Record<string, Swagger2Schema>;
  parameters?: Record<string, Swagger2Parameter>;
  responses?: Record<string, Swagger2Response>;
  securityDefinitions?: Record<string, Swagger2SecurityScheme>;
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
  externalDocs?: { description?: string; url: string };
}

interface Swagger2PathItem {
  get?: Swagger2Operation;
  post?: Swagger2Operation;
  put?: Swagger2Operation;
  patch?: Swagger2Operation;
  delete?: Swagger2Operation;
  options?: Swagger2Operation;
  head?: Swagger2Operation;
  parameters?: Array<Swagger2Parameter | Swagger2Reference>;
}

interface Swagger2Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<Swagger2Parameter | Swagger2Reference>;
  responses: Record<string, Swagger2Response | Swagger2Reference>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
  consumes?: string[];
  produces?: string[];
}

interface Swagger2Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'formData' | 'body';
  description?: string;
  required?: boolean;
  type?: string;
  format?: string;
  schema?: Swagger2Schema;
  items?: Swagger2Schema;
  collectionFormat?: string;
  default?: unknown;
  maximum?: number;
  minimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  enum?: unknown[];
}

interface Swagger2Response {
  description: string;
  schema?: Swagger2Schema | Swagger2Reference;
  headers?: Record<string, Swagger2Header>;
  examples?: Record<string, unknown>;
}

interface Swagger2Header {
  type: string;
  format?: string;
  description?: string;
}

interface Swagger2Schema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  required?: string[];
  properties?: Record<string, Swagger2Schema | Swagger2Reference>;
  items?: Swagger2Schema | Swagger2Reference;
  allOf?: Array<Swagger2Schema | Swagger2Reference>;
  additionalProperties?: boolean | Swagger2Schema | Swagger2Reference;
  discriminator?: string;
  readOnly?: boolean;
  xml?: unknown;
  externalDocs?: { description?: string; url: string };
  example?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  $ref?: string;
}

interface Swagger2Reference {
  $ref: string;
}

interface Swagger2SecurityScheme {
  type: 'basic' | 'apiKey' | 'oauth2';
  description?: string;
  name?: string;
  in?: 'query' | 'header';
  flow?: 'implicit' | 'password' | 'application' | 'accessCode';
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: Record<string, string>;
}

/**
 * Swagger2Adapter converts Swagger 2.0 specifications to OpenAPI 3.x format
 * and then uses OpenAPI3Adapter to generate the IR.
 * 
 * Requirements: 2.1-2.7
 */
export class Swagger2Adapter {
  private spec: Swagger2Document;
  private refCache: Map<string, Swagger2Schema | Swagger2Parameter | Swagger2Response> = new Map();

  constructor(spec: Swagger2Document) {
    this.spec = spec;
  }

  /**
   * Detects if a spec is Swagger 2.0
   * Requirement 2.1, 2.2: Detect swagger: "2.0" field
   */
  static canHandle(spec: unknown): boolean {
    if (!spec || typeof spec !== 'object') return false;
    const s = spec as Record<string, unknown>;
    return 'swagger' in s && s.swagger === '2.0';
  }

  /**
   * Converts Swagger 2.0 spec to IR by first transforming to OpenAPI 3.x
   * Requirements: 2.1-2.7
   */
  adapt(): UIGenApp {
    const openapi3Spec = this.convertToOpenAPI3();
    const adapter = new OpenAPI3Adapter(openapi3Spec);
    return adapter.adapt();
  }

  /**
   * Converts Swagger 2.0 document to OpenAPI 3.x format
   */
  private convertToOpenAPI3(): OpenAPIV3.Document {
    return {
      openapi: '3.0.0',
      info: this.convertInfo(),
      servers: this.convertServers(),
      paths: this.convertPaths(),
      components: this.convertComponents(),
      security: this.spec.security,
      tags: this.spec.tags,
      externalDocs: this.spec.externalDocs
    };
  }

  /**
   * Convert info section (no changes needed)
   */
  private convertInfo(): OpenAPIV3.InfoObject {
    return {
      title: this.spec.info.title,
      version: this.spec.info.version,
      description: this.spec.info.description
    };
  }

  /**
   * Construct server URLs from host, basePath, and schemes
   * Requirement 2.6: Construct server URLs from host, basePath, schemes fields
   */
  private convertServers(): OpenAPIV3.ServerObject[] {
    const servers: OpenAPIV3.ServerObject[] = [];
    
    // If no host specified, return default localhost
    if (!this.spec.host) {
      return [{ url: 'http://localhost:3000' }];
    }

    const schemes = this.spec.schemes || ['http'];
    const basePath = this.spec.basePath || '';

    // Create a server entry for each scheme
    for (const scheme of schemes) {
      servers.push({
        url: `${scheme}://${this.spec.host}${basePath}`,
        description: `${scheme.toUpperCase()} server`
      });
    }

    return servers;
  }

  /**
   * Convert paths section
   */
  private convertPaths(): OpenAPIV3.PathsObject {
    const paths: OpenAPIV3.PathsObject = {};

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      paths[path] = this.convertPathItem(pathItem);
    }

    return paths;
  }

  /**
   * Convert a single path item
   */
  private convertPathItem(pathItem: Swagger2PathItem): OpenAPIV3.PathItemObject {
    const result: OpenAPIV3.PathItemObject = {};

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
    
    for (const method of methods) {
      const operation = pathItem[method];
      if (operation) {
        result[method] = this.convertOperation(operation);
      }
    }

    if (pathItem.parameters) {
      result.parameters = pathItem.parameters.map(p => this.convertParameter(p));
    }

    // Preserve x-uigen-id vendor extension from Swagger 2 path item
    // Requirements: 1.3, 1.4
    const vendorExtension = (pathItem as any)['x-uigen-id'];
    if (vendorExtension) {
      (result as any)['x-uigen-id'] = vendorExtension;
    }

    // Preserve x-uigen-ignore vendor extension from Swagger 2 path item
    const ignoreAnnotation = (pathItem as any)['x-uigen-ignore'];
    if (ignoreAnnotation !== undefined) {
      (result as any)['x-uigen-ignore'] = ignoreAnnotation;
    }

    return result;
  }

  /**
   * Convert a single operation
   */
  private convertOperation(operation: Swagger2Operation): OpenAPIV3.OperationObject {
    const result: OpenAPIV3.OperationObject = {
      responses: this.convertResponses(operation.responses)
    };

    if (operation.operationId) result.operationId = operation.operationId;
    if (operation.summary) result.summary = operation.summary;
    if (operation.description) result.description = operation.description;
    if (operation.tags) result.tags = operation.tags;
    if (operation.deprecated) result.deprecated = operation.deprecated;
    if (operation.security) result.security = operation.security;

    // Convert parameters
    if (operation.parameters) {
      const { parameters, requestBody } = this.convertParameters(operation.parameters);
      if (parameters.length > 0) result.parameters = parameters;
      if (requestBody) result.requestBody = requestBody;
    }

    // Preserve x-uigen-id vendor extension from Swagger 2 operation
    // Requirements: 1.5, 1.6
    const vendorExtension = (operation as any)['x-uigen-id'];
    if (vendorExtension) {
      (result as any)['x-uigen-id'] = vendorExtension;
    }

    // Preserve x-uigen-login vendor extension from Swagger 2 operation
    // Requirements: 1.4, 7.1, 7.2, 7.3
    const loginAnnotation = (operation as any)['x-uigen-login'];
    if (loginAnnotation !== undefined) {
      (result as any)['x-uigen-login'] = loginAnnotation;
    }

    // Preserve x-uigen-ignore vendor extension from Swagger 2 operation
    const ignoreAnnotation = (operation as any)['x-uigen-ignore'];
    if (ignoreAnnotation !== undefined) {
      (result as any)['x-uigen-ignore'] = ignoreAnnotation;
    }

    // Preserve x-uigen-password-reset vendor extension from Swagger 2 operation
    const passwordResetAnnotation = (operation as any)['x-uigen-password-reset'];
    if (passwordResetAnnotation !== undefined) {
      (result as any)['x-uigen-password-reset'] = passwordResetAnnotation;
    }

    // Preserve x-uigen-sign-up vendor extension from Swagger 2 operation
    const signUpAnnotation = (operation as any)['x-uigen-sign-up'];
    if (signUpAnnotation !== undefined) {
      (result as any)['x-uigen-sign-up'] = signUpAnnotation;
    }

    return result;
  }

  /**
   * Check if a schema contains file fields (including nested objects and arrays).
   * This method is used to detect when multipart/form-data content type should be used.
   * 
   * Requirement 16.5: Apply same content type detection rules as OpenAPI3 adapter
   * 
   * @param schema - The OpenAPI 3.x schema to check (after conversion from Swagger 2.0)
   * @returns True if the schema contains any file fields
   */
  private hasFileFields(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): boolean {
    // Handle references
    if ('$ref' in schema) {
      return false; // References are not expanded here for simplicity
    }

    // Direct file field (format: binary)
    if (schema.format === 'binary') {
      return true;
    }

    // Check children in object schemas
    if (schema.type === 'object' && schema.properties) {
      return Object.values(schema.properties).some(prop => this.hasFileFields(prop));
    }

    // Check items in array schemas
    if (schema.type === 'array' && schema.items) {
      return this.hasFileFields(schema.items);
    }

    return false;
  }

  /**
   * Convert parameters, separating body parameters into requestBody
   */
  private convertParameters(params: Array<Swagger2Parameter | Swagger2Reference>): {
    parameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject>;
    requestBody?: OpenAPIV3.RequestBodyObject;
  } {
    const parameters: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject> = [];
    let requestBody: OpenAPIV3.RequestBodyObject | undefined;

    // First pass: check if any formData parameters are file type
    // Requirement 16.5: Detect file fields to determine content type
    let hasFileInFormData = false;
    for (const param of params) {
      if (!('$ref' in param) && param.in === 'formData' && param.type === 'file') {
        hasFileInFormData = true;
        break;
      }
    }

    for (const param of params) {
      if ('$ref' in param) {
        // Convert reference from #/parameters/X to #/components/parameters/X
        const ref = param.$ref.replace('#/parameters/', '#/components/parameters/');
        parameters.push({ $ref: ref });
        continue;
      }

      // Body parameters become requestBody in OpenAPI 3.x
      if (param.in === 'body') {
        requestBody = {
          description: param.description,
          required: param.required,
          content: {
            'application/json': {
              schema: param.schema ? this.convertSchema(param.schema) : {}
            }
          }
        };
      } else if (param.in === 'formData') {
        // FormData parameters also become requestBody
        // Requirement 16.5: Use multipart/form-data when file fields are present
        const contentType = hasFileInFormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
        
        if (!requestBody) {
          requestBody = {
            required: param.required,
            content: {
              [contentType]: {
                schema: {
                  type: 'object',
                  properties: {}
                }
              }
            }
          };
        }
        const schema = requestBody.content[contentType].schema as OpenAPIV3.SchemaObject;
        if (!schema.properties) schema.properties = {};
        schema.properties[param.name] = this.convertParameterToSchema(param);
      } else {
        // Query, path, header parameters stay as parameters
        parameters.push(this.convertParameter(param));
      }
    }

    return { parameters, requestBody };
  }

  /**
   * Convert a single parameter
   */
  private convertParameter(param: Swagger2Parameter | Swagger2Reference): OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject {
    if ('$ref' in param) {
      const ref = param.$ref.replace('#/parameters/', '#/components/parameters/');
      return { $ref: ref };
    }

    const result: OpenAPIV3.ParameterObject = {
      name: param.name,
      in: param.in as 'query' | 'header' | 'path' | 'cookie',
      description: param.description,
      required: param.required || param.in === 'path',
      schema: this.convertParameterToSchema(param)
    };

    return result;
  }

  /**
   * Convert parameter properties to schema
   */
  private convertParameterToSchema(param: Swagger2Parameter): OpenAPIV3.SchemaObject {
    if (param.type === 'array' && param.items) {
      return {
        type: 'array',
        items: this.convertSchema(param.items) as OpenAPIV3.SchemaObject,
        minItems: param.minItems,
        maxItems: param.maxItems
      } as OpenAPIV3.ArraySchemaObject;
    }

    // Convert Swagger2 file type to OpenAPI3 binary format
    // In Swagger2, formData parameters use type: "file"
    // In OpenAPI3, this becomes type: "string" with format: "binary"
    const type = param.type === 'file' ? 'string' : param.type;
    const format = param.type === 'file' ? 'binary' : param.format;

    const schema: OpenAPIV3.NonArraySchemaObject = {
      type: type as any,
      format: format,
      default: param.default,
      enum: param.enum,
      minimum: param.minimum,
      maximum: param.maximum,
      minLength: param.minLength,
      maxLength: param.maxLength,
      pattern: param.pattern
    };

    return schema;
  }

  /**
   * Convert responses
   */
  private convertResponses(responses: Record<string, Swagger2Response | Swagger2Reference>): OpenAPIV3.ResponsesObject {
    const result: OpenAPIV3.ResponsesObject = {};

    for (const [code, response] of Object.entries(responses)) {
      if ('$ref' in response) {
        const ref = response.$ref.replace('#/responses/', '#/components/responses/');
        result[code] = { $ref: ref };
      } else {
        result[code] = this.convertResponse(response);
      }
    }

    return result;
  }

  /**
   * Convert a single response
   */
  private convertResponse(response: Swagger2Response): OpenAPIV3.ResponseObject {
    const result: OpenAPIV3.ResponseObject = {
      description: response.description
    };

    if (response.schema) {
      const convertedSchema = '$ref' in response.schema 
        ? { $ref: this.convertSchemaRef(response.schema.$ref!) }
        : this.convertSchema(response.schema);
      
      result.content = {
        'application/json': {
          schema: convertedSchema
        }
      };
    }

    if (response.headers) {
      result.headers = {};
      for (const [name, header] of Object.entries(response.headers)) {
        result.headers[name] = {
          description: header.description,
          schema: {
            type: header.type as any,
            format: header.format
          }
        };
      }
    }

    return result;
  }

  /**
   * Convert schema object
   * Requirement 2.4: Convert Swagger 2.0 definitions to OpenAPI 3.x schema format
   */
  private convertSchema(schema: Swagger2Schema | Swagger2Reference, visited: Set<string> = new Set()): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if ('$ref' in schema) {
      return { $ref: this.convertSchemaRef(schema.$ref!) };
    }

    // Handle array schemas separately
    if (schema.items) {
      const arrayResult: OpenAPIV3.ArraySchemaObject = {
        type: 'array',
        items: this.convertSchema(schema.items, visited) as OpenAPIV3.SchemaObject,
        description: schema.description,
        minItems: schema.minItems,
        maxItems: schema.maxItems,
        uniqueItems: schema.uniqueItems
      };
      const uigenLabelArray = (schema as any)['x-uigen-label'];
      if (uigenLabelArray !== undefined) {
        (arrayResult as any)['x-uigen-label'] = uigenLabelArray;
      }
      const uigenRefArray = (schema as any)['x-uigen-ref'];
      if (uigenRefArray !== undefined) {
        (arrayResult as any)['x-uigen-ref'] = uigenRefArray;
      }
      return arrayResult;
    }

    const result: OpenAPIV3.NonArraySchemaObject = {
      type: schema.type as any,
      format: schema.format,
      title: schema.title,
      description: schema.description,
      default: schema.default,
      enum: schema.enum,
      minimum: schema.minimum,
      maximum: schema.maximum,
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      pattern: schema.pattern,
      multipleOf: schema.multipleOf,
      readOnly: schema.readOnly,
      example: schema.example
    };

    if (schema.required) {
      result.required = schema.required;
    }

    if (schema.properties) {
      result.properties = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        result.properties[key] = this.convertSchema(prop, visited);
      }
    }

    if (schema.allOf) {
      result.allOf = schema.allOf.map(s => this.convertSchema(s, visited));
    }

    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties === 'boolean') {
        result.additionalProperties = schema.additionalProperties;
      } else {
        result.additionalProperties = this.convertSchema(schema.additionalProperties, visited);
      }
    }

    const uigenLabel = (schema as any)['x-uigen-label'];
    if (uigenLabel !== undefined) {
      (result as any)['x-uigen-label'] = uigenLabel;
    }

    const uigenRef = (schema as any)['x-uigen-ref'];
    if (uigenRef !== undefined) {
      (result as any)['x-uigen-ref'] = uigenRef;
    }

    // Preserve file metadata extensions for binary format fields
    // Requirement 1.6: Apply same file type detection rules as OpenAPI3 adapter
    this.preserveFileMetadataExtensions(schema, result);

    return result;
  }

  /**
   * Preserves file metadata extensions from Swagger 2.0 schema to OpenAPI 3.x schema.
   * This ensures that file upload metadata (contentMediaType, x-uigen-file-types, x-uigen-max-file-size)
   * is carried over during the conversion process.
   * 
   * Requirement 1.6: Apply same file type detection rules as OpenAPI3 adapter
   * 
   * @param swagger2Schema - The original Swagger 2.0 schema
   * @param openapi3Schema - The converted OpenAPI 3.x schema to preserve extensions on
   */
  private preserveFileMetadataExtensions(
    swagger2Schema: Swagger2Schema,
    openapi3Schema: OpenAPIV3.SchemaObject
  ): void {
    // Only preserve extensions for binary format fields
    if (swagger2Schema.format !== 'binary') {
      return;
    }

    // Preserve contentMediaType if present
    const contentMediaType = (swagger2Schema as any).contentMediaType;
    if (typeof contentMediaType === 'string' && contentMediaType.trim() !== '') {
      (openapi3Schema as any).contentMediaType = contentMediaType;
    }

    // Preserve x-uigen-file-types extension if present
    const xUigenFileTypes = (swagger2Schema as any)['x-uigen-file-types'];
    if (Array.isArray(xUigenFileTypes)) {
      (openapi3Schema as any)['x-uigen-file-types'] = xUigenFileTypes;
    }

    // Preserve x-uigen-max-file-size extension if present
    const xUigenMaxFileSize = (swagger2Schema as any)['x-uigen-max-file-size'];
    if (typeof xUigenMaxFileSize === 'number') {
      (openapi3Schema as any)['x-uigen-max-file-size'] = xUigenMaxFileSize;
    }
  }

  /**
   * Resolves a $ref reference in the Swagger 2.0 spec.
   * Implements caching and circular reference detection.
   * Requirements: 2.3, 2.7
   * 
   * @param ref - The reference path (e.g., "#/definitions/Pet")
   * @param visited - Set of references currently being resolved (for circular detection)
   * @returns The resolved schema, parameter, or response, or null if resolution fails
   */
  private resolveRef(ref: string, visited: Set<string> = new Set()): Swagger2Schema | Swagger2Parameter | Swagger2Response | null {
    // Check cache first for O(1) lookup
    // Requirement 2.3: Resolve all $ref references recursively with caching
    if (this.refCache.has(ref)) {
      return this.refCache.get(ref)!;
    }

    // Detect circular references
    if (visited.has(ref)) {
      console.warn(`Circular reference detected in Swagger 2.0 spec: ${ref}`);
      // Return a placeholder to prevent infinite loops
      return {
        type: 'object',
        description: `Circular reference to ${ref}`
      } as Swagger2Schema;
    }

    // Add to visited set
    const newVisited = new Set(visited);
    newVisited.add(ref);

    // Navigate to the referenced object
    const resolved = this.navigateToRef(ref);
    
    if (!resolved) {
      // Requirement 2.7: Log warning and continue processing when $ref cannot be resolved
      console.warn(`Unable to resolve reference in Swagger 2.0 spec: ${ref}`);
      return null;
    }

    // If the resolved object is itself a reference, resolve it recursively
    if ('$ref' in resolved && resolved.$ref) {
      return this.resolveRef(resolved.$ref, newVisited);
    }

    // Cache the result before returning
    this.refCache.set(ref, resolved);

    return resolved;
  }

  /**
   * Navigates the Swagger 2.0 spec object tree to find the referenced object.
   * 
   * @param ref - The reference path (e.g., "#/definitions/Pet")
   * @returns The referenced object or null if not found
   */
  private navigateToRef(ref: string): Swagger2Schema | Swagger2Parameter | Swagger2Response | null {
    // Only handle internal references starting with #/
    if (!ref.startsWith('#/')) {
      console.warn(`External references not supported in Swagger 2.0: ${ref}`);
      return null;
    }

    // Parse the reference path
    const path = ref.slice(2); // Remove '#/'
    const parts = path.split('/');

    // Navigate through the spec object
    let current: any = this.spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current as Swagger2Schema | Swagger2Parameter | Swagger2Response;
  }

  /**
   * Clears the reference resolution cache.
   * Should be called when parsing a new spec.
   */
  clearCache(): void {
    this.refCache.clear();
  }

  /**
   * Convert schema reference from Swagger 2.0 to OpenAPI 3.x format
   * Changes #/definitions/X to #/components/schemas/X
   */
  private convertSchemaRef(ref: string): string {
    return ref.replace('#/definitions/', '#/components/schemas/');
  }

  /**
   * Convert components (schemas, parameters, responses, securitySchemes)
   * Requirement 2.4: Convert definitions to components/schemas
   * Requirement 2.5: Convert securityDefinitions to securitySchemes
   */
  private convertComponents(): OpenAPIV3.ComponentsObject {
    const components: OpenAPIV3.ComponentsObject = {};

    // Convert definitions to schemas
    if (this.spec.definitions) {
      components.schemas = {};
      for (const [name, schema] of Object.entries(this.spec.definitions)) {
        components.schemas[name] = this.convertSchema(schema) as OpenAPIV3.SchemaObject;
      }
    }

    // Convert parameters
    if (this.spec.parameters) {
      components.parameters = {};
      for (const [name, param] of Object.entries(this.spec.parameters)) {
        components.parameters[name] = this.convertParameter(param) as OpenAPIV3.ParameterObject;
      }
    }

    // Convert responses
    if (this.spec.responses) {
      components.responses = {};
      for (const [name, response] of Object.entries(this.spec.responses)) {
        components.responses[name] = this.convertResponse(response);
      }
    }

    // Convert securityDefinitions to securitySchemes
    // Requirement 2.5: Convert Swagger 2.0 securityDefinitions to OpenAPI 3.x securitySchemes format
    if (this.spec.securityDefinitions) {
      components.securitySchemes = {};
      for (const [name, scheme] of Object.entries(this.spec.securityDefinitions)) {
        components.securitySchemes[name] = this.convertSecurityScheme(scheme);
      }
    }

    return components;
  }

  /**
   * Convert security scheme from Swagger 2.0 to OpenAPI 3.x format
   * Requirement 2.5: Convert securityDefinitions to securitySchemes format
   */
  private convertSecurityScheme(scheme: Swagger2SecurityScheme): OpenAPIV3.SecuritySchemeObject {
    if (scheme.type === 'basic') {
      return {
        type: 'http',
        scheme: 'basic',
        description: scheme.description
      };
    }

    if (scheme.type === 'apiKey') {
      return {
        type: 'apiKey',
        name: scheme.name!,
        in: scheme.in! as 'query' | 'header' | 'cookie',
        description: scheme.description
      };
    }

    if (scheme.type === 'oauth2') {
      const flows: OpenAPIV3.OAuth2SecurityScheme['flows'] = {};

      if (scheme.flow === 'implicit') {
        flows.implicit = {
          authorizationUrl: scheme.authorizationUrl!,
          scopes: scheme.scopes || {}
        };
      } else if (scheme.flow === 'password') {
        flows.password = {
          tokenUrl: scheme.tokenUrl!,
          scopes: scheme.scopes || {}
        };
      } else if (scheme.flow === 'application') {
        flows.clientCredentials = {
          tokenUrl: scheme.tokenUrl!,
          scopes: scheme.scopes || {}
        };
      } else if (scheme.flow === 'accessCode') {
        flows.authorizationCode = {
          authorizationUrl: scheme.authorizationUrl!,
          tokenUrl: scheme.tokenUrl!,
          scopes: scheme.scopes || {}
        };
      }

      return {
        type: 'oauth2',
        flows,
        description: scheme.description
      };
    }

    // Fallback for unknown types
    return {
      type: 'http',
      scheme: 'bearer',
      description: scheme.description
    };
  }
}
