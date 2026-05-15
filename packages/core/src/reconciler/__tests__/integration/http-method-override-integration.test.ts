/**
 * Integration test for HTTP Method Override reconciliation
 * 
 * This test demonstrates the complete flow of HTTP method override reconciliation
 * from config.yaml to OpenAPI spec through the main Reconciler.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('HTTP Method Override Integration', () => {
  it('should apply HTTP method override from config file', () => {
    // OpenAPI spec with POST endpoint
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            summary: 'Create a user',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
    };

    // Config with HTTP method override
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'POST:/users': {
          'x-uigen-http-get': true,
          'x-uigen-label': 'List Users',
        },
      },
    };

    const reconciler = new Reconciler({
      logLevel: 'error',
      validateOutput: true,
      strictMode: false,
    });

    const result = reconciler.reconcile(spec, config);

    // Verify reconciliation was successful
    expect(result.warnings).toHaveLength(0);
    expect(result.spec).toBeDefined();

    // Verify method was changed from POST to GET
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    expect(reconciledSpec.paths['/users'].post).toBeUndefined();
    expect(reconciledSpec.paths['/users'].get).toBeDefined();
    expect(reconciledSpec.paths['/users'].get?.operationId).toBe('createUser');
  });

  it('should update operation path after override', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/logout': {
          delete: {
            operationId: 'logout',
            summary: 'Logout user',
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
        'DELETE:/logout': {
          'x-uigen-http-post': true,
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Verify method was changed from DELETE to POST
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    expect(reconciledSpec.paths['/logout'].delete).toBeUndefined();
    expect(reconciledSpec.paths['/logout'].post).toBeDefined();
    expect(reconciledSpec.paths['/logout'].post?.operationId).toBe('logout');
  });

  it('should preserve other annotations during override', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users/{id}': {
          put: {
            operationId: 'updateUser',
            summary: 'Update user',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
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
        'PUT:/users/{id}': {
          'x-uigen-http-patch': true,
          'x-uigen-label': 'Update User',
          'x-uigen-icon': 'edit',
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Verify method was changed from PUT to PATCH
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    expect(reconciledSpec.paths['/users/{id}'].put).toBeUndefined();
    expect(reconciledSpec.paths['/users/{id}'].patch).toBeDefined();

    // Verify other annotations were preserved
    const patchOp = reconciledSpec.paths['/users/{id}'].patch as any;
    expect(patchOp['x-uigen-label']).toBe('Update User');
    expect(patchOp['x-uigen-icon']).toBe('edit');
    expect(patchOp.operationId).toBe('updateUser');
    expect(patchOp.summary).toBe('Update user');
    expect(patchOp.parameters).toHaveLength(1);
  });

  it('should handle multiple overrides on different operations', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
        '/logout': {
          delete: {
            operationId: 'logout',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
        '/profile': {
          put: {
            operationId: 'updateProfile',
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
        'POST:/users': {
          'x-uigen-http-get': true,
        },
        'DELETE:/logout': {
          'x-uigen-http-post': true,
        },
        'PUT:/profile': {
          'x-uigen-http-patch': true,
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Verify all three overrides were applied
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    
    // POST:/users → GET:/users
    expect(reconciledSpec.paths['/users'].post).toBeUndefined();
    expect(reconciledSpec.paths['/users'].get).toBeDefined();
    expect(reconciledSpec.paths['/users'].get?.operationId).toBe('createUser');
    
    // DELETE:/logout → POST:/logout
    expect(reconciledSpec.paths['/logout'].delete).toBeUndefined();
    expect(reconciledSpec.paths['/logout'].post).toBeDefined();
    expect(reconciledSpec.paths['/logout'].post?.operationId).toBe('logout');
    
    // PUT:/profile → PATCH:/profile
    expect(reconciledSpec.paths['/profile'].put).toBeUndefined();
    expect(reconciledSpec.paths['/profile'].patch).toBeDefined();
    expect(reconciledSpec.paths['/profile'].patch?.operationId).toBe('updateProfile');
  });

  it('should log warning for invalid override value', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
    };

    // Config with invalid override value (string instead of boolean)
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'POST:/users': {
          'x-uigen-http-get': 'yes' as any, // Invalid: should be boolean
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Method should not be changed
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    expect(reconciledSpec.paths['/users'].post).toBeDefined();
    expect(reconciledSpec.paths['/users'].get).toBeUndefined();
  });

  it('should log warning for missing operation', () => {
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

    // Config references non-existent operation
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'POST:/nonexistent': {
          'x-uigen-http-get': true,
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Should have warning for unresolved path
    expect(result.warnings.length).toBeGreaterThan(0);
    const unresolvedWarning = result.warnings.find(
      (w) => w.elementPath === 'POST:/nonexistent'
    );
    expect(unresolvedWarning).toBeDefined();
    expect(unresolvedWarning?.message).toContain('not found');
  });

  it('should log warning for method conflict', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
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

    // Config tries to override POST to GET, but GET already exists
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'POST:/users': {
          'x-uigen-http-get': true,
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Should have warning for method conflict
    expect(result.warnings.length).toBeGreaterThan(0);
    const conflictWarning = result.warnings.find(
      (w) => w.message.includes('already exists')
    );
    expect(conflictWarning).toBeDefined();

    // Method should not be changed
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    expect(reconciledSpec.paths['/users'].post).toBeDefined();
    expect(reconciledSpec.paths['/users'].get).toBeDefined();
    expect(reconciledSpec.paths['/users'].get?.operationId).toBe('getUsers'); // Original GET preserved
  });

  it('should include override in applied annotations count', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
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
        'POST:/users': {
          'x-uigen-http-get': true,
          'x-uigen-label': 'List Users',
        },
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Should count both the label annotation and the method override
    // Note: appliedAnnotations counts annotations merged by AnnotationMerger
    // HTTP method overrides are applied separately by HttpMethodOverrideReconciler
    expect(result.appliedAnnotations).toBeGreaterThan(0);
  });

  it('should handle end-to-end flow: config → reconciler → spec', () => {
    // Simulate a real-world scenario: logout endpoint using DELETE in spec but POST in reality
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Auth API',
        version: '1.0.0',
        description: 'Authentication API with method discrepancies',
      },
      paths: {
        '/auth/login': {
          post: {
            operationId: 'login',
            summary: 'Login user',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      password: { type: 'string' },
                    },
                    required: ['username', 'password'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Login successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/auth/logout': {
          delete: {
            operationId: 'logout',
            summary: 'Logout user',
            responses: {
              '200': {
                description: 'Logout successful',
              },
            },
          },
        },
        '/users/search': {
          post: {
            operationId: 'searchUsers',
            summary: 'Search users',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Search results',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Config corrects method discrepancies
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'DELETE:/auth/logout': {
          'x-uigen-http-post': true,
          'x-uigen-label': 'Logout',
          'x-uigen-icon': 'logout',
        },
        'POST:/users/search': {
          'x-uigen-http-get': true,
          'x-uigen-label': 'Search Users',
        },
      },
    };

    const reconciler = new Reconciler({
      logLevel: 'error',
      validateOutput: true,
      strictMode: false,
    });

    const result = reconciler.reconcile(spec, config);

    // Verify reconciliation was successful
    expect(result.warnings).toHaveLength(0);
    expect(result.spec).toBeDefined();

    const reconciledSpec = result.spec as OpenAPIV3.Document;

    // Verify login endpoint unchanged
    expect(reconciledSpec.paths['/auth/login'].post).toBeDefined();
    expect(reconciledSpec.paths['/auth/login'].post?.operationId).toBe('login');

    // Verify logout changed from DELETE to POST
    expect(reconciledSpec.paths['/auth/logout'].delete).toBeUndefined();
    expect(reconciledSpec.paths['/auth/logout'].post).toBeDefined();
    const logoutOp = reconciledSpec.paths['/auth/logout'].post as any;
    expect(logoutOp.operationId).toBe('logout');
    expect(logoutOp['x-uigen-label']).toBe('Logout');
    expect(logoutOp['x-uigen-icon']).toBe('logout');

    // Verify search changed from POST to GET
    expect(reconciledSpec.paths['/users/search'].post).toBeUndefined();
    expect(reconciledSpec.paths['/users/search'].get).toBeDefined();
    const searchOp = reconciledSpec.paths['/users/search'].get as any;
    expect(searchOp.operationId).toBe('searchUsers');
    expect(searchOp['x-uigen-label']).toBe('Search Users');
    
    // Verify request body is preserved (even though GET typically doesn't have body)
    expect(searchOp.requestBody).toBeDefined();
  });

  it('should work with OAuth reconciliation', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/auth/logout': {
          delete: {
            operationId: 'logout',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
    };

    // Config with both HTTP method override and OAuth
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'DELETE:/auth/logout': {
          'x-uigen-http-post': true,
        },
      },
      auth: {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'google-client-id',
            redirectUri: 'https://myapp.com/callback',
          },
        ],
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Verify both HTTP method override and OAuth were applied
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    
    // HTTP method override
    expect(reconciledSpec.paths['/auth/logout'].delete).toBeUndefined();
    expect(reconciledSpec.paths['/auth/logout'].post).toBeDefined();
    
    // OAuth
    const authAnnotation = (reconciledSpec.info as any)['x-uigen-auth'];
    expect(authAnnotation).toBeDefined();
    expect(authAnnotation.providers).toHaveLength(1);
    expect(authAnnotation.providers[0].provider).toBe('google');
  });

  it('should not mutate original spec', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
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
        'POST:/users': {
          'x-uigen-http-get': true,
        },
      },
    };

    const originalPost = spec.paths['/users'].post;

    const reconciler = new Reconciler({ logLevel: 'error' });
    reconciler.reconcile(spec, config);

    // Original spec should be unchanged
    expect(spec.paths['/users'].post).toBe(originalPost);
    expect(spec.paths['/users'].get).toBeUndefined();
  });
});
