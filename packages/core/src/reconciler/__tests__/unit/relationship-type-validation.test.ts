import { describe, it, expect } from 'vitest';
import { validateRelationshipType, validateRelationships } from '../../relationship-validator.js';
import type { RelationshipConfig } from '../../../config/types.js';

describe('validateRelationshipType', () => {
  it('returns null for valid hasMany type', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
      type: 'hasMany',
    };

    const result = validateRelationshipType(rel, 0);
    expect(result).toBeNull();
  });

  it('returns null for valid belongsTo type', () => {
    const rel: RelationshipConfig = {
      source: 'orders',
      target: 'users',
      path: '/users/{id}/orders',
      type: 'belongsTo',
    };

    const result = validateRelationshipType(rel, 0);
    expect(result).toBeNull();
  });

  it('returns null for valid manyToMany type', () => {
    const rel: RelationshipConfig = {
      source: 'meetings',
      target: 'templates',
      path: '/meetings/{id}/templates',
      type: 'manyToMany',
    };

    const result = validateRelationshipType(rel, 0);
    expect(result).toBeNull();
  });

  it('returns warning when type field is missing', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
    };

    const result = validateRelationshipType(rel, 0);
    expect(result).not.toBeNull();
    expect(result?.message).toContain('Missing type field');
    expect(result?.message).toContain('Type will be derived from path');
    expect(result?.elementPath).toBe('relationships[0]');
  });

  it('returns error when type field has invalid value', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
      type: 'invalidType' as any,
    };

    const result = validateRelationshipType(rel, 2);
    expect(result).not.toBeNull();
    expect(result?.message).toContain('Invalid relationship type');
    expect(result?.message).toContain('invalidType');
    expect(result?.message).toContain('Must be one of: hasMany, belongsTo, manyToMany');
    expect(result?.elementPath).toBe('relationships[2]');
  });

  it('includes correct index in warning message', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
    };

    const result = validateRelationshipType(rel, 5);
    expect(result?.message).toContain('relationships[5]');
    expect(result?.elementPath).toBe('relationships[5]');
  });
});

describe('validateRelationships - type field integration', () => {
  it('includes relationship with valid type in validRelationships', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'hasMany',
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(1);
    expect(result.validRelationships[0].type).toBe('hasMany');
    expect(result.warnings).toHaveLength(0);
  });

  it('includes relationship with missing type in validRelationships but adds warning', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Missing type field');
  });

  it('excludes relationship with invalid type from validRelationships', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'invalidType' as any,
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Invalid relationship type');
  });

  it('validates multiple relationships with mixed type validity', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'hasMany',
      },
      {
        source: 'orders',
        target: 'items',
        path: '/orders/{id}/items',
      },
      {
        source: 'meetings',
        target: 'templates',
        path: '/meetings/{id}/templates',
        type: 'invalidType' as any,
      },
      {
        source: 'projects',
        target: 'tags',
        path: '/projects/{id}/tags',
        type: 'manyToMany',
      },
    ];

    const result = validateRelationships(entries);
    
    // Valid: hasMany (index 0), missing type (index 1), manyToMany (index 3)
    // Invalid: invalidType (index 2)
    expect(result.validRelationships).toHaveLength(3);
    expect(result.validRelationships[0].type).toBe('hasMany');
    expect(result.validRelationships[1].type).toBeUndefined();
    expect(result.validRelationships[2].type).toBe('manyToMany');
    
    // Warnings: missing type (index 1), invalid type (index 2)
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0].message).toContain('Missing type field');
    expect(result.warnings[1].message).toContain('Invalid relationship type');
  });

  it('validates all three valid type values', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'hasMany',
      },
      {
        source: 'orders',
        target: 'users',
        path: '/users/{id}/orders',
        type: 'belongsTo',
      },
      {
        source: 'meetings',
        target: 'templates',
        path: '/meetings/{id}/templates',
        type: 'manyToMany',
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
  });

  it('type validation runs after basic field validation', () => {
    const entries: RelationshipConfig[] = [
      {
        source: '',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'hasMany',
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    // Should fail on missing source, not reach type validation
    expect(result.warnings[0].message).toContain('"source"');
  });

  it('invalid type does not prevent other validations from running', () => {
    const entries: RelationshipConfig[] = [
      {
        source: 'users',
        target: 'orders',
        path: '/users/{id}/orders',
        type: 'invalidType' as any,
      },
      {
        source: 'projects',
        target: 'tags',
        path: '/projects/{id}/tags',
        type: 'hasMany',
      },
    ];

    const result = validateRelationships(entries);
    expect(result.validRelationships).toHaveLength(1);
    expect(result.validRelationships[0].source).toBe('projects');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Invalid relationship type');
  });
});
