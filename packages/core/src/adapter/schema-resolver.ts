import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../ir/types.js';

/**
 * Resolves $ref references in OpenAPI specifications with caching and circular reference detection.
 */
export class SchemaResolver {
  private cache: Map<string, SchemaNode> = new Map();
  private spec: OpenAPIV3.Document;
  private adaptSchema: (key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited?: Set<string>) => SchemaNode;

  constructor(
    spec: OpenAPIV3.Document,
    adaptSchema: (key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited?: Set<string>) => SchemaNode
  ) {
    this.spec = spec;
    this.adaptSchema = adaptSchema;
  }

  /**
   * Resolves a $ref reference to a SchemaNode.
   * @param ref - The reference path (e.g., "#/components/schemas/User")
   * @param visited - Set of references currently being resolved (for circular detection)
   * @returns The resolved SchemaNode or null if resolution fails
   */
  resolve(ref: string, visited: Set<string> = new Set()): SchemaNode | null {
    // Check cache first for O(1) lookup
    if (this.cache.has(ref)) {
      return this.cache.get(ref)!;
    }

    // Detect circular references
    if (visited.has(ref)) {
      console.warn(`Circular reference detected: ${ref}`);
      return this.createPlaceholderSchema(this.extractName(ref));
    }

    // Add to visited set
    const newVisited = new Set(visited);
    newVisited.add(ref);

    // Parse and navigate to the referenced schema
    const schema = this.navigateToRef(ref);
    
    if (!schema) {
      console.warn(`Unable to resolve reference: ${ref}`);
      return null;
    }

    // If the resolved schema is itself a reference, resolve it recursively
    if ('$ref' in schema) {
      return this.resolve(schema.$ref, newVisited);
    }

    // Adapt the schema to SchemaNode
    const name = this.extractName(ref);
    const node = this.adaptSchema(name, schema as OpenAPIV3.SchemaObject, newVisited);

    // Cache the result before returning
    this.cache.set(ref, node);

    return node;
  }

  /**
   * Navigates the spec object tree to find the referenced schema.
   * @param ref - The reference path (e.g., "#/components/schemas/User")
   * @returns The schema object or null if not found
   */
  private navigateToRef(ref: string): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | null {
    // Only handle internal references starting with #/
    if (!ref.startsWith('#/')) {
      console.warn(`External references not supported: ${ref}`);
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

    return current as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  }

  /**
   * Extracts the schema name from a reference path.
   * @param ref - The reference path (e.g., "#/components/schemas/User")
   * @returns The schema name (e.g., "User")
   */
  private extractName(ref: string): string {
    const parts = ref.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Creates a placeholder schema for unresolvable or circular references.
   * @param key - The schema name
   * @returns A placeholder SchemaNode
   */
  private createPlaceholderSchema(key: string): SchemaNode {
    return {
      type: 'object',
      key,
      label: this.humanize(key),
      required: false,
      children: []
    };
  }

  /**
   * Converts a key to a human-readable label.
   * @param str - The key string
   * @returns A humanized label
   */
  private humanize(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Clears the resolution cache.
   * Should be called when parsing a new spec.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
