/**
 * Property-Based Tests for Bearer Strategy
 * 
 * Property 1: Bearer Strategy Serialization Round-Trip
 * **Validates: Requirements 4.2, 4.5, 4.6, 14.1**
 * 
 * Property 5: Bearer Strategy Authentication Consistency
 * **Validates: Requirements 4.2, 4.3, 4.4**
 * 
 * Property 11: Header Format Consistency
 * **Validates: Requirements 4.3, 9.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BearerStrategy } from '../BearerStrategy';

describe('Property-Based Tests: Bearer Strategy', () => {
  /**
   * Property 1: Bearer Strategy Serialization Round-Trip
   * **Validates: Requirements 4.2, 4.5, 4.6, 14.1**
   * 
   * For any valid Bearer token, authenticating then serializing then deserializing
   * into a new Bearer strategy instance SHALL produce an equivalent authenticated
   * state with the same token value and headers.
   */
  describe('Property 1: Bearer Strategy Serialization Round-Trip', () => {
    it('should preserve authenticated state through serialize/deserialize cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''), // Valid non-empty token
          async (token) => {
            const strategy = new BearerStrategy();
            // Authenticate with token
            const authResult = await strategy.authenticate({ token });
            expect(authResult.success).toBe(true);
            
            // Serialize the state
            const serialized = strategy.serialize();
            
            // Create new strategy instance and deserialize
            const newStrategy = new BearerStrategy();
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

    it('should preserve token value through serialize/deserialize cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            // Authenticate
            await strategy.authenticate({ token });
            
            // Serialize
            const serialized = strategy.serialize();
            
            // Deserialize into new instance
            const newStrategy = new BearerStrategy();
            newStrategy.deserialize(serialized);
            
            // Property: Token should be preserved (check via headers)
            expect(newStrategy.getHeaders()['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tokens with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            const serialized = strategy.serialize();
            
            const newStrategy = new BearerStrategy();
            newStrategy.deserialize(serialized);
            
            expect(newStrategy.getHeaders()['x-uigen-auth']).toBe(token);
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
            const strategy = new BearerStrategy();
            // Don't authenticate
            const serialized = strategy.serialize();
            
            const newStrategy = new BearerStrategy();
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
          fc.integer({ min: 2, max: 5 }), // Number of cycles
          async (token, cycles) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            let currentStrategy = strategy;
            for (let i = 0; i < cycles; i++) {
              const serialized = currentStrategy.serialize();
              const nextStrategy = new BearerStrategy();
              nextStrategy.deserialize(serialized);
              currentStrategy = nextStrategy;
            }
            
            // Property: After multiple cycles, state should be preserved
            expect(currentStrategy.isAuthenticated()).toBe(true);
            expect(currentStrategy.getHeaders()['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Bearer Strategy Authentication Consistency
   * **Validates: Requirements 4.2, 4.3, 4.4**
   * 
   * For any valid Bearer token, after successful authentication, isAuthenticated
   * SHALL return true AND getHeaders SHALL return an object containing "x-uigen-auth"
   * with the token value.
   */
  describe('Property 5: Bearer Strategy Authentication Consistency', () => {
    it('should be authenticated and have correct headers after authenticate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            // Authenticate
            const result = await strategy.authenticate({ token });
            
            // Property: Authentication should succeed
            expect(result.success).toBe(true);
            
            // Property: isAuthenticated should return true
            expect(strategy.isAuthenticated()).toBe(true);
            
            // Property: getHeaders should contain x-uigen-auth with token value
            const headers = strategy.getHeaders();
            expect(headers).toHaveProperty('x-uigen-auth');
            expect(headers['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency across multiple getHeaders calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.integer({ min: 2, max: 10 }), // Number of calls
          async (token, numCalls) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            // Call getHeaders multiple times
            const headerResults = [];
            for (let i = 0; i < numCalls; i++) {
              headerResults.push(strategy.getHeaders());
            }
            
            // Property: All calls should return the same headers
            for (const headers of headerResults) {
              expect(headers).toEqual({ 'x-uigen-auth': token });
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
          fc.integer({ min: 2, max: 10 }),
          async (token, numCalls) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
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

    it('should reject empty tokens and remain unauthenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n', '  \t\n  '), // Empty/whitespace tokens
          async (token) => {
            const strategy = new BearerStrategy();
            const result = await strategy.authenticate({ token });
            
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

    it('should handle re-authentication with different tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token1, token2) => {
            const strategy = new BearerStrategy();
            // First authentication
            await strategy.authenticate({ token: token1 });
            expect(strategy.getHeaders()['x-uigen-auth']).toBe(token1);
            
            // Second authentication
            await strategy.authenticate({ token: token2 });
            
            // Property: Should now use second token
            expect(strategy.isAuthenticated()).toBe(true);
            expect(strategy.getHeaders()['x-uigen-auth']).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Header Format Consistency
   * **Validates: Requirements 4.3, 9.1**
   * 
   * For any authenticated Bearer strategy, getHeaders SHALL always return an object
   * with exactly one key "x-uigen-auth" whose value equals the stored token.
   */
  describe('Property 11: Header Format Consistency', () => {
    it('should always return exactly one header key for authenticated state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            const headers = strategy.getHeaders();
            
            // Property: Should have exactly one key
            expect(Object.keys(headers)).toHaveLength(1);
            
            // Property: That key should be "x-uigen-auth"
            expect(headers).toHaveProperty('x-uigen-auth');
            
            // Property: Value should equal the token
            expect(headers['x-uigen-auth']).toBe(token);
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
            const strategy = new BearerStrategy();
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
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token1, token2) => {
            const strategy = new BearerStrategy();
            // Authenticate
            await strategy.authenticate({ token: token1 });
            
            // Clear
            strategy.clear();
            expect(strategy.getHeaders()).toEqual({});
            
            // Re-authenticate
            await strategy.authenticate({ token: token2 });
            
            // Property: Should have correct format again
            const headers = strategy.getHeaders();
            expect(Object.keys(headers)).toHaveLength(1);
            expect(headers['x-uigen-auth']).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never include additional headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            const headers = strategy.getHeaders();
            
            // Property: Should not have any other headers
            const keys = Object.keys(headers);
            expect(keys).toEqual(['x-uigen-auth']);
            
            // Property: Should not have Authorization, Bearer, or other common auth headers
            expect(headers).not.toHaveProperty('Authorization');
            expect(headers).not.toHaveProperty('Bearer');
            expect(headers).not.toHaveProperty('authorization');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve header format through serialize/deserialize', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            const serialized = strategy.serialize();
            const newStrategy = new BearerStrategy();
            newStrategy.deserialize(serialized);
            
            const headers = newStrategy.getHeaders();
            
            // Property: Should maintain exact format
            expect(Object.keys(headers)).toHaveLength(1);
            expect(headers['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tokens with various character sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 200 }), // Any string
            fc.uuid(), // UUID tokens
          ).filter(s => s.trim() !== ''),
          async (token) => {
            const strategy = new BearerStrategy();
            await strategy.authenticate({ token });
            
            const headers = strategy.getHeaders();
            
            // Property: Format should be consistent regardless of token content
            expect(Object.keys(headers)).toHaveLength(1);
            expect(headers['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
