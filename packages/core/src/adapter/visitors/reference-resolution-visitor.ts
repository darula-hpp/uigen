import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../ir/types.js';
import type { SchemaResolver } from '../schema-resolver.js';

/**
 * Resolves $ref references in OpenAPI schemas.
 * 
 * Implements the Visitor pattern for reference resolution operations.
 * Preserves all existing reference resolution behavior from OpenAPI3Adapter.
 * 
 * Resolution rules:
 * - Use SchemaResolver to resolve $ref references
 * - Track visited references using a Set for circular reference detection
 * - Create placeholder schemas for unresolvable references
 * - Preserve x-uigen-label annotations on $ref schemas
 * - Process annotations on $ref schemas using AnnotationHandlerRegistry
 * 
 * Requirements: 5.1-5.10
 */
export interface ReferenceResolutionVisitor {
  /**
   * Resolve a $ref reference to a SchemaNode.
   * 
   * Uses SchemaResolver for actual resolution and caching.
   * Handles circular references by checking the visited Set.
   * 
   * @param ref - The reference path (e.g., "#/components/schemas/User")
   * @param visited - Set of references currently being resolved (for circular detection)
   * @returns The resolved SchemaNode or null if resolution fails
   */
  resolveReference(
    ref: string,
    visited: Set<string>
  ): SchemaNode | null;

  /**
   * Detect if a reference would create a circular dependency.
   * 
   * Checks if the reference is already in the visited Set.
   * 
   * @param ref - The reference path to check
   * @param visited - Set of references currently being resolved
   * @returns True if the reference would create a circular dependency
   */
  detectCircularReference(
    ref: string,
    visited: Set<string>
  ): boolean;
}

/**
 * Default implementation of ReferenceResolutionVisitor.
 * Preserves all existing reference resolution behavior from OpenAPI3Adapter.
 */
export class DefaultReferenceResolutionVisitor implements ReferenceResolutionVisitor {
  private resolver: SchemaResolver;

  constructor(resolver: SchemaResolver) {
    this.resolver = resolver;
  }

  resolveReference(
    ref: string,
    visited: Set<string>
  ): SchemaNode | null {
    // Delegate to SchemaResolver which handles:
    // - Caching for O(1) lookup
    // - Circular reference detection
    // - Schema navigation
    // - Placeholder creation
    return this.resolver.resolve(ref, visited);
  }

  detectCircularReference(
    ref: string,
    visited: Set<string>
  ): boolean {
    // Check if reference is already being resolved
    return visited.has(ref);
  }
}
