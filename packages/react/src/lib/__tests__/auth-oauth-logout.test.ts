/**
 * Unit tests for OAuth logout functionality
 * 
 * Requirements: 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearAuthCredentials, isAuthenticated, getAuthHeaders } from '../auth';
import { storeAccessToken, storeRefreshToken, storeAuthMethod, getAccessToken, getRefreshToken, getAuthMethod } from '../oauth-token-storage';
import { storeUserProfile, getUserProfile, type UserProfile } from '../oauth-user-profile';

describe('OAuth Logout Functionality', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('clearAuthCredentials', () => {
    it('should clear OAuth access token', () => {
      storeAccessToken('test-access-token');
      storeAuthMethod('oauth');

      expect(getAccessToken()).toBe('test-access-token');

      clearAuthCredentials();

      expect(getAccessToken()).toBeNull();
    });

    it('should clear OAuth refresh token', () => {
      storeRefreshToken('test-refresh-token');
      storeAuthMethod('oauth');

      expect(getRefreshToken()).toBe('test-refresh-token');

      clearAuthCredentials();

      expect(getRefreshToken()).toBeNull();
    });

    it('should clear auth method', () => {
      storeAuthMethod('oauth');

      expect(getAuthMethod()).toBe('oauth');

      clearAuthCredentials();

      expect(getAuthMethod()).toBeNull();
    });

    it('should clear user profile', () => {
      const profile: UserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      storeUserProfile(profile);

      expect(getUserProfile()).toEqual(profile);

      clearAuthCredentials();

      expect(getUserProfile()).toBeNull();
    });

    it('should clear all OAuth data in one call', () => {
      // Set up OAuth authentication
      storeAccessToken('test-access-token');
      storeRefreshToken('test-refresh-token');
      storeAuthMethod('oauth');
      storeUserProfile({
        email: 'user@example.com',
        name: 'Test User'
      });

      // Verify data is stored
      expect(getAccessToken()).toBe('test-access-token');
      expect(getRefreshToken()).toBe('test-refresh-token');
      expect(getAuthMethod()).toBe('oauth');
      expect(getUserProfile()).toBeTruthy();

      // Clear all data
      clearAuthCredentials();

      // Verify all data is cleared
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getAuthMethod()).toBeNull();
      expect(getUserProfile()).toBeNull();
    });

    it('should also clear credential-based auth', () => {
      // Set up credential-based auth
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'test-token'
      }));

      expect(sessionStorage.getItem('uigen_auth')).toBeTruthy();

      clearAuthCredentials();

      expect(sessionStorage.getItem('uigen_auth')).toBeNull();
    });

    it('should not throw when no data is stored', () => {
      expect(() => clearAuthCredentials()).not.toThrow();
    });
  });

  describe('isAuthenticated with OAuth', () => {
    it('should return true when OAuth access token exists', () => {
      storeAccessToken('test-access-token');
      storeAuthMethod('oauth');

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when OAuth access token is missing', () => {
      storeAuthMethod('oauth');

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false after logout', () => {
      storeAccessToken('test-access-token');
      storeAuthMethod('oauth');

      expect(isAuthenticated()).toBe(true);

      clearAuthCredentials();

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthHeaders with OAuth', () => {
    it('should return Authorization header with Bearer token', () => {
      storeAccessToken('test-access-token');
      storeAuthMethod('oauth');

      const headers = getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': 'Bearer test-access-token'
      });
    });

    it('should return empty headers after logout', () => {
      storeAccessToken('test-access-token');
      storeAuthMethod('oauth');

      expect(getAuthHeaders()).toEqual({
        'Authorization': 'Bearer test-access-token'
      });

      clearAuthCredentials();

      expect(getAuthHeaders()).toEqual({});
    });

    it('should prioritize OAuth over credential-based auth', () => {
      // Set up both OAuth and credential-based auth
      storeAccessToken('oauth-token');
      storeAuthMethod('oauth');
      sessionStorage.setItem('uigen_auth', JSON.stringify({
        type: 'bearer',
        token: 'credential-token'
      }));

      const headers = getAuthHeaders();

      // Should use OAuth token
      expect(headers).toEqual({
        'Authorization': 'Bearer oauth-token'
      });
    });
  });

  describe('Logout flow integration', () => {
    it('should complete full logout flow', () => {
      // Set up authenticated OAuth session
      storeAccessToken('test-access-token');
      storeRefreshToken('test-refresh-token');
      storeAuthMethod('oauth');
      storeUserProfile({
        email: 'user@example.com',
        name: 'Test User'
      });

      // Verify authenticated
      expect(isAuthenticated()).toBe(true);
      expect(getAuthHeaders()).toEqual({
        'Authorization': 'Bearer test-access-token'
      });

      // Logout
      clearAuthCredentials();

      // Verify logged out
      expect(isAuthenticated()).toBe(false);
      expect(getAuthHeaders()).toEqual({});
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getAuthMethod()).toBeNull();
      expect(getUserProfile()).toBeNull();
    });
  });
});
