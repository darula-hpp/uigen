import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';

describe('Auth Annotations - Swagger 2.0 Compatibility', () => {
  /**
   * Test that x-uigen-password-reset and x-uigen-sign-up are recognized
   * in Swagger 2.0 operations.
   * Requirements: 12.1, 12.2
   */
  describe('Swagger 2.0 annotation recognition', () => {
    it('should recognize x-uigen-password-reset in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/reset-password': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset password',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      expect(app.auth.passwordResetEndpoints).toBeDefined();
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
      expect(app.auth.passwordResetEndpoints?.[0].path).toBe('/reset-password');
    });

    it('should recognize x-uigen-sign-up in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/register': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Register user',
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              ],
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      expect(app.auth.signUpEndpoints).toBeDefined();
      expect(app.auth.signUpEndpoints?.length).toBe(1);
      expect(app.auth.signUpEndpoints?.[0].path).toBe('/register');
    });
  });

  /**
   * Test that annotations are preserved through Swagger 2.0 to OpenAPI 3.x conversion.
   * Requirements: 12.4
   */
  describe('Annotation preservation', () => {
    it('should preserve x-uigen-password-reset through conversion', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        paths: {
          '/reset': {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Reset password',
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      // Annotation should be preserved and endpoint created
      expect(app.auth.passwordResetEndpoints?.length).toBe(1);
    });

    it('should preserve x-uigen-sign-up through conversion', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        paths: {
          '/signup': {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Sign up',
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      // Annotation should be preserved and endpoint created
      expect(app.auth.signUpEndpoints?.length).toBe(1);
    });
  });

  /**
   * Test that validation rules are consistent between OpenAPI 3.x and Swagger 2.0.
   * Requirements: 12.3
   */
  describe('Format-agnostic validation', () => {
    it('should reject non-boolean values in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        paths: {
          '/test': {
            post: {
              'x-uigen-password-reset': 'invalid',
              summary: 'Test',
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      // Non-boolean value should be rejected
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
    });

    it('should handle false values consistently in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        host: 'api.example.com',
        paths: {
          '/reset-password': {
            post: {
              'x-uigen-password-reset': false,
              summary: 'Reset password',
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };
      
      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      // false value should exclude endpoint
      expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
    });
  });
});
