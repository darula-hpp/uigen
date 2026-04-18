/**
 * Property 2: Idempotence and determinism
 * Feature: config-reconciliation-system
 * 
 * For any valid OpenAPI/Swagger spec and config file, applying reconciliation
 * twice SHALL produce the same result as applying it once.
 * 
 * Formally: reconcile(reconcile(spec, config), config) === reconcile(spec, config)
 * 
 * Validates: Requirements 2.7, 12.4
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { Reconciler } from '../../reconciler';
import { generateValidSpec, generateValidConfig } from './generators';

describe('Property 2: Idempotence and Determinism', () => {
  it('reconciliation is idempotent', () => {
    fc.assert(
      fc.property(
        generateValidSpec().chain((spec) =>
          fc.tuple(fc.constant(spec), generateValidConfig(spec))
        ),
        ([spec, config]) => {
          const reconciler = new Reconciler({ logLevel: 'error' });

          // First reconciliation
          const result1 = reconciler.reconcile(spec, config);

          // Second reconciliation (on already reconciled spec)
          const result2 = reconciler.reconcile(result1.spec, config);

          // Results should be deeply equal
          return JSON.stringify(result1.spec) === JSON.stringify(result2.spec);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reconciliation is deterministic', () => {
    fc.assert(
      fc.property(
        generateValidSpec().chain((spec) =>
          fc.tuple(fc.constant(spec), generateValidConfig(spec))
        ),
        ([spec, config]) => {
          const reconciler1 = new Reconciler({ logLevel: 'error' });
          const reconciler2 = new Reconciler({ logLevel: 'error' });

          // Reconcile with two different reconciler instances
          const result1 = reconciler1.reconcile(spec, config);
          const result2 = reconciler2.reconcile(spec, config);

          // Results should be identical
          return JSON.stringify(result1.spec) === JSON.stringify(result2.spec);
        }
      ),
      { numRuns: 100 }
    );
  });
});
