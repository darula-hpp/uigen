import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { AuthHandler } from '../auth-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp } from '../../../../ir/types.js';
import type { AuthAnnotation, OAuthProviderConfig } from '../auth-handler.js';

// Helper function to create mock context
function makeContext(element: any): AnnotationContext {
  const mockUtils: AdapterUtils = {
    humanize: vi.fn((str: string) => str),
    resolveRef: vi.fn(),
    logError: vi.fn(),
    logWarning: vi.fn()
  };
  
  const mockIR: UIGenApp = {
    meta: { title: 'Test', version: '1.0.0' },
    resources: [],
    auth: { schemes: [], globalRequired: false },
    dashboard: { enabled: true, widgets: [] },
    servers: [],
    parsingErrors: []
  } as UIGenApp;

  return {
    element,
    path: '',
    method: undefined,
    utils: mockUtils,
    ir: mockIR
  };
}

// Arbitraries for generating test data
const validProvider = fc.constantFrom('google', 'github', 'facebook', 'microsoft');
const nonEmptyString = fc.constantFrom('test-client-id', 'my-app-id', 'oauth-client-123');
const validHttpUrl = fc.constantFrom(
  'http://localhost:3000/auth/callback',
  'http://localhost:8080/callback',
  'https://example.com/auth/callback',
  'https://app.example.com:8443/oauth/callback'
);
const validHttpsUrl = fc.constantFrom(
  'https://example.com/authorize',
  'https://auth.example.com/token',
  'https://api.example.com:8443/userinfo'
);
const validScope = fc.constantFrom('openid', 'email', 'profile', 'read:user', 'user:email');

// Arbitrary for valid OAuth provider configuration
const validProviderConfig = fc.record({
  provider: validProvider,
  clientId: nonEmptyString,
  redirectUri: validHttpUrl,
  scopes: fc.option(fc.array(validScope, { minLength: 1, maxLength: 3 }), { nil: undefined }),
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  authorizationUrl: fc.option(validHttpsUrl, { nil: undefined }),
  tokenUrl: fc.option(validHttpsUrl, { nil: undefined }),
  userInfoUrl: fc.option(validHttpsUrl, { nil: undefined }),
  refreshTokenEndpoint: fc.option(validHttpsUrl, { nil: undefined })
}) as fc.Arbitrary<OAuthProviderConfig>;

describe('AuthHandler - Property-Based Tests', () => {
  const handler = new AuthHandler();

  // Property 1: Valid configuration acceptance
  it('Property 1: Valid configuration acceptance', () => {
    /**
     * **Validates: Requirements 1.2-1.7, 2.1-2.9, 8.9, 11.3-11.17**
     * 
     * For any valid OAuth provider configuration with all required fields present and valid,
     * the AuthHandler SHALL successfully extract, validate, and apply the configuration
     * without errors.
     */
    fc.assert(
      fc.property(
        fc.array(validProviderConfig, { minLength: 1, maxLength: 10 }),
        (providers) => {
          const element = {
            'x-uigen-auth': {
              providers
            }
          };
          
          const context = makeContext(element);
          
          // Extract the annotation
          const extracted = handler.extract(context);
          
          // Validate the extracted annotation
          const isValid = handler.validate(extracted!);
          
          // Apply the annotation
          handler.apply(extracted!, context);
          
          // Assertions
          expect(extracted).toBeDefined();
          expect(extracted!.providers).toHaveLength(providers.length);
          expect(isValid).toBe(true);
          expect(context.ir.auth.oauthProviders).toBeDefined();
          
          // Verify enabled providers are in IR (disabled ones are filtered out)
          const enabledProviders = providers.filter(p => p.enabled !== false);
          expect(context.ir.auth.oauthProviders!.length).toBe(enabledProviders.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Required field validation
  it('Property 2: Required field validation', () => {
    /**
     * **Validates: Requirements 1.2-1.4, 2.2-2.4**
     * 
     * For any provider configuration missing one or more required fields (provider, clientId, redirectUri),
     * the AuthHandler SHALL reject the configuration during validation and return false.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('provider', 'clientId', 'redirectUri'),
        (missingField) => {
          // Create a config with the specified field explicitly set to undefined
          const config: any = {};
          
          if (missingField !== 'provider') {
            config.provider = 'google';
          }
          if (missingField !== 'clientId') {
            config.clientId = 'test-client-id';
          }
          if (missingField !== 'redirectUri') {
            config.redirectUri = 'http://localhost:3000/auth/callback';
          }
          
          const value: AuthAnnotation = {
            providers: [config]
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Assertions
          expect(isValid).toBe(false);
          expect(consoleWarnSpy).toHaveBeenCalled();
          
          // Cleanup
          consoleWarnSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: URL format validation
  it('Property 3: URL format validation', () => {
    /**
     * **Validates: Requirements 2.6, 11.12-11.16**
     * 
     * For any provider configuration with invalid URL formats in redirectUri or custom URLs,
     * the AuthHandler SHALL reject the configuration during validation.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('not-a-url', 'ftp://example.com', 'javascript:alert(1)', '//example.com', 'example.com'),
        (invalidUrl) => {
          const value: AuthAnnotation = {
            providers: [
              {
                provider: 'google',
                clientId: 'test-client-id',
                redirectUri: invalidUrl
              }
            ]
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Cleanup
          consoleWarnSpy.mockRestore();
          
          // Assertions
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 4: Scope array preservation
  it('Property 4: Scope array preservation', () => {
    /**
     * **Validates: Requirements 8.1, 8.9, 11.6**
     * 
     * For any valid provider configuration with a scopes array, the AuthHandler SHALL
     * preserve the exact scopes array when applying the configuration to the IR.
     * When scopes are omitted, default scopes SHALL be applied based on the provider.
     */
    fc.assert(
      fc.property(
        validProvider,
        fc.option(fc.array(validScope, { minLength: 1, maxLength: 5 }), { nil: undefined }),
        (provider, scopes) => {
          const config: OAuthProviderConfig = {
            provider,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes
          };
          
          const value: AuthAnnotation = {
            providers: [config]
          };
          
          const context = makeContext({});
          
          // Apply the configuration
          handler.apply(value, context);
          
          // Assertions
          expect(context.ir.auth.oauthProviders).toBeDefined();
          expect(context.ir.auth.oauthProviders!.length).toBe(1);
          
          const appliedProvider = context.ir.auth.oauthProviders![0];
          
          if (scopes !== undefined) {
            // Custom scopes should be preserved exactly
            expect(appliedProvider.scopes).toEqual(scopes);
          } else {
            // Default scopes should be applied
            expect(appliedProvider.scopes).toBeDefined();
            expect(Array.isArray(appliedProvider.scopes)).toBe(true);
            expect(appliedProvider.scopes.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 5: Round-trip preservation
  it('Property 5: Round-trip preservation', () => {
    /**
     * **Validates: Requirements 1.1, 1.8, 11.1-11.17**
     * 
     * For any valid provider configuration, extracting from an element and then applying
     * to the IR SHALL preserve all configuration data (with defaults applied where appropriate).
     */
    fc.assert(
      fc.property(
        validProviderConfig,
        (providerConfig) => {
          const element = {
            'x-uigen-auth': {
              providers: [providerConfig]
            }
          };
          
          const context = makeContext(element);
          
          // Extract
          const extracted = handler.extract(context);
          
          // Validate
          const isValid = handler.validate(extracted!);
          
          // Apply
          if (isValid) {
            handler.apply(extracted!, context);
          }
          
          // Assertions
          expect(extracted).toBeDefined();
          expect(isValid).toBe(true);
          
          if (providerConfig.enabled !== false) {
            expect(context.ir.auth.oauthProviders).toBeDefined();
            expect(context.ir.auth.oauthProviders!.length).toBe(1);
            
            const appliedProvider = context.ir.auth.oauthProviders![0];
            
            // Verify core fields are preserved
            expect(appliedProvider.provider).toBe(providerConfig.provider);
            expect(appliedProvider.clientId).toBe(providerConfig.clientId);
            expect(appliedProvider.redirectUri).toBe(providerConfig.redirectUri);
            
            // Verify optional fields are preserved or defaults applied
            if (providerConfig.scopes !== undefined) {
              expect(appliedProvider.scopes).toEqual(providerConfig.scopes);
            } else {
              expect(appliedProvider.scopes).toBeDefined();
            }
            
            if (providerConfig.authorizationUrl !== undefined) {
              expect(appliedProvider.authorizationUrl).toBe(providerConfig.authorizationUrl);
            } else {
              expect(appliedProvider.authorizationUrl).toBeDefined();
            }
            
            if (providerConfig.tokenUrl !== undefined) {
              expect(appliedProvider.tokenUrl).toBe(providerConfig.tokenUrl);
            } else {
              expect(appliedProvider.tokenUrl).toBeDefined();
            }
            
            if (providerConfig.userInfoUrl !== undefined) {
              expect(appliedProvider.userInfoUrl).toBe(providerConfig.userInfoUrl);
            } else {
              expect(appliedProvider.userInfoUrl).toBeDefined();
            }
          } else {
            // Disabled providers should be filtered out
            expect(context.ir.auth.oauthProviders!.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional Property: Extraction type safety
  it('Property 6: Extraction type safety', () => {
    /**
     * **Validates: Requirements 1.1, 11.10**
     * 
     * For any non-object value or object without providers array, the AuthHandler SHALL
     * return undefined during extraction without throwing errors.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.anything()),
          fc.record({ notProviders: fc.anything() })
        ),
        (value) => {
          const element = {
            'x-uigen-auth': value
          };
          
          const context = makeContext(element);
          
          // Extract should return undefined for invalid types
          const extracted = handler.extract(context);
          
          // Assertions
          expect(extracted).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional Property: Provider limit enforcement
  it('Property 7: Provider limit enforcement', () => {
    /**
     * **Validates: Requirements 1.7, 11.17**
     * 
     * For any configuration with more than 10 providers, the AuthHandler SHALL
     * reject the configuration during validation.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 15 }),
        (numProviders) => {
          const providers = Array.from({ length: numProviders }, () => ({
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }));
          
          const value: AuthAnnotation = {
            providers
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Assertions
          expect(isValid).toBe(false);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Maximum 10 providers allowed')
          );
          
          // Cleanup
          consoleWarnSpy.mockRestore();
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional Property: Unsupported provider rejection
  it('Property 8: Unsupported provider rejection', () => {
    /**
     * **Validates: Requirements 1.5, 1.6, 2.5**
     * 
     * For any provider value that is not in the supported list (google, github, facebook, microsoft),
     * the AuthHandler SHALL reject the configuration during validation.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('twitter', 'linkedin', 'apple', 'amazon', 'unsupported'),
        (unsupportedProvider) => {
          const value: AuthAnnotation = {
            providers: [
              {
                provider: unsupportedProvider as any,
                clientId: 'test-client-id',
                redirectUri: 'http://localhost:3000/auth/callback'
              }
            ]
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Cleanup
          consoleWarnSpy.mockRestore();
          
          // Assertions
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional Property: Empty scopes validation
  it('Property 9: Empty scopes validation', () => {
    /**
     * **Validates: Requirements 8.9, 11.6**
     * 
     * For any provider configuration with scopes array containing empty strings,
     * the AuthHandler SHALL reject the configuration during validation.
     */
    fc.assert(
      fc.property(
        fc.constantFrom(
          ['openid', '', 'profile'],
          ['', 'email'],
          ['openid', '  ', 'profile'],
          ['   ']
        ),
        (scopesWithEmpty) => {
          const value: AuthAnnotation = {
            providers: [
              {
                provider: 'google',
                clientId: 'test-client-id',
                redirectUri: 'http://localhost:3000/auth/callback',
                scopes: scopesWithEmpty
              }
            ]
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Cleanup
          consoleWarnSpy.mockRestore();
          
          // Assertions
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional Property: Custom HTTPS URL validation
  it('Property 10: Custom HTTPS URL validation', () => {
    /**
     * **Validates: Requirements 11.12-11.15, 14.13-14.15**
     * 
     * For any custom URL (authorizationUrl, tokenUrl, userInfoUrl, refreshTokenEndpoint)
     * that is not HTTPS, the AuthHandler SHALL reject the configuration during validation.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('authorizationUrl', 'tokenUrl', 'userInfoUrl', 'refreshTokenEndpoint'),
        fc.constantFrom('http://example.com/auth', 'http://api.example.com/token'),
        (urlField, httpUrl) => {
          const config: any = {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            [urlField]: httpUrl
          };
          
          const value: AuthAnnotation = {
            providers: [config]
          };
          
          // Spy on console.warn to suppress output
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate should fail
          const isValid = handler.validate(value);
          
          // Cleanup
          consoleWarnSpy.mockRestore();
          
          // Assertions
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional Property: Exception safety
  it('Property 11: Exception safety', () => {
    /**
     * For any arbitrary input, the AuthHandler SHALL not throw exceptions during
     * extract, validate, or apply operations.
     */
    fc.assert(
      fc.property(
        fc.anything(),
        (value) => {
          expect(() => {
            const element = { 'x-uigen-auth': value };
            const context = makeContext(element);
            
            const extracted = handler.extract(context);
            
            if (extracted) {
              const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
              const isValid = handler.validate(extracted);
              consoleWarnSpy.mockRestore();
              
              if (isValid) {
                handler.apply(extracted, context);
              }
            }
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
