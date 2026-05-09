/**
 * Unit tests for OAuth state parameter security utilities
 * Tests Requirements 3.2, 12.1-12.10
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateState,
  storeState,
  validateState,
  clearState,
  getStoredState,
} from '../oauth-state';

describe('OAuth State Parameter Security', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });
  
  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  /**
   * Requirement 3.2, 12.1: Generate cryptographically secure state with 128-bit entropy
   */
  describe('generateState', () => {
    it('should generate a 32-character hexadecimal string', () => {
      const state = generateState();
      
      expect(state).toHaveLength(32);
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique states on each call', () => {
      const state1 = generateState();
      const state2 = generateState();
      const state3 = generateState();
      
      expect(state1).not.toBe(state2);
      expect(state2).not.toBe(state3);
      expect(state1).not.toBe(state3);
    });

    it('should use crypto.getRandomValues for randomness', () => {
      const spy = vi.spyOn(crypto, 'getRandomValues');
      
      generateState();
      
      expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(spy.mock.calls[0][0]).toHaveLength(16); // 128 bits = 16 bytes
      
      spy.mockRestore();
    });

    it('should generate states with sufficient entropy', () => {
      // Generate multiple states and ensure they're all different
      const states = new Set<string>();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        states.add(generateState());
      }
      
      // All states should be unique (no collisions)
      expect(states.size).toBe(iterations);
    });

    it('should pad single-digit hex values with leading zeros', () => {
      // Mock crypto.getRandomValues to return small values
      const originalGetRandomValues = crypto.getRandomValues;
      crypto.getRandomValues = (array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 16; // Values 0-15 (single hex digit)
        }
        return array;
      };
      
      const state = generateState();
      
      // Should be 32 characters even with small values
      expect(state).toHaveLength(32);
      expect(state).toMatch(/^[0-9a-f]{32}$/);
      
      // Restore original
      crypto.getRandomValues = originalGetRandomValues;
    });
  });

  /**
   * Requirement 12.2: Store state in sessionStorage with provider-specific key
   */
  describe('storeState', () => {
    it('should store state in sessionStorage with provider-specific key', () => {
      const provider = 'google';
      const state = 'test-state-123';
      
      storeState(provider, state);
      
      const stored = sessionStorage.getItem('oauth_state_google');
      expect(stored).toBe(state);
    });

    it('should store states for different providers independently', () => {
      const googleState = 'google-state-123';
      const githubState = 'github-state-456';
      
      storeState('google', googleState);
      storeState('github', githubState);
      
      expect(sessionStorage.getItem('oauth_state_google')).toBe(googleState);
      expect(sessionStorage.getItem('oauth_state_github')).toBe(githubState);
    });

    it('should overwrite existing state for the same provider', () => {
      const provider = 'google';
      const state1 = 'state-1';
      const state2 = 'state-2';
      
      storeState(provider, state1);
      storeState(provider, state2);
      
      expect(sessionStorage.getItem('oauth_state_google')).toBe(state2);
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage.setItem to throw an error
      const originalSetItem = sessionStorage.setItem;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
      
      // Should not throw
      expect(() => {
        storeState('google', 'test-state');
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to store OAuth state:',
        expect.any(Error)
      );
      
      // Restore original
      sessionStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty provider names', () => {
      storeState('', 'test-state');
      
      expect(sessionStorage.getItem('oauth_state_')).toBe('test-state');
    });

    it('should handle special characters in provider names', () => {
      const provider = 'custom-provider_v2';
      const state = 'test-state';
      
      storeState(provider, state);
      
      expect(sessionStorage.getItem(`oauth_state_${provider}`)).toBe(state);
    });
  });

  /**
   * Requirements 12.4, 12.5, 12.6: Validate state matches stored value
   */
  describe('validateState', () => {
    it('should return true when state matches stored value', () => {
      const provider = 'google';
      const state = 'test-state-123';
      
      storeState(provider, state);
      
      expect(validateState(provider, state)).toBe(true);
    });

    it('should return false when state does not match stored value', () => {
      const provider = 'google';
      const storedState = 'correct-state';
      const providedState = 'wrong-state';
      
      storeState(provider, storedState);
      
      expect(validateState(provider, providedState)).toBe(false);
    });

    it('should return false when no state is stored for provider', () => {
      expect(validateState('google', 'any-state')).toBe(false);
    });

    it('should validate states independently for different providers', () => {
      const googleState = 'google-state';
      const githubState = 'github-state';
      
      storeState('google', googleState);
      storeState('github', githubState);
      
      expect(validateState('google', googleState)).toBe(true);
      expect(validateState('github', githubState)).toBe(true);
      expect(validateState('google', githubState)).toBe(false);
      expect(validateState('github', googleState)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const provider = 'google';
      const state = 'TestState123';
      
      storeState(provider, state);
      
      expect(validateState(provider, 'teststate123')).toBe(false);
      expect(validateState(provider, 'TESTSTATE123')).toBe(false);
      expect(validateState(provider, state)).toBe(true);
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage.getItem to throw an error
      const originalGetItem = sessionStorage.getItem;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.getItem = () => {
        throw new Error('Storage access denied');
      };
      
      const result = validateState('google', 'test-state');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to validate OAuth state:',
        expect.any(Error)
      );
      
      // Restore original
      sessionStorage.getItem = originalGetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should return false for empty state strings', () => {
      const provider = 'google';
      
      storeState(provider, 'valid-state');
      
      expect(validateState(provider, '')).toBe(false);
    });

    it('should handle whitespace in state values', () => {
      const provider = 'google';
      const state = 'state with spaces';
      
      storeState(provider, state);
      
      expect(validateState(provider, state)).toBe(true);
      expect(validateState(provider, 'state with spaces')).toBe(true);
      expect(validateState(provider, 'statewithspaces')).toBe(false);
    });
  });

  /**
   * Requirements 12.8, 12.9: Clear state after validation
   */
  describe('clearState', () => {
    it('should remove state from sessionStorage', () => {
      const provider = 'google';
      const state = 'test-state';
      
      storeState(provider, state);
      expect(sessionStorage.getItem('oauth_state_google')).toBe(state);
      
      clearState(provider);
      expect(sessionStorage.getItem('oauth_state_google')).toBeNull();
    });

    it('should not affect states for other providers', () => {
      const googleState = 'google-state';
      const githubState = 'github-state';
      
      storeState('google', googleState);
      storeState('github', githubState);
      
      clearState('google');
      
      expect(sessionStorage.getItem('oauth_state_google')).toBeNull();
      expect(sessionStorage.getItem('oauth_state_github')).toBe(githubState);
    });

    it('should not throw when clearing non-existent state', () => {
      expect(() => {
        clearState('google');
      }).not.toThrow();
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage.removeItem to throw an error
      const originalRemoveItem = sessionStorage.removeItem;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.removeItem = () => {
        throw new Error('Storage access denied');
      };
      
      expect(() => {
        clearState('google');
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to clear OAuth state:',
        expect.any(Error)
      );
      
      // Restore original
      sessionStorage.removeItem = originalRemoveItem;
      consoleErrorSpy.mockRestore();
    });

    it('should clear state for multiple providers', () => {
      storeState('google', 'google-state');
      storeState('github', 'github-state');
      storeState('facebook', 'facebook-state');
      
      clearState('google');
      clearState('github');
      clearState('facebook');
      
      expect(sessionStorage.getItem('oauth_state_google')).toBeNull();
      expect(sessionStorage.getItem('oauth_state_github')).toBeNull();
      expect(sessionStorage.getItem('oauth_state_facebook')).toBeNull();
    });
  });

  /**
   * getStoredState utility function
   */
  describe('getStoredState', () => {
    it('should retrieve stored state without removing it', () => {
      const provider = 'google';
      const state = 'test-state';
      
      storeState(provider, state);
      
      const retrieved = getStoredState(provider);
      expect(retrieved).toBe(state);
      
      // State should still be in storage
      expect(sessionStorage.getItem('oauth_state_google')).toBe(state);
    });

    it('should return null when no state is stored', () => {
      expect(getStoredState('google')).toBeNull();
    });

    it('should retrieve states for different providers independently', () => {
      storeState('google', 'google-state');
      storeState('github', 'github-state');
      
      expect(getStoredState('google')).toBe('google-state');
      expect(getStoredState('github')).toBe('github-state');
    });

    it('should handle sessionStorage errors gracefully', () => {
      const originalGetItem = sessionStorage.getItem;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.getItem = () => {
        throw new Error('Storage access denied');
      };
      
      const result = getStoredState('google');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to retrieve OAuth state:',
        expect.any(Error)
      );
      
      sessionStorage.getItem = originalGetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Integration: Complete OAuth state flow
   */
  describe('Complete OAuth state flow', () => {
    it('should support complete state lifecycle', () => {
      const provider = 'google';
      
      // 1. Generate state
      const state = generateState();
      expect(state).toHaveLength(32);
      
      // 2. Store state
      storeState(provider, state);
      expect(getStoredState(provider)).toBe(state);
      
      // 3. Validate state (success)
      expect(validateState(provider, state)).toBe(true);
      
      // 4. Clear state
      clearState(provider);
      expect(getStoredState(provider)).toBeNull();
      
      // 5. Validation should fail after clearing
      expect(validateState(provider, state)).toBe(false);
    });

    it('should support multiple concurrent OAuth flows', () => {
      const googleState = generateState();
      const githubState = generateState();
      const facebookState = generateState();
      
      // Store states for multiple providers
      storeState('google', googleState);
      storeState('github', githubState);
      storeState('facebook', facebookState);
      
      // All should validate correctly
      expect(validateState('google', googleState)).toBe(true);
      expect(validateState('github', githubState)).toBe(true);
      expect(validateState('facebook', facebookState)).toBe(true);
      
      // Clear one provider
      clearState('github');
      
      // Others should still validate
      expect(validateState('google', googleState)).toBe(true);
      expect(validateState('github', githubState)).toBe(false);
      expect(validateState('facebook', facebookState)).toBe(true);
    });

    it('should prevent replay attacks by clearing state after use', () => {
      const provider = 'google';
      const state = generateState();
      
      storeState(provider, state);
      
      // First validation succeeds
      expect(validateState(provider, state)).toBe(true);
      
      // Clear state (simulating single-use)
      clearState(provider);
      
      // Second validation with same state fails
      expect(validateState(provider, state)).toBe(false);
    });

    it('should handle state regeneration for same provider', () => {
      const provider = 'google';
      
      // First OAuth attempt
      const state1 = generateState();
      storeState(provider, state1);
      expect(validateState(provider, state1)).toBe(true);
      
      // User cancels and tries again - new state generated
      const state2 = generateState();
      storeState(provider, state2);
      
      // Old state should not validate
      expect(validateState(provider, state1)).toBe(false);
      
      // New state should validate
      expect(validateState(provider, state2)).toBe(true);
    });
  });

  /**
   * Security considerations
   */
  describe('Security properties', () => {
    it('should generate states with high entropy (no patterns)', () => {
      const states = Array.from({ length: 100 }, () => generateState());
      
      // Check for no obvious patterns
      const firstChars = states.map(s => s[0]);
      const uniqueFirstChars = new Set(firstChars);
      
      // Should have good distribution (at least 8 different first characters)
      expect(uniqueFirstChars.size).toBeGreaterThan(8);
    });

    it('should not leak state across providers', () => {
      const googleState = generateState();
      const githubState = generateState();
      
      storeState('google', googleState);
      storeState('github', githubState);
      
      // Cross-provider validation should fail
      expect(validateState('google', githubState)).toBe(false);
      expect(validateState('github', googleState)).toBe(false);
    });

    it('should use sessionStorage (not localStorage) for security', () => {
      const provider = 'google';
      const state = generateState();
      
      storeState(provider, state);
      
      // Should be in sessionStorage
      expect(sessionStorage.getItem('oauth_state_google')).toBe(state);
      
      // Should NOT be in localStorage
      expect(localStorage.getItem('oauth_state_google')).toBeNull();
    });
  });
});
