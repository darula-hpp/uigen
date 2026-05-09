import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiFetch, validateTokenOnLoad } from '../api-client';
import * as tokenStorage from '../oauth-token-storage';
import { OAuthStrategy } from '../oauth-strategy';

// Mock dependencies
vi.mock('../oauth-token-storage');
vi.mock('../oauth-strategy');

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset fetch mock
    global.fetch = vi.fn();
    
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiFetch', () => {
    it('should include Authorization header when OAuth token exists', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('test_token_123');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' })
      });

      await apiFetch('https://api.example.com/data');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token_123'
          })
        })
      );
    });

    it('should not include Authorization header when no OAuth token exists', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue(null);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await apiFetch('https://api.example.com/data');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1]?.headers?.Authorization).toBeUndefined();
    });

    it('should not include Authorization header when auth method is credentials', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('some_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('credentials');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await apiFetch('https://api.example.com/data');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1]?.headers?.Authorization).toBeUndefined();
    });

    it('should preserve existing headers when adding Authorization', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('test_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await apiFetch('https://api.example.com/data', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        }
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should attempt token refresh on 401 response', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('expired_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      // Mock localStorage for provider config
      localStorage.setItem('oauth_last_provider', JSON.stringify({
        provider: 'google',
        clientId: 'test_client_id',
        redirectUri: 'http://localhost:3000/callback'
      }));
      localStorage.setItem('oauth_refresh_token', 'refresh_token_123');
      
      // Mock OAuth strategy refresh
      const mockRefresh = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'new_token_456'
      });
      vi.mocked(OAuthStrategy).mockImplementation(() => ({
        refresh: mockRefresh
      } as any));
      
      // First call returns 401, second call succeeds
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: true, status: 200 });
      
      // Mock getAccessToken to return new token after refresh
      vi.mocked(tokenStorage.getAccessToken)
        .mockReturnValueOnce('expired_token')
        .mockReturnValueOnce('new_token_456');

      await apiFetch('https://api.example.com/protected');

      expect(mockRefresh).toHaveBeenCalledWith('refresh_token_123', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear tokens and redirect on failed refresh', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('expired_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});
      
      // Mock localStorage
      localStorage.setItem('oauth_last_provider', JSON.stringify({ provider: 'google' }));
      localStorage.setItem('oauth_refresh_token', 'refresh_token');
      
      // Mock failed refresh
      const mockRefresh = vi.fn().mockResolvedValue({ success: false });
      vi.mocked(OAuthStrategy).mockImplementation(() => ({
        refresh: mockRefresh
      } as any));
      
      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;
      
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

      await apiFetch('https://api.example.com/protected');

      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    it('should not attempt refresh when already refreshing', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      localStorage.setItem('oauth_last_provider', JSON.stringify({ provider: 'google' }));
      localStorage.setItem('oauth_refresh_token', 'refresh_token');
      
      const mockRefresh = vi.fn().mockResolvedValue({ success: true });
      vi.mocked(OAuthStrategy).mockImplementation(() => ({
        refresh: mockRefresh
      } as any));
      
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

      // Make two simultaneous requests
      await Promise.all([
        apiFetch('https://api.example.com/protected'),
        apiFetch('https://api.example.com/protected')
      ]);

      // Refresh should only be called once
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should pass through non-401 responses without refresh', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const response = await apiFetch('https://api.example.com/forbidden');

      expect(response.status).toBe(403);
      expect(OAuthStrategy).not.toHaveBeenCalled();
    });
  });

  describe('validateTokenOnLoad', () => {
    it('should return true for valid token', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('valid_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await validateTokenOnLoad('https://api.example.com/validate');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/validate',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid_token'
          })
        })
      );
    });

    it('should return false and clear tokens for invalid token', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('invalid_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });

      const result = await validateTokenOnLoad('https://api.example.com/validate');

      expect(result).toBe(false);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should return false when no OAuth token exists', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue(null);

      const result = await validateTokenOnLoad('https://api.example.com/validate');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false when auth method is not oauth', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('some_token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('credentials');

      const result = await validateTokenOnLoad('https://api.example.com/validate');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue('token');
      vi.mocked(tokenStorage.getAuthMethod).mockReturnValue('oauth');
      vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await validateTokenOnLoad('https://api.example.com/validate');

      expect(result).toBe(false);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });
});
