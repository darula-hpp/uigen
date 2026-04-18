/**
 * Property 3: Output validity preservation
 * Feature: config-reconciliation-system
 * 
 * For any valid OpenAPI/Swagger spec and valid config file, the reconciled spec
 * SHALL be a valid OpenAPI/Swagger document that conforms to the schema.
 * 
 * Validates: Requirements 2.6, 7.1, 15.5
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { Reconciler } from '../../reconciler';
import { Validator } from '../../validator';
import { generateValidSpec, generateValidConfig } from './generators';

describe('Property 3: Output Validity Preservation', () => {
  it('reconciled spec is valid', () => {
    fc.assert(
      fc.property(
        generateValidSpec().chain((spec) =>
          fc.tuple(fc.constant(spec), generateValidConfig(spec))
        ),
        ([spec, config]) => {
          const reconciler = new Reconciler({ logLevel: 'error', validateOutput: true });
          const validator = new Validator();

          // Reconcile
          const result = reconciler.reconcile(spec, config);

          // Validate reconciled spec
          const validationResult = validator.validate(result.spec);

          return validationResult.valid;
        }
      ),
      { numRuns: 100 }
    );
  });
});
