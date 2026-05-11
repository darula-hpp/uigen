import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  storeAccessToken,
  getAccessToken,
  storeRefreshToken,
  getRefreshToken,
  storeAuthMethod,
  getAuthMethod,
  clearTokens,
} from '../oauth-token-storage';

describe('OAuth Token Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Access Token', () => {
    it('should store and retrieve access token', () => {
      const token = 'test_access_token_12345';
      storeAccessToken(token);
      expect(getAccessToken()).toBe(token);
    });

    it('should return null when no access token is stored', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('should overwrite existing access token', () => {
      storeAccessToken('old_token');
      storeAccessToken('new_token');
      expect(getAccessToken()).toBe('new_token');
    });
  });

  describe('Refresh Token', () => {
    it('should store and retrieve refresh token', () => {
      const token = 'test_refresh_token_67890';
      storeRefreshToken(token);
      expect(getRefreshToken()).toBe(token);
    });

    it('should return null when no refresh token is stored', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('should overwrite existing refresh token', () => {
      storeRefreshToken('old_refresh');
      storeRefreshToken('new_refresh');
      expect(getRefreshToken()).toBe('new_refresh');
    });
  });

  describe('Auth Method', () => {
    it('should store and retrieve oauth auth method', () => {
      storeAuthMethod('oauth');
      expect(getAuthMethod()).toBe('oauth');
    });

    it('should store and retrieve credentials auth method', () => {
      storeAuthMethod('credentials');
      expect(getAuthMethod()).toBe('credentials');
    });

    it('should return null when no auth method is stored', () => {
      expect(getAuthMethod()).toBeNull();
    });

    it('should return null for invalid auth method values', () => {
      localStorage.setItem('auth_method', 'invalid');
      expect(getAuthMethod()).toBeNull();
    });

    it('should overwrite existing auth method', () => {
      storeAuthMethod('credentials');
      storeAuthMethod('oauth');
      expect(getAuthMethod()).toBe('oauth');
    });
  });

  describe('Clear Tokens', () => {
    it('should clear all OAuth tokens and data', () => {
      // Store all types of data
      storeAccessToken('access_token');
      storeRefreshToken('refresh_token');
      storeAuthMethod('oauth');
      localStorage.setItem('oauth_user_profile', JSON.stringify({ email: 'test@example.com' }));

      // Clear all tokens
      clearTokens();

      // Verify all are cleared
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getAuthMethod()).toBeNull();
      expect(localStorage.getItem('oauth_user_profile')).toBeNull();
    });

    it('should not throw error when clearing empty storage', () => {
      expect(() => clearTokens()).not.toThrow();
    });

    it('should not affect other localStorage items', () => {
      localStorage.setItem('other_key', 'other_value');
      storeAccessToken('token');
      
      clearTokens();
      
      expect(localStorage.getItem('other_key')).toBe('other_value');
    });
  });

  describe('Token Persistence', () => {
    it('should persist tokens across multiple operations', () => {
      storeAccessToken('access_123');
      storeRefreshToken('refresh_456');
      storeAuthMethod('oauth');

      // Simulate multiple reads
      expect(getAccessToken()).toBe('access_123');
      expect(getRefreshToken()).toBe('refresh_456');
      expect(getAuthMethod()).toBe('oauth');
      
      // Verify still there
      expect(getAccessToken()).toBe('access_123');
      expect(getRefreshToken()).toBe('refresh_456');
      expect(getAuthMethod()).toBe('oauth');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string tokens', () => {
      storeAccessToken('');
      expect(getAccessToken()).toBe('');
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      storeAccessToken(longToken);
      expect(getAccessToken()).toBe(longToken);
    });

    it('should handle tokens with special characters', () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      storeAccessToken(specialToken);
      expect(getAccessToken()).toBe(specialToken);
    });
  });
});
