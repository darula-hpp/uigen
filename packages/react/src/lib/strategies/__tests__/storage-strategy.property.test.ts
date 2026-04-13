/**
 * Property-Based Tests for Storage Strategy
 * 
 * Property 3: Storage Strategy Serialization Round-Trip
 * **Validates: Requirements 1.4, 1.5, 2.6, 14.3**
 * 
 * Property 4: Session Storage Save-Load Round-Trip
 * **Validates: Requirements 2.2, 2.3**
 * 
 * Property 9: Session Storage Remove Completeness
 * **Validates: Requirements 2.4**
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { SessionStorageStrategy } from '../SessionStorageStrategy';

// Helper function to normalize -0 to 0 since JSON doesn't preserve the sign of zero
const normalizeNegativeZero = (val: unknown): unknown => {
  if (typeof val === 'number' && Object.is(val, -0)) {
    return 0;
  }
  if (Array.isArray(val)) {
    return val.map(normalizeNegativeZero);
  }
  if (val !== null && typeof val === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      result[k] = normalizeNegativeZero(v);
    }
    return result;
  }
  return val;
};

// Ensure sessionStorage is available in test environment
beforeAll(() => {
  if (typeof sessionStorage === 'undefined') {
    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};

      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (index: number) => {
          const keys = Object.keys(store);
          return keys[index] || null;
        },
      };
    })();

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  }
});

describe('Property-Based Tests: Storage Strategy', () => {
  let strategy: SessionStorageStrategy;

  beforeEach(() => {
    strategy = new SessionStorageStrategy();
    sessionStorage.clear();
  });

  /**
   * Property 3: Storage Strategy Serialization Round-Trip
   * **Validates: Requirements 1.4, 1.5, 2.6, 14.3**
   * 
   * For any JSON-serializable value, saving to storage then loading from storage
   * SHALL return an equivalent value (deep equality).
   */
  describe('Property 3: Storage Strategy Serialization Round-Trip', () => {
    it('should preserve any JSON-serializable value through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            // Filter out problematic keys that conflict with Object.prototype
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ), // Storage key
          fc.jsonValue().map(normalizeNegativeZero), // Any JSON-serializable value
          (key, value) => {
            // Save the value
            strategy.save(key, value);
            
            // Load it back
            const loaded = strategy.load(key);
            
            // Property: Loaded value should equal original value
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve strings through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.string(),
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve numbers through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.oneof(
            fc.integer(),
            fc.double({ noNaN: true, noDefaultInfinity: true })
          ).map(n => n === -0 ? 0 : n), // Normalize -0 to 0 since JSON doesn't preserve it
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve booleans through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.boolean(),
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve null through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          (key) => {
            strategy.save(key, null);
            const loaded = strategy.load(key);
            expect(loaded).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve arrays through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.array(fc.jsonValue()).map(normalizeNegativeZero),
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve objects through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.dictionary(fc.string(), fc.jsonValue()).map(normalizeNegativeZero),
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve nested structures through save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.record({
            string: fc.string(),
            number: fc.integer(),
            boolean: fc.boolean(),
            null: fc.constant(null),
            array: fc.array(fc.integer()),
            nested: fc.record({
              a: fc.integer(),
              b: fc.string(),
            }),
          }),
          (key, value) => {
            strategy.save(key, value);
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Session Storage Save-Load Round-Trip
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any key-value pair where the value is JSON-serializable, calling save
   * then load with the same key SHALL return the original value.
   */
  describe('Property 4: Session Storage Save-Load Round-Trip', () => {
    it('should return original value when loading with same key after save', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.jsonValue().map(normalizeNegativeZero),
          (key, value) => {
            // Save with key
            strategy.save(key, value);
            
            // Load with same key
            const loaded = strategy.load(key);
            
            // Property: Should return original value
            expect(loaded).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple key-value pairs independently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
                key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
              ),
              value: fc.jsonValue().map(normalizeNegativeZero),
            }),
            { minLength: 1, maxLength: 10 }
          ).chain(pairs => {
            // Ensure unique keys
            const uniqueKeys = new Set(pairs.map(p => p.key));
            if (uniqueKeys.size !== pairs.length) {
              return fc.constant([]);
            }
            return fc.constant(pairs);
          }).filter(pairs => pairs.length > 0),
          (pairs) => {
            // Save all pairs
            pairs.forEach(({ key, value }) => {
              strategy.save(key, value);
            });
            
            // Load all pairs and verify
            pairs.forEach(({ key, value }) => {
              const loaded = strategy.load(key);
              expect(loaded).toEqual(value);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should overwrite previous value when saving to same key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.jsonValue().map(normalizeNegativeZero),
          fc.jsonValue().map(normalizeNegativeZero),
          (key, value1, value2) => {
            // Save first value
            strategy.save(key, value1);
            
            // Save second value to same key
            strategy.save(key, value2);
            
            // Load should return second value
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for keys that were never saved', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype' &&
            key !== 'toString' && key !== 'valueOf' && key !== 'hasOwnProperty'
          ),
          (key) => {
            // Don't save anything
            
            // Load should return null
            const loaded = strategy.load(key);
            expect(loaded).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Session Storage Remove Completeness
   * **Validates: Requirements 2.4**
   * 
   * For any key that has been saved to session storage, calling remove then load
   * with the same key SHALL return null.
   */
  describe('Property 9: Session Storage Remove Completeness', () => {
    it('should return null when loading after remove', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.jsonValue().map(normalizeNegativeZero),
          (key, value) => {
            // Save a value
            strategy.save(key, value);
            
            // Verify it was saved
            expect(strategy.load(key)).toEqual(value);
            
            // Remove the key
            strategy.remove(key);
            
            // Property: Load should return null after remove
            const loaded = strategy.load(key);
            expect(loaded).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove only the specified key, leaving others intact', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
                key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
              ),
              value: fc.jsonValue().map(normalizeNegativeZero),
            }),
            { minLength: 2, maxLength: 10 }
          ).chain(pairs => {
            // Ensure unique keys
            const uniqueKeys = new Set(pairs.map(p => p.key));
            if (uniqueKeys.size !== pairs.length) {
              return fc.constant([]);
            }
            return fc.constant(pairs);
          }).filter(pairs => pairs.length >= 2),
          fc.integer({ min: 0 }),
          (pairs, indexSeed) => {
            // Save all pairs
            pairs.forEach(({ key, value }) => {
              strategy.save(key, value);
            });
            
            // Remove one key
            const removeIndex = indexSeed % pairs.length;
            const keyToRemove = pairs[removeIndex].key;
            strategy.remove(keyToRemove);
            
            // Property: Removed key should return null
            expect(strategy.load(keyToRemove)).toBeNull();
            
            // Property: Other keys should still have their values
            pairs.forEach(({ key, value }, index) => {
              if (index !== removeIndex) {
                expect(strategy.load(key)).toEqual(value);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle removing non-existent keys gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype' &&
            key !== 'toString' && key !== 'valueOf' && key !== 'hasOwnProperty'
          ),
          (key) => {
            // Don't save anything
            
            // Remove should not throw
            expect(() => strategy.remove(key)).not.toThrow();
            
            // Load should still return null
            expect(strategy.load(key)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow re-saving after remove', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          ),
          fc.jsonValue().map(normalizeNegativeZero),
          fc.jsonValue().map(normalizeNegativeZero),
          (key, value1, value2) => {
            // Save first value
            strategy.save(key, value1);
            
            // Remove it
            strategy.remove(key);
            expect(strategy.load(key)).toBeNull();
            
            // Save second value
            strategy.save(key, value2);
            
            // Property: Should be able to load the new value
            const loaded = strategy.load(key);
            expect(loaded).toEqual(value2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should completely remove all traces of the key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(key => 
            key !== '__proto__' && key !== 'constructor' && key !== 'prototype' &&
            key !== 'toString' && key !== 'valueOf' && key !== 'hasOwnProperty'
          ),
          fc.jsonValue().map(normalizeNegativeZero),
          (key, value) => {
            // Save a value
            strategy.save(key, value);
            
            // Remove it
            strategy.remove(key);
            
            // Property: sessionStorage should not contain the key
            expect(sessionStorage.getItem(key)).toBeNull();
            
            // Property: Load should return null
            expect(strategy.load(key)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
