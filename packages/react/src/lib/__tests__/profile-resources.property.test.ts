import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isProfileResource, filterProfileResources } from '../profile-resources';
import type { Resource } from '@uigen-dev/core';

// Arbitraries

/** Generates a minimal mock resource with optional __profileAnnotation */
const resourceArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  slug: fc.string({ minLength: 1, maxLength: 20 }),
  uigenId: fc.string({ minLength: 1, maxLength: 30 }),
  __profileAnnotation: fc.option(fc.boolean(), { nil: undefined }),
  operations: fc.constant([]),
  schema: fc.constant({
    type: 'object' as const,
    key: 'test',
    children: [],
  }),
  relationships: fc.constant([]),
});

describe('profile-resources - Property-Based Tests', () => {
  // Feature: x-uigen-profile, Property 3: Profile Resource Identification
  it('Property 3: isProfileResource returns true if and only if __profileAnnotation is explicitly true', () => {
    // **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    fc.assert(
      fc.property(resourceArb, (resource) => {
        const result = isProfileResource(resource as Resource);
        const expected = resource.__profileAnnotation === true;
        
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-profile, Property 4: Profile Resource Filtering
  it('Property 4: filterProfileResources returns exactly those resources where isProfileResource returns false', () => {
    // **Validates: Requirements 7.1, 7.2, 7.3**
    fc.assert(
      fc.property(
        fc.array(resourceArb, { minLength: 0, maxLength: 20 }),
        (resources) => {
          const filtered = filterProfileResources(resources as Resource[]);
          const expected = resources.filter(r => r.__profileAnnotation !== true);
          
          // Filtered result should match expected
          expect(filtered.length).toBe(expected.length);
          expect(filtered).toEqual(expected);
          
          // Filtered length should be less than or equal to original
          expect(filtered.length).toBeLessThanOrEqual(resources.length);
          
          // Verify order preservation by checking slugs
          const filteredSlugs = filtered.map(r => r.slug);
          const expectedSlugs = expected.map(r => r.slug);
          expect(filteredSlugs).toEqual(expectedSlugs);
          
          // Verify no profile resources in filtered result
          for (const resource of filtered) {
            expect(isProfileResource(resource as Resource)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Filtering is idempotent
  it('Property: filterProfileResources is idempotent - filtering twice produces same result', () => {
    fc.assert(
      fc.property(
        fc.array(resourceArb, { minLength: 0, maxLength: 20 }),
        (resources) => {
          const filtered1 = filterProfileResources(resources as Resource[]);
          const filtered2 = filterProfileResources(filtered1);
          
          expect(filtered2).toEqual(filtered1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Filtering preserves non-profile resources
  it('Property: filterProfileResources preserves all non-profile resources', () => {
    fc.assert(
      fc.property(
        fc.array(resourceArb, { minLength: 0, maxLength: 20 }),
        (resources) => {
          const filtered = filterProfileResources(resources as Resource[]);
          const nonProfileResources = resources.filter(r => r.__profileAnnotation !== true);
          
          // Every non-profile resource should be in the filtered result
          for (const resource of nonProfileResources) {
            expect(filtered).toContainEqual(resource);
          }
          
          // Filtered result should contain only non-profile resources
          expect(filtered.length).toBe(nonProfileResources.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
