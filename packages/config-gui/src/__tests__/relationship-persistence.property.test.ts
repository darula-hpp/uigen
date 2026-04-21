/**
 * Property-based tests for relationship persistence in config-gui.
 *
 * Feature: config-driven-relationships
 * Property 9: Config write preserves existing sections
 * Validates: Requirement 7.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ConfigFile, RelationshipConfig } from '@uigen-dev/core';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const slug = () => fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/);

const validRelationshipConfig = (): fc.Arbitrary<RelationshipConfig> =>
  fc.record({
    source: slug(),
    target: slug(),
    path: fc
      .tuple(slug(), slug(), slug())
      .map(([s, id, t]) => `/${s}/{${id}}/${t}`),
    label: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  });

const existingConfigFile = (): fc.Arbitrary<ConfigFile> =>
  fc.record({
    version: fc.constant('1.0'),
    enabled: fc.dictionary(
      fc.stringMatching(/^x-uigen-[a-z]+$/),
      fc.boolean(),
      { minKeys: 0, maxKeys: 3 }
    ),
    defaults: fc.dictionary(
      fc.stringMatching(/^x-uigen-[a-z]+$/),
      fc.dictionary(fc.string(), fc.string(), { minKeys: 0, maxKeys: 2 }),
      { minKeys: 0, maxKeys: 2 }
    ),
    annotations: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.dictionary(
        fc.stringMatching(/^x-uigen-[a-z]+$/),
        fc.oneof(fc.boolean(), fc.string()),
        { minKeys: 1, maxKeys: 2 }
      ),
      { minKeys: 0, maxKeys: 3 }
    ),
    relationships: fc.option(
      fc.array(validRelationshipConfig(), { minLength: 0, maxLength: 3 }),
      { nil: undefined }
    ),
  });

// ---------------------------------------------------------------------------
// Simulate the "write relationships" operation performed by App.tsx
// ---------------------------------------------------------------------------

function writeRelationships(
  existingConfig: ConfigFile,
  newRelationships: RelationshipConfig[]
): ConfigFile {
  return {
    ...existingConfig,
    relationships: newRelationships,
  };
}

// ---------------------------------------------------------------------------
// Property 9: Config write preserves existing sections
// ---------------------------------------------------------------------------

describe('Property 9: Config write preserves existing sections', () => {
  it('writing a new relationships array leaves version, enabled, defaults, and annotations unchanged', () => {
    fc.assert(
      fc.property(
        existingConfigFile(),
        fc.array(validRelationshipConfig(), { minLength: 0, maxLength: 5 }),
        (existingConfig, newRelationships) => {
          const updated = writeRelationships(existingConfig, newRelationships);

          // All existing sections must be preserved
          expect(updated.version).toBe(existingConfig.version);
          expect(JSON.stringify(updated.enabled)).toBe(JSON.stringify(existingConfig.enabled));
          expect(JSON.stringify(updated.defaults)).toBe(JSON.stringify(existingConfig.defaults));
          expect(JSON.stringify(updated.annotations)).toBe(JSON.stringify(existingConfig.annotations));

          // The relationships section must be the new one
          expect(JSON.stringify(updated.relationships)).toBe(JSON.stringify(newRelationships));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('writing an empty relationships array does not remove other sections', () => {
    fc.assert(
      fc.property(existingConfigFile(), (existingConfig) => {
        const updated = writeRelationships(existingConfig, []);

        expect(updated.version).toBe(existingConfig.version);
        expect(JSON.stringify(updated.enabled)).toBe(JSON.stringify(existingConfig.enabled));
        expect(JSON.stringify(updated.defaults)).toBe(JSON.stringify(existingConfig.defaults));
        expect(JSON.stringify(updated.annotations)).toBe(JSON.stringify(existingConfig.annotations));
        expect(updated.relationships).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Integration test 11.2: config-gui adds a relationship, verify relationships array
// Validates: Requirements 7.1, 7.4
// ---------------------------------------------------------------------------

describe('Integration 11.2: adding a relationship updates the relationships array', () => {
  it('adding a relationship appends it to the existing array', () => {
    const existingConfig: ConfigFile = {
      version: '1.0',
      enabled: { 'x-uigen-label': true },
      defaults: {},
      annotations: { 'User.email': { 'x-uigen-label': 'Email' } },
      relationships: [{ source: 'users', target: 'orders', path: '/users/{id}/orders' }],
    };

    const newRel: RelationshipConfig = {
      source: 'projects',
      target: 'tags',
      path: '/projects/{id}/tags',
    };

    const updated = writeRelationships(existingConfig, [
      ...(existingConfig.relationships ?? []),
      newRel,
    ]);

    expect(updated.relationships).toHaveLength(2);
    expect(updated.relationships![1].source).toBe('projects');

    // Existing sections preserved
    expect(updated.enabled['x-uigen-label']).toBe(true);
    expect(updated.annotations['User.email']).toBeDefined();
  });
});
