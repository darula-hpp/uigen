/**
 * Property 4: Source spec non-mutation
 * Feature: config-reconciliation-system
 * 
 * For any valid OpenAPI/Swagger spec object and config file, after reconciliation
 * completes, the source spec object SHALL be deeply equal to its state before
 * reconciliation (no in-memory mutation).
 * 
 * Validates: Requirements 3.2, 3.3
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { Reconciler } from '../../reconciler';
import { generateValidSpec, generateValidConfig } from './generators';

describe('Property 4: Source Spec Non-Mutation', () => {
  it('source spec is not mutated', () => {
    fc.assert(
      fc.property(
        generateValidSpec().chain((spec) =>
          fc.tuple(fc.constant(spec), generateValidConfig(spec))
        ),
        ([spec, config]) => {
          // Deep clone the original spec for comparison
          const originalSpec = JSON.parse(JSON.stringify(spec));

          const reconciler = new Reconciler({ logLevel: 'error' });

          // Reconcile
          reconciler.reconcile(spec, config);

          // Source spec should be unchanged
          return JSON.stringify(spec) === JSON.stringify(originalSpec);
        }
      ),
      { numRuns: 100 }
    );
  });
});
