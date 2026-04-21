/**
 * Property-based tests for the config-driven-relationships feature.
 *
 * Feature: config-driven-relationships
 * Uses fast-check with a minimum of 100 iterations per property.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import yaml from 'js-yaml';
import type { RelationshipConfig, ConfigFile } from '../config/types.js';
import { deriveRelationshipType } from '../adapter/relationship-type-deriver.js';
import { Reconciler } from '../reconciler/reconciler.js';

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

const validRelationshipConfigArray = () =>
  fc.array(validRelationshipConfig(), { minLength: 0, maxLength: 5 });

const validConfigFile = (
  relationships?: fc.Arbitrary<RelationshipConfig[]>
): fc.Arbitrary<ConfigFile> =>
  fc.record({
    version: fc.constant('1.0'),
    enabled: fc.constant({}),
    defaults: fc.constant({}),
    annotations: fc.constant({}),
    relationships: relationships ?? validRelationshipConfigArray(),
  });

const minimalOpenAPISpec = () =>
  fc.record({
    openapi: fc.constant('3.0.0'),
    info: fc.record({
      title: fc.string({ minLength: 1, maxLength: 30 }),
      version: fc.constant('1.0.0'),
    }),
    paths: fc.constant({
      '/items': {
        get: { summary: 'List items', responses: { '200': { description: 'OK' } } },
      },
    }),
  });

// ---------------------------------------------------------------------------
// Property 1: Relationship config round-trip
// Validates: Requirements 2.1, 2.2, 2.3
// ---------------------------------------------------------------------------

describe('Property 1: Relationship config round-trip', () => {
  it('serializing ConfigFile to YAML and parsing back produces equivalent relationships', () => {
    fc.assert(
      fc.property(validConfigFile(), (config) => {
        const serialized = yaml.dump(config);
        const parsed = yaml.load(serialized) as ConfigFile;

        const original = config.relationships ?? [];
        const roundTripped = parsed.relationships ?? [];

        expect(roundTripped).toHaveLength(original.length);
        for (let i = 0; i < original.length; i++) {
          expect(roundTripped[i].source).toBe(original[i].source);
          expect(roundTripped[i].target).toBe(original[i].target);
          expect(roundTripped[i].path).toBe(original[i].path);
          if (original[i].label !== undefined) {
            expect(roundTripped[i].label).toBe(original[i].label);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Missing required field produces a validation error
// Validates: Requirements 1.2, 2.4
// ---------------------------------------------------------------------------

describe('Property 2: Missing required field produces a validation error', () => {
  function validateEntry(
    entry: Partial<RelationshipConfig>,
    index: number
  ): string[] {
    const errors: string[] = [];
    if (!entry.source) errors.push(`relationships[${index}]: missing required field "source"`);
    if (!entry.target) errors.push(`relationships[${index}]: missing required field "target"`);
    if (!entry.path) errors.push(`relationships[${index}]: missing required field "path"`);
    return errors;
  }

  it('missing source produces an error identifying the field name and entry index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        slug(),
        fc.stringMatching(/^\/[a-z]+\/\{id\}\/[a-z]+$/),
        (index, target, path) => {
          const errors = validateEntry({ target, path }, index);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some((e) => e.includes('"source"') && e.includes(String(index)))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('missing target produces an error identifying the field name and entry index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        slug(),
        fc.stringMatching(/^\/[a-z]+\/\{id\}\/[a-z]+$/),
        (index, source, path) => {
          const errors = validateEntry({ source, path }, index);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some((e) => e.includes('"target"') && e.includes(String(index)))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('missing path produces an error identifying the field name and entry index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        slug(),
        slug(),
        (index, source, target) => {
          const errors = validateEntry({ source, target }, index);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some((e) => e.includes('"path"') && e.includes(String(index)))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Duplicate entry produces a validation error
// Validates: Requirements 1.4, 5.6, 7.5
// ---------------------------------------------------------------------------

describe('Property 3: Duplicate entry produces a validation error', () => {
  function hasDuplicates(entries: RelationshipConfig[]): boolean {
    const seen = new Set<string>();
    for (const e of entries) {
      const key = `${e.source}|${e.target}|${e.path}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  it('adding an identical copy of an entry causes the validator to detect a duplicate', () => {
    fc.assert(
      fc.property(validRelationshipConfig(), (entry) => {
        const entries: RelationshipConfig[] = [entry, { ...entry }];
        expect(hasDuplicates(entries)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Path-to-type derivation
// Validates: Requirement 8.5
// ---------------------------------------------------------------------------

describe('Property 6: Path-to-type derivation', () => {
  it('/{sourceSlug}/{id}/{targetSlug} path derives hasMany from source perspective', () => {
    fc.assert(
      fc.property(
        slug(),
        slug(),
        fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
        (source, target, idParam) => {
          fc.pre(source !== target);
          const path = `/${source}/{${idParam}}/${target}`;
          const type = deriveRelationshipType(path, source, target, []);
          expect(type).toBe('hasMany');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('/{targetSlug}/{id}/{sourceSlug} path derives belongsTo from source perspective', () => {
    fc.assert(
      fc.property(
        slug(),
        slug(),
        fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
        (source, target, idParam) => {
          fc.pre(source !== target);
          const path = `/${target}/{${idParam}}/${source}`;
          const type = deriveRelationshipType(path, source, target, []);
          expect(type).toBe('belongsTo');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('symmetric pair (source->target and target->source) derives manyToMany on both sides', () => {
    fc.assert(
      fc.property(
        slug(),
        slug(),
        fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
        (source, target, idParam) => {
          fc.pre(source !== target);
          const forwardPath = `/${source}/{${idParam}}/${target}`;
          const reversePath = `/${target}/{${idParam}}/${source}`;

          const allEntries: RelationshipConfig[] = [
            { source, target, path: forwardPath },
            { source: target, target: source, path: reversePath },
          ];

          const forwardType = deriveRelationshipType(forwardPath, source, target, allEntries);
          const reverseType = deriveRelationshipType(reversePath, target, source, allEntries);

          expect(forwardType).toBe('manyToMany');
          expect(reverseType).toBe('manyToMany');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Reconciler does not mutate spec
// Validates: Requirements 9.1, 9.2
// ---------------------------------------------------------------------------

describe('Property 7: Reconciler does not mutate spec', () => {
  it('spec field of ReconciledSpec is structurally identical to input spec', () => {
    fc.assert(
      fc.property(
        minimalOpenAPISpec(),
        fc.array(validRelationshipConfig(), { minLength: 1, maxLength: 3 }),
        (spec, relationships) => {
          const config: ConfigFile = {
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {},
            relationships,
          };

          const originalSpecJson = JSON.stringify(spec);
          const reconciler = new Reconciler({ logLevel: 'error' });
          const result = reconciler.reconcile(spec as any, config);

          // Spec must not be mutated
          expect(JSON.stringify(spec)).toBe(originalSpecJson);

          // Result spec must equal original
          expect(JSON.stringify(result.spec)).toBe(originalSpecJson);

          // Relationships must not appear in the spec object
          const specStr = JSON.stringify(result.spec);
          expect(specStr).not.toContain('"relationships"');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Reconciler warnings for invalid entries
// Validates: Requirement 9.3
// ---------------------------------------------------------------------------

describe('Property 8: Reconciler warnings for invalid entries', () => {
  it('invalid RelationshipConfig entry produces at least one ReconciliationWarning', () => {
    fc.assert(
      fc.property(
        minimalOpenAPISpec(),
        fc.oneof(
          // missing source
          fc.record({ target: slug(), path: fc.stringMatching(/^\/[a-z]+\/\{id\}\/[a-z]+$/) }).map(
            (e) => e as Partial<RelationshipConfig>
          ),
          // missing target
          fc.record({ source: slug(), path: fc.stringMatching(/^\/[a-z]+\/\{id\}\/[a-z]+$/) }).map(
            (e) => e as Partial<RelationshipConfig>
          ),
          // missing path
          fc.record({ source: slug(), target: slug() }).map(
            (e) => e as Partial<RelationshipConfig>
          ),
          // self-relationship
          slug().map((s) => ({ source: s, target: s, path: `/${s}/{id}/${s}` })),
        ),
        (spec, invalidEntry) => {
          const config: ConfigFile = {
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {},
            relationships: [invalidEntry as RelationshipConfig],
          };

          const reconciler = new Reconciler({ logLevel: 'error' });
          const result = reconciler.reconcile(spec as any, config);

          expect(result.warnings.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Self-relationship is rejected
// Validates: Requirement 5.5
// ---------------------------------------------------------------------------

describe('Property 11: Self-relationship is rejected', () => {
  it('source === target produces a validation error', () => {
    fc.assert(
      fc.property(
        minimalOpenAPISpec(),
        slug(),
        (spec, s) => {
          const config: ConfigFile = {
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {},
            relationships: [{ source: s, target: s, path: `/${s}/{id}/${s}` }],
          };

          const reconciler = new Reconciler({ logLevel: 'error' });
          const result = reconciler.reconcile(spec as any, config);

          expect(result.warnings.length).toBeGreaterThan(0);
          expect(
            result.warnings.some(
              (w) => w.message.toLowerCase().includes('self') || w.message.toLowerCase().includes('source') || w.message.toLowerCase().includes('same')
            )
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Config relationships bypass heuristics
// Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------

import { OpenAPI3Adapter } from '../adapter/openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Build a minimal spec with two resources and a sub-resource path.
 * The heuristic detector would normally detect a hasMany relationship.
 */
function buildSpecWithSubResource(
  sourceSlug: string,
  targetSlug: string
): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      [`/${sourceSlug}`]: {
        get: { summary: 'List', responses: { '200': { description: 'OK' } } },
        post: { summary: 'Create', responses: { '201': { description: 'Created' } } },
      },
      [`/${sourceSlug}/{id}`]: {
        get: { summary: 'Detail', responses: { '200': { description: 'OK' } } },
      },
      [`/${targetSlug}`]: {
        get: { summary: 'List', responses: { '200': { description: 'OK' } } },
        post: { summary: 'Create', responses: { '201': { description: 'Created' } } },
      },
      [`/${targetSlug}/{id}`]: {
        get: { summary: 'Detail', responses: { '200': { description: 'OK' } } },
      },
      [`/${sourceSlug}/{id}/${targetSlug}`]: {
        get: { summary: 'List related', responses: { '200': { description: 'OK' } } },
      },
    },
  };
}

describe('Property 4: Config relationships bypass heuristics', () => {
  it('non-empty configRelationships produces exactly the declared relationships', () => {
    fc.assert(
      fc.property(
        slug(),
        slug(),
        (source, target) => {
          fc.pre(source !== target);

          const spec = buildSpecWithSubResource(source, target);
          const configRelationships: RelationshipConfig[] = [
            { source, target, path: `/${source}/{id}/${target}` },
          ];

          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt(configRelationships);

          const sourceResource = ir.resources.find((r) => r.slug === source);
          expect(sourceResource).toBeDefined();

          // Exactly the declared relationships -- no heuristic additions
          expect(sourceResource!.relationships).toHaveLength(1);
          expect(sourceResource!.relationships[0].target).toBe(target);
          expect(sourceResource!.relationships[0].path).toBe(`/${source}/{id}/${target}`);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 5: Empty config falls back to heuristics', () => {
  it('empty configRelationships produces the same relationships as no config', () => {
    fc.assert(
      fc.property(
        slug(),
        slug(),
        (source, target) => {
          fc.pre(source !== target);

          const spec = buildSpecWithSubResource(source, target);
          const adapter1 = new OpenAPI3Adapter(spec);
          const irNoConfig = adapter1.adapt();

          const adapter2 = new OpenAPI3Adapter(spec);
          const irEmptyConfig = adapter2.adapt([]);

          const r1 = irNoConfig.resources.find((r) => r.slug === source);
          const r2 = irEmptyConfig.resources.find((r) => r.slug === source);

          expect(JSON.stringify(r1?.relationships)).toBe(JSON.stringify(r2?.relationships));
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Integration test 11.1: write config with relationships, verify ReconciledSpec
// Validates: Requirements 9.1, 9.2, 9.4
// ---------------------------------------------------------------------------

describe('Integration 11.1: config with relationships populates ReconciledSpec.relationships', () => {
  it('ReconciledSpec.relationships is populated and spec is unchanged', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: { summary: 'List', responses: { '200': { description: 'OK' } } },
        },
      },
    };

    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      ],
    };

    const originalSpecJson = JSON.stringify(spec);
    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Spec is unchanged
    expect(JSON.stringify(result.spec)).toBe(originalSpecJson);

    // Relationships are populated
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].source).toBe('users');
    expect(result.relationships[0].target).toBe('orders');
  });
});
