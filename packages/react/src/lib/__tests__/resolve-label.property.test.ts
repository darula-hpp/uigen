import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveLabel } from '../resolve-label';

// Arbitraries

/** Simple identifier: starts with a letter, only lowercase letters/digits/underscores */
const identifierArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-z][a-z0-9_]*$/.test(s));

/** String value that contains no '{' or '}' characters */
const safeStringValueArb = fc
  .string({ minLength: 0, maxLength: 30 })
  .filter(s => !s.includes('{') && !s.includes('}'));

/** A record whose keys are identifiers and values are safe strings (no braces) */
const safeRecordArb = fc
  .uniqueArray(identifierArb, { minLength: 1, maxLength: 6 })
  .chain(keys =>
    fc
      .tuple(...keys.map(() => safeStringValueArb))
      .map(values => {
        const record: Record<string, unknown> = {};
        keys.forEach((k, i) => { record[k] = values[i]; });
        return record;
      })
  );

describe('resolveLabel - Property-Based Tests', () => {
  // Feature: x-uigen-ref-annotation, Property 4: Label template idempotence
  it('Property 4: resolveLabel is a pure function - same inputs always produce same output', () => {
    // **Validates: Requirements 5.6, 12.2**
    //
    // The simplest correct interpretation of idempotence for a pure function:
    // calling resolveLabel twice with the same arguments always returns the same result.
    // This verifies determinism (purity) which is the foundation of idempotence.
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40 }),
        fc.dictionary(identifierArb, fc.oneof(safeStringValueArb, fc.integer(), fc.boolean())),
        (labelField, record) => {
          const first = resolveLabel(labelField, record);
          const second = resolveLabel(labelField, record);
          expect(first).toBe(second);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-ref-annotation, Property 5: Plain field label resolution
  it('Property 5: plain field name (no "{") resolves to String(record[fieldName])', () => {
    // **Validates: Requirements 5.1**
    fc.assert(
      fc.property(
        safeRecordArb.chain(record => {
          const keys = Object.keys(record);
          return fc.record({
            record: fc.constant(record),
            key: fc.constantFrom(...keys),
          });
        }),
        ({ record, key }) => {
          // key has no '{' by construction (identifierArb only produces [a-z0-9_])
          const result = resolveLabel(key, record);
          expect(result).toBe(String(record[key]));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-ref-annotation, Property 6: Template placeholder substitution
  it('Property 6: template with {key} placeholders replaces all placeholders with record values', () => {
    // **Validates: Requirements 5.2, 5.5**
    fc.assert(
      fc.property(
        safeRecordArb.chain(record => {
          const keys = Object.keys(record);
          // Build a template that uses at least one key from the record
          return fc
            .array(fc.constantFrom(...keys), { minLength: 1, maxLength: keys.length })
            .map(selectedKeys => {
              // Deduplicate while preserving order
              const unique = [...new Set(selectedKeys)];
              // Build template: join placeholders with a space separator
              const template = unique.map(k => `{${k}}`).join(' ');
              return { record, template, usedKeys: unique };
            });
        }),
        ({ record, template, usedKeys }) => {
          const result = resolveLabel(template, record);

          // No remaining {placeholder} patterns should exist
          expect(result).not.toMatch(/\{[^}]+\}/);

          // Each used key's value should appear in the result
          for (const key of usedKeys) {
            const expected = String(record[key] ?? '');
            expect(result).toContain(expected);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
