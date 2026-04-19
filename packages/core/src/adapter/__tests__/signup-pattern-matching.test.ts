import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('matchesSignupPattern', () => {
  // Helper to create a minimal OpenAPI spec
  const createSpec = (path: string, operation: Partial<OpenAPIV3.OperationObject>): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      [path]: {
        post: operation as OpenAPIV3.OperationObject,
      },
    },
  });

  // Helper to access the private method via adapter
  const testMatchesSignupPattern = (path: string, operation: Partial<OpenAPIV3.OperationObject>): boolean => {
    const spec = createSpec(path, operation);
    const adapter = new OpenAPI3Adapter(spec);
    // Access private method via type assertion
    return (adapter as any).matchesSignupPattern(path, operation);
  };

  describe('Path pattern matching', () => {
    it('should match /register path', () => {
      expect(testMatchesSignupPattern('/register', {})).toBe(true);
    });

    it('should match /signup path', () => {
      expect(testMatchesSignupPattern('/signup', {})).toBe(true);
    });

    it('should match /sign-up path', () => {
      expect(testMatchesSignupPattern('/sign-up', {})).toBe(true);
    });

    it('should match /registration path', () => {
      expect(testMatchesSignupPattern('/registration', {})).toBe(true);
    });

    it('should match /auth/register path', () => {
      expect(testMatchesSignupPattern('/auth/register', {})).toBe(true);
    });

    it('should match /auth/signup path', () => {
      expect(testMatchesSignupPattern('/auth/signup', {})).toBe(true);
    });

    it('should match /auth/sign-up path', () => {
      expect(testMatchesSignupPattern('/auth/sign-up', {})).toBe(true);
    });

    it('should match /auth/registration path', () => {
      expect(testMatchesSignupPattern('/auth/registration', {})).toBe(true);
    });

    it('should be case-insensitive for paths', () => {
      expect(testMatchesSignupPattern('/Register', {})).toBe(true);
      expect(testMatchesSignupPattern('/SIGNUP', {})).toBe(true);
      expect(testMatchesSignupPattern('/Auth/Register', {})).toBe(true);
    });

    it('should not match non-signup paths', () => {
      expect(testMatchesSignupPattern('/login', {})).toBe(false);
      expect(testMatchesSignupPattern('/auth/login', {})).toBe(false);
      expect(testMatchesSignupPattern('/users', {})).toBe(false);
    });
  });

  describe('Description keyword matching', () => {
    it('should match "register" keyword in summary', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Register a new user' })).toBe(true);
    });

    it('should match "signup" keyword in summary', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Signup for an account' })).toBe(true);
    });

    it('should match "sign up" keyword in summary', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Sign up for an account' })).toBe(true);
    });

    it('should match "registration" keyword in summary', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'User registration endpoint' })).toBe(true);
    });

    it('should match "create account" keyword in summary', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Create account for new users' })).toBe(true);
    });

    it('should match keywords in description', () => {
      expect(testMatchesSignupPattern('/api/users', { description: 'This endpoint allows users to register' })).toBe(true);
    });

    it('should be case-insensitive for keywords', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'REGISTER a new user' })).toBe(true);
      expect(testMatchesSignupPattern('/api/users', { summary: 'SignUp for an account' })).toBe(true);
    });

    it('should not match non-signup descriptions', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Login to your account' })).toBe(false);
      expect(testMatchesSignupPattern('/api/users', { summary: 'Get user details' })).toBe(false);
    });
  });

  describe('Combined matching', () => {
    it('should return true if path matches even without description', () => {
      expect(testMatchesSignupPattern('/register', { summary: 'Some endpoint' })).toBe(true);
    });

    it('should return true if description matches even without signup path', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Register a new user' })).toBe(true);
    });

    it('should return false if neither path nor description matches', () => {
      expect(testMatchesSignupPattern('/api/users', { summary: 'Get user details' })).toBe(false);
    });
  });
});
