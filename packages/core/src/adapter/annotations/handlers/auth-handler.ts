import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { OAuthProvider } from '../../../ir/types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'info';
  parameterSchema: {
    type: 'object';
    properties: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * OAuth provider configuration from OpenAPI spec
 */
export interface OAuthProviderConfig {
  provider: 'google' | 'github' | 'facebook' | 'microsoft';
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  enabled?: boolean;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  refreshTokenEndpoint?: string;
}

/**
 * Auth annotation value structure
 */
export interface AuthAnnotation {
  providers: OAuthProviderConfig[];
}

/**
 * Validation error structure
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Provider metadata for defaults
 */
interface ProviderDefaults {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  defaultScopes: string[];
}

const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    defaultScopes: ['openid', 'email', 'profile']
  },
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    defaultScopes: ['read:user', 'user:email']
  },
  facebook: {
    authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    defaultScopes: ['email', 'public_profile']
  },
  microsoft: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    defaultScopes: ['openid', 'email', 'profile']
  }
};

const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'microsoft'];
const MAX_PROVIDERS = 10;
const HTTPS_URL_PATTERN = /^https:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;
const HTTP_OR_HTTPS_URL_PATTERN = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;

/**
 * Handler for x-uigen-auth annotation.
 * Configures OAuth 2.0 providers for social login authentication.
 * 
 * Applied at the document level (info object) to configure OAuth providers
 * that will be available throughout the application.
 * 
 * Requirements: 1.1-1.9, 2.1-2.9, 8.2-8.9, 11.1-11.17, 14.4-14.15
 */
export class AuthHandler implements AnnotationHandler<AuthAnnotation> {
  public readonly name = 'x-uigen-auth';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-auth',
    description: 'Configures OAuth 2.0 providers for social login authentication at the document level',
    targetType: 'info',
    parameterSchema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          description: 'Array of OAuth provider configurations',
          items: {
            type: 'object',
            properties: {
              provider: {
                type: 'enum',
                enum: ['google', 'github', 'facebook', 'microsoft'],
                description: 'OAuth provider identifier'
              },
              clientId: {
                type: 'string',
                description: 'OAuth client ID from provider console'
              },
              redirectUri: {
                type: 'string',
                description: 'Redirect URI for OAuth callback'
              },
              scopes: {
                type: 'array',
                description: 'OAuth scopes to request (optional, uses provider defaults if omitted)',
                items: { type: 'string' }
              },
              enabled: {
                type: 'boolean',
                description: 'Whether this provider is enabled (defaults to true)'
              },
              authorizationUrl: {
                type: 'string',
                description: 'Custom authorization endpoint URL (optional)'
              },
              tokenUrl: {
                type: 'string',
                description: 'Custom token endpoint URL (optional)'
              },
              userInfoUrl: {
                type: 'string',
                description: 'Custom user info endpoint URL (optional)'
              },
              refreshTokenEndpoint: {
                type: 'string',
                description: 'Custom refresh token endpoint URL (optional)'
              }
            }
          }
        }
      },
      required: ['providers']
    },
    examples: [
      {
        description: 'Google OAuth configuration',
        value: {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile']
            }
          ]
        }
      },
      {
        description: 'Multiple OAuth providers',
        value: {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback'
            },
            {
              provider: 'github',
              clientId: '${GITHUB_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback'
            }
          ]
        }
      }
    ]
  };
  
  /**
   * Extract the x-uigen-auth annotation value from the OpenAPI info object.
   * Only accepts objects with a providers array.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The AuthAnnotation object or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): AuthAnnotation | undefined {
    const element = context.element as any;
    
    // x-uigen-auth is in the info object, not at document root
    const info = element.info;
    if (!info || typeof info !== 'object') {
      return undefined;
    }
    
    const annotation = info['x-uigen-auth'];
    
    // Must be an object
    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      return undefined;
    }
    
    // Must have providers field
    if (!annotation.providers) {
      return undefined;
    }
    
    // Providers must be an array
    if (!Array.isArray(annotation.providers)) {
      return undefined;
    }
    
    return {
      providers: annotation.providers
    };
  }
  
  /**
   * Validate the extracted annotation value.
   * Validates provider configurations and returns detailed error messages.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: AuthAnnotation): boolean {
    const errors: ValidationError[] = [];
    
    // Validate providers array is not empty
    if (!value.providers || value.providers.length === 0) {
      console.warn('x-uigen-auth: At least one provider must be configured');
      return false;
    }
    
    // Validate maximum providers limit
    if (value.providers.length > MAX_PROVIDERS) {
      console.warn(`x-uigen-auth: Maximum ${MAX_PROVIDERS} providers allowed, found ${value.providers.length}`);
      return false;
    }
    
    // Validate each provider configuration
    for (let i = 0; i < value.providers.length; i++) {
      const provider = value.providers[i];
      const providerErrors = this.validateProvider(provider, i);
      errors.push(...providerErrors);
    }
    
    // Log all validation errors
    if (errors.length > 0) {
      console.warn('x-uigen-auth validation errors:');
      for (const error of errors) {
        console.warn(`  - ${error.field}: ${error.message}`);
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate a single provider configuration.
   * 
   * @param provider - The provider configuration to validate
   * @param index - The index of the provider in the array (for error messages)
   * @returns Array of validation errors
   */
  private validateProvider(provider: any, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `providers[${index}]`;
    
    // Validate required fields
    if (!provider.provider) {
      errors.push({
        field: `${prefix}.provider`,
        message: 'Provider field is required'
      });
    } else if (!SUPPORTED_PROVIDERS.includes(provider.provider)) {
      errors.push({
        field: `${prefix}.provider`,
        message: `Unsupported provider. Supported providers are: ${SUPPORTED_PROVIDERS.join(', ')}`
      });
    }
    
    if (!provider.clientId) {
      errors.push({
        field: `${prefix}.clientId`,
        message: 'ClientId field is required'
      });
    }
    
    if (!provider.redirectUri) {
      errors.push({
        field: `${prefix}.redirectUri`,
        message: 'RedirectUri field is required'
      });
    } else if (!HTTP_OR_HTTPS_URL_PATTERN.test(provider.redirectUri)) {
      errors.push({
        field: `${prefix}.redirectUri`,
        message: 'RedirectUri must be a valid URL'
      });
    }
    
    // Validate optional custom URLs (must be HTTPS)
    if (provider.authorizationUrl && !HTTPS_URL_PATTERN.test(provider.authorizationUrl)) {
      errors.push({
        field: `${prefix}.authorizationUrl`,
        message: 'Custom authorizationUrl must be a valid HTTPS URL'
      });
    }
    
    if (provider.tokenUrl && !HTTPS_URL_PATTERN.test(provider.tokenUrl)) {
      errors.push({
        field: `${prefix}.tokenUrl`,
        message: 'Custom tokenUrl must be a valid HTTPS URL'
      });
    }
    
    if (provider.userInfoUrl && !HTTPS_URL_PATTERN.test(provider.userInfoUrl)) {
      errors.push({
        field: `${prefix}.userInfoUrl`,
        message: 'Custom userInfoUrl must be a valid HTTPS URL'
      });
    }
    
    if (provider.refreshTokenEndpoint && !HTTPS_URL_PATTERN.test(provider.refreshTokenEndpoint)) {
      errors.push({
        field: `${prefix}.refreshTokenEndpoint`,
        message: 'Custom refreshTokenEndpoint must be a valid HTTPS URL'
      });
    }
    
    // Validate scopes array if present
    if (provider.scopes !== undefined) {
      if (!Array.isArray(provider.scopes)) {
        errors.push({
          field: `${prefix}.scopes`,
          message: 'Scopes must be an array'
        });
      } else {
        for (let j = 0; j < provider.scopes.length; j++) {
          const scope = provider.scopes[j];
          if (typeof scope !== 'string' || scope.trim() === '') {
            errors.push({
              field: `${prefix}.scopes[${j}]`,
              message: 'Each scope must be a non-empty string'
            });
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Apply the auth annotation by storing OAuth providers in the IR's AuthConfig.
   * Filters out disabled providers and applies default values.
   * 
   * @param value - The validated annotation value
   * @param context - The annotation context
   */
  apply(value: AuthAnnotation, context: AnnotationContext): void {
    // Initialize oauthProviders array if not present
    if (!context.ir.auth.oauthProviders) {
      context.ir.auth.oauthProviders = [];
    }
    
    // Process each provider configuration
    for (const providerConfig of value.providers) {
      // Skip disabled providers
      if (providerConfig.enabled === false) {
        continue;
      }
      
      // Get provider defaults
      const defaults = PROVIDER_DEFAULTS[providerConfig.provider];
      if (!defaults) {
        console.warn(`x-uigen-auth: Unknown provider ${providerConfig.provider}, skipping`);
        continue;
      }
      
      // Build OAuthProvider with defaults applied
      const oauthProvider: OAuthProvider = {
        provider: providerConfig.provider,
        clientId: providerConfig.clientId,
        redirectUri: providerConfig.redirectUri,
        scopes: providerConfig.scopes || defaults.defaultScopes,
        enabled: providerConfig.enabled === undefined ? true : providerConfig.enabled,
        authorizationUrl: providerConfig.authorizationUrl || defaults.authorizationUrl,
        tokenUrl: providerConfig.tokenUrl || defaults.tokenUrl,
        userInfoUrl: providerConfig.userInfoUrl || defaults.userInfoUrl,
        refreshTokenEndpoint: providerConfig.refreshTokenEndpoint
      };
      
      // Add to IR
      context.ir.auth.oauthProviders.push(oauthProvider);
    }
  }
}
