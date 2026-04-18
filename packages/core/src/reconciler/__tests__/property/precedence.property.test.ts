/**
 * Property 1: Config precedence over spec annotations
 * Feature: config-reconciliation-system
 * 
 * For any valid OpenAPI/Swagger spec and config file, when an annotation exists
 * in both the source spec and config for the same element path, the reconciled
 * spec SHALL contain the config value (not the spec value).
 * 
 * Validates: Requirements 2.3, 12.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Reconciler } from '../../reconciler';
import { generateValidSpec, annotationName } from './generators';
import { deepClone } from '../../utils';

describe('Property 1: Config Precedence', () => {
  it('config annotations take precedence over spec annotations', () => {
    fc.assert(
      fc.property(
        generateValidSpec(),
        annotationName(),
        fc.string({ minLength: 1, maxLength: 20 }), // Spec value
        fc.string({ minLength: 1, maxLength: 20 }), // Config value
        (spec, annName, specValue, configValue) => {
          // Skip if values are the same (no conflict to test)
          if (specValue === configValue) return true;

          // Deep clone spec to avoid mutation
          const clonedSpec = deepClone(spec);

          // Find first operation path
          let elementPath: string | null = null;
          for (const [path, pathItem] of Object.entries(clonedSpec.paths)) {
            if (!pathItem || typeof pathItem !== 'object') continue;
            for (const method of ['get', 'post', 'put', 'delete']) {
              if (method in pathItem && pathItem[method]) {
                elementPath = `${method.toUpperCase()}:${path}`;
                // Add annotation to spec
                (pathItem[method] as Record<string, unknown>)[annName] = specValue;
                break;
              }
            }
            if (elementPath) break;
          }

          // Skip if no valid element path found
          if (!elementPath) return true;

          // Create config with conflicting annotation
          const config = {
            version: '1.0',
            enabled: {},
            defaults: {},
            annotations: {
              [elementPath]: {
                [annName]: configValue,
              },
            },
          };

          // Reconcile
          const reconciler = new Reconciler({ logLevel: 'error' });
          const result = reconciler.reconcile(clonedSpec, config);

          // Verify: reconciled spec has config value, not spec value
          const [method, path] = elementPath.split(':');
          const operation = result.spec.paths[path]?.[method.toLowerCase()];
          
          return operation && (operation as Record<string, unknown>)[annName] === configValue;
        }
      ),
      { numRuns: 100 }
    );
  });
});
