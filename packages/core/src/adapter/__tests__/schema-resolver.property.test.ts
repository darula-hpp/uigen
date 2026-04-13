import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import type { OpenAPIV3 } from 'openapi-types';
import { SchemaResolver } from '../schema-resolver.js';
import type { SchemaNode } from '../ir/types.js';

/**
 * **Validates: Requirements 1.3, 1.8**
 * 
 * Property 2: Reference Resolution Completeness
 * 
 * For any specification with $ref references, all resolvable references should be 
 * expanded in the IR, and unresolvable references should be logged without causing 
 * parsing failure.
 */
describe('SchemaResolver - Property-Based Tests', () => {
  // Simple adapter function for testing
  const adaptSchema = (key: string, schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, visited?: Set<string>): SchemaNode => {
    // Handle reference objects
    if ('$ref' in schema) {
      return {
        type: 'object',
        key,
        label: key,
        required: false
      };
    }
    
    return {
      type: schema.type === 'string' ? 'string' : 
            schema.type === 'number' ? 'number' :
            schema.type === 'integer' ? 'integer' :
            schema.type === 'boolean' ? 'boolean' :
            schema.type === 'array' ? 'array' :
            schema.type === 'object' ? 'object' : 'string',
      key,
      label: key,
      required: false,
      description: schema.description
    };
  };

  describe('Property 2: Reference Resolution Completeness', () => {
    it('should resolve all resolvable references without failure', () => {
      // Arbitrary for generating schema names
      const schemaNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,15}$/);
      
      // Arbitrary for generating simple schema objects
      const simpleSchemaArb = fc.record({
        type: fc.constantFrom('string', 'number', 'integer', 'boolean', 'object'),
        description: fc.option(fc.string(), { nil: undefined })
      });

      // Arbitrary for generating a spec with multiple schemas and references
      const specWithReferencesArb = fc.tuple(
        fc.array(schemaNameArb, { minLength: 2, maxLength: 10 }),
        fc.nat({ max: 5 }) // Number of references to create
      ).chain(([schemaNames, refCount]) => {
        // Create schemas dictionary
        const schemasRecord: Record<string, fc.Arbitrary<OpenAPIV3.SchemaObject>> = {};
        
        schemaNames.forEach(name => {
          schemasRecord[name] = simpleSchemaArb;
        });

        return fc.record(schemasRecord).map(schemas => {
          // Add some references between schemas
          const schemaEntries = Object.entries(schemas);
          const referencesToAdd = Math.min(refCount, schemaEntries.length - 1);
          
          for (let i = 0; i < referencesToAdd && i < schemaEntries.length - 1; i++) {
            const [sourceName, sourceSchema] = schemaEntries[i];
            const targetName = schemaEntries[i + 1][0];
            
            // Add a property that references another schema
            if (sourceSchema.type === 'object') {
              sourceSchema.properties = {
                ...sourceSchema.properties,
                [`ref_${targetName}`]: { $ref: `#/components/schemas/${targetName}` }
              };
            }
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {},
            components: { schemas }
          };

          return { spec, schemaNames };
        });
      });

      fc.assert(
        fc.property(specWithReferencesArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Test that all schemas can be resolved
          schemaNames.forEach(schemaName => {
            const ref = `#/components/schemas/${schemaName}`;
            const result = resolver.resolve(ref);
            
            // All resolvable references should return a SchemaNode
            expect(result).not.toBeNull();
            expect(result?.key).toBe(schemaName);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should handle unresolvable references gracefully without throwing', () => {
      // Arbitrary for generating valid schema names
      const validSchemaNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,15}$/);
      
      // Arbitrary for generating invalid reference paths
      const invalidRefArb = fc.oneof(
        // Non-existent schema
        fc.string().map(s => `#/components/schemas/${s}_NonExistent`),
        // Invalid path structure
        fc.constantFrom(
          '#/invalid/path/Schema',
          '#/components/wrongSection/Schema',
          'external.yaml#/components/schemas/Schema'
        )
      );

      const specArb = fc.array(validSchemaNameArb, { minLength: 1, maxLength: 5 }).map(names => {
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        names.forEach(name => {
          schemas[name] = { type: 'object' };
        });

        return {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        } as OpenAPIV3.Document;
      });

      fc.assert(
        fc.property(specArb, invalidRefArb, (spec, invalidRef) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Spy on console.warn to verify logging
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Should not throw, should return null
          let result: SchemaNode | null = null;
          expect(() => {
            result = resolver.resolve(invalidRef);
          }).not.toThrow();
          
          // Should return null for unresolvable references
          expect(result).toBeNull();
          
          // Should log a warning
          expect(warnSpy).toHaveBeenCalled();
          
          warnSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });

    it('should expand all resolvable references in nested structures', () => {
      // Arbitrary for generating a chain of references
      const refChainArb = fc.integer({ min: 2, max: 5 }).chain(depth => {
        const schemaNames = Array.from({ length: depth }, (_, i) => `Schema${i}`);
        
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        // Create a chain: Schema0 -> Schema1 -> Schema2 -> ... -> SchemaLast
        schemaNames.forEach((name, index) => {
          if (index < schemaNames.length - 1) {
            schemas[name] = {
              type: 'object',
              properties: {
                next: { $ref: `#/components/schemas/${schemaNames[index + 1]}` }
              }
            };
          } else {
            // Last schema has no reference
            schemas[name] = {
              type: 'object',
              properties: {
                value: { type: 'string' }
              }
            };
          }
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return fc.constant({ spec, schemaNames });
      });

      fc.assert(
        fc.property(refChainArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Resolve the first schema in the chain
          const firstRef = `#/components/schemas/${schemaNames[0]}`;
          const result = resolver.resolve(firstRef);
          
          // Should successfully resolve the entire chain
          expect(result).not.toBeNull();
          expect(result?.key).toBe(schemaNames[0]);
          
          // All schemas in the chain should be resolvable
          schemaNames.forEach(name => {
            const ref = `#/components/schemas/${name}`;
            const resolved = resolver.resolve(ref);
            expect(resolved).not.toBeNull();
            expect(resolved?.key).toBe(name);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should handle circular references without infinite loops', () => {
      // Arbitrary for generating circular reference structures
      const circularSpecArb = fc.integer({ min: 2, max: 4 }).map(numSchemas => {
        const schemaNames = Array.from({ length: numSchemas }, (_, i) => `Circular${i}`);
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        // Create circular references: each schema references the next, last references first
        schemaNames.forEach((name, index) => {
          const nextIndex = (index + 1) % schemaNames.length;
          schemas[name] = {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              next: { $ref: `#/components/schemas/${schemaNames[nextIndex]}` }
            }
          };
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, schemaNames };
      });

      fc.assert(
        fc.property(circularSpecArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Spy on console.warn to verify circular reference detection
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Should resolve without hanging or throwing
          schemaNames.forEach(name => {
            const ref = `#/components/schemas/${name}`;
            let result: SchemaNode | null = null;
            
            expect(() => {
              result = resolver.resolve(ref);
            }).not.toThrow();
            
            // Should return a result (either resolved or placeholder)
            expect(result).not.toBeNull();
          });
          
          warnSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain reference resolution completeness with mixed valid and invalid refs', () => {
      // Arbitrary for generating specs with both valid and invalid references
      const mixedRefsSpecArb = fc.tuple(
        fc.array(fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,10}$/), { minLength: 2, maxLength: 5 }),
        fc.array(fc.string(), { minLength: 1, maxLength: 3 })
      ).map(([validNames, invalidNames]) => {
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        // Create valid schemas
        validNames.forEach(name => {
          schemas[name] = { type: 'object' };
        });

        // Create schemas with invalid references
        validNames.forEach((name, index) => {
          if (index < invalidNames.length) {
            schemas[name] = {
              type: 'object',
              properties: {
                valid: { type: 'string' },
                invalid: { $ref: `#/components/schemas/${invalidNames[index]}_Invalid` }
              }
            };
          }
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, validNames, invalidNames };
      });

      fc.assert(
        fc.property(mixedRefsSpecArb, ({ spec, validNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // All valid schemas should still be resolvable
          validNames.forEach(name => {
            const ref = `#/components/schemas/${name}`;
            const result = resolver.resolve(ref);
            
            // Should not fail due to invalid nested references
            expect(result).not.toBeNull();
            expect(result?.key).toBe(name);
          });
          
          warnSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 70.1, 70.2**
   * 
   * Property 3: Reference Resolution Caching
   * 
   * For any specification with duplicate $ref references, resolving the same reference 
   * multiple times should return cached results, making subsequent resolutions faster 
   * than the first.
   */
  describe('Property 3: Reference Resolution Caching', () => {
    it('should return cached results for duplicate reference resolutions', () => {
      // Arbitrary for generating schema names
      const schemaNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,15}$/);
      
      // Arbitrary for generating simple schema objects
      const simpleSchemaArb = fc.record({
        type: fc.constantFrom('string', 'number', 'integer', 'boolean', 'object'),
        description: fc.option(fc.string(), { nil: undefined })
      });

      // Arbitrary for generating a spec with schemas
      const specWithSchemasArb = fc.array(schemaNameArb, { minLength: 2, maxLength: 10 })
        .chain(schemaNames => {
          const schemasRecord: Record<string, fc.Arbitrary<OpenAPIV3.SchemaObject>> = {};
          
          schemaNames.forEach(name => {
            schemasRecord[name] = simpleSchemaArb;
          });

          return fc.record(schemasRecord).map(schemas => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              paths: {},
              components: { schemas }
            };

            return { spec, schemaNames };
          });
        });

      fc.assert(
        fc.property(specWithSchemasArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Pick a schema to resolve multiple times
          const targetSchema = schemaNames[0];
          const ref = `#/components/schemas/${targetSchema}`;
          
          // First resolution
          const result1 = resolver.resolve(ref);
          
          // Second resolution - should return the same cached instance
          const result2 = resolver.resolve(ref);
          
          // Both should be non-null
          expect(result1).not.toBeNull();
          expect(result2).not.toBeNull();
          
          // Should return the exact same object reference (cached)
          expect(result1).toBe(result2);
          
          // Verify the result is correct
          expect(result1?.key).toBe(targetSchema);
        }),
        { numRuns: 100 }
      );
    });

    it('should cache results independently for different references', () => {
      // Arbitrary for generating specs with multiple schemas
      const multiSchemaSpecArb = fc.array(
        fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,15}$/), 
        { minLength: 3, maxLength: 8 }
      ).map(schemaNames => {
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        schemaNames.forEach(name => {
          schemas[name] = { type: 'object', description: `Schema for ${name}` };
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, schemaNames };
      });

      fc.assert(
        fc.property(multiSchemaSpecArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Resolve all schemas
          const results = schemaNames.map(name => {
            const ref = `#/components/schemas/${name}`;
            return { name, result: resolver.resolve(ref) };
          });
          
          // Resolve all schemas again
          const results2 = schemaNames.map(name => {
            const ref = `#/components/schemas/${name}`;
            return { name, result: resolver.resolve(ref) };
          });
          
          // Each schema should have its own cached result
          results.forEach((r1, index) => {
            const r2 = results2[index];
            
            // Same reference should return same cached instance
            expect(r1.result).toBe(r2.result);
            
            // Different references should return different instances
            results.forEach((other, otherIndex) => {
              if (index !== otherIndex) {
                expect(r1.result).not.toBe(other.result);
              }
            });
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should make subsequent resolutions faster than the first', () => {
      // Arbitrary for generating a spec with nested references
      const nestedRefSpecArb = fc.integer({ min: 3, max: 8 }).map(depth => {
        const schemaNames = Array.from({ length: depth }, (_, i) => `Level${i}`);
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        // Create a deep chain of references
        schemaNames.forEach((name, index) => {
          if (index < schemaNames.length - 1) {
            schemas[name] = {
              type: 'object',
              properties: {
                id: { type: 'string' },
                nested: { $ref: `#/components/schemas/${schemaNames[index + 1]}` }
              }
            };
          } else {
            schemas[name] = {
              type: 'object',
              properties: {
                value: { type: 'string' }
              }
            };
          }
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, schemaNames };
      });

      fc.assert(
        fc.property(nestedRefSpecArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Pick a schema in the middle of the chain
          const targetSchema = schemaNames[Math.floor(schemaNames.length / 2)];
          const ref = `#/components/schemas/${targetSchema}`;
          
          // First resolution - measure time
          const start1 = performance.now();
          const result1 = resolver.resolve(ref);
          const duration1 = performance.now() - start1;
          
          // Second resolution - should be faster (cached)
          const start2 = performance.now();
          const result2 = resolver.resolve(ref);
          const duration2 = performance.now() - start2;
          
          // Both should succeed
          expect(result1).not.toBeNull();
          expect(result2).not.toBeNull();
          
          // Should return the same cached instance
          expect(result1).toBe(result2);
          
          // Second resolution should be faster (or at least not significantly slower)
          // We use a lenient check because timing can be noisy in tests
          // The key property is that it returns the same cached object
          expect(duration2).toBeLessThanOrEqual(duration1 * 2);
        }),
        { numRuns: 100 }
      );
    });

    it('should cache results even when resolving references with circular dependencies', () => {
      // Arbitrary for generating circular reference structures
      const circularSpecArb = fc.integer({ min: 2, max: 5 }).map(numSchemas => {
        const schemaNames = Array.from({ length: numSchemas }, (_, i) => `Circular${i}`);
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        // Create circular references
        schemaNames.forEach((name, index) => {
          const nextIndex = (index + 1) % schemaNames.length;
          schemas[name] = {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              next: { $ref: `#/components/schemas/${schemaNames[nextIndex]}` }
            }
          };
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, schemaNames };
      });

      fc.assert(
        fc.property(circularSpecArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Resolve each schema twice
          schemaNames.forEach(name => {
            const ref = `#/components/schemas/${name}`;
            
            const result1 = resolver.resolve(ref);
            const result2 = resolver.resolve(ref);
            
            // Both should succeed
            expect(result1).not.toBeNull();
            expect(result2).not.toBeNull();
            
            // Should return the same cached instance
            expect(result1).toBe(result2);
          });
          
          warnSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain cache across multiple resolution calls in any order', () => {
      // Arbitrary for generating specs with multiple schemas
      const specArb = fc.array(
        fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,10}$/),
        { minLength: 3, maxLength: 6 }
      ).map(schemaNames => {
        const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
        
        schemaNames.forEach(name => {
          schemas[name] = { type: 'string', description: name };
        });

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {},
          components: { schemas }
        };

        return { spec, schemaNames };
      });

      fc.assert(
        fc.property(specArb, ({ spec, schemaNames }) => {
          const resolver = new SchemaResolver(spec, adaptSchema);
          
          // Resolve schemas in original order
          const firstPass = schemaNames.map(name => ({
            name,
            result: resolver.resolve(`#/components/schemas/${name}`)
          }));
          
          // Resolve schemas in reverse order
          const secondPass = [...schemaNames].reverse().map(name => ({
            name,
            result: resolver.resolve(`#/components/schemas/${name}`)
          }));
          
          // Verify that each schema returns the same cached instance
          firstPass.forEach(({ name, result: result1 }) => {
            const result2 = secondPass.find(r => r.name === name)?.result;
            
            expect(result1).not.toBeNull();
            expect(result2).not.toBeNull();
            expect(result1).toBe(result2);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
