import { describe, it, expect } from 'vitest';
import { TokenExtractor } from '../TokenExtractor';

describe('TokenExtractor', () => {
  describe('extract', () => {
    it('extracts top-level token field', () => {
      const response = { token: 'abc123' };
      expect(TokenExtractor.extract(response, 'token')).toBe('abc123');
    });

    it('extracts top-level accessToken field', () => {
      const response = { accessToken: 'xyz789' };
      expect(TokenExtractor.extract(response, 'accessToken')).toBe('xyz789');
    });

    it('extracts top-level access_token field', () => {
      const response = { access_token: 'def456' };
      expect(TokenExtractor.extract(response, 'access_token')).toBe('def456');
    });

    it('extracts top-level bearerToken field', () => {
      const response = { bearerToken: 'ghi789' };
      expect(TokenExtractor.extract(response, 'bearerToken')).toBe('ghi789');
    });

    it('extracts nested token (data.token)', () => {
      const response = { data: { token: 'nested123' } };
      expect(TokenExtractor.extract(response, 'data.token')).toBe('nested123');
    });

    it('extracts nested accessToken (data.accessToken)', () => {
      const response = { data: { accessToken: 'nested456' } };
      expect(TokenExtractor.extract(response, 'data.accessToken')).toBe('nested456');
    });

    it('returns null for null response', () => {
      expect(TokenExtractor.extract(null, 'token')).toBeNull();
    });

    it('returns null for undefined response', () => {
      expect(TokenExtractor.extract(undefined, 'token')).toBeNull();
    });

    it('returns null for non-object response', () => {
      expect(TokenExtractor.extract('string', 'token')).toBeNull();
      expect(TokenExtractor.extract(123, 'token')).toBeNull();
      expect(TokenExtractor.extract(true, 'token')).toBeNull();
    });

    it('returns null when token field is missing', () => {
      const response = { otherField: 'value' };
      expect(TokenExtractor.extract(response, 'token')).toBeNull();
    });

    it('returns null when nested path is invalid', () => {
      const response = { data: 'not an object' };
      expect(TokenExtractor.extract(response, 'data.token')).toBeNull();
    });

    it('returns null when token value is not a string', () => {
      const response = { token: 123 };
      expect(TokenExtractor.extract(response, 'token')).toBeNull();
    });
  });

  describe('extractRefreshToken', () => {
    it('extracts refreshToken field', () => {
      const response = { refreshToken: 'refresh123' };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('refresh123');
    });

    it('extracts refresh_token field', () => {
      const response = { refresh_token: 'refresh456' };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('refresh456');
    });

    it('extracts refresh field', () => {
      const response = { refresh: 'refresh789' };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('refresh789');
    });

    it('extracts nested refreshToken (data.refreshToken)', () => {
      const response = { data: { refreshToken: 'nested123' } };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('nested123');
    });

    it('extracts nested refresh_token (data.refresh_token)', () => {
      const response = { data: { refresh_token: 'nested456' } };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('nested456');
    });

    it('returns null for null response', () => {
      expect(TokenExtractor.extractRefreshToken(null)).toBeNull();
    });

    it('returns null for undefined response', () => {
      expect(TokenExtractor.extractRefreshToken(undefined)).toBeNull();
    });

    it('returns null for non-object response', () => {
      expect(TokenExtractor.extractRefreshToken('string')).toBeNull();
    });

    it('returns null when refresh token field is missing', () => {
      const response = { token: 'abc123' };
      expect(TokenExtractor.extractRefreshToken(response)).toBeNull();
    });

    it('prioritizes top-level over nested refresh token', () => {
      const response = {
        refreshToken: 'top-level',
        data: { refreshToken: 'nested' }
      };
      expect(TokenExtractor.extractRefreshToken(response)).toBe('top-level');
    });
  });
});
