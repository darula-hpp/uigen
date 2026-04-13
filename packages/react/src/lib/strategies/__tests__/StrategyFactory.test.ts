import { describe, it, expect } from 'vitest';
import { StrategyFactory } from '../StrategyFactory';
import { BearerStrategy } from '../BearerStrategy';
import { ApiKeyStrategy } from '../ApiKeyStrategy';
import { CredentialStrategy } from '../CredentialStrategy';
import { SessionStorageStrategy } from '../SessionStorageStrategy';
import { AuthManager } from '../AuthManager';

describe('StrategyFactory', () => {
  describe('createAuthStrategy', () => {
    it('should create BearerStrategy for "bearer" type', () => {
      const strategy = StrategyFactory.createAuthStrategy('bearer');
      expect(strategy).toBeInstanceOf(BearerStrategy);
      expect(strategy.type).toBe('bearer');
    });

    it('should create ApiKeyStrategy for "apiKey" type', () => {
      const strategy = StrategyFactory.createAuthStrategy('apiKey');
      expect(strategy).toBeInstanceOf(ApiKeyStrategy);
      expect(strategy.type).toBe('apiKey');
    });

    it('should create CredentialStrategy for "credential" type', () => {
      const strategy = StrategyFactory.createAuthStrategy('credential');
      expect(strategy).toBeInstanceOf(CredentialStrategy);
      expect(strategy.type).toBe('credential');
    });

    it('should create CredentialStrategy with config', () => {
      const strategy = StrategyFactory.createAuthStrategy('credential', {
        loginEndpoint: 'http://api.test/login',
        tokenPath: 'data.token'
      });
      expect(strategy).toBeInstanceOf(CredentialStrategy);
      expect(strategy.type).toBe('credential');
    });

    it('should throw error for unknown auth strategy type', () => {
      expect(() => StrategyFactory.createAuthStrategy('unknown')).toThrow(
        'Unknown auth strategy type: unknown'
      );
    });

    it('should throw error for empty string type', () => {
      expect(() => StrategyFactory.createAuthStrategy('')).toThrow(
        'Unknown auth strategy type: '
      );
    });
  });

  describe('createCredentialStrategy', () => {
    it('should create CredentialStrategy with valid loginEndpoint', () => {
      const strategy = StrategyFactory.createCredentialStrategy('http://api.test/login');
      expect(strategy).toBeInstanceOf(CredentialStrategy);
      expect(strategy.type).toBe('credential');
    });

    it('should create CredentialStrategy with loginEndpoint and tokenPath', () => {
      const strategy = StrategyFactory.createCredentialStrategy(
        'http://api.test/login',
        'data.accessToken'
      );
      expect(strategy).toBeInstanceOf(CredentialStrategy);
      expect(strategy.type).toBe('credential');
    });

    it('should throw error for empty loginEndpoint', () => {
      expect(() => StrategyFactory.createCredentialStrategy('')).toThrow(
        'Login endpoint is required for credential strategy'
      );
    });

    it('should throw error for whitespace-only loginEndpoint', () => {
      expect(() => StrategyFactory.createCredentialStrategy('   ')).toThrow(
        'Login endpoint is required for credential strategy'
      );
    });
  });

  describe('createStorageStrategy', () => {
    it('should create SessionStorageStrategy for "session" type', () => {
      const strategy = StrategyFactory.createStorageStrategy('session');
      expect(strategy).toBeInstanceOf(SessionStorageStrategy);
    });

    it('should throw error for unknown storage strategy type', () => {
      expect(() => StrategyFactory.createStorageStrategy('unknown')).toThrow(
        'Unknown storage strategy type: unknown'
      );
    });

    it('should throw error for empty string type', () => {
      expect(() => StrategyFactory.createStorageStrategy('')).toThrow(
        'Unknown storage strategy type: '
      );
    });
  });

  describe('createDefaultAuthManager', () => {
    it('should create AuthManager with bearer strategy and session storage', () => {
      const manager = StrategyFactory.createDefaultAuthManager('bearer');
      expect(manager).toBeInstanceOf(AuthManager);
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('should create AuthManager with apiKey strategy and session storage', () => {
      const manager = StrategyFactory.createDefaultAuthManager('apiKey');
      expect(manager).toBeInstanceOf(AuthManager);
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('should throw error for unknown auth type', () => {
      expect(() => StrategyFactory.createDefaultAuthManager('unknown')).toThrow(
        'Unknown auth strategy type: unknown'
      );
    });
  });
});
