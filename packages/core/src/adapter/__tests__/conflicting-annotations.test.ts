import { describe, it, expect, vi } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Conflicting Annotations', () => {
  // Helper to create a minimal OpenAPI spec with authentication endpoints
  const createSpec = (
    path: string,
    loginAnnotation?: boolean,
    signupAnnotation?: boolean,
    requestBody?: OpenAPIV3.RequestBodyObject
  ): OpenAPIV3.Document => {
    const operation: any = {
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' }
                }
              }
            }
          }
        }
      }
    };

    if (loginAnnotation !== undefined) {
      operation['x-uigen-login'] = loginAnnotation;
    }

    if (signupAnnotation !== undefined) {
      operation['x-uigen-signup'] = signupAnnotation;
    }

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    return {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        [path]: {
          post: operation as OpenAPIV3.OperationObject,
        },
      },
    };
  };

  const createCredentialRequestBody = (): OpenAPIV3.RequestBodyObject => ({
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          },
          required: ['username', 'password']
        }
      }
    }
  });

  describe('Task 2.3: Handle conflicting annotations', () => {
    it('should log warning when endpoint has both x-uigen-login: true AND x-uigen-signup: true', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/endpoint', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Conflicting authentication annotations on /auth/endpoint')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('both x-uigen-login and x-uigen-signup are true')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using login annotation')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should prioritize login annotation when both are true', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/endpoint', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify endpoint is in loginEndpoints
      expect(result.auth.loginEndpoints).toBeDefined();
      expect(result.auth.loginEndpoints?.length).toBe(1);
      expect(result.auth.loginEndpoints?.[0].path).toBe('/auth/endpoint');

      // Verify endpoint is NOT in signupEndpoints
      expect(result.auth.signUpEndpoints).toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    it('should add endpoint to loginEndpoints when conflict occurs', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/endpoint', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify endpoint structure
      expect(result.auth.loginEndpoints).toBeDefined();
      expect(result.auth.loginEndpoints?.length).toBe(1);
      
      const loginEndpoint = result.auth.loginEndpoints?.[0];
      expect(loginEndpoint).toBeDefined();
      expect(loginEndpoint?.path).toBe('/auth/endpoint');
      expect(loginEndpoint?.method).toBe('POST');
      expect(loginEndpoint?.requestBodySchema).toBeDefined();

      consoleWarnSpy.mockRestore();
    });

    it('should include endpoint path in warning message', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/api/v1/auth/custom-endpoint', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      // Verify path is in warning message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/custom-endpoint')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle multiple endpoints with conflicts independently', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/auth/endpoint1': {
            post: {
              'x-uigen-login': true,
              'x-uigen-signup': true,
              requestBody: createCredentialRequestBody(),
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { token: { type: 'string' } }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/endpoint2': {
            post: {
              'x-uigen-login': true,
              'x-uigen-signup': true,
              requestBody: createCredentialRequestBody(),
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: { token: { type: 'string' } }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify both warnings were logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/endpoint1')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/endpoint2')
      );

      // Verify both endpoints are in loginEndpoints
      expect(result.auth.loginEndpoints?.length).toBe(2);
      expect(result.auth.signUpEndpoints).toBeUndefined();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Requirements 2.3 and 7.2 validation', () => {
    it('should satisfy requirement 2.3: check for both annotations', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/test', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      // Requirement: Check if endpoint has both x-uigen-login: true AND x-uigen-signup: true
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should satisfy requirement 2.3: log error message with endpoint path', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/test', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      adapter.adapt();

      // Requirement: Log error message with endpoint path
      const warningCall = consoleWarnSpy.mock.calls.find(call => 
        call[0].includes('/auth/test')
      );
      expect(warningCall).toBeDefined();

      consoleWarnSpy.mockRestore();
    });

    it('should satisfy requirement 2.3: prioritize login annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/test', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Requirement: Prioritize login annotation (add to loginEndpoints)
      expect(result.auth.loginEndpoints).toBeDefined();
      expect(result.auth.loginEndpoints?.some(e => e.path === '/auth/test')).toBe(true);
      
      // Should NOT be in signupEndpoints
      expect(result.auth.signUpEndpoints?.some(e => e.path === '/auth/test')).toBeFalsy();

      consoleWarnSpy.mockRestore();
    });

    it('should satisfy requirement 7.2: same as 2.3 (duplicate requirement)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const spec = createSpec('/auth/test', true, true, createCredentialRequestBody());
      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Requirement 7.2 is the same as 2.3
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(result.auth.loginEndpoints?.some(e => e.path === '/auth/test')).toBe(true);

      consoleWarnSpy.mockRestore();
    });
  });
});
