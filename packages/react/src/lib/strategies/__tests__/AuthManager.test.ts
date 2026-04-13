import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthManager } from '../AuthManager';
import { BearerStrategy } from '../BearerStrategy';
import { ApiKeyStrategy } from '../ApiKeyStrategy';
import { SessionStorageStrategy } from '../SessionStorageStrategy';
import type { IAuthStrategy, AuthResult, SerializedAuthData } from '../IAuthStrategy';
import type { IStorageStrategy } from '../IStorageStrategy';

describe('AuthManager', () => {
  let authStrategy: IAuthStrategy;
  let storageStrategy: IStorageStrategy;
  let manager: AuthManager;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    
    authStrategy = new BearerStrategy();
    storageStrategy = new SessionStorageStrategy();
    
    // Create manager without auto-restore for controlled testing
    vi.spyOn(AuthManager.prototype as any, 'restore').mockImplementation(() => {});
    manager = new AuthManager(authStrategy, storageStrategy);
    (AuthManager.prototype as any).restore.mockRestore();
  });

  describe('constructor', () => {
    it('should accept auth and storage strategies - Requirement 6.1', () => {
      const mgr = new AuthManager(authStrategy, storageStrategy);
      expect(mgr).toBeDefined();
    });

    it('should automatically restore on initialization - Requirement 6.7', () => {
      // Store some data first
      storageStrategy.save('uigen_auth', {
        type: 'bearer',
        token: 'restored-token'
      });
      
      // Create new manager (should auto-restore)
      const mgr = new AuthManager(authStrategy, storageStrategy);
      
      expect(mgr.isAuthenticated()).toBe(true);
      expect(mgr.getHeaders()).toEqual({ 'x-uigen-auth': 'restored-token' });
    });
  });

  describe('login', () => {
    it('should authenticate, serialize, and save - Requirement 6.2', async () => {
      const result = await manager.login({ token: 'my-token' });
      
      expect(result.success).toBe(true);
      expect(manager.isAuthenticated()).toBe(true);
      
      // Verify data was saved to storage
      const stored = storageStrategy.load('uigen_auth') as SerializedAuthData;
      expect(stored).toEqual({
        type: 'bearer',
        token: 'my-token'
      });
    });

    it('should return error on invalid credentials', async () => {
      const result = await manager.login({ token: '' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token cannot be empty');
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('should not save on authentication failure', async () => {
      await manager.login({ token: '' });
      
      const stored = storageStrategy.load('uigen_auth');
      expect(stored).toBeNull();
    });

    it('should handle storage errors gracefully - Requirement 6.8', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveSpy = vi.spyOn(storageStrategy, 'save').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const result = await manager.login({ token: 'my-token' });
      
      // Authentication should still succeed
      expect(result.success).toBe(true);
      expect(manager.isAuthenticated()).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save auth state:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      saveSpy.mockRestore();
    });

    it('should work with API key strategy', async () => {
      const apiKeyStrategy = new ApiKeyStrategy();
      const mgr = new AuthManager(apiKeyStrategy, storageStrategy);
      
      const result = await mgr.login({
        apiKey: 'my-key',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header'
      });
      
      expect(result.success).toBe(true);
      expect(mgr.isAuthenticated()).toBe(true);
      
      const stored = storageStrategy.load('uigen_auth') as SerializedAuthData;
      expect(stored.type).toBe('apiKey');
    });
  });

  describe('logout', () => {
    it('should clear auth and remove from storage - Requirement 6.3', async () => {
      await manager.login({ token: 'my-token' });
      
      manager.logout();
      
      expect(manager.isAuthenticated()).toBe(false);
      expect(manager.getHeaders()).toEqual({});
      
      const stored = storageStrategy.load('uigen_auth');
      expect(stored).toBeNull();
    });

    it('should be idempotent', () => {
      manager.logout();
      manager.logout();
      
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('should handle storage errors gracefully - Requirement 6.8', async () => {
      await manager.login({ token: 'my-token' });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const removeSpy = vi.spyOn(storageStrategy, 'remove').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      manager.logout();
      
      // Auth should still be cleared
      expect(manager.isAuthenticated()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to remove auth state:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('getHeaders', () => {
    it('should delegate to auth strategy - Requirement 6.4', async () => {
      await manager.login({ token: 'my-token' });
      
      const headers = manager.getHeaders();
      
      expect(headers).toEqual({ 'x-uigen-auth': 'my-token' });
    });

    it('should return empty object when not authenticated', () => {
      const headers = manager.getHeaders();
      
      expect(headers).toEqual({});
    });

    it('should return API key headers with API key strategy', async () => {
      const apiKeyStrategy = new ApiKeyStrategy();
      const mgr = new AuthManager(apiKeyStrategy, storageStrategy);
      
      await mgr.login({
        apiKey: 'my-key',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header'
      });
      
      const headers = mgr.getHeaders();
      
      expect(headers).toEqual({
        'x-uigen-api-key': 'my-key',
        'x-uigen-api-key-name': 'X-API-Key',
        'x-uigen-api-key-in': 'header'
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should delegate to auth strategy - Requirement 6.5', async () => {
      expect(manager.isAuthenticated()).toBe(false);
      
      await manager.login({ token: 'my-token' });
      
      expect(manager.isAuthenticated()).toBe(true);
    });

    it('should return false after logout', async () => {
      await manager.login({ token: 'my-token' });
      manager.logout();
      
      expect(manager.isAuthenticated()).toBe(false);
    });
  });

  describe('restore', () => {
    it('should load from storage and deserialize - Requirement 6.6', () => {
      // Store data first
      storageStrategy.save('uigen_auth', {
        type: 'bearer',
        token: 'restored-token'
      });
      
      manager.restore();
      
      expect(manager.isAuthenticated()).toBe(true);
      expect(manager.getHeaders()).toEqual({ 'x-uigen-auth': 'restored-token' });
    });

    it('should handle missing storage data', () => {
      manager.restore();
      
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('should handle storage errors gracefully - Requirement 6.8', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const loadSpy = vi.spyOn(storageStrategy, 'load').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      manager.restore();
      
      expect(manager.isAuthenticated()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore auth state:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      loadSpy.mockRestore();
    });

    it('should handle corrupted storage data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Store invalid data
      storageStrategy.save('uigen_auth', { invalid: 'data' });
      
      manager.restore();
      
      // Should not crash, but won't be authenticated
      expect(manager.isAuthenticated()).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('should support full login-logout-restore cycle', async () => {
      // Login
      await manager.login({ token: 'session-token' });
      expect(manager.isAuthenticated()).toBe(true);
      
      // Simulate page refresh by creating new manager
      const newManager = new AuthManager(new BearerStrategy(), storageStrategy);
      expect(newManager.isAuthenticated()).toBe(true);
      expect(newManager.getHeaders()).toEqual({ 'x-uigen-auth': 'session-token' });
      
      // Logout
      newManager.logout();
      expect(newManager.isAuthenticated()).toBe(false);
      
      // Another refresh should not restore
      const finalManager = new AuthManager(new BearerStrategy(), storageStrategy);
      expect(finalManager.isAuthenticated()).toBe(false);
    });

    it('should support strategy composition', async () => {
      // Bearer strategy with session storage
      const bearerMgr = new AuthManager(new BearerStrategy(), new SessionStorageStrategy());
      await bearerMgr.login({ token: 'bearer-token' });
      expect(bearerMgr.isAuthenticated()).toBe(true);
      
      // API key strategy with session storage
      const apiKeyMgr = new AuthManager(new ApiKeyStrategy(), new SessionStorageStrategy());
      await apiKeyMgr.login({
        apiKey: 'api-key',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header'
      });
      expect(apiKeyMgr.isAuthenticated()).toBe(true);
    });

    it('should use static STORAGE_KEY', () => {
      // Verify the storage key is used consistently
      const key = (AuthManager as any).STORAGE_KEY;
      expect(key).toBe('uigen_auth');
    });
  });
});
