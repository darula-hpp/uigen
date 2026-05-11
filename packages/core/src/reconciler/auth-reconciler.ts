/**
 * Auth Reconciler
 * 
 * Handles bidirectional synchronization of OAuth provider configurations
 * between config.yaml and OpenAPI spec x-uigen-auth annotations.
 * 
 * Reconciliation Rules:
 * 1. config.yaml is the source of truth when both sources define providers
 * 2. New providers in config.yaml are added to OpenAPI spec
 * 3. Providers removed from config.yaml are removed from OpenAPI spec
 * 4. Providers with enabled: false in config.yaml are disabled in OpenAPI spec
 * 5. Provider order from config.yaml is preserved in OpenAPI spec
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from './types.js';

/**
 * Configuration file structure for auth section
 */
export interface AuthConfigFile {
  auth?: {
    providers?: OAuthProviderConfig[];
  };
}

/**
 * OAuth provider configuration from config.yaml
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
 * Result of reconciliation operation
 */
export interface ReconcileResult {
  /** Updated OpenAPI spec with reconciled auth configuration */
  spec: OpenAPIV3.Document | Swagger2Document;
  
  /** Updated config with reconciled auth configuration */
  config: AuthConfigFile;
  
  /** Number of providers reconciled */
  reconciledProviders: number;
  
  /** Validation errors encountered during reconciliation */
  errors: string[];
}

/**
 * Auth Reconciler
 * 
 * Manages bidirectional sync of OAuth provider configurations.
 */
export class AuthReconciler {
  /**
   * Reconcile OAuth providers between OpenAPI spec and config.yaml
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param config - The config file with auth section
   * @returns Reconciliation result with updated spec and config
   */
  reconcile(
    spec: OpenAPIV3.Document | Swagger2Document,
    config: AuthConfigFile
  ): ReconcileResult {
    const errors: string[] = [];
    
    // Extract providers from both sources
    const specProviders = this.extractProvidersFromSpec(spec);
    const configProviders = config.auth?.providers || [];
    
    // Validate config providers
    const validationErrors = this.validateProviders(configProviders);
    errors.push(...validationErrors);
    
    // Merge providers with config as source of truth
    const mergedProviders = this.mergeProviders(specProviders, configProviders);
    
    // Create updated spec and config
    const updatedSpec = this.syncToSpec(mergedProviders, spec);
    const updatedConfig = this.syncToConfig(mergedProviders, config);
    
    return {
      spec: updatedSpec,
      config: updatedConfig,
      reconciledProviders: mergedProviders.length,
      errors,
    };
  }
  
  /**
   * Extract OAuth providers from OpenAPI spec x-uigen-auth annotation
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @returns Array of OAuth provider configurations
   */
  private extractProvidersFromSpec(
    spec: OpenAPIV3.Document | Swagger2Document
  ): OAuthProviderConfig[] {
    const info = spec.info as Record<string, unknown>;
    const authAnnotation = info['x-uigen-auth'] as { providers?: OAuthProviderConfig[] } | undefined;
    
    if (!authAnnotation || !Array.isArray(authAnnotation.providers)) {
      return [];
    }
    
    return authAnnotation.providers;
  }
  
  /**
   * Validate OAuth provider configurations
   * 
   * @param providers - Array of provider configurations to validate
   * @returns Array of validation error messages
   */
  private validateProviders(providers: OAuthProviderConfig[]): string[] {
    const errors: string[] = [];
    const supportedProviders = ['google', 'github', 'facebook', 'microsoft'];
    const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;
    const httpsPattern = /^https:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;
    
    if (providers.length > 10) {
      errors.push('Maximum 10 OAuth providers allowed');
    }
    
    providers.forEach((provider, index) => {
      const prefix = `Provider ${index + 1}`;
      
      // Required fields
      if (!provider.provider) {
        errors.push(`${prefix}: provider field is required`);
      } else if (!supportedProviders.includes(provider.provider)) {
        errors.push(
          `${prefix}: Unsupported provider "${provider.provider}". Supported providers are: ${supportedProviders.join(', ')}`
        );
      }
      
      if (!provider.clientId) {
        errors.push(`${prefix}: clientId field is required`);
      }
      
      if (!provider.redirectUri) {
        errors.push(`${prefix}: redirectUri field is required`);
      } else if (!urlPattern.test(provider.redirectUri)) {
        errors.push(`${prefix}: redirectUri must be a valid URL`);
      }
      
      // Optional URL fields must be HTTPS
      if (provider.authorizationUrl && !httpsPattern.test(provider.authorizationUrl)) {
        errors.push(`${prefix}: authorizationUrl must be a valid HTTPS URL`);
      }
      
      if (provider.tokenUrl && !httpsPattern.test(provider.tokenUrl)) {
        errors.push(`${prefix}: tokenUrl must be a valid HTTPS URL`);
      }
      
      if (provider.userInfoUrl && !httpsPattern.test(provider.userInfoUrl)) {
        errors.push(`${prefix}: userInfoUrl must be a valid HTTPS URL`);
      }
      
      if (provider.refreshTokenEndpoint && !httpsPattern.test(provider.refreshTokenEndpoint)) {
        errors.push(`${prefix}: refreshTokenEndpoint must be a valid HTTPS URL`);
      }
      
      // Scopes validation
      if (provider.scopes && Array.isArray(provider.scopes)) {
        provider.scopes.forEach((scope, scopeIndex) => {
          if (typeof scope !== 'string' || scope.trim() === '') {
            errors.push(`${prefix}: scope ${scopeIndex + 1} must be a non-empty string`);
          }
        });
      }
    });
    
    return errors;
  }
  
  /**
   * Merge providers from spec and config, with config as source of truth
   * 
   * Rules:
   * - Providers in config override providers in spec (by provider name)
   * - Providers only in config are added
   * - Providers only in spec are removed
   * - Providers with enabled: false are filtered out
   * - Provider order from config is preserved
   * 
   * @param _specProviders - Providers from OpenAPI spec (unused, config is source of truth)
   * @param configProviders - Providers from config.yaml
   * @returns Merged array of providers
   */
  mergeProviders(
    _specProviders: OAuthProviderConfig[],
    configProviders: OAuthProviderConfig[]
  ): OAuthProviderConfig[] {
    // If no config providers, return empty array (config is source of truth)
    if (configProviders.length === 0) {
      return [];
    }
    
    // Filter out disabled providers and return config providers
    // (config is source of truth, so we ignore spec providers)
    return configProviders.filter(provider => provider.enabled !== false);
  }
  
  /**
   * Sync merged providers to OpenAPI spec
   * 
   * Updates or creates x-uigen-auth annotation in spec info object
   * 
   * @param providers - Merged provider configurations
   * @param spec - The OpenAPI/Swagger specification
   * @returns Updated specification
   */
  syncToSpec(
    providers: OAuthProviderConfig[],
    spec: OpenAPIV3.Document | Swagger2Document
  ): OpenAPIV3.Document | Swagger2Document {
    // Deep clone to avoid mutation
    const updatedSpec = JSON.parse(JSON.stringify(spec)) as OpenAPIV3.Document | Swagger2Document;
    const info = updatedSpec.info as Record<string, unknown>;
    
    if (providers.length === 0) {
      // Remove x-uigen-auth if no providers
      delete info['x-uigen-auth'];
    } else {
      // Set or update x-uigen-auth annotation
      info['x-uigen-auth'] = {
        providers: providers.map(provider => ({
          provider: provider.provider,
          clientId: provider.clientId,
          redirectUri: provider.redirectUri,
          ...(provider.scopes && { scopes: provider.scopes }),
          ...(provider.enabled !== undefined && { enabled: provider.enabled }),
          ...(provider.authorizationUrl && { authorizationUrl: provider.authorizationUrl }),
          ...(provider.tokenUrl && { tokenUrl: provider.tokenUrl }),
          ...(provider.userInfoUrl && { userInfoUrl: provider.userInfoUrl }),
          ...(provider.refreshTokenEndpoint && { refreshTokenEndpoint: provider.refreshTokenEndpoint }),
        })),
      };
    }
    
    return updatedSpec;
  }
  
  /**
   * Sync merged providers to config.yaml
   * 
   * Updates or creates auth.providers section in config
   * 
   * @param providers - Merged provider configurations
   * @param config - The config file
   * @returns Updated config
   */
  syncToConfig(
    providers: OAuthProviderConfig[],
    config: AuthConfigFile
  ): AuthConfigFile {
    // Deep clone to avoid mutation
    const updatedConfig = JSON.parse(JSON.stringify(config)) as AuthConfigFile;
    
    if (providers.length === 0) {
      // Remove auth.providers if no providers
      if (updatedConfig.auth) {
        delete updatedConfig.auth.providers;
        
        // Remove auth section if empty
        if (Object.keys(updatedConfig.auth).length === 0) {
          delete updatedConfig.auth;
        }
      }
    } else {
      // Ensure auth section exists
      if (!updatedConfig.auth) {
        updatedConfig.auth = {};
      }
      
      // Set providers
      updatedConfig.auth.providers = providers.map(provider => ({
        provider: provider.provider,
        clientId: provider.clientId,
        redirectUri: provider.redirectUri,
        ...(provider.scopes && { scopes: provider.scopes }),
        ...(provider.enabled !== undefined && { enabled: provider.enabled }),
        ...(provider.authorizationUrl && { authorizationUrl: provider.authorizationUrl }),
        ...(provider.tokenUrl && { tokenUrl: provider.tokenUrl }),
        ...(provider.userInfoUrl && { userInfoUrl: provider.userInfoUrl }),
        ...(provider.refreshTokenEndpoint && { refreshTokenEndpoint: provider.refreshTokenEndpoint }),
      }));
    }
    
    return updatedConfig;
  }
}
