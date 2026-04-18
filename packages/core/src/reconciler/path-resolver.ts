/**
 * Element Path Resolver
 * 
 * Resolves element paths (e.g., "POST:/api/v1/users", "User.email") to their
 * corresponding elements in an OpenAPI/Swagger specification.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { ResolvedElement, Swagger2Document } from './types';

/**
 * Cache for resolved element paths
 */
class ElementPathCache {
  private cache: Map<string, ResolvedElement | null> = new Map();

  get(path: string): ResolvedElement | null | undefined {
    return this.cache.get(path);
  }

  set(path: string, element: ResolvedElement | null): void {
    this.cache.set(path, element);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Element Path Resolver
 * 
 * Resolves element paths to their corresponding elements in a spec.
 * Supports caching for performance.
 */
export class ElementPathResolver {
  private cache: ElementPathCache = new ElementPathCache();

  /**
   * Resolve an element path to its corresponding element in the spec
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param elementPath - The element path to resolve
   * @returns The resolved element, or null if not found
   */
  resolve(
    spec: OpenAPIV3.Document | Swagger2Document,
    elementPath: string
  ): ResolvedElement | null {
    // Check cache first
    const cached = this.cache.get(elementPath);
    if (cached !== undefined) {
      return cached;
    }

    // Determine path type and delegate to appropriate resolver
    let resolved: ResolvedElement | null = null;

    if (elementPath.includes(':')) {
      // Operation path: METHOD:/path/to/endpoint
      resolved = this.resolveOperationPath(spec, elementPath);
    } else if (elementPath.includes('.')) {
      // Schema property path: SchemaName.propertyName
      resolved = this.resolveSchemaPropertyPath(spec, elementPath);
    } else {
      // Invalid path format
      resolved = null;
    }

    // Cache the result
    this.cache.set(elementPath, resolved);

    return resolved;
  }

  /**
   * Resolve an operation path (METHOD:/path/to/endpoint)
   */
  private resolveOperationPath(
    spec: OpenAPIV3.Document | Swagger2Document,
    elementPath: string
  ): ResolvedElement | null {
    // Parse: "POST:/api/v1/users" → { method: "POST", path: "/api/v1/users" }
    const colonIndex = elementPath.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }

    const method = elementPath.slice(0, colonIndex);
    const path = elementPath.slice(colonIndex + 1);

    // Normalize method to lowercase for spec lookup
    const normalizedMethod = method.toLowerCase();

    // Lookup in spec.paths
    const pathItem = spec.paths?.[path];
    if (!pathItem || typeof pathItem !== 'object') {
      return null; // Path not found
    }

    // Lookup operation by method
    const operation = (pathItem as Record<string, unknown>)[normalizedMethod];
    if (!operation || typeof operation !== 'object') {
      return null; // Method not found
    }

    return {
      type: 'operation',
      location: { path: `paths.${path}.${normalizedMethod}` },
      object: operation as Record<string, unknown>,
    };
  }

  /**
   * Resolve a schema property path (SchemaName.propertyName)
   */
  private resolveSchemaPropertyPath(
    spec: OpenAPIV3.Document | Swagger2Document,
    elementPath: string
  ): ResolvedElement | null {
    // Parse: "User.address.street" → ["User", "address", "street"]
    const parts = elementPath.split('.');
    const schemaName = parts[0];
    const propertyPath = parts.slice(1);

    if (propertyPath.length === 0) {
      return null; // No property specified
    }

    // Locate schema in components/schemas (OpenAPI 3.x) or definitions (Swagger 2.0)
    let schemas: Record<string, unknown> = {};
    
    if ('components' in spec && spec.components && typeof spec.components === 'object' && 'schemas' in spec.components) {
      schemas = spec.components.schemas as Record<string, unknown>;
    } else if ('definitions' in spec && spec.definitions) {
      schemas = spec.definitions as Record<string, unknown>;
    }

    let schema = schemas[schemaName];

    if (!schema || typeof schema !== 'object') {
      return null; // Schema not found
    }

    // Resolve $ref if present
    if ('$ref' in schema && typeof schema.$ref === 'string') {
      schema = this.resolveRef(spec, schema.$ref);
      if (!schema) return null;
    }

    // Navigate nested properties
    let current: Record<string, unknown> = schema as Record<string, unknown>;
    for (let i = 0; i < propertyPath.length; i++) {
      const propName = propertyPath[i];

      const properties = current.properties as Record<string, unknown> | undefined;
      if (!properties || typeof properties !== 'object' || !(propName in properties)) {
        return null; // Property not found
      }

      current = properties[propName] as Record<string, unknown>;

      // Resolve $ref if present
      if ('$ref' in current && typeof current.$ref === 'string') {
        const resolved = this.resolveRef(spec, current.$ref);
        if (!resolved) return null;
        current = resolved;
      }
    }

    return {
      type: 'schema-property',
      location: { path: `schemas.${schemaName}.properties.${propertyPath.join('.properties.')}` },
      object: current,
    };
  }

  /**
   * Resolve a $ref reference
   * 
   * Only handles internal references: #/components/schemas/X or #/definitions/X
   */
  private resolveRef(
    spec: OpenAPIV3.Document | Swagger2Document,
    ref: string
  ): Record<string, unknown> | null {
    // Only handle internal references
    if (!ref.startsWith('#/')) {
      return null;
    }

    const path = ref.slice(2); // Remove '#/'
    const parts = path.split('/');

    let current: unknown = spec;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return current as Record<string, unknown>;
  }

  /**
   * Suggest similar paths for typos
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param invalidPath - The invalid path
   * @param maxSuggestions - Maximum number of suggestions (default: 3)
   * @returns Array of suggested paths
   */
  suggestSimilarPaths(
    spec: OpenAPIV3.Document | Swagger2Document,
    invalidPath: string,
    maxSuggestions = 3
  ): string[] {
    const allPaths = this.collectAllElementPaths(spec);

    // Calculate Levenshtein distance for each path
    const distances = allPaths.map((path) => ({
      path,
      distance: this.levenshteinDistance(invalidPath, path),
    }));

    // Sort by distance and take top N
    distances.sort((a, b) => a.distance - b.distance);

    // Only suggest paths with distance < 50% of path length
    const threshold = Math.floor(invalidPath.length * 0.5);
    return distances
      .filter((d) => d.distance <= threshold)
      .slice(0, maxSuggestions)
      .map((d) => d.path);
  }

  /**
   * Collect all valid element paths from a spec
   */
  private collectAllElementPaths(spec: OpenAPIV3.Document | Swagger2Document): string[] {
    const paths: string[] = [];

    // Collect operation paths
    if (spec.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
          if (method in pathItem) {
            paths.push(`${method.toUpperCase()}:${path}`);
          }
        }
      }
    }

    // Collect schema property paths
    let schemas: Record<string, unknown> = {};
    
    if ('components' in spec && spec.components && typeof spec.components === 'object' && 'schemas' in spec.components) {
      schemas = spec.components.schemas as Record<string, unknown>;
    } else if ('definitions' in spec && spec.definitions) {
      schemas = spec.definitions as Record<string, unknown>;
    }

    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (schema && typeof schema === 'object') {
        this.collectSchemaPropertyPaths(schemaName, schema as Record<string, unknown>, paths);
      }
    }

    return paths;
  }

  /**
   * Recursively collect schema property paths
   */
  private collectSchemaPropertyPaths(
    schemaName: string,
    schema: Record<string, unknown>,
    paths: string[],
    prefix = ''
  ): void {
    const properties = schema.properties as Record<string, unknown> | undefined;
    if (!properties || typeof properties !== 'object') return;

    for (const [propName, prop] of Object.entries(properties)) {
      const fullPath = prefix ? `${prefix}.${propName}` : `${schemaName}.${propName}`;
      paths.push(fullPath);

      // Recurse for nested objects
      if (
        prop &&
        typeof prop === 'object' &&
        'type' in prop &&
        prop.type === 'object' &&
        'properties' in prop
      ) {
        this.collectSchemaPropertyPaths(schemaName, prop as Record<string, unknown>, paths, fullPath);
      }
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Clear the path resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
