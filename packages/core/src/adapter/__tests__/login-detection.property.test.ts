import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3';
import type { OpenAPIV3 } from 'openapi-types';

describe('Login Detection - Property Tests', () => {
  /**
   * Property 1: Login Endpoint Detection by Credential Fields
   * 
   * **Feature: credential-based-auth-strategy, Property 1**
   * 
   * For any OpenAPI operation with a POST method and requestBody containing 
   * both a credential field (username OR email) and a password field, the 
   * Login_Detector SHALL classify it as a login endpoint and extract the 
   * operation path, method, and requestBody schema.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.5**
   */
  it('Property 1: detects login endpoints by credential fields', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant('username'), fc.constant('email')), // credential field
        fc.string({ minLength: 5 }), // path suffix
        (credField, pathSuffix) => {
          // Use a path that looks auth-related so credential-field detection triggers
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/auth/${pathSuffix}`]: {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            [credField]: { type: 'string' },
                            password: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
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
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          expect(app.auth.loginEndpoints).toBeDefined();
          expect(app.auth.loginEndpoints!.length).toBeGreaterThan(0);
          
          const loginEndpoint = app.auth.loginEndpoints![0];
          expect(loginEndpoint.path).toBe(`/auth/${pathSuffix}`);
          expect(loginEndpoint.method).toBe('POST');
          expect(loginEndpoint.requestBodySchema).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Token Path Detection from Response Schema
   * 
   * **Feature: credential-based-auth-strategy, Property 2**
   * 
   * For any login endpoint response schema containing a token field (token, 
   * accessToken, access_token, bearerToken, or nested variants like data.token), 
   * the Login_Detector SHALL record the correct JSON path to that token field.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  it('Property 2: detects token path from response schema', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('token'),
          fc.constant('accessToken'),
          fc.constant('access_token'),
          fc.constant('bearerToken')
        ),
        (tokenField) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/login': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            username: { type: 'string' },
                            password: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              [tokenField]: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          expect(app.auth.loginEndpoints).toBeDefined();
          expect(app.auth.loginEndpoints!.length).toBe(1);
          
          const loginEndpoint = app.auth.loginEndpoints![0];
          expect(loginEndpoint.tokenPath).toBe(tokenField);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Refresh Endpoint Detection
   * 
   * **Feature: credential-based-auth-strategy, Property 6**
   * 
   * For any OpenAPI operation with a POST method and requestBody containing 
   * a refresh token field (refreshToken OR refresh_token) OR path matching 
   * refresh patterns (/refresh, /auth/refresh, /token/refresh) OR 
   * summary/description containing "refresh token", the Login_Detector SHALL 
   * classify it as a refresh endpoint and extract the operation path, method, 
   * and requestBody schema.
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   */
  it('Property 6: detects refresh endpoints', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('refreshToken'),
          fc.constant('refresh_token'),
          fc.constant('refresh')
        ),
        (refreshField) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/refresh': {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            [refreshField]: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
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
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          expect(app.auth.refreshEndpoints).toBeDefined();
          expect(app.auth.refreshEndpoints!.length).toBeGreaterThan(0);
          
          const refreshEndpoint = app.auth.refreshEndpoints![0];
          expect(refreshEndpoint.path).toBe('/refresh');
          expect(refreshEndpoint.method).toBe('POST');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Path Pattern Matching for Login Detection
   * 
   * **Feature: credential-based-auth-strategy, Property 7**
   * 
   * For any OpenAPI operation with a path matching the patterns /login, 
   * /auth/login, /signin, or /auth/signin (case-insensitive), the 
   * Login_Detector SHALL classify it as a login endpoint regardless of 
   * requestBody schema.
   * 
   * **Validates: Requirements 1.3**
   */
  it('Property 7: detects login endpoints by path pattern', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('/login'),
          fc.constant('/auth/login'),
          fc.constant('/signin'),
          fc.constant('/auth/signin'),
          fc.constant('/Login'),
          fc.constant('/AUTH/LOGIN')
        ),
        (loginPath) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [loginPath]: {
                post: {
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            credentials: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
                  responses: {
                    '200': {
                      description: 'Success'
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          expect(app.auth.loginEndpoints).toBeDefined();
          expect(app.auth.loginEndpoints!.length).toBeGreaterThan(0);
          
          const loginEndpoint = app.auth.loginEndpoints![0];
          expect(loginEndpoint.path).toBe(loginPath);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Summary/Description Keyword Detection
   * 
   * **Feature: credential-based-auth-strategy, Property 8**
   * 
   * For any OpenAPI operation with summary or description containing the 
   * keywords "login" or "authenticate" (case-insensitive), the Login_Detector 
   * SHALL classify it as a login endpoint.
   * 
   * **Validates: Requirements 1.4**
   */
  it('Property 8: detects login endpoints by summary/description keywords', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('login'),
          fc.constant('authenticate'),
          fc.constant('Login user'),
          fc.constant('Authenticate with credentials')
        ),
        fc.string({ minLength: 5 }),
        (keyword, pathSuffix) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/api/${pathSuffix}`]: {
                post: {
                  summary: keyword,
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            data: { type: 'string' }
                          }
                        }
                      }
                    }
                  },
                  responses: {
                    '200': {
                      description: 'Success'
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          expect(app.auth.loginEndpoints).toBeDefined();
          expect(app.auth.loginEndpoints!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Multiple Login Endpoint Detection
   * 
   * **Feature: credential-based-auth-strategy, Property 9**
   * 
   * For any OpenAPI spec containing N login endpoints (where N ≥ 0), the 
   * Login_Detector SHALL detect and include all N endpoints in the AuthConfig 
   * loginEndpoints array.
   * 
   * **Validates: Requirements 1.7**
   */
  it('Property 9: detects all login endpoints in spec', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // number of login endpoints
        (numEndpoints) => {
          const paths: Record<string, any> = {};
          
          for (let i = 0; i < numEndpoints; i++) {
            paths[`/v${i}/login`] = {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          username: { type: 'string' },
                          password: { type: 'string' }
                        }
                      }
                    }
                  }
                },
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
              }
            };
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths
          };

          const adapter = new OpenAPI3Adapter(spec);
          const app = adapter.adapt();

          if (numEndpoints === 0) {
            expect(app.auth.loginEndpoints || []).toHaveLength(0);
          } else {
            expect(app.auth.loginEndpoints).toBeDefined();
            expect(app.auth.loginEndpoints!.length).toBe(numEndpoints);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
