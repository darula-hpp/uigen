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
  RefreshEndpoint
} from '../ir/types.js';
import { SchemaResolver } from './schema-resolver.js';
import { ViewHintClassifier } from './view-hint-classifier.js';
import { RelationshipDetector } from './relationship-detector.js';
import { PaginationDetector } from './pagination-detector.js';

export class OpenAPI3Adapter {
  private spec: OpenAPIV3.Document;
  private resolver: SchemaResolver;
  private viewHintClassifier: ViewHintClassifier;
  private relationshipDetector: RelationshipDetector;
  private paginationDetector: PaginationDetector;
  private parsingErrors: ParsingError[] = [];

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
  }

  adapt(): UIGenApp {
    return {
      meta: this.extractMeta(),
      resources: this.extractResources(),
      auth: this.extractAuth(),
      dashboard: { enabled: true, widgets: [] },
      servers: this.extractServers(),
      parsingErrors: this.parsingErrors.length > 0 ? this.parsingErrors : undefined
    };
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

    return {
      schemes,
      globalRequired: !!this.spec.security && this.spec.security.length > 0,
      loginEndpoints,
      refreshEndpoints
    };
  }

  private detectLoginEndpoints(): LoginEndpoint[] {
    const loginEndpoints: LoginEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;
      const postOp = pathItem.post as OpenAPIV3.OperationObject | undefined;
      if (!postOp) continue;

      const pathMatch = /\/(login|signin|auth\/login|auth\/signin)$/i.test(path);
      const descText = (postOp.summary || postOp.description || '').toLowerCase();
      const descMatch = descText.match(/\b(login|authenticate|sign\s*in)\b/) &&
        !descText.match(/\b(create|generate|get|retrieve|list)\b.*\b(login link|login url)\b/);

      let hasCredentialFields = false;
      let requestBodySchema: SchemaNode | undefined;

      if (postOp.requestBody && 'content' in postOp.requestBody) {
        const content = this.pickContent(postOp.requestBody.content);
        if (content?.schema) {
          requestBodySchema = this.adaptSchema('credentials', content.schema);
          const fields = this.getSchemaFieldNames(requestBodySchema);
          hasCredentialFields =
            (fields.includes('username') || fields.includes('email')) &&
            fields.includes('password');
        }
      }

      if (pathMatch || descMatch) {
        const tokenPath = this.detectTokenPath(postOp);
        loginEndpoints.push({ path, method: 'POST', requestBodySchema: requestBodySchema!, tokenPath, description: postOp.summary || postOp.description });
      } else if (hasCredentialFields) {
        const pathLooksAuthRelated = /\/(auth|account|session|token|user|access)/.test(path);
        if (pathLooksAuthRelated) {
          const tokenPath = this.detectTokenPath(postOp);
          loginEndpoints.push({ path, method: 'POST', requestBodySchema: requestBodySchema!, tokenPath, description: postOp.summary || postOp.description });
        }
      }
    }

    return loginEndpoints;
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
          const op = this.adaptOperation(method.toUpperCase() as HttpMethod, path, operation);
          resource.operations.push(op);

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

    // Detect relationships and pagination
    for (const resource of resourceMap.values()) {
      resource.relationships = this.detectRelationships(resource, resourceMap);
      resource.pagination = this.detectPagination(resource);
    }

    // Ensure operation IDs are unique
    const usedIds = new Set<string>();
    for (const resource of resourceMap.values()) {
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

    return Array.from(resourceMap.values());
  }

  private adaptOperation(method: HttpMethod, path: string, operation: OpenAPIV3.OperationObject): Operation {
    const parameters = this.adaptParameters(operation.parameters || []);
    const requestBody = operation.requestBody ? this.adaptRequestBody(operation.requestBody) : undefined;

    let requestContentType: string | undefined;
    if (operation.requestBody && 'content' in operation.requestBody) {
      const content = operation.requestBody.content;
      if (content['application/json']) requestContentType = 'application/json';
      else if (content['application/x-www-form-urlencoded']) requestContentType = 'application/x-www-form-urlencoded';
      else if (content['multipart/form-data']) requestContentType = 'multipart/form-data';
      else requestContentType = Object.keys(content)[0];
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

  private adaptParameters(params: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]): Parameter[] {
    return params
      .filter(p => p != null)
      .map(p => {
        if ('$ref' in p) return this.resolveParameterRef(p.$ref);
        return {
          name: p.name,
          in: p.in as 'path' | 'query' | 'header' | 'cookie',
          required: p.required || false,
          schema: p.schema ? this.adaptSchema(p.name, p.schema as OpenAPIV3.SchemaObject) : this.createPlaceholderSchema(p.name),
          description: p.description
        };
      });
  }

  private adaptRequestBody(body: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject): SchemaNode | undefined {
    if ('$ref' in body) {
      const resolved = this.resolver.resolve(body.$ref);
      return resolved || undefined;
    }
    const content = this.pickContent(body.content);
    if (!content?.schema) return undefined;
    return this.adaptSchema('body', content.schema as OpenAPIV3.SchemaObject);
  }

  private adaptResponses(responses: OpenAPIV3.ResponsesObject): Record<string, { description?: string; schema?: SchemaNode }> {
    const result: Record<string, { description?: string; schema?: SchemaNode }> = {};
    if (!responses || typeof responses !== 'object') return result;

    for (const [code, response] of Object.entries(responses)) {
      if ('$ref' in response) continue;
      const content = this.pickContent(response.content);
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

  private adaptSchema(key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited: Set<string> = new Set()): SchemaNode {
    if (!schema) return this.createPlaceholderSchema(key);

    if ('$ref' in schema) {
      const resolved = this.resolver.resolve(schema.$ref, visited);
      if (!resolved) return this.createPlaceholderSchema(key);
      return { ...resolved, key, label: this.resolveLabel(key, schema, resolved) };
    }

    const type = this.mapType(schema.type, schema.format);
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
      node.children = Object.entries(schema.properties).map(([k, v]) =>
        this.adaptSchema(k, v as OpenAPIV3.SchemaObject, visited)
      );
      if (schema.required) {
        schema.required.forEach(reqKey => {
          const child = node.children?.find(c => c.key === reqKey);
          if (child) child.required = true;
        });
      }
    }

    if (type === 'array' && 'items' in schema && schema.items) {
      node.items = this.adaptSchema('item', schema.items as OpenAPIV3.SchemaObject, visited);
    }

    node.validations = this.extractValidations(schema);
    node.format = schema.format;
    node.readOnly = schema.readOnly;
    node.writeOnly = schema.writeOnly;
    node.nullable = schema.nullable;
    node.deprecated = schema.deprecated;

    return node;
  }

  private mapType(type: string | undefined, format: string | undefined): SchemaNode['type'] {
    if (format === 'date' || format === 'date-time') return 'date';
    if (format === 'binary') return 'file';
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
