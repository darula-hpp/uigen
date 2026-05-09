import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthHandler } from '../auth-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp } from '../../../../ir/types.js';

describe('AuthHandler', () => {
  let handler: AuthHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new AuthHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      resources: [],
      parsingErrors: [],
      auth: {
        schemes: [],
        globalRequired: false
      }
    } as UIGenApp;
  });
  
  describe('name', () => {
    it('should have the correct annotation name', () => {
      expect(handler.name).toBe('x-uigen-auth');
    });
  });
  
  describe('extract - Task 3.2: Provider configuration extraction', () => {
    it('should extract valid OAuth provider configuration from info object', () => {
      const element = {
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            }
          ]
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers).toHaveLength(1);
      expect(result?.providers[0]).toEqual({
        provider: 'google',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/auth/callback'
      });
    });
    
    it('should extract multiple OAuth providers', () => {
      const element = {
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            },
            {
              provider: 'github',
              clientId: 'github-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            }
          ]
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers).toHaveLength(2);
      expect(result?.providers[0].provider).toBe('google');
      expect(result?.providers[1].provider).toBe('github');
    });
    
    it('should extract provider with optional scopes', () => {
      const element = {
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile']
            }
          ]
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers[0].scopes).toEqual(['openid', 'email', 'profile']);
    });
    
    it('should extract provider with enabled flag', () => {
      const element = {
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              enabled: false
            }
          ]
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers[0].enabled).toBe(false);
    });
    
    it('should extract provider with custom URLs', () => {
      const element = {
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              authorizationUrl: 'https://custom.auth.com/authorize',
              tokenUrl: 'https://custom.auth.com/token',
              userInfoUrl: 'https://custom.auth.com/userinfo'
            }
          ]
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers[0].authorizationUrl).toBe('https://custom.auth.com/authorize');
      expect(result?.providers[0].tokenUrl).toBe('https://custom.auth.com/token');
      expect(result?.providers[0].userInfoUrl).toBe('https://custom.auth.com/userinfo');
    });
    
    it('should return undefined when annotation is missing', () => {
      const element = {};
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when annotation is not an object', () => {
      const element = {
        'x-uigen-auth': 'invalid'
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when annotation is null', () => {
      const element = {
        'x-uigen-auth': null
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when annotation is an array', () => {
      const element = {
        'x-uigen-auth': []
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when providers field is missing', () => {
      const element = {
        'x-uigen-auth': {
          someOtherField: 'value'
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when providers is not an array', () => {
      const element = {
        'x-uigen-auth': {
          providers: 'not-an-array'
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeUndefined();
    });
    
    it('should extract empty providers array', () => {
      const element = {
        'x-uigen-auth': {
          providers: []
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      
      expect(result).toBeDefined();
      expect(result?.providers).toEqual([]);
    });
  });
  
  describe('validate', () => {
    it('should validate a valid provider configuration', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(true);
    });
    
    it('should reject empty providers array', () => {
      const value = {
        providers: []
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject configuration with more than 10 providers', () => {
      const providers = Array.from({ length: 11 }, (_, i) => ({
        provider: 'google' as const,
        clientId: `client-${i}`,
        redirectUri: 'http://localhost:3000/auth/callback'
      }));
      
      const value = { providers };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject provider without provider field', () => {
      const value = {
        providers: [
          {
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          } as any
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject provider without clientId field', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            redirectUri: 'http://localhost:3000/auth/callback'
          } as any
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject provider without redirectUri field', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id'
          } as any
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject unsupported provider', () => {
      const value = {
        providers: [
          {
            provider: 'unsupported',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          } as any
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject invalid redirectUri format', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'not-a-valid-url'
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should accept valid HTTPS redirectUri', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'https://example.com/auth/callback'
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(true);
    });
    
    it('should reject non-HTTPS custom authorizationUrl', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            authorizationUrl: 'http://custom.auth.com/authorize'
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should accept HTTPS custom authorizationUrl', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            authorizationUrl: 'https://custom.auth.com/authorize'
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(true);
    });
    
    it('should reject non-array scopes', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: 'not-an-array'
          } as any
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should reject empty string in scopes array', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['openid', '', 'profile']
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(false);
    });
    
    it('should accept valid scopes array', () => {
      const value = {
        providers: [
          {
            provider: 'google',
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['openid', 'email', 'profile']
          }
        ]
      };
      
      const result = handler.validate(value);
      
      expect(result).toBe(true);
    });
    
    it('should validate all supported providers', () => {
      const providers = ['google', 'github', 'facebook', 'microsoft'];
      
      for (const provider of providers) {
        const value = {
          providers: [
            {
              provider: provider as any,
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            }
          ]
        };
        
        const result = handler.validate(value);
        expect(result).toBe(true);
      }
    });
  });
  
  describe('apply', () => {
    it('should add OAuth providers to IR', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders).toBeDefined();
      expect(mockIR.auth.oauthProviders).toHaveLength(1);
      expect(mockIR.auth.oauthProviders![0].provider).toBe('google');
      expect(mockIR.auth.oauthProviders![0].clientId).toBe('test-client-id');
    });
    
    it('should apply default scopes when not provided', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].scopes).toEqual(['openid', 'email', 'profile']);
    });
    
    it('should apply default URLs when not provided', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].authorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(mockIR.auth.oauthProviders![0].tokenUrl).toBe('https://oauth2.googleapis.com/token');
      expect(mockIR.auth.oauthProviders![0].userInfoUrl).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
    });
    
    it('should use custom scopes when provided', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['custom-scope-1', 'custom-scope-2']
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].scopes).toEqual(['custom-scope-1', 'custom-scope-2']);
    });
    
    it('should use custom URLs when provided', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            authorizationUrl: 'https://custom.auth.com/authorize',
            tokenUrl: 'https://custom.auth.com/token',
            userInfoUrl: 'https://custom.auth.com/userinfo'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].authorizationUrl).toBe('https://custom.auth.com/authorize');
      expect(mockIR.auth.oauthProviders![0].tokenUrl).toBe('https://custom.auth.com/token');
      expect(mockIR.auth.oauthProviders![0].userInfoUrl).toBe('https://custom.auth.com/userinfo');
    });
    
    it('should skip disabled providers', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            enabled: false
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders).toEqual([]);
    });
    
    it('should set enabled to true by default', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'test-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].enabled).toBe(true);
    });
    
    it('should handle multiple providers', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          },
          {
            provider: 'github' as const,
            clientId: 'github-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders).toHaveLength(2);
      expect(mockIR.auth.oauthProviders![0].provider).toBe('google');
      expect(mockIR.auth.oauthProviders![1].provider).toBe('github');
    });
    
    it('should apply different default scopes for different providers', () => {
      const value = {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          },
          {
            provider: 'github' as const,
            clientId: 'github-client-id',
            redirectUri: 'http://localhost:3000/auth/callback'
          }
        ]
      };
      
      const context: AnnotationContext = {
        element: {},
        path: '',
        method: '',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(value, context);
      
      expect(mockIR.auth.oauthProviders![0].scopes).toEqual(['openid', 'email', 'profile']);
      expect(mockIR.auth.oauthProviders![1].scopes).toEqual(['read:user', 'user:email']);
    });
  });
});
