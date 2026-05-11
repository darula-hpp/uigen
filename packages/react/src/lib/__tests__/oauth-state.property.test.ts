/**
 * Property-based tests for OAuth state parameter security
 * Feature: oauth-authentication-support
 * Tests Requirements 3.2, 12.1-12.10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  generateState,
  storeState,
  validateState,
  clearState,
  getStoredState,
} from '../oauth-state';

describe('OAuth State Parameter Security - Property-Based Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  
  afterEach(() => {
    sessionStorage.clear();
  });

  /**
   * Property 1: State Uniqueness
   * 
   * **Validates: Requirements 3.2, 12.1, 12.10**
   * 
   * For any number of state generations, each generated state should be unique.
   * This ensures sufficient entropy and prevents collisions that could lead to
   * security vulnerabilities.
   */
  describe('Property 1: State Uniqueness', () => {
    it('should generate unique states with no collisions', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), (count) => {
          const states = new Set<string>();
          
          for (let i = 0; i < count; i++) {
            states.add(generateState());
          }
          
          // All generated states should be unique
          expect(states.size).toBe(count);
        }),
        { numRuns: 50 }
      );
    });

    it('should generate states with consistent format', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const state = generateState();
          
          // Should be 32-character hexadecimal string
          expect(state).toHaveLength(32);
          expect(state).toMatch(/^[0-9a-f]{32}$/);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: State Entropy Validation
   * 
   * **Validates: Requirements 3.2, 12.1**
   * 
   * For any generated state, it should have sufficient entropy (128 bits)
   * and no obvious patterns that could be exploited.
   */
  describe('Property 2: State Entropy Validation', () => {
    it('should generate states with high entropy', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const state = generateState();
          
          // Check length (32 hex chars = 128 bits)
          expect(state).toHaveLength(32);
          
          // Check format (only hex characters)
          expect(state).toMatch(/^[0-9a-f]+$/);
          
          // Check no obvious patterns (not all same character)
          const uniqueChars = new Set(state.split(''));
          expect(uniqueChars.size).toBeGreaterThan(1);
          
          // Check not all zeros or all fs
          expect(state).not.toBe('0'.repeat(32));
          expect(state).not.toBe('f'.repeat(32));
        }),
        { numRuns: 100 }
      );
    });

    it('should have good character distribution', () => {
      const states = Array.from({ length: 100 }, () => generateState());
      const allChars = states.join('');
      const charCounts = new Map<string, number>();
      
      for (const char of allChars) {
        charCounts.set(char, (charCounts.get(char) || 0) + 1);
      }
      
      // Should have reasonable distribution across hex characters
      // With 3200 characters (100 states * 32 chars), each of 16 hex chars
      // should appear roughly 200 times (±50% tolerance)
      const expectedCount = 3200 / 16; // 200
      const tolerance = expectedCount * 0.5; // 100
      
      for (const count of charCounts.values()) {
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      }
    });
  });

  /**
   * Property 3: State Storage Round-Trip
   * 
   * **Validates: Requirements 12.2, 12.4, 12.5**
   * 
   * For any provider and state value, storing and then retrieving the state
   * should return the exact same value.
   */
  describe('Property 3: State Storage Round-Trip', () => {
    it('should preserve state through store and retrieve', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(providerArb, stateArb, (provider, state) => {
          storeState(provider, state);
          const retrieved = getStoredState(provider);
          
          expect(retrieved).toBe(state);
          
          // Clean up
          clearState(provider);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate stored state correctly', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(providerArb, stateArb, (provider, state) => {
          storeState(provider, state);
          
          // Validation with correct state should succeed
          expect(validateState(provider, state)).toBe(true);
          
          // Clean up
          clearState(provider);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject incorrect state values', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      const wrongStateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(providerArb, stateArb, wrongStateArb, (provider, correctState, wrongState) => {
          // Skip if states happen to be the same
          fc.pre(correctState !== wrongState);
          
          storeState(provider, correctState);
          
          // Validation with wrong state should fail
          expect(validateState(provider, wrongState)).toBe(false);
          
          // Clean up
          clearState(provider);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Provider Isolation
   * 
   * **Validates: Requirements 12.2, 12.5**
   * 
   * For any two different providers, states stored for one provider
   * should not affect or be accessible by another provider.
   */
  describe('Property 4: Provider Isolation', () => {
    it('should isolate states between different providers', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(
          providerArb,
          providerArb,
          stateArb,
          stateArb,
          (provider1, provider2, state1, state2) => {
            // Skip if providers are the same
            fc.pre(provider1 !== provider2);
            
            // Store states for both providers
            storeState(provider1, state1);
            storeState(provider2, state2);
            
            // Each provider should have its own state
            expect(getStoredState(provider1)).toBe(state1);
            expect(getStoredState(provider2)).toBe(state2);
            
            // Cross-provider validation should fail
            expect(validateState(provider1, state2)).toBe(false);
            expect(validateState(provider2, state1)).toBe(false);
            
            // Clean up
            clearState(provider1);
            clearState(provider2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not affect other providers when clearing state', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(
          providerArb,
          providerArb,
          stateArb,
          stateArb,
          (provider1, provider2, state1, state2) => {
            fc.pre(provider1 !== provider2);
            
            storeState(provider1, state1);
            storeState(provider2, state2);
            
            // Clear state for provider1
            clearState(provider1);
            
            // Provider1 state should be gone
            expect(getStoredState(provider1)).toBeNull();
            expect(validateState(provider1, state1)).toBe(false);
            
            // Provider2 state should remain
            expect(getStoredState(provider2)).toBe(state2);
            expect(validateState(provider2, state2)).toBe(true);
            
            // Clean up
            clearState(provider2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: State Lifecycle
   * 
   * **Validates: Requirements 12.2, 12.4, 12.8, 12.9**
   * 
   * For any provider and state, the complete lifecycle (store, validate, clear)
   * should work correctly and prevent reuse after clearing.
   */
  describe('Property 5: State Lifecycle', () => {
    it('should support complete state lifecycle', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(providerArb, (provider) => {
          // Generate and store state
          const state = generateState();
          storeState(provider, state);
          
          // Should be retrievable
          expect(getStoredState(provider)).toBe(state);
          
          // Should validate
          expect(validateState(provider, state)).toBe(true);
          
          // Clear state
          clearState(provider);
          
          // Should no longer be retrievable
          expect(getStoredState(provider)).toBeNull();
          
          // Should no longer validate
          expect(validateState(provider, state)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent replay attacks by clearing state', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(providerArb, (provider) => {
          const state = generateState();
          
          // First use
          storeState(provider, state);
          expect(validateState(provider, state)).toBe(true);
          clearState(provider);
          
          // Attempt to reuse same state (replay attack)
          expect(validateState(provider, state)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow state regeneration for same provider', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(providerArb, (provider) => {
          // First OAuth attempt
          const state1 = generateState();
          storeState(provider, state1);
          expect(validateState(provider, state1)).toBe(true);
          
          // Second OAuth attempt (user retries)
          const state2 = generateState();
          storeState(provider, state2);
          
          // Old state should not validate (overwritten)
          expect(validateState(provider, state1)).toBe(false);
          
          // New state should validate
          expect(validateState(provider, state2)).toBe(true);
          
          // Clean up
          clearState(provider);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Case Sensitivity
   * 
   * **Validates: Requirements 12.4, 12.6**
   * 
   * State validation should be case-sensitive to prevent attacks
   * that rely on case manipulation.
   */
  describe('Property 6: Case Sensitivity', () => {
    it('should be case-sensitive in validation', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      // Generate states with mixed case
      const stateArb = fc.string({ minLength: 10, maxLength: 50 })
        .filter(s => s.toLowerCase() !== s && s.toUpperCase() !== s);
      
      fc.assert(
        fc.property(providerArb, stateArb, (provider, state) => {
          storeState(provider, state);
          
          // Exact match should validate
          expect(validateState(provider, state)).toBe(true);
          
          // Different case should not validate
          if (state.toLowerCase() !== state) {
            expect(validateState(provider, state.toLowerCase())).toBe(false);
          }
          if (state.toUpperCase() !== state) {
            expect(validateState(provider, state.toUpperCase())).toBe(false);
          }
          
          // Clean up
          clearState(provider);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 7: Empty and Edge Cases
   * 
   * **Validates: Requirements 12.2, 12.4**
   * 
   * The system should handle edge cases gracefully without throwing errors.
   */
  describe('Property 7: Empty and Edge Cases', () => {
    it('should handle empty provider names', () => {
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(stateArb, (state) => {
          expect(() => {
            storeState('', state);
            getStoredState('');
            validateState('', state);
            clearState('');
          }).not.toThrow();
        }),
        { numRuns: 50 }
      );
    });

    it('should handle special characters in provider names', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const stateArb = fc.string({ minLength: 1, maxLength: 100 });
      
      fc.assert(
        fc.property(providerArb, stateArb, (provider, state) => {
          expect(() => {
            storeState(provider, state);
            getStoredState(provider);
            validateState(provider, state);
            clearState(provider);
          }).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle whitespace-only state values', () => {
      const providerArb = fc.string({ minLength: 1, maxLength: 50 });
      const whitespaceStateArb = fc.string({ minLength: 1, maxLength: 20 })
        .map(s => ' '.repeat(s.length));
      
      fc.assert(
        fc.property(providerArb, whitespaceStateArb, (provider, state) => {
          expect(() => {
            storeState(provider, state);
            expect(getStoredState(provider)).toBe(state);
            expect(validateState(provider, state)).toBe(true);
            clearState(provider);
          }).not.toThrow();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 8: Concurrent OAuth Flows
   * 
   * **Validates: Requirements 12.2, 12.5**
   * 
   * Multiple concurrent OAuth flows with different providers should
   * not interfere with each other.
   */
  describe('Property 8: Concurrent OAuth Flows', () => {
    it('should support multiple concurrent OAuth flows', () => {
      const providersArb = fc.array(
        fc.string({ minLength: 1, maxLength: 50 }),
        { minLength: 2, maxLength: 10 }
      ).filter(providers => {
        // Ensure all providers are unique
        return new Set(providers).size === providers.length;
      });
      
      fc.assert(
        fc.property(providersArb, (providers) => {
          const stateMap = new Map<string, string>();
          
          // Store states for all providers
          for (const provider of providers) {
            const state = generateState();
            stateMap.set(provider, state);
            storeState(provider, state);
          }
          
          // Validate all states
          for (const [provider, state] of stateMap) {
            expect(validateState(provider, state)).toBe(true);
            expect(getStoredState(provider)).toBe(state);
          }
          
          // Clear all states
          for (const provider of providers) {
            clearState(provider);
          }
          
          // All should be cleared
          for (const provider of providers) {
            expect(getStoredState(provider)).toBeNull();
          }
        }),
        { numRuns: 50 }
      );
    });
  });
});
