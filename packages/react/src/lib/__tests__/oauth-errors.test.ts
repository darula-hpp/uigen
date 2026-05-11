/**
 * Unit tests for OAuth error handling and logging utilities
 * 
 * Requirements: 10.1-10.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getErrorMessage,
  logOAuthError,
  createOAuthError,
  parseOAuthError,
  isUserActionError,
  isTemporaryError,
  isConfigurationError,
  type OAuthError,
  type OAuthErrorCode
} from '../oauth-errors';

describe('OAuth Error Handling Utilities', () => {
  describe('getErrorMessage', () => {
    it('should return user-friendly message for access_denied', () => {
      const message = getErrorMessage('access_denied');
      expect(message).toBe('You denied access to your account. Please try again if you want to sign in.');
    });

    it('should return user-friendly message for invalid_grant', () => {
      const message = getErrorMessage('invalid_grant');
      expect(message).toBe('The authorization code is invalid or has expired. Please try again.');
    });

    it('should return user-friendly message for state_mismatch', () => {
      const message = getErrorMessage('state_mismatch');
      expect(message).toContain('Authentication state mismatch');
    });

    it('should return user-friendly message for network_error', () => {
      const message = getErrorMessage('network_error');
      expect(message).toContain('Unable to connect');
    });

    it('should return user-friendly message for timeout', () => {
      const message = getErrorMessage('timeout');
      expect(message).toContain('timed out');
    });

    it('should return user-friendly message for server_error', () => {
      const message = getErrorMessage('server_error');
      expect(message).toContain('provider encountered an error');
    });

    it('should return user-friendly message for temporarily_unavailable', () => {
      const message = getErrorMessage('temporarily_unavailable');
      expect(message).toContain('temporarily unavailable');
    });

    it('should return user-friendly message for invalid_client', () => {
      const message = getErrorMessage('invalid_client');
      expect(message).toContain('credentials are invalid');
    });

    it('should return default message for unknown error code', () => {
      const message = getErrorMessage('unknown');
      expect(message).toContain('unexpected error');
    });

    it('should append provider description when provided', () => {
      const message = getErrorMessage('access_denied', 'User clicked cancel');
      expect(message).toContain('You denied access');
      expect(message).toContain('(User clicked cancel)');
    });

    it('should not duplicate description if it matches the message', () => {
      const baseMessage = 'You denied access to your account. Please try again if you want to sign in.';
      const message = getErrorMessage('access_denied', baseMessage);
      expect(message).toBe(baseMessage);
    });
  });

  describe('createOAuthError', () => {
    it('should create error object with code and timestamp', () => {
      const error = createOAuthError('access_denied');
      
      expect(error.code).toBe('access_denied');
      expect(error.timestamp).toBeTruthy();
      expect(error.description).toBeUndefined();
    });

    it('should create error object with description', () => {
      const error = createOAuthError('invalid_grant', 'Code expired');
      
      expect(error.code).toBe('invalid_grant');
      expect(error.description).toBe('Code expired');
      expect(error.timestamp).toBeTruthy();
    });

    it('should create error with valid ISO timestamp', () => {
      const error = createOAuthError('network_error');
      
      // Should be a valid ISO 8601 timestamp
      expect(() => new Date(error.timestamp)).not.toThrow();
      expect(new Date(error.timestamp).toISOString()).toBe(error.timestamp);
    });
  });

  describe('logOAuthError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should log error to console with timestamp', () => {
      const error: OAuthError = {
        code: 'access_denied',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      logOAuthError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[OAuth Error] 2024-01-01T00:00:00.000Z',
        '\nCode: access_denied',
        '',
        expect.stringContaining('You denied access')
      );
    });

    it('should log error with description', () => {
      const error: OAuthError = {
        code: 'invalid_grant',
        description: 'Authorization code expired',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      logOAuthError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[OAuth Error] 2024-01-01T00:00:00.000Z',
        '\nCode: invalid_grant',
        '\nDescription: Authorization code expired',
        expect.stringContaining('authorization code is invalid')
      );
    });

    it('should log error with user-friendly message', () => {
      const error: OAuthError = {
        code: 'network_error',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      logOAuthError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Unable to connect')
      );
    });
  });

  describe('parseOAuthError', () => {
    it('should parse error from URL search params', () => {
      const params = new URLSearchParams('error=access_denied');
      const error = parseOAuthError(params);

      expect(error).toBeTruthy();
      expect(error!.code).toBe('access_denied');
      expect(error!.timestamp).toBeTruthy();
    });

    it('should parse error with description', () => {
      const params = new URLSearchParams('error=invalid_grant&error_description=Code%20expired');
      const error = parseOAuthError(params);

      expect(error).toBeTruthy();
      expect(error!.code).toBe('invalid_grant');
      expect(error!.description).toBe('Code expired');
    });

    it('should return null when no error parameter', () => {
      const params = new URLSearchParams('code=test-code&state=test-state');
      const error = parseOAuthError(params);

      expect(error).toBeNull();
    });

    it('should handle error without description', () => {
      const params = new URLSearchParams('error=server_error');
      const error = parseOAuthError(params);

      expect(error).toBeTruthy();
      expect(error!.code).toBe('server_error');
      expect(error!.description).toBeUndefined();
    });
  });

  describe('isUserActionError', () => {
    it('should return true for access_denied', () => {
      expect(isUserActionError('access_denied')).toBe(true);
    });

    it('should return false for system errors', () => {
      expect(isUserActionError('server_error')).toBe(false);
      expect(isUserActionError('invalid_grant')).toBe(false);
      expect(isUserActionError('network_error')).toBe(false);
    });
  });

  describe('isTemporaryError', () => {
    it('should return true for temporary errors', () => {
      expect(isTemporaryError('temporarily_unavailable')).toBe(true);
      expect(isTemporaryError('timeout')).toBe(true);
      expect(isTemporaryError('network_error')).toBe(true);
    });

    it('should return false for permanent errors', () => {
      expect(isTemporaryError('access_denied')).toBe(false);
      expect(isTemporaryError('invalid_client')).toBe(false);
      expect(isTemporaryError('invalid_grant')).toBe(false);
    });
  });

  describe('isConfigurationError', () => {
    it('should return true for configuration errors', () => {
      expect(isConfigurationError('invalid_client')).toBe(true);
      expect(isConfigurationError('unauthorized_client')).toBe(true);
      expect(isConfigurationError('unsupported_response_type')).toBe(true);
      expect(isConfigurationError('unsupported_grant_type')).toBe(true);
    });

    it('should return false for non-configuration errors', () => {
      expect(isConfigurationError('access_denied')).toBe(false);
      expect(isConfigurationError('invalid_grant')).toBe(false);
      expect(isConfigurationError('network_error')).toBe(false);
    });
  });

  describe('Error categorization', () => {
    const errorCodes: OAuthErrorCode[] = [
      'access_denied',
      'invalid_request',
      'unauthorized_client',
      'unsupported_response_type',
      'invalid_scope',
      'server_error',
      'temporarily_unavailable',
      'invalid_grant',
      'invalid_client',
      'unsupported_grant_type',
      'state_mismatch',
      'network_error',
      'timeout',
      'unknown'
    ];

    it('should have user-friendly messages for all error codes', () => {
      errorCodes.forEach(code => {
        const message = getErrorMessage(code);
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should categorize each error correctly', () => {
      errorCodes.forEach(code => {
        const isUser = isUserActionError(code);
        const isTemp = isTemporaryError(code);
        const isConfig = isConfigurationError(code);

        // Each error should be in at most one category
        const categories = [isUser, isTemp, isConfig].filter(Boolean);
        expect(categories.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
