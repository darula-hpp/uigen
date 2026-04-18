import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { RefHandler } from '../ref-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeContext(schemaNode?: SchemaNode): AnnotationContext {
  const mockUtils: AdapterUtils = {
    humanize: vi.fn((str: string) => str),
    resolveRef: vi.fn(),
    logError: vi.fn(),
    logWarning: vi.fn()
  };
  const mockIR: UIGenApp = { resources: [], parsingErrors: [] } as UIGenApp;

  return {
    element: { type: 'string' } as any,
    path: 'testField',
    utils: mockUtils,
    ir: mockIR,
    schemaNode
  };
}

function freshSchemaNode(): SchemaNode {
  return { type: 'string', key: 'testField', label: 'Test Field', required: false };
}

/** Arbitrary for a non-empty string (no leading/trailing whitespace issues) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '');

/** Arbitrary for a resource path: non-empty string starting with '/' */
const resourcePath = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-z][a-z0-9_/-]*$/.test(s))
  .map(s => `/${s}`);

/** Arbitrary for a flat primitive filter value */
const primitiveValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 20 }),
  fc.integer({ min: -1000, max: 1000 }),
  fc.boolean()
);

/** Arbitrary for a flat primitive filter record */
const primitiveFilter = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z][a-z0-9_]*$/.test(s)),
  primitiveValue,
  { maxKeys: 5 }
);

/** Arbitrary for a valid RefAnnotation */
const validAnnotation = fc.record({
  resource: resourcePath,
  valueField: nonEmptyString,
  labelField: nonEmptyString,
  filter: fc.option(primitiveFilter, { nil: undefined })
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('RefHandler — Property-Based Tests', () => {
  const handler = new RefHandler();

  // Feature: x-uigen-ref-annotation, Property 1: Annotation round-trip
  it('Property 1: Annotation round-trip', () => {
    // **Validates: Requirements 12.1**
    fc.assert(
      fc.property(validAnnotation, (annotation) => {
        const schemaNode = freshSchemaNode();
        const context = makeContext(schemaNode);

        handler.apply(annotation, context);

        expect(schemaNode.refConfig).toBeDefined();
        expect(schemaNode.refConfig).toEqual({
          resource: annotation.resource,
          valueField: annotation.valueField,
          labelField: annotation.labelField,
          filter: annotation.filter ?? {}
        });
      }),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-ref-annotation, Property 2: Validation rejects invalid required fields
  it('Property 2: Validation rejects invalid required fields', () => {
    // **Validates: Requirements 2.3, 2.4, 2.5, 2.7**

    /** An invalid value for a required string field */
    const invalidFieldValue = fc.oneof(
      fc.constant(''),
      fc.constant(undefined),
      fc.constant(null),
      fc.integer(),
      fc.boolean()
    );

    /** Pick which required field(s) to corrupt */
    const invalidAnnotation = fc.record({
      resource: fc.oneof(nonEmptyString, invalidFieldValue),
      valueField: fc.oneof(nonEmptyString, invalidFieldValue),
      labelField: fc.oneof(nonEmptyString, invalidFieldValue)
    }).filter(ann => {
      // At least one field must be invalid
      const isValidStr = (v: unknown) => typeof v === 'string' && v.trim() !== '';
      return !isValidStr(ann.resource) || !isValidStr(ann.valueField) || !isValidStr(ann.labelField);
    });

    fc.assert(
      fc.property(invalidAnnotation, (annotation) => {
        expect(() => {
          const result = handler.validate(annotation as any);
          expect(result).toBe(false);
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-ref-annotation, Property 3: Validation rejects non-primitive filter values
  it('Property 3: Validation rejects non-primitive filter values', () => {
    // **Validates: Requirements 2.6, 2.7**

    const nonPrimitiveValue = fc.oneof(
      fc.constant({}),
      fc.constant([]),
      fc.constant(null),
      fc.record({ nested: fc.string() }),
      fc.array(fc.integer(), { minLength: 1, maxLength: 3 })
    );

    /** A filter with at least one non-primitive value */
    const filterWithNonPrimitive = fc.record({
      badKey: nonPrimitiveValue
    }).chain(badEntry =>
      fc.dictionary(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z][a-z0-9_]*$/.test(s)),
        primitiveValue,
        { maxKeys: 4 }
      ).map(goodEntries => ({ ...goodEntries, ...badEntry }))
    );

    fc.assert(
      fc.property(
        fc.record({
          resource: resourcePath,
          valueField: nonEmptyString,
          labelField: nonEmptyString,
          filter: filterWithNonPrimitive
        }),
        (annotation) => {
          expect(() => {
            const result = handler.validate(annotation as any);
            expect(result).toBe(false);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-ref-annotation, Property 7: RefConfig is set on valid annotation
  it('Property 7: RefConfig is set on valid annotation', () => {
    // **Validates: Requirements 3.3**
    fc.assert(
      fc.property(validAnnotation, (annotation) => {
        const schemaNode = freshSchemaNode();
        const context = makeContext(schemaNode);

        handler.apply(annotation, context);

        expect(schemaNode.refConfig).toBeDefined();
        expect(typeof schemaNode.refConfig!.resource).toBe('string');
        expect(typeof schemaNode.refConfig!.valueField).toBe('string');
        expect(typeof schemaNode.refConfig!.labelField).toBe('string');
        // filter always defaults to {} when absent
        expect(schemaNode.refConfig!.filter).toBeDefined();
        expect(typeof schemaNode.refConfig!.filter).toBe('object');
      }),
      { numRuns: 100 }
    );
  });
});
