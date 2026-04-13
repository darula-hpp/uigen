import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeyStrategy } from '../ApiKeyStrategy';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;

  beforeEach(() => {
    strategy = new ApiKeyStrategy();
  });

  describe('authenticate', () => {
    it('should authenticate with valid credentials', async () => {
      const result = await strategy.authenticate({
        apiKey: 'test-key-123',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header' as const
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('should reject empty API key', async () => {
      const result = await strategy.authenticate({
        apiKey: '',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header' as const
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key cannot be empty');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should reject empty API key name', async () => {
      const result = await strategy.authenticate({
        apiKey: 'test-key-123',
        apiKeyName: '',
        apiKeyIn: 'header' as const
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key name cannot be empty');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should reject invalid credentials format', async () => {
      const result = await strategy.authenticate({ invalid: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('getHeaders', () => {
    it('should return correct headers when authenticated', async () => {
      await strategy.authenticate({
        apiKey: 'test-key-123',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header' as const
      });

      const headers = strategy.getHeaders();

      expect(headers).toEqual({
        'x-uigen-api-key': 'test-key-123',
        'x-uigen-api-key-name': 'X-API-Key',
        'x-uigen-api-key-in': 'header'
      });
    });

    it('should return empty object when not authenticated', () => {
      const headers = strategy.getHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('serialize and deserialize', () => {
    it('should serialize and deserialize state correctly', async () => {
      await strategy.authenticate({
        apiKey: 'test-key-123',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'query' as const
      });

      const serialized = strategy.serialize();
      expect(serialized).toEqual({
        type: 'apiKey',
        apiKey: 'test-key-123',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'query'
      });

      const newStrategy = new ApiKeyStrategy();
      newStrategy.deserialize(serialized);

      expect(newStrategy.isAuthenticated()).toBe(true);
      expect(newStrategy.getHeaders()).toEqual({
        'x-uigen-api-key': 'test-key-123',
        'x-uigen-api-key-name': 'X-API-Key',
        'x-uigen-api-key-in': 'query'
      });
    });

    it('should handle type mismatch in deserialize', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      strategy.deserialize({ type: 'bearer', token: 'test' });

      expect(strategy.isAuthenticated()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Type mismatch: expected apiKey, got bearer'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear authentication state', async () => {
      await strategy.authenticate({
        apiKey: 'test-key-123',
        apiKeyName: 'X-API-Key',
        apiKeyIn: 'header' as const
      });

      expect(strategy.isAuthenticated()).toBe(true);

      strategy.clear();

      expect(strategy.isAuthenticated()).toBe(false);
      expect(strategy.getHeaders()).toEqual({});
    });
  });

  describe('type property', () => {
    it('should have correct type identifier', () => {
      expect(strategy.type).toBe('apiKey');
    });
  });
});
