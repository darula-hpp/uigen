/**
 * Integration tests for environment variable resolution in the reconciliation pipeline
 * 
 * These tests verify that the environment variable resolver integrates correctly
 * with the reconciler and that the pipeline behaves as expected.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import { EnvVarResolutionError } from '../../../config/env-var-resolver.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Reconciler - Environment Variable Integration', () => {
  let reconciler: Reconciler;

  beforeEach(() => {
    reconciler = new Reconciler({ logLevel: 'error' });
  });

  describe('Pipeline Integration', () => {
    it('should resolve environment variables before reconciliation', () => {
      /**
       * **Validates: Requirements 4.1**
       * 
       * Test that the resolver runs before the reconciler in the pipeline.
       * The reconciler should receive a fully resolved config with no ${} references.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-api-key': '${API_KEY}',
          },
        },
      };

      // Set environment variable
      const originalEnv = process.env.API_KEY;
      process.env.API_KEY = 'test-api-key-12345';

      try {
        const result = reconciler.reconcile(spec, config);

        // Verify the resolved value is in the spec (not the ${} reference)
        expect((result.spec.info as any)['x-api-key']).toBe('test-api-key-12345');
        expect((result.spec.info as any)['x-api-key']).not.toContain('${');
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.API_KEY = originalEnv;
        } else {
          delete process.env.API_KEY;
        }
      }
    });

    it('should reconcile resolved config correctly', () => {
      /**
       * **Validates: Requirements 4.2**
       * 
       * Test that the reconciler receives a fully resolved config and processes it correctly.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'GET:/users': {
            'x-rate-limit': '${RATE_LIMIT}',
            'x-timeout': '${TIMEOUT}',
          },
        },
      };

      // Set environment variables
      const originalRateLimit = process.env.RATE_LIMIT;
      const originalTimeout = process.env.TIMEOUT;
      process.env.RATE_LIMIT = '100';
      process.env.TIMEOUT = '30';

      try {
        const result = reconciler.reconcile(spec, config);

        // Verify annotations were applied with resolved values
        const getUsersOp = (result.spec as OpenAPIV3.Document).paths['/users']?.get;
        expect(getUsersOp).toHaveProperty('x-rate-limit', '100');
        expect(getUsersOp).toHaveProperty('x-timeout', '30');
      } finally {
        // Restore original env
        if (originalRateLimit !== undefined) {
          process.env.RATE_LIMIT = originalRateLimit;
        } else {
          delete process.env.RATE_LIMIT;
        }
        if (originalTimeout !== undefined) {
          process.env.TIMEOUT = originalTimeout;
        } else {
          delete process.env.TIMEOUT;
        }
      }
    });

    it('should halt pipeline on resolution error', () => {
      /**
       * **Validates: Requirements 4.3**
       * 
       * Test that the pipeline halts and throws an error when env vars are missing.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-api-key': '${MISSING_API_KEY}',
          },
        },
      };

      // Ensure the env var doesn't exist
      const originalEnv = process.env.MISSING_API_KEY;
      delete process.env.MISSING_API_KEY;

      try {
        expect(() => {
          reconciler.reconcile(spec, config);
        }).toThrow(EnvVarResolutionError);
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.MISSING_API_KEY = originalEnv;
        }
      }
    });
  });

  describe('Error Messages', () => {
    it('should include variable name in error message', () => {
      /**
       * **Validates: Requirements 3.2**
       * 
       * Test that error messages include the variable name.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-api-key': '${MISSING_VAR}',
          },
        },
      };

      // Ensure the env var doesn't exist
      const originalEnv = process.env.MISSING_VAR;
      delete process.env.MISSING_VAR;

      try {
        expect(() => {
          reconciler.reconcile(spec, config);
        }).toThrow(/MISSING_VAR/);
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.MISSING_VAR = originalEnv;
        }
      }
    });

    it('should include element path in error message', () => {
      /**
       * **Validates: Requirements 3.3**
       * 
       * Test that error messages include the element path where the variable was referenced.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-nested': {
              'x-deep': {
                'x-value': '${MISSING_NESTED_VAR}',
              },
            },
          },
        },
      };

      // Ensure the env var doesn't exist
      const originalEnv = process.env.MISSING_NESTED_VAR;
      delete process.env.MISSING_NESTED_VAR;

      try {
        expect(() => {
          reconciler.reconcile(spec, config);
        }).toThrow(/annotations\.\#\/info\.x-nested\.x-deep\.x-value/);
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.MISSING_NESTED_VAR = originalEnv;
        }
      }
    });
  });

  describe('Nested Structures', () => {
    it('should resolve environment variables in deeply nested objects', () => {
      /**
       * **Validates: Requirements 2.1**
       * 
       * Test that the resolver recursively traverses nested objects.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-level1': {
              'x-level2': {
                'x-level3': {
                  'x-value': '${NESTED_VAR}',
                },
              },
            },
          },
        },
      };

      // Set environment variable
      const originalEnv = process.env.NESTED_VAR;
      process.env.NESTED_VAR = 'deeply-nested-value';

      try {
        const result = reconciler.reconcile(spec, config);

        // Navigate to the deeply nested value
        const level1 = (result.spec.info as any)['x-level1'];
        const level2 = level1['x-level2'];
        const level3 = level2['x-level3'];
        expect(level3['x-value']).toBe('deeply-nested-value');
      } finally {
        // Restore original env
        if (originalEnv !== undefined) {
          process.env.NESTED_VAR = originalEnv;
        } else {
          delete process.env.NESTED_VAR;
        }
      }
    });

    it('should resolve environment variables in arrays', () => {
      /**
       * **Validates: Requirements 2.2**
       * 
       * Test that the resolver recursively traverses arrays.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-servers': [
              '${SERVER_1}',
              '${SERVER_2}',
              '${SERVER_3}',
            ],
          },
        },
      };

      // Set environment variables
      const originalServer1 = process.env.SERVER_1;
      const originalServer2 = process.env.SERVER_2;
      const originalServer3 = process.env.SERVER_3;
      process.env.SERVER_1 = 'https://server1.example.com';
      process.env.SERVER_2 = 'https://server2.example.com';
      process.env.SERVER_3 = 'https://server3.example.com';

      try {
        const result = reconciler.reconcile(spec, config);

        const servers = (result.spec.info as any)['x-servers'];
        expect(servers).toEqual([
          'https://server1.example.com',
          'https://server2.example.com',
          'https://server3.example.com',
        ]);
      } finally {
        // Restore original env
        if (originalServer1 !== undefined) {
          process.env.SERVER_1 = originalServer1;
        } else {
          delete process.env.SERVER_1;
        }
        if (originalServer2 !== undefined) {
          process.env.SERVER_2 = originalServer2;
        } else {
          delete process.env.SERVER_2;
        }
        if (originalServer3 !== undefined) {
          process.env.SERVER_3 = originalServer3;
        } else {
          delete process.env.SERVER_3;
        }
      }
    });

    it('should resolve environment variables in mixed nested structures', () => {
      /**
       * **Validates: Requirements 2.3**
       * 
       * Test that the resolver processes string values at any depth level.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-config': {
              'x-endpoints': [
                {
                  url: '${ENDPOINT_1_URL}',
                  timeout: 30,
                },
                {
                  url: '${ENDPOINT_2_URL}',
                  timeout: 60,
                },
              ],
            },
          },
        },
      };

      // Set environment variables
      const originalEndpoint1 = process.env.ENDPOINT_1_URL;
      const originalEndpoint2 = process.env.ENDPOINT_2_URL;
      process.env.ENDPOINT_1_URL = 'https://api1.example.com';
      process.env.ENDPOINT_2_URL = 'https://api2.example.com';

      try {
        const result = reconciler.reconcile(spec, config);

        const endpoints = (result.spec.info as any)['x-config']['x-endpoints'];
        expect(endpoints[0].url).toBe('https://api1.example.com');
        expect(endpoints[0].timeout).toBe(30);
        expect(endpoints[1].url).toBe('https://api2.example.com');
        expect(endpoints[1].timeout).toBe(60);
      } finally {
        // Restore original env
        if (originalEndpoint1 !== undefined) {
          process.env.ENDPOINT_1_URL = originalEndpoint1;
        } else {
          delete process.env.ENDPOINT_1_URL;
        }
        if (originalEndpoint2 !== undefined) {
          process.env.ENDPOINT_2_URL = originalEndpoint2;
        } else {
          delete process.env.ENDPOINT_2_URL;
        }
      }
    });
  });

  describe('OAuth Integration', () => {
    it('should resolve environment variables in OAuth configuration', () => {
      /**
       * Test that environment variables work correctly with OAuth providers.
       * This is a common use case for sensitive credentials.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: '${GOOGLE_REDIRECT_URI}',
              scopes: ['openid', 'email', 'profile'],
            },
          ],
        },
      };

      // Set environment variables
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      const originalRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      process.env.GOOGLE_CLIENT_ID = '123456.apps.googleusercontent.com';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8000/callback';

      try {
        const result = reconciler.reconcile(spec, config);

        const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
        expect(authAnnotation).toBeDefined();
        expect(authAnnotation.providers).toHaveLength(1);
        expect(authAnnotation.providers[0].clientId).toBe('123456.apps.googleusercontent.com');
        expect(authAnnotation.providers[0].redirectUri).toBe('http://localhost:8000/callback');
        expect(authAnnotation.providers[0].scopes).toEqual(['openid', 'email', 'profile']);
      } finally {
        // Restore original env
        if (originalClientId !== undefined) {
          process.env.GOOGLE_CLIENT_ID = originalClientId;
        } else {
          delete process.env.GOOGLE_CLIENT_ID;
        }
        if (originalRedirectUri !== undefined) {
          process.env.GOOGLE_REDIRECT_URI = originalRedirectUri;
        } else {
          delete process.env.GOOGLE_REDIRECT_URI;
        }
      }
    });

    it('should work with both environment variables and regular annotations', () => {
      /**
       * Test that environment variable resolution works alongside regular annotation reconciliation.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'GET:/users': {
            'x-api-key': '${API_KEY}',
            'x-static-value': 'static',
          },
        },
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };

      // Set environment variables
      const originalApiKey = process.env.API_KEY;
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      process.env.API_KEY = 'test-api-key';
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';

      try {
        const result = reconciler.reconcile(spec, config);

        // Check annotation was applied with resolved env var
        const getUsersOp = (result.spec as OpenAPIV3.Document).paths['/users']?.get;
        expect(getUsersOp).toHaveProperty('x-api-key', 'test-api-key');
        expect(getUsersOp).toHaveProperty('x-static-value', 'static');

        // Check OAuth was reconciled with resolved env var
        const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
        expect(authAnnotation).toBeDefined();
        expect(authAnnotation.providers[0].clientId).toBe('test-client-id');
      } finally {
        // Restore original env
        if (originalApiKey !== undefined) {
          process.env.API_KEY = originalApiKey;
        } else {
          delete process.env.API_KEY;
        }
        if (originalClientId !== undefined) {
          process.env.GOOGLE_CLIENT_ID = originalClientId;
        } else {
          delete process.env.GOOGLE_CLIENT_ID;
        }
      }
    });
  });

  describe('Partial String Replacement', () => {
    it('should replace environment variables within larger strings', () => {
      /**
       * **Validates: Requirements 1.4**
       * 
       * Test that env vars can be embedded within larger strings.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-callback-url': 'http://localhost:${PORT}/auth/callback',
          },
        },
      };

      // Set environment variable
      const originalPort = process.env.PORT;
      process.env.PORT = '8000';

      try {
        const result = reconciler.reconcile(spec, config);

        expect((result.spec.info as any)['x-callback-url']).toBe('http://localhost:8000/auth/callback');
      } finally {
        // Restore original env
        if (originalPort !== undefined) {
          process.env.PORT = originalPort;
        } else {
          delete process.env.PORT;
        }
      }
    });

    it('should replace multiple environment variables in a single string', () => {
      /**
       * **Validates: Requirements 1.5**
       * 
       * Test that multiple env var references in a single string are all replaced.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          '#/info': {
            'x-connection-string': '${PROTOCOL}://${HOST}:${PORT}/${DATABASE}',
          },
        },
      };

      // Set environment variables
      const originalProtocol = process.env.PROTOCOL;
      const originalHost = process.env.HOST;
      const originalPort = process.env.PORT;
      const originalDatabase = process.env.DATABASE;
      process.env.PROTOCOL = 'postgresql';
      process.env.HOST = 'localhost';
      process.env.PORT = '5432';
      process.env.DATABASE = 'mydb';

      try {
        const result = reconciler.reconcile(spec, config);

        expect((result.spec.info as any)['x-connection-string']).toBe('postgresql://localhost:5432/mydb');
      } finally {
        // Restore original env
        if (originalProtocol !== undefined) {
          process.env.PROTOCOL = originalProtocol;
        } else {
          delete process.env.PROTOCOL;
        }
        if (originalHost !== undefined) {
          process.env.HOST = originalHost;
        } else {
          delete process.env.HOST;
        }
        if (originalPort !== undefined) {
          process.env.PORT = originalPort;
        } else {
          delete process.env.PORT;
        }
        if (originalDatabase !== undefined) {
          process.env.DATABASE = originalDatabase;
        } else {
          delete process.env.DATABASE;
        }
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should not modify configs without environment variable references', () => {
      /**
       * **Validates: Requirements 5.1, 5.2**
       * 
       * Test that configs without env var references work unchanged.
       */
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'GET:/users': {
            'x-custom': 'value',
            'x-number': 42,
            'x-boolean': true,
          },
        },
      };

      const result = reconciler.reconcile(spec, config);

      const getUsersOp = (result.spec as OpenAPIV3.Document).paths['/users']?.get;
      expect(getUsersOp).toHaveProperty('x-custom', 'value');
      expect(getUsersOp).toHaveProperty('x-number', 42);
      expect(getUsersOp).toHaveProperty('x-boolean', true);
    });
  });
});
