import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BearerStrategy } from '../BearerStrategy';
import type { SerializedAuthData } from '../IAuthStrategy';

describe('BearerStrategy', () => {
  let strategy: BearerStrategy;

  beforeEach(() => {
    strategy = new BearerStrategy();
  });

  describe('type property', () => {
    it('should have type "bearer" - Requirement 4.1', () => {
      expect(strategy.type).toBe('bearer');
    });

    it('should be readonly at compile time', () => {
      // TypeScript enforces readonly at compile time
      // Runtime check: verify the property exists and is a string
      expect(strategy.type).toBeDefined();
      expect(typeof strategy.type).toBe('string');
    });
  });

  describe('authenticate', () => {
    it('should store valid token - Requirement 4.2', async () => {
      const result = await strategy.authenticate({ token: 'valid-token' });
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('should reject empty token - Requirement 4.8', async () => {
      const result = await strategy.authenticate({ token: '' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token cannot be empty');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should reject whitespace-only token - Requirement 4.8', async () => {
      const result = await strategy.authenticate({ token: '   ' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token cannot be empty');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should reject invalid credentials format', async () => {
      const result = await strategy.authenticate({ notToken: 'value' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });

    it('should reject null credentials', async () => {
      const result = await strategy.authenticate(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });

    it('should reject non-object credentials', async () => {
      const result = await strategy.authenticate('just-a-string');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });

    it('should reject credentials with non-string token', async () => {
      const result = await strategy.authenticate({ token: 123 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials format');
    });
  });

  describe('getHeaders', () => {
    it('should return x-uigen-auth header with token - Requirement 4.3', async () => {
      await strategy.authenticate({ token: 'my-token' });
      
      const headers = strategy.getHeaders();
      
      expect(headers).toEqual({ 'x-uigen-auth': 'my-token' });
    });

    it('should return empty object when not authenticated', () => {
      const headers = strategy.getHeaders();
      
      expect(headers).toEqual({});
    });

    it('should return empty object after clear', async () => {
      await strategy.authenticate({ token: 'my-token' });
      strategy.clear();
      
      const headers = strategy.getHeaders();
      
      expect(headers).toEqual({});
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists - Requirement 4.4', async () => {
      await strategy.authenticate({ token: 'valid-token' });
      
      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('should return false when no token exists', () => {
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should return false after clear', async () => {
      await strategy.authenticate({ token: 'valid-token' });
      strategy.clear();
      
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should return false for empty token', async () => {
      await strategy.authenticate({ token: '' });
      
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('serialize', () => {
    it('should return object with type and token - Requirement 4.5', async () => {
      await strategy.authenticate({ token: 'my-token' });
      
      const serialized = strategy.serialize();
      
      expect(serialized).toEqual({
        type: 'bearer',
        token: 'my-token'
      });
    });

    it('should return empty token when not authenticated', () => {
      const serialized = strategy.serialize();
      
      expect(serialized).toEqual({
        type: 'bearer',
        token: ''
      });
    });

    it('should return JSON-serializable data', async () => {
      await strategy.authenticate({ token: 'my-token' });
      
      const serialized = strategy.serialize();
      const json = JSON.stringify(serialized);
      const parsed = JSON.parse(json);
      
      expect(parsed).toEqual(serialized);
    });
  });

  describe('deserialize', () => {
    it('should restore token from data - Requirement 4.6', () => {
      const data: SerializedAuthData = {
        type: 'bearer',
        token: 'restored-token'
      };
      
      strategy.deserialize(data);
      
      expect(strategy.isAuthenticated()).toBe(true);
      expect(strategy.getHeaders()).toEqual({ 'x-uigen-auth': 'restored-token' });
    });

    it('should handle empty token', () => {
      const data: SerializedAuthData = {
        type: 'bearer',
        token: ''
      };
      
      strategy.deserialize(data);
      
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should log error and ignore mismatched type', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const data: SerializedAuthData = {
        type: 'apiKey',
        token: 'some-token'
      };
      
      strategy.deserialize(data);
      
      expect(strategy.isAuthenticated()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Type mismatch: expected bearer, got apiKey')
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing token field', () => {
      const data: SerializedAuthData = {
        type: 'bearer'
      };
      
      strategy.deserialize(data);
      
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should handle non-string token field', () => {
      const data: SerializedAuthData = {
        type: 'bearer',
        token: 123
      };
      
      strategy.deserialize(data);
      
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove stored token - Requirement 4.7', async () => {
      await strategy.authenticate({ token: 'my-token' });
      
      strategy.clear();
      
      expect(strategy.isAuthenticated()).toBe(false);
      expect(strategy.getHeaders()).toEqual({});
    });

    it('should be idempotent', () => {
      strategy.clear();
      strategy.clear();
      
      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('IAuthStrategy interface compliance', () => {
    it('should implement type property - Requirement 3.1', () => {
      expect(strategy.type).toBeDefined();
      expect(typeof strategy.type).toBe('string');
    });

    it('should implement authenticate method - Requirement 3.2', () => {
      expect(typeof strategy.authenticate).toBe('function');
    });

    it('should implement getHeaders method - Requirement 3.3', () => {
      expect(typeof strategy.getHeaders).toBe('function');
    });

    it('should implement isAuthenticated method - Requirement 3.4', () => {
      expect(typeof strategy.isAuthenticated).toBe('function');
    });

    it('should implement serialize method - Requirement 3.5', () => {
      expect(typeof strategy.serialize).toBe('function');
    });

    it('should implement deserialize method - Requirement 3.6', () => {
      expect(typeof strategy.deserialize).toBe('function');
    });

    it('should implement clear method - Requirement 3.7', () => {
      expect(typeof strategy.clear).toBe('function');
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve state through serialize/deserialize cycle', async () => {
      await strategy.authenticate({ token: 'original-token' });
      
      const serialized = strategy.serialize();
      const newStrategy = new BearerStrategy();
      newStrategy.deserialize(serialized);
      
      expect(newStrategy.isAuthenticated()).toBe(true);
      expect(newStrategy.getHeaders()).toEqual({ 'x-uigen-auth': 'original-token' });
    });

    it('should preserve unauthenticated state through serialize/deserialize cycle', () => {
      const serialized = strategy.serialize();
      const newStrategy = new BearerStrategy();
      newStrategy.deserialize(serialized);
      
      expect(newStrategy.isAuthenticated()).toBe(false);
      expect(newStrategy.getHeaders()).toEqual({});
    });
  });
});
