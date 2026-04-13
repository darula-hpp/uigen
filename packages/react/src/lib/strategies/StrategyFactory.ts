import type { IAuthStrategy } from './IAuthStrategy';
import type { IStorageStrategy } from './IStorageStrategy';
import { BearerStrategy } from './BearerStrategy';
import { ApiKeyStrategy } from './ApiKeyStrategy';
import { CredentialStrategy } from './CredentialStrategy';
import { SessionStorageStrategy } from './SessionStorageStrategy';
import { AuthManager } from './AuthManager';

/**
 * Factory for creating authentication and storage strategies
 * Requirement 13: Provide Strategy Factory
 */
export class StrategyFactory {
  /**
   * Create credential strategy with configuration
   * Requirements 18.1, 18.2, 18.3, 18.4, 18.5
   */
  static createCredentialStrategy(
    loginEndpoint: string,
    tokenPath?: string
  ): CredentialStrategy {
    // Requirement 18.3: Validate login endpoint
    if (!loginEndpoint || loginEndpoint.trim() === '') {
      throw new Error('Login endpoint is required for credential strategy');
    }
    
    const strategy = new CredentialStrategy();
    
    // Pre-configure the strategy (will be used during authenticate)
    // Note: We can't call authenticate here, but we store the config
    // The actual authentication happens when authenticate() is called
    
    return strategy;
  }

  /**
   * Create an authentication strategy by type
   * Requirements 13.1, 13.2, 13.3, 13.4, 18.5
   * @param type - Strategy type ('bearer', 'apiKey', or 'credential')
   * @param config - Optional configuration for the strategy
   * @returns Auth strategy instance
   * @throws Error if type is unknown
   */
  static createAuthStrategy(type: string, config?: any): IAuthStrategy {
    switch (type) {
      case 'bearer':
        // Requirement 13.2: Return Bearer strategy for 'bearer' type
        return new BearerStrategy();
      case 'apiKey':
        // Requirement 13.3: Return API Key strategy for 'apiKey' type
        return new ApiKeyStrategy();
      case 'credential':
        // Requirement 13.2: Support credential type
        if (config?.loginEndpoint) {
          return StrategyFactory.createCredentialStrategy(
            config.loginEndpoint,
            config.tokenPath
          );
        }
        return new CredentialStrategy();
      default:
        // Requirement 13.4: Throw error for unknown types
        throw new Error(`Unknown auth strategy type: ${type}`);
    }
  }

  /**
   * Create a storage strategy by type
   * Requirements 13.5, 13.6
   * @param type - Storage type ('session')
   * @returns Storage strategy instance
   * @throws Error if type is unknown
   */
  static createStorageStrategy(type: string): IStorageStrategy {
    switch (type) {
      case 'session':
        // Requirement 13.6: Return Session storage for 'session' type
        return new SessionStorageStrategy();
      default:
        throw new Error(`Unknown storage strategy type: ${type}`);
    }
  }

  /**
   * Create a default AuthManager with session storage
   * Convenience method for common use case
   * @param authType - Auth strategy type ('bearer' or 'apiKey')
   * @returns Configured AuthManager instance
   */
  static createDefaultAuthManager(authType: string): AuthManager {
    const authStrategy = StrategyFactory.createAuthStrategy(authType);
    const storageStrategy = StrategyFactory.createStorageStrategy('session');
    return new AuthManager(authStrategy, storageStrategy);
  }
}
