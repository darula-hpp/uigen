import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CredentialStrategy } from '../CredentialStrategy';
import { BearerStrategy } from '../BearerStrategy';

describe('CredentialStrategy - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 4: Bearer Strategy Delegation Consistency
   * 
   * **Feature: credential-based-auth-strategy, Property 4**
   * 
   * For any authenticated Credential_Auth_Strategy state, calling getHeaders 
   * SHALL return the same result as calling getHeaders on the internal 
   * Bearer_Strategy, and calling isAuthenticated SHALL return the same result 
   * as calling isAuthenticated on the internal Bearer_Strategy.
   * 
   * **Validates: Requirements 6.3, 6.4**
   */
  it('Property 4: delegates getHeaders and isAuthenticated to bearer strategy', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // token
        fc.string({ minLength: 5 }), // username
        fc.string({ minLength: 5 }), // password
        async (token, username, password) => {
          // Mock fetch to return token
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token }),
            text: async () => JSON.stringify({ token })
          });

          const credStrategy = new CredentialStrategy();
          const bearerStrategy = new BearerStrategy();

          // Authenticate both strategies with same token
          await credStrategy.authenticate({
            username,
            password,
            loginEndpoint: 'http://api.test/login'
          });
          await bearerStrategy.authenticate({ token });

          // Verify delegation consistency
          expect(credStrategy.getHeaders()).toEqual(bearerStrategy.getHeaders());
          expect(credStrategy.isAuthenticated()).toBe(bearerStrategy.isAuthenticated());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Credential Strategy Serialization Round-Trip
   * 
   * **Feature: credential-based-auth-strategy, Property 5**
   * 
   * For any valid Credential_Auth_Strategy state (authenticated with token, 
   * loginEndpoint, tokenPath, and optional refreshToken), serializing then 
   * deserializing into a new Credential_Auth_Strategy instance SHALL produce 
   * an equivalent state with the same authentication status, headers, and 
   * configuration.
   * 
   * **Validates: Requirements 4.5, 4.7, 6.5, 6.6, 10.1, 10.2, 14.1, 14.2**
   */
  it('Property 5: serialization round-trip preserves state', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // token
        fc.string({ minLength: 5 }), // username
        fc.string({ minLength: 5 }), // password
        fc.string({ minLength: 5 }), // loginEndpoint
        fc.oneof(
          fc.constant('token'),
          fc.constant('accessToken'),
          fc.constant('data.token')
        ), // tokenPath
        fc.option(fc.string({ minLength: 10 })), // refreshToken
        async (token, username, password, loginEndpoint, tokenPath, refreshToken) => {
          // Mock fetch to return token and optional refresh token
          const responseBody: any = { [tokenPath.includes('.') ? 'data' : tokenPath]: token };
          if (tokenPath.includes('.')) {
            const [parent, child] = tokenPath.split('.');
            responseBody[parent] = { [child]: token };
          }
          if (refreshToken) {
            responseBody.refreshToken = refreshToken;
          }

          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => responseBody,
            text: async () => JSON.stringify(responseBody)
          });

          const strategy1 = new CredentialStrategy();
          await strategy1.authenticate({
            username,
            password,
            loginEndpoint: `http://api.test/${loginEndpoint}`,
            tokenPath
          });

          // Serialize and deserialize
          const serialized = strategy1.serialize();
          const strategy2 = new CredentialStrategy();
          strategy2.deserialize(serialized);

          // Verify equivalent state
          expect(strategy2.isAuthenticated()).toBe(strategy1.isAuthenticated());
          expect(strategy2.getHeaders()).toEqual(strategy1.getHeaders());
          expect(strategy2.serialize()).toEqual(serialized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Empty Credential Rejection
   * 
   * **Feature: credential-based-auth-strategy, Property 10**
   * 
   * For any string composed entirely of whitespace (or empty string), when 
   * used as username or password in Credential_Auth_Strategy.authenticate, 
   * the strategy SHALL return an error without making an API call.
   * 
   * **Validates: Requirements 4.6, 15.1, 15.2**
   */
  it('Property 10: rejects empty or whitespace-only credentials', () => {
    fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^\s*$/), // whitespace-only string
        fc.string({ minLength: 1 }), // valid string
        async (emptyString, validString) => {
          const fetchSpy = vi.fn();
          global.fetch = fetchSpy;

          const strategy = new CredentialStrategy();

          // Test empty username
          const result1 = await strategy.authenticate({
            username: emptyString,
            password: validString,
            loginEndpoint: 'http://api.test/login'
          });
          expect(result1.success).toBe(false);
          expect(result1.error).toContain('Username');
          expect(fetchSpy).not.toHaveBeenCalled();

          fetchSpy.mockClear();

          // Test empty password
          const result2 = await strategy.authenticate({
            username: validString,
            password: emptyString,
            loginEndpoint: 'http://api.test/login'
          });
          expect(result2.success).toBe(false);
          expect(result2.error).toContain('Password');
          expect(fetchSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Clear Operation Completeness
   * 
   * **Feature: credential-based-auth-strategy, Property 12**
   * 
   * For any authenticated Credential_Auth_Strategy state, calling clear SHALL 
   * result in isAuthenticated returning false, getHeaders returning an empty 
   * object, and all internal state (token, loginEndpoint, refreshToken) being 
   * cleared.
   * 
   * **Validates: Requirements 6.7**
   */
  it('Property 12: clear removes all authentication state', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // token
        fc.string({ minLength: 5 }), // username
        fc.string({ minLength: 5 }), // password
        async (token, username, password) => {
          // Mock fetch to return token
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token }),
            text: async () => JSON.stringify({ token })
          });

          const strategy = new CredentialStrategy();
          await strategy.authenticate({
            username,
            password,
            loginEndpoint: 'http://api.test/login'
          });

          // Verify authenticated before clear
          expect(strategy.isAuthenticated()).toBe(true);

          // Clear and verify state is reset
          strategy.clear();
          expect(strategy.isAuthenticated()).toBe(false);
          expect(strategy.getHeaders()).toEqual({});
          
          // Verify serialized state shows cleared state
          const serialized = strategy.serialize();
          expect(serialized.token).toBe('');
          expect(serialized.loginEndpoint).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Login Endpoint Validation
   * 
   * **Feature: credential-based-auth-strategy, Property 13**
   * 
   * For any call to Credential_Auth_Strategy.authenticate with an empty, null, 
   * or whitespace-only loginEndpoint parameter, the strategy SHALL return an 
   * error without making an API call.
   * 
   * **Validates: Requirements 15.1, 15.2**
   */
  it('Property 13: validates login endpoint before making API call', () => {
    fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^\s*$/), // whitespace-only string
        fc.string({ minLength: 5 }), // username
        fc.string({ minLength: 5 }), // password
        async (emptyEndpoint, username, password) => {
          const fetchSpy = vi.fn();
          global.fetch = fetchSpy;

          const strategy = new CredentialStrategy();

          const result = await strategy.authenticate({
            username,
            password,
            loginEndpoint: emptyEndpoint
          });

          expect(result.success).toBe(false);
          expect(result.error).toContain('endpoint');
          expect(fetchSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Bearer Strategy State Restoration
   * 
   * **Feature: credential-based-auth-strategy, Property 14**
   * 
   * For any valid bearer token, after authenticating a Credential_Auth_Strategy 
   * with that token and then deserializing the serialized state into a new 
   * instance, the new instance's internal Bearer_Strategy SHALL have the same 
   * authentication state as the original.
   * 
   * **Validates: Requirements 6.6, 10.4**
   */
  it('Property 14: deserialize restores bearer strategy state', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // token
        fc.string({ minLength: 5 }), // username
        fc.string({ minLength: 5 }), // password
        async (token, username, password) => {
          // Mock fetch to return token
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token }),
            text: async () => JSON.stringify({ token })
          });

          const strategy1 = new CredentialStrategy();
          await strategy1.authenticate({
            username,
            password,
            loginEndpoint: 'http://api.test/login'
          });

          // Serialize and deserialize
          const serialized = strategy1.serialize();
          const strategy2 = new CredentialStrategy();
          strategy2.deserialize(serialized);

          // Verify bearer strategy state is restored
          expect(strategy2.isAuthenticated()).toBe(true);
          expect(strategy2.getHeaders()).toEqual(strategy1.getHeaders());
          
          // Verify the token is the same
          const headers1 = strategy1.getHeaders();
          const headers2 = strategy2.getHeaders();
          expect(headers1['x-uigen-auth']).toBe(headers2['x-uigen-auth']);
        }
      ),
      { numRuns: 100 }
    );
  });
});
