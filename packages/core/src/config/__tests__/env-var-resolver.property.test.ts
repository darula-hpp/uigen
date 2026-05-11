/**
 * Property-based tests for Environment Variable Resolver
 * 
 * These tests verify universal properties that should hold across all valid inputs.
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { EnvVarResolver } from '../env-var-resolver.js';
import { EnvVarParser } from '../env-var-parser.js';
import type { ConfigFile } from '../types.js';

// Generators
const envVarNameArb = fc.stringMatching(/^[A-Z][A-Z0-9_]*$/);

const configValueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined)
);

describe('Property-Based Tests: Environment Variable Resolver', () => {
  describe('Property 1: Environment Variable Replacement', () => {
    it('replaces all env var references when variables are defined', () => {
      /**
       * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
       * 
       * Feature: env-var-resolution, Property 1: For any config object containing 
       * string values with ${ENV_VAR_NAME} syntax, when all referenced environment 
       * variables are defined, the resolver SHALL replace all references with their 
       * corresponding environment variable values.
       */
      fc.assert(
        fc.property(
          fc.array(fc.tuple(envVarNameArb, fc.string()), { minLength: 1, maxLength: 5 }),
          (varPairs) => {
            // Build env vars and var names from the same source
            const envVars: Record<string, string> = {};
            const varNames: string[] = [];
            
            for (const [name, value] of varPairs) {
              envVars[name] = value;
              varNames.push(name);
            }
            
            // Build a config with env var references
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: {
                  value: varNames.map(name => `\${${name}}`).join(' '),
                },
              },
            };
            
            const resolver = new EnvVarResolver({ env: envVars });
            const result = resolver.resolve(config);
            
            // Verify all references are replaced
            const value = result.config.annotations.test.value as string;
            for (const varName of varNames) {
              expect(value).toContain(envVars[varName]);
              expect(value).not.toContain(`\${${varName}}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 2: Type Preservation', () => {
    it('preserves non-string values unchanged', () => {
      /**
       * **Validates: Requirements 1.3**
       * 
       * Feature: env-var-resolution, Property 2: For any config object, after 
       * environment variable resolution, all non-string values (numbers, booleans, 
       * null, undefined) SHALL remain identical to their original values.
       */
      fc.assert(
        fc.property(
          fc.record({
            string: fc.string().filter(s => !s.includes('${')),
            number: fc.integer(),
            boolean: fc.boolean(),
            nullValue: fc.constant(null),
            array: fc.array(fc.integer()),
          }),
          (testData) => {
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: testData,
              },
            };
            
            const resolver = new EnvVarResolver({ env: {} });
            const result = resolver.resolve(config);
            
            const resolved = result.config.annotations.test as typeof testData;
            expect(resolved.number).toBe(testData.number);
            expect(resolved.boolean).toBe(testData.boolean);
            expect(resolved.nullValue).toBe(testData.nullValue);
            expect(resolved.array).toEqual(testData.array);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 3: Structure Preservation', () => {
    it('preserves object keys, array lengths, and nesting depth', () => {
      /**
       * **Validates: Requirements 2.4**
       * 
       * Feature: env-var-resolution, Property 3: For any config object, after 
       * environment variable resolution, the structure SHALL be preserved: object 
       * keys SHALL remain the same, array lengths SHALL remain the same, and the 
       * nesting depth SHALL remain the same.
       */
      fc.assert(
        fc.property(
          fc.object({ maxDepth: 3 }),
          (testData) => {
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: testData,
              },
            };
            
            const resolver = new EnvVarResolver({ env: {} });
            
            // Try to resolve, but skip validation if malformed syntax is encountered
            let result;
            try {
              result = resolver.resolve(config);
            } catch (error) {
              // Skip this test case if malformed syntax is encountered
              // The property only applies to valid configs
              return true;
            }
            
            // Check keys match at top level
            expect(Object.keys(result.config.annotations)).toEqual(Object.keys(config.annotations));
            
            // Check array lengths match recursively
            const checkArrayLengths = (original: unknown, resolved: unknown): void => {
              if (Array.isArray(original)) {
                expect(resolved).toBeInstanceOf(Array);
                expect((resolved as unknown[]).length).toBe(original.length);
                for (let i = 0; i < original.length; i++) {
                  checkArrayLengths(original[i], (resolved as unknown[])[i]);
                }
              } else if (typeof original === 'object' && original !== null) {
                expect(typeof resolved).toBe('object');
                expect(resolved).not.toBe(null);
                for (const key in original) {
                  checkArrayLengths(
                    (original as Record<string, unknown>)[key],
                    (resolved as Record<string, unknown>)[key]
                  );
                }
              }
            };
            
            checkArrayLengths(config.annotations.test, result.config.annotations.test);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 4: Immutability', () => {
    it('does not modify the original config object', () => {
      /**
       * **Validates: Requirements 4.4**
       * 
       * Feature: env-var-resolution, Property 4: For any config object, after 
       * calling the resolver, the original config object SHALL remain unchanged 
       * (deep equality with the original).
       */
      fc.assert(
        fc.property(
          fc.object({ maxDepth: 3 }),
          (testData) => {
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: testData,
              },
            };
            
            // Create a deep copy using structuredClone (preserves undefined)
            const originalCopy = structuredClone(config);
            const resolver = new EnvVarResolver({ env: {} });
            
            // Try to resolve, but catch any errors (e.g., malformed syntax)
            // The important thing is that the original config is not modified
            try {
              resolver.resolve(config);
            } catch (error) {
              // Errors are expected for malformed syntax, missing vars, etc.
              // The key property is that the original config remains unchanged
            }
            
            expect(config).toEqual(originalCopy);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 5: Identity for Non-Referenced Configs', () => {
    it('returns unchanged config when no env var references exist', () => {
      /**
       * **Validates: Requirements 5.1, 5.2**
       * 
       * Feature: env-var-resolution, Property 5: For any config object that 
       * contains no environment variable references, the resolver SHALL return 
       * a config that is deeply equal to the input.
       */
      fc.assert(
        fc.property(
          fc.record({
            string: fc.string().filter(s => !s.includes('${')),
            number: fc.integer(),
            nested: fc.record({
              value: fc.string().filter(s => !s.includes('${')),
            }),
          }),
          (testData) => {
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: testData,
              },
            };
            
            const resolver = new EnvVarResolver({ env: {} });
            const result = resolver.resolve(config);
            
            expect(result.config).toEqual(config);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 6: Parser Round-Trip', () => {
    it('preserves variable name through format and parse cycle', () => {
      /**
       * **Validates: Requirements 8.5**
       * 
       * Feature: env-var-resolution, Property 6: For any valid environment 
       * variable name, formatting it with format() and then parsing it with 
       * parse() SHALL produce a reference with the same variable name.
       */
      fc.assert(
        fc.property(
          envVarNameArb,
          (varName) => {
            const parser = new EnvVarParser();
            const formatted = parser.format(varName);
            const parsed = parser.parse(formatted);
            
            expect(parsed.references).toHaveLength(1);
            expect(parsed.references[0].name).toBe(varName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 7: Recursive Resolution', () => {
    it('resolves references at any depth in the config structure', () => {
      /**
       * **Validates: Requirements 2.1, 2.2, 2.3**
       * 
       * Feature: env-var-resolution, Property 7: For any config object with 
       * environment variable references at varying depths (0 to N levels deep), 
       * the resolver SHALL resolve all references regardless of their depth in 
       * the structure.
       */
      fc.assert(
        fc.property(
          envVarNameArb,
          fc.string(),
          fc.nat(5), // depth 0-5
          (varName, value, depth) => {
            const env = { [varName]: value };
            
            // Build nested config with reference at specified depth
            let nestedValue: unknown = `\${${varName}}`;
            for (let i = 0; i < depth; i++) {
              nestedValue = { nested: nestedValue };
            }
            
            const config: ConfigFile = {
              version: '1.0',
              enabled: {},
              defaults: {},
              annotations: {
                test: nestedValue,
              },
            };
            
            const resolver = new EnvVarResolver({ env });
            const result = resolver.resolve(config);
            
            // Navigate to the same depth and verify resolution
            let resolved: unknown = result.config.annotations.test;
            for (let i = 0; i < depth; i++) {
              resolved = (resolved as Record<string, unknown>).nested;
            }
            
            expect(resolved).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
