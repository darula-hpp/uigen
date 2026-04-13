/**
 * Property-Based Tests for Auth Manager
 * 
 * Property 7: Auth Manager Coordination
 * **Validates: Requirements 6.2, 6.4, 6.5**
 * 
 * Property 8: Clear Operation Completeness
 * **Validates: Requirements 4.7, 5.7, 6.3**
 * 
 * Property 10: Auth Manager Restore Round-Trip
 * **Validates: Requirements 6.6, 6.7, 10.2**
 * 
 * Property 14: Logout Idempotence
 * **Validates: Requirements 6.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthManager } from '../AuthManager';
import { BearerStrategy } from '../BearerStrategy';
import { ApiKeyStrategy } from '../ApiKeyStrategy';
import { SessionStorageStrategy } from '../SessionStorageStrategy';
import type { IAuthStrategy } from '../IAuthStrategy';
import type { IStorageStrategy } from '../IStorageStrategy';

describe('Property-Based Tests: Auth Manager', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  /**
   * Property 7: Auth Manager Coordination
   * **Validates: Requirements 6.2, 6.4, 6.5**
   * 
   * For any valid credentials and any combination of auth and storage strategies,
   * calling login SHALL result in the auth strategy being authenticated AND the
   * storage containing the serialized auth data.
   */
  describe('Property 7: Auth Manager Coordination', () => {
    it('should coordinate Bearer strategy authentication and storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''), // Valid token
          async (token) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login with credentials
            const result = await manager.login({ token });
            
            // Property: Login should succeed
            expect(result.success).toBe(true);
            
            // Property: Auth strategy should be authenticated (via manager delegation)
            expect(manager.isAuthenticated()).toBe(true);
            
            // Property: Manager should delegate getHeaders correctly
            const headers = manager.getHeaders();
            expect(headers).toHaveProperty('x-uigen-auth');
            expect(headers['x-uigen-auth']).toBe(token);
            
            // Property: Storage should contain serialized auth data
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).not.toBeNull();
            expect(stored).toEqual({
              type: 'bearer',
              token: token
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should coordinate API Key strategy authentication and storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''), // apiKey
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''), // apiKeyName
          fc.constantFrom('header' as const, 'query' as const), // apiKeyIn
          async (apiKey, apiKeyName, apiKeyIn) => {
            const authStrategy = new ApiKeyStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login with API key credentials
            const result = await manager.login({ apiKey, apiKeyName, apiKeyIn });
            
            // Property: Login should succeed
            expect(result.success).toBe(true);
            
            // Property: Auth strategy should be authenticated
            expect(manager.isAuthenticated()).toBe(true);
            
            // Property: Manager should delegate getHeaders correctly
            const headers = manager.getHeaders();
            expect(headers).toHaveProperty('x-uigen-api-key');
            expect(headers['x-uigen-api-key']).toBe(apiKey);
            expect(headers['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(headers['x-uigen-api-key-in']).toBe(apiKeyIn);
            
            // Property: Storage should contain serialized auth data
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).not.toBeNull();
            expect(stored).toEqual({
              type: 'apiKey',
              apiKey,
              apiKeyName,
              apiKeyIn
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain coordination across multiple login calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
            { minLength: 2, maxLength: 5 }
          ),
          async (tokens) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login multiple times with different tokens
            for (const token of tokens) {
              await manager.login({ token });
            }
            
            // Property: Should be authenticated with the last token
            const lastToken = tokens[tokens.length - 1];
            expect(manager.isAuthenticated()).toBe(true);
            expect(manager.getHeaders()['x-uigen-auth']).toBe(lastToken);
            
            // Property: Storage should contain the last token
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).toEqual({
              type: 'bearer',
              token: lastToken
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should coordinate correctly even with failed authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t'), // Invalid tokens
          async (invalidToken) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Attempt login with invalid credentials
            const result = await manager.login({ token: invalidToken });
            
            // Property: Login should fail
            expect(result.success).toBe(false);
            
            // Property: Auth strategy should NOT be authenticated
            expect(manager.isAuthenticated()).toBe(false);
            
            // Property: Headers should be empty
            expect(manager.getHeaders()).toEqual({});
            
            // Property: Storage should NOT contain auth data
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Clear Operation Completeness
   * **Validates: Requirements 4.7, 5.7, 6.3**
   * 
   * For any authenticated auth strategy (Bearer or API Key), calling clear SHALL
   * result in isAuthenticated returning false AND getHeaders returning an empty object.
   */
  describe('Property 8: Clear Operation Completeness', () => {
    it('should completely clear Bearer strategy state via logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login first
            await manager.login({ token });
            expect(manager.isAuthenticated()).toBe(true);
            
            // Logout (which calls clear on the strategy)
            manager.logout();
            
            // Property: isAuthenticated should return false
            expect(manager.isAuthenticated()).toBe(false);
            
            // Property: getHeaders should return empty object
            expect(manager.getHeaders()).toEqual({});
            
            // Property: Storage should be cleared
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should completely clear API Key strategy state via logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const authStrategy = new ApiKeyStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login first
            await manager.login({ apiKey, apiKeyName, apiKeyIn });
            expect(manager.isAuthenticated()).toBe(true);
            
            // Logout
            manager.logout();
            
            // Property: isAuthenticated should return false
            expect(manager.isAuthenticated()).toBe(false);
            
            // Property: getHeaders should return empty object
            expect(manager.getHeaders()).toEqual({});
            
            // Property: Storage should be cleared
            const stored = storageStrategy.load('uigen_auth');
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear state completely regardless of how many times authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
            { minLength: 1, maxLength: 5 }
          ),
          async (tokens) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login multiple times
            for (const token of tokens) {
              await manager.login({ token });
            }
            
            // Logout once
            manager.logout();
            
            // Property: All state should be cleared
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
            expect(storageStrategy.load('uigen_auth')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear state even if storage operations fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const authStrategy = new BearerStrategy();
            
            // Create a storage strategy that throws on remove
            const faultyStorage: IStorageStrategy = {
              save: (key: string, value: unknown) => {
                sessionStorage.setItem(key, JSON.stringify(value));
              },
              load: (key: string) => {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
              },
              remove: (_key: string) => {
                throw new Error('Storage remove failed');
              }
            };
            
            const manager = new AuthManager(authStrategy, faultyStorage);
            
            // Login
            await manager.login({ token });
            expect(manager.isAuthenticated()).toBe(true);
            
            // Logout (storage will fail but auth should still clear)
            manager.logout();
            
            // Property: Auth strategy should still be cleared
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Auth Manager Restore Round-Trip
   * **Validates: Requirements 6.6, 6.7, 10.2**
   * 
   * For any valid credentials, logging in (which saves to storage) then creating
   * a new Auth Manager instance with the same strategies SHALL result in the new
   * manager being authenticated with equivalent state.
   */
  describe('Property 10: Auth Manager Restore Round-Trip', () => {
    it('should restore Bearer strategy state in new manager instance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const storageStrategy = new SessionStorageStrategy();
            
            // First manager: login
            const manager1 = new AuthManager(new BearerStrategy(), storageStrategy);
            await manager1.login({ token });
            
            const headers1 = manager1.getHeaders();
            const isAuth1 = manager1.isAuthenticated();
            
            // Second manager: should auto-restore on construction
            const manager2 = new AuthManager(new BearerStrategy(), storageStrategy);
            
            // Property: Second manager should be authenticated
            expect(manager2.isAuthenticated()).toBe(isAuth1);
            expect(manager2.isAuthenticated()).toBe(true);
            
            // Property: Second manager should have equivalent headers
            expect(manager2.getHeaders()).toEqual(headers1);
            expect(manager2.getHeaders()['x-uigen-auth']).toBe(token);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should restore API Key strategy state in new manager instance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          async (apiKey, apiKeyName, apiKeyIn) => {
            const storageStrategy = new SessionStorageStrategy();
            
            // First manager: login
            const manager1 = new AuthManager(new ApiKeyStrategy(), storageStrategy);
            await manager1.login({ apiKey, apiKeyName, apiKeyIn });
            
            const headers1 = manager1.getHeaders();
            const isAuth1 = manager1.isAuthenticated();
            
            // Second manager: should auto-restore
            const manager2 = new AuthManager(new ApiKeyStrategy(), storageStrategy);
            
            // Property: Second manager should be authenticated
            expect(manager2.isAuthenticated()).toBe(isAuth1);
            expect(manager2.isAuthenticated()).toBe(true);
            
            // Property: Second manager should have equivalent headers
            expect(manager2.getHeaders()).toEqual(headers1);
            expect(manager2.getHeaders()['x-uigen-api-key']).toBe(apiKey);
            expect(manager2.getHeaders()['x-uigen-api-key-name']).toBe(apiKeyName);
            expect(manager2.getHeaders()['x-uigen-api-key-in']).toBe(apiKeyIn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should restore state through multiple manager instances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.integer({ min: 2, max: 5 }), // Number of manager instances
          async (token, numInstances) => {
            const storageStrategy = new SessionStorageStrategy();
            
            // First manager: login
            const manager1 = new AuthManager(new BearerStrategy(), storageStrategy);
            await manager1.login({ token });
            
            // Create multiple new manager instances
            const managers: AuthManager[] = [];
            for (let i = 0; i < numInstances; i++) {
              managers.push(new AuthManager(new BearerStrategy(), storageStrategy));
            }
            
            // Property: All managers should be authenticated with same state
            for (const manager of managers) {
              expect(manager.isAuthenticated()).toBe(true);
              expect(manager.getHeaders()['x-uigen-auth']).toBe(token);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not restore if storage is empty', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No stored data
          (_unused) => {
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(new BearerStrategy(), storageStrategy);
            
            // Property: Should not be authenticated
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should restore after logout and re-login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token1, token2) => {
            const storageStrategy = new SessionStorageStrategy();
            
            // First manager: login with token1
            const manager1 = new AuthManager(new BearerStrategy(), storageStrategy);
            await manager1.login({ token: token1 });
            
            // Logout
            manager1.logout();
            
            // Login with token2
            await manager1.login({ token: token2 });
            
            // Second manager: should restore token2
            const manager2 = new AuthManager(new BearerStrategy(), storageStrategy);
            
            // Property: Should be authenticated with token2, not token1
            expect(manager2.isAuthenticated()).toBe(true);
            expect(manager2.getHeaders()['x-uigen-auth']).toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Logout Idempotence
   * **Validates: Requirements 6.3**
   * 
   * For any auth manager state, calling logout multiple times SHALL produce the
   * same result as calling it once (isAuthenticated is false, storage is empty,
   * headers are empty).
   */
  describe('Property 14: Logout Idempotence', () => {
    it('should be idempotent for Bearer strategy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          fc.integer({ min: 2, max: 10 }), // Number of logout calls
          async (token, numLogouts) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login first
            await manager.login({ token });
            expect(manager.isAuthenticated()).toBe(true);
            
            // Call logout multiple times
            for (let i = 0; i < numLogouts; i++) {
              manager.logout();
            }
            
            // Property: State should be same as single logout
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
            expect(storageStrategy.load('uigen_auth')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent for API Key strategy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
          fc.constantFrom('header' as const, 'query' as const),
          fc.integer({ min: 2, max: 10 }),
          async (apiKey, apiKeyName, apiKeyIn, numLogouts) => {
            const authStrategy = new ApiKeyStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login first
            await manager.login({ apiKey, apiKeyName, apiKeyIn });
            expect(manager.isAuthenticated()).toBe(true);
            
            // Call logout multiple times
            for (let i = 0; i < numLogouts; i++) {
              manager.logout();
            }
            
            // Property: State should be same as single logout
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
            expect(storageStrategy.load('uigen_auth')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent even when not authenticated', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (numLogouts) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Don't login, just logout multiple times
            for (let i = 0; i < numLogouts; i++) {
              manager.logout();
            }
            
            // Property: Should remain unauthenticated
            expect(manager.isAuthenticated()).toBe(false);
            expect(manager.getHeaders()).toEqual({});
            expect(storageStrategy.load('uigen_auth')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent across login-logout cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
            { minLength: 1, maxLength: 5 }
          ),
          fc.integer({ min: 2, max: 5 }), // Logouts per cycle
          async (tokens, logoutsPerCycle) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Multiple login-logout cycles
            for (const token of tokens) {
              await manager.login({ token });
              
              // Multiple logouts
              for (let i = 0; i < logoutsPerCycle; i++) {
                manager.logout();
              }
              
              // Property: After each cycle, should be fully cleared
              expect(manager.isAuthenticated()).toBe(false);
              expect(manager.getHeaders()).toEqual({});
              expect(storageStrategy.load('uigen_auth')).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with interleaved operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim() !== ''),
          async (token) => {
            const authStrategy = new BearerStrategy();
            const storageStrategy = new SessionStorageStrategy();
            const manager = new AuthManager(authStrategy, storageStrategy);
            
            // Login
            await manager.login({ token });
            
            // Logout multiple times with interleaved checks
            manager.logout();
            expect(manager.isAuthenticated()).toBe(false);
            
            manager.logout();
            expect(manager.isAuthenticated()).toBe(false);
            
            manager.logout();
            expect(manager.isAuthenticated()).toBe(false);
            
            // Property: Final state should be cleared
            expect(manager.getHeaders()).toEqual({});
            expect(storageStrategy.load('uigen_auth')).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
