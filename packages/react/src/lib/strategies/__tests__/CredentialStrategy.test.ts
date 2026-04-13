import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CredentialStrategy } from '../CredentialStrategy';

describe('CredentialStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('rejects empty username', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: '',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username cannot be empty');
    });

    it('rejects whitespace-only username', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: '   ',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username cannot be empty');
    });

    it('rejects empty password', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: '',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password cannot be empty');
    });

    it('rejects whitespace-only password', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: '   ',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password cannot be empty');
    });

    it('rejects empty login endpoint', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login endpoint not configured');
    });

    it('accepts valid credentials and extracts token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123' }),
        text: async () => JSON.stringify({ token: 'abc123' })
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(true);
      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('handles 401 Unauthorized error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => ''
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'wrong',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('handles 403 Forbidden error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => ''
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access forbidden');
    });

    it('handles 404 Not Found error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => ''
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/wrong'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login endpoint not found');
    });

    it('handles 500 Server Error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => ''
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error occurred');
    });

    it('uses error message from response body if available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Account locked' })
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account locked');
    });

    it('handles network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error - please check your connection');
    });

    it('handles invalid JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'not json'
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format from login endpoint');
    });

    it('handles missing token in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: 'user123' }),
        text: async () => JSON.stringify({ user: 'user123' })
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login succeeded but token not found in response');
    });

    it('extracts token from custom token path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { accessToken: 'xyz789' } }),
        text: async () => JSON.stringify({ data: { accessToken: 'xyz789' } })
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login',
        tokenPath: 'data.accessToken'
      });

      expect(result.success).toBe(true);
      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('extracts refresh token if present', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123', refreshToken: 'refresh456' }),
        text: async () => JSON.stringify({ token: 'abc123', refreshToken: 'refresh456' })
      });

      const strategy = new CredentialStrategy();
      const result = await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(result.success).toBe(true);
      const serialized = strategy.serialize();
      expect(serialized.refreshToken).toBe('refresh456');
    });
  });

  describe('getHeaders', () => {
    it('delegates to bearer strategy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123' }),
        text: async () => JSON.stringify({ token: 'abc123' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      const headers = strategy.getHeaders();
      expect(headers).toHaveProperty('x-uigen-auth');
      expect(headers['x-uigen-auth']).toBe('abc123');
    });
  });

  describe('isAuthenticated', () => {
    it('returns false before authentication', () => {
      const strategy = new CredentialStrategy();
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('returns true after successful authentication', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123' }),
        text: async () => JSON.stringify({ token: 'abc123' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(strategy.isAuthenticated()).toBe(true);
    });
  });

  describe('serialize and deserialize', () => {
    it('serializes authenticated state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123' }),
        text: async () => JSON.stringify({ token: 'abc123' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login',
        tokenPath: 'token'
      });

      const serialized = strategy.serialize();
      expect(serialized.type).toBe('credential');
      expect(serialized.token).toBe('abc123');
      expect(serialized.loginEndpoint).toBe('http://api.test/login');
      expect(serialized.tokenPath).toBe('token');
    });

    it('deserializes and restores state', async () => {
      const strategy1 = new CredentialStrategy();
      const serialized = {
        type: 'credential',
        token: 'abc123',
        loginEndpoint: 'http://api.test/login',
        tokenPath: 'token'
      };

      strategy1.deserialize(serialized);

      expect(strategy1.isAuthenticated()).toBe(true);
      expect(strategy1.getHeaders()['x-uigen-auth']).toBe('abc123');
    });

    it('handles type mismatch gracefully', () => {
      const strategy = new CredentialStrategy();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      strategy.deserialize({
        type: 'bearer',
        token: 'abc123'
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears all authentication state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'abc123' }),
        text: async () => JSON.stringify({ token: 'abc123' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      expect(strategy.isAuthenticated()).toBe(true);

      strategy.clear();

      expect(strategy.isAuthenticated()).toBe(false);
      expect(strategy.getHeaders()).toEqual({});
      
      const serialized = strategy.serialize();
      expect(serialized.token).toBe('');
      expect(serialized.loginEndpoint).toBe('');
    });
  });

  describe('refresh', () => {
    it('refreshes token when refresh token and endpoint available', async () => {
      // Initial login
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'abc123', refreshToken: 'refresh456' }),
        text: async () => JSON.stringify({ token: 'abc123', refreshToken: 'refresh456' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      strategy.setRefreshEndpoint('http://api.test/refresh');

      // Mock refresh response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'newtoken789' }),
        text: async () => JSON.stringify({ token: 'newtoken789' })
      });

      const result = await strategy.refresh();

      expect(result.success).toBe(true);
      expect(strategy.getHeaders()['x-uigen-auth']).toBe('newtoken789');
    });

    it('returns error when refresh token not available', async () => {
      const strategy = new CredentialStrategy();
      const result = await strategy.refresh();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh token not available');
    });

    it('clears state on refresh failure', async () => {
      // Initial login
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'abc123', refreshToken: 'refresh456' }),
        text: async () => JSON.stringify({ token: 'abc123', refreshToken: 'refresh456' })
      });

      const strategy = new CredentialStrategy();
      await strategy.authenticate({
        username: 'user123',
        password: 'password123',
        loginEndpoint: 'http://api.test/login'
      });

      strategy.setRefreshEndpoint('http://api.test/refresh');

      // Mock refresh failure
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => ''
      });

      const result = await strategy.refresh();

      expect(result.success).toBe(false);
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('type guard', () => {
    it('rejects invalid credentials format', async () => {
      const strategy = new CredentialStrategy();
      
      const result = await strategy.authenticate({
        username: 'user123'
        // missing password and loginEndpoint
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });

    it('rejects non-object credentials', async () => {
      const strategy = new CredentialStrategy();
      
      const result = await strategy.authenticate('not an object');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });
  });
});
