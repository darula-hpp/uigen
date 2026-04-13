import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RelationshipDetector } from '../relationship-detector.js';
import type { Resource, Relationship } from '../../ir/types.js';

/**
 * Property-Based Tests for Relationship Detection
 * 
 * **Property 7: Relationship Detection from Paths**
 * **Validates: Requirements 5.1**
 * 
 * These tests verify that relationship detection behaves correctly across
 * a wide range of randomly generated path patterns and schemas.
 */

describe('Relationship Detection - Property-Based Tests', () => {
  /**
   * **Property 7: Relationship Detection from Paths**
   * **Validates: Requirements 5.1**
   * 
   * For any path pattern matching /resources/{id}/related, a hasMany relationship
   * should be detected from the parent resource to the related resource.
   */
  it('should detect hasMany relationships from path patterns', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders', 'posts', 'articles'),
        fc.constantFrom('comments', 'reviews', 'items', 'tags', 'categories'),
        fc.constantFrom('id', 'userId', 'productId', 'uuid'),
        (parentSlug, relatedSlug, paramName) => {
          // Create a resource with a nested path
          const parentResource: Resource = {
            name: parentSlug.charAt(0).toUpperCase() + parentSlug.slice(1),
            slug: parentSlug,
            operations: [
              {
                id: `get_${parentSlug}_${relatedSlug}`,
                method: 'GET',
                path: `/${parentSlug}/{${paramName}}/${relatedSlug}`,
                summary: `Get ${relatedSlug} for ${parentSlug}`,
                parameters: [],
                responses: {},
                viewHint: 'list'
              }
            ],
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          // Create the related resource
          const relatedResource: Resource = {
            name: relatedSlug.charAt(0).toUpperCase() + relatedSlug.slice(1),
            slug: relatedSlug,
            operations: [],
            schema: {
              type: 'object',
              key: relatedSlug,
              label: relatedSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource],
            [relatedSlug, relatedResource]
          ]);
          
          const detector = new RelationshipDetector();
          const relationships = detector.detectFromPaths(parentResource, allResources);
          
          // Should detect exactly one hasMany relationship
          expect(relationships).toHaveLength(1);
          expect(relationships[0].type).toBe('hasMany');
          expect(relationships[0].target).toBe(relatedSlug);
          expect(relationships[0].path).toBe(`/${parentSlug}/{${paramName}}/${relatedSlug}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1**
   * 
   * Property: Multiple nested paths should detect multiple hasMany relationships.
   */
  it('should detect multiple hasMany relationships from multiple paths', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders'),
        fc.array(
          fc.constantFrom('comments', 'reviews', 'items', 'tags', 'notes', 'attachments'),
          { minLength: 2, maxLength: 4 }
        ).map(arr => [...new Set(arr)]), // Ensure unique related resources
        (parentSlug, relatedSlugs) => {
          // Create operations for each related resource
          const operations = relatedSlugs.map(relatedSlug => ({
            id: `get_${parentSlug}_${relatedSlug}`,
            method: 'GET' as const,
            path: `/${parentSlug}/{id}/${relatedSlug}`,
            summary: `Get ${relatedSlug}`,
            parameters: [],
            responses: {},
            viewHint: 'list' as const
          }));
          
          const parentResource: Resource = {
            name: parentSlug,
            slug: parentSlug,
            operations,
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          // Create all related resources
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource]
          ]);
          
          relatedSlugs.forEach(slug => {
            allResources.set(slug, {
              name: slug,
              slug,
              operations: [],
              schema: {
                type: 'object',
                key: slug,
                label: slug,
                required: false
              },
              relationships: [],
              pagination: undefined
            });
          });
          
          const detector = new RelationshipDetector();
          const relationships = detector.detectFromPaths(parentResource, allResources);
          
          // Should detect one relationship per related resource
          expect(relationships).toHaveLength(relatedSlugs.length);
          
          // All should be hasMany relationships
          relationships.forEach(rel => {
            expect(rel.type).toBe('hasMany');
            expect(relatedSlugs).toContain(rel.target);
          });
          
          // All related resources should be represented
          const detectedTargets = relationships.map(r => r.target);
          relatedSlugs.forEach(slug => {
            expect(detectedTargets).toContain(slug);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1**
   * 
   * Property: Paths that don't match the pattern should not detect relationships.
   */
  it('should not detect relationships from non-matching paths', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders'),
        fc.oneof(
          fc.constant('/users'), // No parameter
          fc.constant('/users/{id}'), // No nested resource
          fc.constant('/users/settings'), // No parameter before nested
          fc.constant('/api/v1/users/{id}/comments'), // Extra prefix
          fc.constant('/users/{id}/comments/recent') // Extra suffix
        ),
        (parentSlug, path) => {
          const parentResource: Resource = {
            name: parentSlug,
            slug: parentSlug,
            operations: [
              {
                id: 'test_op',
                method: 'GET',
                path,
                summary: 'Test',
                parameters: [],
                responses: {},
                viewHint: 'list'
              }
            ],
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource],
            ['comments', {
              name: 'comments',
              slug: 'comments',
              operations: [],
              schema: { type: 'object', key: 'comments', label: 'comments', required: false },
              relationships: [],
              pagination: undefined
            }]
          ]);
          
          const detector = new RelationshipDetector();
          const relationships = detector.detectFromPaths(parentResource, allResources);
          
          // Should not detect any relationships from non-matching paths
          // (unless the path happens to match the pattern)
          const expectedPattern = new RegExp(`^/${parentSlug}/\\{[^}]+\\}/[^/]+$`);
          if (!expectedPattern.test(path)) {
            expect(relationships).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1**
   * 
   * Property: Should not detect relationships to non-existent resources.
   */
  it('should only detect relationships to existing resources', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders'),
        fc.constantFrom('comments', 'reviews', 'items'),
        fc.constantFrom('tags', 'notes', 'attachments'), // Non-existent resource
        (parentSlug, existingSlug, nonExistentSlug) => {
          const parentResource: Resource = {
            name: parentSlug,
            slug: parentSlug,
            operations: [
              {
                id: 'op1',
                method: 'GET',
                path: `/${parentSlug}/{id}/${existingSlug}`,
                summary: 'Test',
                parameters: [],
                responses: {},
                viewHint: 'list'
              },
              {
                id: 'op2',
                method: 'GET',
                path: `/${parentSlug}/{id}/${nonExistentSlug}`,
                summary: 'Test',
                parameters: [],
                responses: {},
                viewHint: 'list'
              }
            ],
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          // Only add the existing resource to the map
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource],
            [existingSlug, {
              name: existingSlug,
              slug: existingSlug,
              operations: [],
              schema: { type: 'object', key: existingSlug, label: existingSlug, required: false },
              relationships: [],
              pagination: undefined
            }]
          ]);
          
          const detector = new RelationshipDetector();
          const relationships = detector.detectFromPaths(parentResource, allResources);
          
          // Should only detect relationship to existing resource
          expect(relationships).toHaveLength(1);
          expect(relationships[0].target).toBe(existingSlug);
          expect(relationships[0].target).not.toBe(nonExistentSlug);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1**
   * 
   * Property: Should handle special characters in resource slugs correctly.
   */
  it('should handle special regex characters in resource slugs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('api-users', 'my.products', 'test_orders'),
        fc.constantFrom('comments', 'reviews'),
        (parentSlug, relatedSlug) => {
          const parentResource: Resource = {
            name: parentSlug,
            slug: parentSlug,
            operations: [
              {
                id: 'test_op',
                method: 'GET',
                path: `/${parentSlug}/{id}/${relatedSlug}`,
                summary: 'Test',
                parameters: [],
                responses: {},
                viewHint: 'list'
              }
            ],
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource],
            [relatedSlug, {
              name: relatedSlug,
              slug: relatedSlug,
              operations: [],
              schema: { type: 'object', key: relatedSlug, label: relatedSlug, required: false },
              relationships: [],
              pagination: undefined
            }]
          ]);
          
          const detector = new RelationshipDetector();
          
          // Should not throw and should detect the relationship
          expect(() => {
            const relationships = detector.detectFromPaths(parentResource, allResources);
            expect(relationships).toHaveLength(1);
            expect(relationships[0].target).toBe(relatedSlug);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.1**
   * 
   * Property: Should not create duplicate relationships from multiple operations.
   */
  it('should avoid duplicate relationships from multiple operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products'),
        fc.constantFrom('comments', 'reviews'),
        fc.integer({ min: 2, max: 5 }),
        (parentSlug, relatedSlug, numOperations) => {
          // Create multiple operations with the same relationship pattern
          const operations = Array.from({ length: numOperations }, (_, i) => ({
            id: `op_${i}`,
            method: 'GET' as const,
            path: `/${parentSlug}/{id}/${relatedSlug}`,
            summary: `Operation ${i}`,
            parameters: [],
            responses: {},
            viewHint: 'list' as const
          }));
          
          const parentResource: Resource = {
            name: parentSlug,
            slug: parentSlug,
            operations,
            schema: {
              type: 'object',
              key: parentSlug,
              label: parentSlug,
              required: false
            },
            relationships: [],
            pagination: undefined
          };
          
          const allResources = new Map<string, Resource>([
            [parentSlug, parentResource],
            [relatedSlug, {
              name: relatedSlug,
              slug: relatedSlug,
              operations: [],
              schema: { type: 'object', key: relatedSlug, label: relatedSlug, required: false },
              relationships: [],
              pagination: undefined
            }]
          ]);
          
          const detector = new RelationshipDetector();
          const relationships = detector.detectFromPaths(parentResource, allResources);
          
          // Should detect only one relationship despite multiple operations
          expect(relationships).toHaveLength(1);
          expect(relationships[0].target).toBe(relatedSlug);
        }
      ),
      { numRuns: 100 }
    );
  });
});
