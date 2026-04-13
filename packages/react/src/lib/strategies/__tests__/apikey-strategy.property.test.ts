/**
 * Property-Based Tests for API Key Strategy
 * 
 * Property 2: API Key Strategy Serialization Round-Trip
 * **Validates: Requirements 5.2, 5.5, 5.6, 14.2**
 * 
 * Property 6: API Key Strategy Authentication Consistency
 * **Validates: Requirements 5.2, 5.3, 5.4**
 * 
 * Property 12: API Key Header Format Consistency
 * **Validates: Requirements 5.3, 9.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ApiKeyStrategy } from '../ApiKeyStrategy';

describe('Property-Based Tests: API Key Strategy', () => {
  /**
   * Property 2: API Key Strategy Serialization Round-Trip
   * **Validates: Requirements 5.2, 5.5, 5.6, 14.2**
   * 
   * For any valid API key credentials (apiKey, apiKeyName, apiKeyIn), authenticating
   * then serializing then deserializing into a new API Key strategy instance SHALL
   * produce an equivalent authenticated state with the same credentials and headers.
   */
  describe('Property 2: API Key Strategy Serialization Round-Trip', () => {
    it('should preserve authenticated state through serialize/deserialize cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''), // apiKey
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''), // apiKeyName
          fc.constantFrom('header' as const, 'query' as const), // apiKeyIn
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            // Authenticate with credentials
            const authResult = await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            expect(authResult.success).toBe(true);
            
            // Serialize the state
            const serialized = strategy.serialize();
            
            // Create new strategy instance and deserialize
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            // Property: New strategy should have equivalent state
            expect(newStrategy.isAuthenticated()).toBe(strategy.isAuthenticated());
            expect(newStrategy.getHeaders()).toEqual(strategy.getHeaders());
            expect(newStrategy.serialize()).toEqual(serialized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve credential values through serialize/deserialize cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            // Authenticate
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Serialize
            const serialized = strategy.serialize();
            
            // Deserialize into new instance
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            // Property: Credentials should be preserved (check via headers)
            const headers = newStrategy.getHeaders();
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle credentials with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            const serialized = strategy.serialize();
            
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            const headers = newStrategy.getHeaders();
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve unauthenticated state through serialize/deserialize', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No authentication
          (_unused) => {
            const strategy = new ApiKeyStrategy();
            // Don't authenticate
            const serialized = strategy.serialize();
            
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            // Property: Should remain unauthenticated
            expect(newStrategy.isAuthenticated()).toBe(false);
            expect(newStrategy.getHeaders()).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple serialize/deserialize cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.integer({ min: 2, max: 5 }), // Number of cycles
          async (apiKey, apiKeyName, apiKeyIn, cycles) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            let currentStrategy = strategy;
            for (let i = 0; i < cycles; i++) {
              const serialized = currentStrategy.serialize();
              const nextStrategy = new ApiKeyStrategy();
              nextStrategy.deserialize(serialized);
              currentStrategy = nextStrategy;
            }
            
            // Property: After multiple cycles, state should be preserved
            expect(currentStrategy.isAuthenticated()).toBe(true);
            const headers = currentStrategy.getHeaders();
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle both header and query apiKeyIn values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const serialized = strategy.serialize();
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            // Property: apiKeyIn should be preserved correctly
            expect(newStrategy.getHeaders()['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: API Key Strategy Authentication Consistency
   * **Validates: Requirements 5.2, 5.3, 5.4**
   * 
   * For any valid API key credentials, after successful authentication, isAuthenticated
   * SHALL return true AND getHeaders SHALL return an object containing "x-uigen-api-key",
   * "x-uigen-api-key-name", and "x-uigen-api-key-in" with the credential values.
   */
  describe('Property 6: API Key Strategy Authentication Consistency', () => {
    it('should be authenticated and have correct headers after authenticate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            // Authenticate
            const result = await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Property: Authentication should succeed
            expect(result.success).toBe(true);
            
            // Property: isAuthenticated should return true
            expect(strategy.isAuthenticated()).toBe(true);
            
            // Property: getHeaders should contain all three required headers with correct values
            const headers = strategy.getHeaders();
            expect(headers).toHaveProperty('x-uigen-api-key');
            expect(headers).toHaveProperty('x-uigen-api-key-name');
            expect(headers).toHaveProperty('x-uigen-api-key-in');
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple getHeaders calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.integer({ min: 2, max: 10 }), // Number of calls
          async (apiKey, apiKeyName, apiKeyIn, numCalls) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Call getHeaders multiple times
            const headerResults = [];
            for (let i = 0; i < numCalls; i++) {
              headerResults.push(strategy.getHeaders());
            }
            
            // Property: All calls should return the same headers
            const expectedHeaders = {
              'x-uigen-api-key': apiKey,
              'x-uigen-api-key-name': apiKeyName,
              'x-uigen-api-key-in': apiKeyIn
            };
            for (const headers of headerResults) {
              expect(headers).toEqual(expectedHeaders);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple isAuthenticated calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.integer({ min: 2, max: 10 }),
          async (apiKey, apiKeyName, apiKeyIn, numCalls) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Call isAuthenticated multiple times
            const results = [];
            for (let i = 0; i < numCalls; i++) {
              results.push(strategy.isAuthenticated());
            }
            
            // Property: All calls should return true
            for (const result of results) {
              expect(result).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty apiKey and remain unauthenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '), // Empty/whitespace apiKey
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            const result = await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Property: Authentication should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Property: Should remain unauthenticated
            expect(strategy.isAuthenticated()).toBe(false);
            
            // Property: Headers should be empty
            expect(strategy.getHeaders()).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty apiKeyName and remain unauthenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '), // Empty/whitespace apiKeyName
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            const result = await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            // Property: Authentication should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Property: Should remain unauthenticated
            expect(strategy.isAuthenticated()).toBe(false);
            
            // Property: Headers should be empty
            expect(strategy.getHeaders()).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle re-authentication with different credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey1, apiKeyName1, apiKeyIn1, apiKey2, apiKeyName2, apiKeyIn2) => {
            const strategy = new ApiKeyStrategy();
            // First authentication
            await strategy.authenticate({ apiKey: apiKey1, apiKeyName: apiKeyName1, apiKeyIn: apiKeyIn1 });
            const headers1 = strategy.getHeaders();
            expect(headers1['x-uigen-api-key']).toBe(apiKey1);
            expect(headers1['x-uigen-api-key-name']).toBe(apiKeyName1);
            expect(headers1['x-uigen-api-key-in']).toBe(apiKeyIn1);
            
            // Second authentication
            await strategy.authenticate({ apiKey: apiKey2, apiKeyName: apiKeyName2, apiKeyIn: apiKeyIn2 });
            
            // Property: Should now use second credentials
            expect(strategy.isAuthenticated()).toBe(true);
            const headers2 = strategy.getHeaders();
            expect(headers2['x-uigen-api-key']).toBe(apiKey2);
            expect(headers2['x-uigen-api-key-name']).toBe(apiKeyName2);
            expect(headers2['x-uigen-api-key-in']).toBe(apiKeyIn2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: API Key Header Format Consistency
   * **Validates: Requirements 5.3, 9.2**
   * 
   * For any authenticated API Key strategy, getHeaders SHALL always return an object
   * with exactly three keys "x-uigen-api-key", "x-uigen-api-key-name", and
   * "x-uigen-api-key-in" whose values equal the stored credentials.
   */
  describe('Property 12: API Key Header Format Consistency', () => {
    it('should always return exactly three header keys for authenticated state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const headers = strategy.getHeaders();
            
            // Property: Should have exactly three keys
            expect(Object.keys(headers)).toHaveLength(3);
            
            // Property: Those keys should be the three required headers
            expect(headers).toHaveProperty('x-uigen-api-key');
            expect(headers).toHaveProperty('x-uigen-api-key-name');
            expect(headers).toHaveProperty('x-uigen-api-key-in');
            
            // Property: Values should equal the credentials
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty object for unauthenticated state', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          (_unused) => {
            const strategy = new ApiKeyStrategy();
            // Don't authenticate
            const headers = strategy.getHeaders();
            
            // Property: Should return empty object
            expect(headers).toEqual({});
            expect(Object.keys(headers)).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain header format after clear and re-authenticate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey1, apiKeyName1, apiKeyIn1, apiKey2, apiKeyName2, apiKeyIn2) => {
            const strategy = new ApiKeyStrategy();
            // Authenticate
            await strategy.authenticate({ apiKey: apiKey1, apiKeyName: apiKeyName1, apiKeyIn: apiKeyIn1 });
            
            // Clear
            strategy.clear();
            expect(strategy.getHeaders()).toEqual({});
            
            // Re-authenticate
            await strategy.authenticate({ apiKey: apiKey2, apiKeyName: apiKeyName2, apiKeyIn: apiKeyIn2 });
            
            // Property: Should have correct format again
            const headers = strategy.getHeaders();
            expect(Object.keys(headers)).toHaveLength(3);
            expect(headers['x-uigen-api-key']).toBe(apiKey2);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName2);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never include additional headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const headers = strategy.getHeaders();
            
            // Property: Should have exactly these three headers and no others
            const keys = Object.keys(headers).sort();
            expect(keys).toEqual(['x-uigen-api-key', 'x-uigen-api-key-in', 'x-uigen-api-key-name']);
            
            // Property: Should not have Authorization or other common auth headers
            expect(headers).not.toHaveProperty('Authorization');
            expect(headers).not.toHaveProperty('authorization');
            expect(headers).not.toHaveProperty('x-api-key');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve header format through serialize/deserialize', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const serialized = strategy.serialize();
            const newStrategy = new ApiKeyStrategy();
            newStrategy.deserialize(serialized);
            
            const headers = newStrategy.getHeaders();
            
            // Property: Should maintain exact format
            expect(Object.keys(headers)).toHaveLength(3);
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle credentials with various character sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 200 }), // Any string
            fc.uuid(), // UUID keys
          ).filter(s => s.trim() !== ''),
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }), // Any string
            fc.constantFrom('X-API-Key', 'api_key', 'apiKey', 'key'), // Common names
          ).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const headers = strategy.getHeaders();
            
            // Property: Format should be consistent regardless of credential content
            expect(Object.keys(headers)).toHaveLength(3);
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly distinguish between header and query apiKeyIn values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const strategy = new ApiKeyStrategy();
            await strategy.authenticate({ apiKey, apiKeyName, apiKeyIn });
            
            const headers = strategy.getHeaders();
            
            // Property: apiKeyIn value should be exactly what was provided
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
            
            // Property: Should be one of the two valid values
            expect(['header', 'query']).toContain(headers['x-uigen-api-key-in']);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
