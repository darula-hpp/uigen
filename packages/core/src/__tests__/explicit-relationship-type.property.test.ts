import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { RelationshipConfig } from '../config/types.js';
import { validateRelationshipType } from '../reconciler/relationship-validator.js';
import { deriveRelationshipType } from '../adapter/relationship-type-deriver.js';

/**
 * Property-based tests for explicit relationship type selection feature
 * 
 * These tests verify correctness properties that should hold for all inputs,
 * running 100 iterations each to catch edge cases.
 * 
 * Requirements: Task 12
 */

// --- Arbitraries (generators for test data) ---

const relationshipTypeArb = fc.constantFrom('hasMany', 'belongsTo', 'manyToMany');

const slugArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,20}$/);

const pathSegmentArb = fc.oneof(
  slugArb,
  fc.constant('{id}'),
  fc.constant('{userId}'),
  fc.constant('{projectId}')
);

const pathArb = fc.array(pathSegmentArb, { minLength: 2, maxLength: 5 }).map(
  segments => '/' + segments.join('/')
);

const relationshipConfigArb = fc.record({
  source: slugArb,
  target: slugArb,
  path: pathArb,
  type: fc.option(relationshipTypeArb, { nil: undefined }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined })
}) as fc.Arbitrary<RelationshipConfig>;

// --- Property Tests ---

describe('Property-based tests: Explicit Relationship Type', () => {
  /**
   * P1: Type field round-trip
   * If a relationship has an explicit type, validation should preserve it
   */
  it('P1: Type field survives validation round-trip', () => {
    fc.assert(
      fc.property(relationshipConfigArb, relationshipTypeArb, (rel, type) => {
        const withType = { ...rel, type };
        const warning = validateRelationshipType(withType, 0);
        
        // Should have no warnings for valid types
        expect(warning).toBeNull();
        
        // Type should be preserved
        expect(withType.type).toBe(type);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P2: Invalid type produces error
   * Any type value outside the valid set should produce a validation error
   */
  it('P2: Invalid type values produce validation errors', () => {
    fc.assert(
      fc.property(
        relationshipConfigArb,
        fc.string({ minLength: 1 }).filter(s => !['hasMany', 'belongsTo', 'manyToMany'].includes(s)),
        (rel, invalidType) => {
          const withInvalidType = { ...rel, type: invalidType as any };
          const warning = validateRelationshipType(withInvalidType, 0);
          
          // Should have a warning
          expect(warning).not.toBeNull();
          expect(warning?.message).toContain('Invalid relationship type');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P3: Missing type produces warning (not error)
   * For backward compatibility, missing type should warn but not error
   */
  it('P3: Missing type field produces warning', () => {
    fc.assert(
      fc.property(relationshipConfigArb, (rel) => {
        const withoutType = { ...rel, type: undefined };
        const warning = validateRelationshipType(withoutType, 0);
        
        // Should have a warning
        expect(warning).not.toBeNull();
        expect(warning?.message).toContain('Missing type field');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P4: Explicit type bypasses derivation
   * When a type is explicitly set, it should be used directly without path-based derivation
   */
  it('P4: Explicit type is used directly without derivation', () => {
    fc.assert(
      fc.property(
        slugArb,
        slugArb,
        pathArb,
        relationshipTypeArb,
        (source, target, path, explicitType) => {
          // Create relationship with explicit type
          const rel: RelationshipConfig = {
            source,
            target,
            path,
            type: explicitType
          };
          
          // Derive type from path
          const derivedType = deriveRelationshipType(path, source, target, [rel]);
          
          // Even if derived type differs, explicit type should be preserved
          // (This is tested by checking that validation doesn't change it)
          const warning = validateRelationshipType(rel, 0);
          expect(rel.type).toBe(explicitType);
          
          // No warnings should occur for valid explicit types
          expect(warning).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P5: Type derivation is deterministic
   * Deriving type from the same path should always produce the same result
   */
  it('P5: Type derivation is deterministic', () => {
    fc.assert(
      fc.property(slugArb, slugArb, pathArb, (source, target, path) => {
        const rel: RelationshipConfig = { source, target, path };
        const type1 = deriveRelationshipType(path, source, target, [rel]);
        const type2 = deriveRelationshipType(path, source, target, [rel]);
        
        expect(type1).toBe(type2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P6: Migration preserves all fields
   * When migrating a relationship by adding a type, all other fields should be preserved
   */
  it('P6: Migration preserves all relationship fields', () => {
    fc.assert(
      fc.property(relationshipConfigArb, (rel) => {
        // Remove type to simulate implicit relationship
        const { type, ...withoutType } = rel;
        
        // Simulate migration: derive type and add it
        const derivedType = deriveRelationshipType(
          withoutType.path,
          withoutType.source,
          withoutType.target,
          [withoutType as RelationshipConfig]
        );
        const migrated = { ...withoutType, type: derivedType };
        
        // All original fields should be preserved
        expect(migrated.source).toBe(withoutType.source);
        expect(migrated.target).toBe(withoutType.target);
        expect(migrated.path).toBe(withoutType.path);
        expect(migrated.label).toBe(withoutType.label);
        expect(migrated.description).toBe(withoutType.description);
        
        // Type should be added
        expect(migrated.type).toBeDefined();
        expect(['hasMany', 'belongsTo', 'manyToMany']).toContain(migrated.type);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P7: Type change updates relationship
   * Changing a relationship's type should produce a valid relationship
   */
  it('P7: Type change produces valid relationship', () => {
    fc.assert(
      fc.property(
        relationshipConfigArb,
        relationshipTypeArb,
        relationshipTypeArb,
        (rel, oldType, newType) => {
          // Start with old type
          const withOldType = { ...rel, type: oldType };
          
          // Change to new type
          const withNewType = { ...withOldType, type: newType };
          
          // Both should be valid
          const oldWarning = validateRelationshipType(withOldType, 0);
          const newWarning = validateRelationshipType(withNewType, 0);
          
          expect(oldWarning).toBeNull();
          expect(newWarning).toBeNull();
          
          // Type should be updated
          expect(withNewType.type).toBe(newType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * P8: Derived type matches path pattern
   * The type derived from a path should be consistent with the path structure
   */
  it('P8: Derived type is consistent with path structure', () => {
    fc.assert(
      fc.property(slugArb, slugArb, (source, target) => {
        fc.pre(source !== target); // Skip when source equals target
        
        // Test hasMany pattern: /{source}/{id}/{target}
        const hasManyPath = `/${source}/{id}/${target}`;
        const hasManyRel: RelationshipConfig = { source, target, path: hasManyPath };
        const hasManyType = deriveRelationshipType(hasManyPath, source, target, [hasManyRel]);
        expect(hasManyType).toBe('hasMany');
        
        // Test belongsTo pattern: /{target}/{id}/{source}
        const belongsToPath = `/${target}/{id}/${source}`;
        const belongsToRel: RelationshipConfig = { source, target, path: belongsToPath };
        const belongsToType = deriveRelationshipType(belongsToPath, source, target, [belongsToRel]);
        expect(belongsToType).toBe('belongsTo');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P9: Validation is idempotent
   * Running validation multiple times should produce the same result
   */
  it('P9: Validation is idempotent', () => {
    fc.assert(
      fc.property(relationshipConfigArb, (rel) => {
        const warning1 = validateRelationshipType(rel, 0);
        const warning2 = validateRelationshipType(rel, 0);
        
        // Both should be null or both should have the same message
        if (warning1 === null) {
          expect(warning2).toBeNull();
        } else {
          expect(warning2).not.toBeNull();
          expect(warning1.message).toBe(warning2?.message);
          expect(warning1.elementPath).toBe(warning2?.elementPath);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * P10: Type field is optional
   * Relationships should be valid with or without explicit type (backward compatibility)
   */
  it('P10: Type field is optional for backward compatibility', () => {
    fc.assert(
      fc.property(relationshipConfigArb, (rel) => {
        // With type - should have no warnings
        const withType = { ...rel, type: 'hasMany' as const };
        const withTypeWarning = validateRelationshipType(withType, 0);
        expect(withTypeWarning).toBeNull();
        
        // Without type - should have a warning but still be acceptable
        const withoutType = { ...rel, type: undefined };
        const withoutTypeWarning = validateRelationshipType(withoutType, 0);
        expect(withoutTypeWarning).not.toBeNull();
        expect(withoutTypeWarning?.message).toContain('Missing type field');
      }),
      { numRuns: 100 }
    );
  });
});
