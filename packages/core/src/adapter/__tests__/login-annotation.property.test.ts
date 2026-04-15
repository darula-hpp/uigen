import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3';
import { Swagger2Adapter } from '../swagger2';
import type { OpenAPIV3 } from 'openapi-types';

describe('Login Annotation - Property Tests', () => {
  /**
   * Property 8: Backward Compatibility
   * 
   * **Feature: login-endpoint-annotation, Property 8**
   * 
   * For any OpenAPI spec without `x-uigen-login` annotations, the loginEndpoints 
   * array SHALL contain exactly the same endpoints as would be detected by the 
   * auto-detection logic alone.
   * 
   * This property ensures that the introduction of the `x-uigen-login` annotation 
   * feature does not break existing auto-detection behavior. Specs without 
   * annotations should continue to work exactly as they did before this feature.
   * 
   * **Validates: Requirements 2.4, 8.1, 8.2, 8.3, 8.4**
   */
  it('Property 8: maintains backward compatibility for specs without annotations', () => {
    // Generator for login-like paths
    const loginPathGen = fc.oneof(
      fc.constant('/login'),
      fc.constant('/auth/login'),
      fc.constant('/signin'),
      fc.constant('/auth/signin'),
      fc.constant('/api/login'),
      fc.constant('/api/auth/login')
    );

    // Generator for login-like summaries/descriptions
    // Note: These must match the auto-detection regex: /\b(login|authenticate|sign\s*in)\b/
    const loginDescriptionGen = fc.oneof(
      fc.constant('User login'),
      fc.constant('Authenticate user'),
      fc.constant('Sign in to the application'),
      fc.constant('Login with credentials'),
      fc.constant('Authenticate with credentials')
    );

    // Generator for credential field names
    const credentialFieldGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email')
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for non-login paths
    const nonLoginPathGen = fc.oneof(
      fc.constant('/users'),
      fc.constant('/api/users'),
      fc.constant('/products'),
      fc.constant('/api/products'),
      fc.constant('/orders'),
      fc.constant('/api/data')
    );

    // Generator for a login endpoint detected by path pattern
    const pathBasedLoginGen = fc.record({
      path: loginPathGen,
      hasRequestBody: fc.boolean(),
      hasResponse: fc.boolean(),
      tokenField: tokenFieldGen
    });

    // Generator for a login endpoint detected by description
    const descriptionBasedLoginGen = fc.record({
      path: nonLoginPathGen,
      description: loginDescriptionGen,
      hasRequestBody: fc.boolean(),
      hasResponse: fc.boolean(),
      tokenField: tokenFieldGen
    });

    // Generator for a login endpoint detected by credential fields
    const credentialBasedLoginGen = fc.record({
      path: fc.oneof(
        fc.constant('/api/auth'),
        fc.constant('/api/session'),
        fc.constant('/auth/session')
      ),
      credentialField: credentialFieldGen,
      hasResponse: fc.boolean(),
      tokenField: tokenFieldGen
    });

    // Generator for a spec with various auto-detectable login endpoints
    const specGen = fc.record({
      pathBasedLogins: fc.array(pathBasedLoginGen, { minLength: 0, maxLength: 2 }),
      descriptionBasedLogins: fc.array(descriptionBasedLoginGen, { minLength: 0, maxLength: 2 }),
      credentialBasedLogins: fc.array(credentialBasedLoginGen, { minLength: 0, maxLength: 2 })
    });

    fc.assert(
      fc.property(specGen, (config) => {
        const paths: Record<string, any> = {};

        // Add path-based login endpoints
        config.pathBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          paths[uniquePath] = {
            post: {
              summary: 'Login endpoint',
              ...(login.hasRequestBody && {
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
                }
              }),
              responses: {
                '200': {
                  description: 'Success',
                  ...(login.hasResponse && {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            [login.tokenField]: { type: 'string' }
                          }
                        }
                      }
                    }
                  })
                }
              }
            }
          };
        });

        // Add description-based login endpoints
        config.descriptionBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          paths[uniquePath] = {
            post: {
              summary: login.description,
              ...(login.hasRequestBody && {
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
                }
              }),
              responses: {
                '200': {
                  description: 'Success',
                  ...(login.hasResponse && {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            [login.tokenField]: { type: 'string' }
                          }
                        }
                      }
                    }
                  })
                }
              }
            }
          };
        });

        // Add credential-based login endpoints
        config.credentialBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          paths[uniquePath] = {
            post: {
              summary: 'Create session',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        [login.credentialField]: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  ...(login.hasResponse && {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            [login.tokenField]: { type: 'string' }
                          }
                        }
                      }
                    }
                  })
                }
              }
            }
          };
        });

        // Create the spec WITHOUT any x-uigen-login annotations
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Calculate expected number of login endpoints
        const expectedCount = 
          config.pathBasedLogins.length +
          config.descriptionBasedLogins.length +
          config.credentialBasedLogins.length;

        // Verify that the number of detected endpoints matches expectations
        const actualCount = app.auth.loginEndpoints?.length || 0;
        expect(actualCount).toBe(expectedCount);

        // Verify that all detected endpoints are POST operations
        if (app.auth.loginEndpoints) {
          app.auth.loginEndpoints.forEach(endpoint => {
            expect(endpoint.method).toBe('POST');
          });
        }

        // Verify that all detected endpoints have valid paths
        if (app.auth.loginEndpoints) {
          app.auth.loginEndpoints.forEach(endpoint => {
            expect(endpoint.path).toBeDefined();
            expect(typeof endpoint.path).toBe('string');
            expect(endpoint.path.length).toBeGreaterThan(0);
          });
        }

        // Verify that all detected endpoints have token paths
        if (app.auth.loginEndpoints) {
          app.auth.loginEndpoints.forEach(endpoint => {
            expect(endpoint.tokenPath).toBeDefined();
            expect(typeof endpoint.tokenPath).toBe('string');
          });
        }

        // Verify that path-based detection still works
        config.pathBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          const detected = app.auth.loginEndpoints?.find(e => e.path === uniquePath);
          expect(detected).toBeDefined();
        });

        // Verify that description-based detection still works
        config.descriptionBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          const detected = app.auth.loginEndpoints?.find(e => e.path === uniquePath);
          expect(detected).toBeDefined();
        });

        // Verify that credential-based detection still works
        config.credentialBasedLogins.forEach((login, index) => {
          const uniquePath = `${login.path}${index > 0 ? index : ''}`;
          const detected = app.auth.loginEndpoints?.find(e => e.path === uniquePath);
          expect(detected).toBeDefined();
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Invalid Placement Ignored
   * 
   * **Feature: login-endpoint-annotation, Property 9**
   * 
   * For any OpenAPI spec with `x-uigen-login` placed on path items, request body 
   * schemas, or response schemas (not on operation objects), the annotation SHALL 
   * be ignored and not affect login endpoint detection.
   * 
   * This property ensures that the parser only recognizes `x-uigen-login` when 
   * placed in the correct location (directly on operation objects). Invalid 
   * placements should be silently ignored, allowing auto-detection to proceed 
   * normally.
   * 
   * **Validates: Requirements 3.2, 3.3, 3.4**
   */
  it('Property 9: ignores x-uigen-login in invalid placements', () => {
    // Generator for paths that would NOT be auto-detected as login endpoints
    const nonLoginPathGen = fc.oneof(
      fc.constant('/users'),
      fc.constant('/api/users'),
      fc.constant('/products'),
      fc.constant('/api/products'),
      fc.constant('/orders'),
      fc.constant('/api/data'),
      fc.constant('/api/items'),
      fc.constant('/resources')
    );

    // Generator for non-login descriptions
    const nonLoginDescriptionGen = fc.oneof(
      fc.constant('Create a new user'),
      fc.constant('Update user data'),
      fc.constant('Fetch products'),
      fc.constant('Process order'),
      fc.constant('Get data')
    );

    // Generator for invalid placement scenarios
    const invalidPlacementGen = fc.record({
      path: nonLoginPathGen,
      description: nonLoginDescriptionGen,
      // Which invalid placements to test
      onPathItem: fc.boolean(),
      onRequestBody: fc.boolean(),
      onResponse: fc.boolean(),
      // Whether to also have a valid auto-detectable login endpoint
      hasValidLoginEndpoint: fc.boolean()
    });

    fc.assert(
      fc.property(invalidPlacementGen, (config) => {
        const paths: Record<string, any> = {};

        // Create a path item with x-uigen-login in invalid locations
        const pathItem: any = {};

        // Invalid placement 1: On path item object (Requirements 3.2)
        if (config.onPathItem) {
          pathItem['x-uigen-login'] = true;
        }

        // Create the POST operation WITHOUT x-uigen-login on the operation itself
        pathItem.post = {
          summary: config.description,
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' }
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
                      id: { type: 'string' },
                      status: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };

        // Invalid placement 2: On request body schema (Requirements 3.3)
        if (config.onRequestBody) {
          pathItem.post.requestBody.content['application/json'].schema['x-uigen-login'] = true;
        }

        // Invalid placement 3: On response schema (Requirements 3.4)
        if (config.onResponse) {
          pathItem.post.responses['200'].content['application/json'].schema['x-uigen-login'] = true;
        }

        paths[config.path] = pathItem;

        // Optionally add a valid auto-detectable login endpoint for comparison
        if (config.hasValidLoginEndpoint) {
          paths['/auth/login'] = {
            post: {
              summary: 'User login',
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

        // Create the spec with invalid placements
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // The endpoint with invalid placements should NOT be detected as a login endpoint
        const invalidEndpoint = app.auth.loginEndpoints?.find(e => e.path === config.path);
        expect(invalidEndpoint).toBeUndefined();

        // If we added a valid login endpoint, it should be detected
        if (config.hasValidLoginEndpoint) {
          const validEndpoint = app.auth.loginEndpoints?.find(e => e.path === '/auth/login');
          expect(validEndpoint).toBeDefined();
          expect(validEndpoint?.method).toBe('POST');
        } else {
          // If no valid login endpoint, the array should be empty or undefined
          expect(app.auth.loginEndpoints?.length || 0).toBe(0);
        }

        // Verify that the total count matches expectations
        const expectedCount = config.hasValidLoginEndpoint ? 1 : 0;
        expect(app.auth.loginEndpoints?.length || 0).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Request Body Schema Extraction
   * 
   * **Feature: login-endpoint-annotation, Property 10**
   * 
   * For any operation with `x-uigen-login: true` and a requestBody, the resulting 
   * LoginEndpoint SHALL contain the extracted requestBody schema.
   * 
   * This property ensures that annotated login endpoints correctly extract and 
   * include the request body schema in the LoginEndpoint object, allowing the UI 
   * to generate appropriate login forms.
   * 
   * **Validates: Requirements 4.1**
   */
  it('Property 10: extracts request body schema from annotated endpoints', () => {
    // Generator for schema property types
    const schemaTypeGen = fc.oneof(
      fc.constant('string'),
      fc.constant('number'),
      fc.constant('integer'),
      fc.constant('boolean')
    );

    // Generator for credential field names
    const credentialFieldGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('user'),
      fc.constant('login'),
      fc.constant('identifier')
    );

    // Generator for password field names
    const passwordFieldGen = fc.oneof(
      fc.constant('password'),
      fc.constant('pass'),
      fc.constant('pwd'),
      fc.constant('secret')
    );

    // Generator for additional optional fields
    const additionalFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('rememberMe'),
        fc.constant('deviceId'),
        fc.constant('clientId'),
        fc.constant('domain')
      ),
      type: schemaTypeGen
    });

    // Generator for request body schema
    const requestBodySchemaGen = fc.record({
      credentialField: credentialFieldGen,
      passwordField: passwordFieldGen,
      credentialType: schemaTypeGen,
      passwordType: schemaTypeGen,
      additionalFields: fc.array(additionalFieldGen, { minLength: 0, maxLength: 3 }),
      hasDescription: fc.boolean(),
      hasRequired: fc.boolean()
    }).map(schema => {
      // Deduplicate additional field names to avoid conflicts
      const seenNames = new Set<string>();
      const uniqueFields = schema.additionalFields.filter(field => {
        if (seenNames.has(field.name)) {
          return false;
        }
        seenNames.add(field.name);
        return true;
      });
      return {
        ...schema,
        additionalFields: uniqueFields
      };
    });

    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin')
    );

    // Generator for annotated login endpoint with request body
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      requestBodySchema: requestBodySchemaGen,
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      )
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        // Build the request body schema properties
        const properties: Record<string, any> = {
          [config.requestBodySchema.credentialField]: {
            type: config.requestBodySchema.credentialType,
            ...(config.requestBodySchema.hasDescription && {
              description: `User ${config.requestBodySchema.credentialField}`
            })
          },
          [config.requestBodySchema.passwordField]: {
            type: config.requestBodySchema.passwordType,
            ...(config.requestBodySchema.hasDescription && {
              description: 'User password'
            })
          }
        };

        // Add additional fields
        config.requestBodySchema.additionalFields.forEach(field => {
          properties[field.name] = {
            type: field.type,
            ...(config.requestBodySchema.hasDescription && {
              description: `Additional field: ${field.name}`
            })
          };
        });

        // Build required array
        const required = config.requestBodySchema.hasRequired
          ? [config.requestBodySchema.credentialField, config.requestBodySchema.passwordField]
          : undefined;

        // Create the spec with annotated endpoint
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            [config.path]: {
              post: {
                'x-uigen-login': true,
                ...(config.hasSummary && { summary: config.summary }),
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties,
                        ...(required && { required })
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

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // Verify basic endpoint properties
        expect(endpoint.path).toBe(config.path);
        expect(endpoint.method).toBe('POST');

        // Verify that requestBodySchema is extracted and defined
        expect(endpoint.requestBodySchema).toBeDefined();
        expect(endpoint.requestBodySchema).not.toBeNull();

        // Verify that the schema is an object type
        expect(endpoint.requestBodySchema.type).toBe('object');

        // Verify that the schema has children (properties)
        expect(endpoint.requestBodySchema.children).toBeDefined();
        expect(endpoint.requestBodySchema.children!.length).toBeGreaterThan(0);

        // Verify that credential field is present in the schema
        const credentialField = endpoint.requestBodySchema.children!.find(
          c => c.key === config.requestBodySchema.credentialField
        );
        expect(credentialField).toBeDefined();
        expect(credentialField?.type).toBeDefined();

        // Verify that password field is present in the schema
        const passwordField = endpoint.requestBodySchema.children!.find(
          c => c.key === config.requestBodySchema.passwordField
        );
        expect(passwordField).toBeDefined();
        expect(passwordField?.type).toBeDefined();

        // Verify that additional fields are present in the schema
        config.requestBodySchema.additionalFields.forEach(field => {
          const additionalField = endpoint.requestBodySchema.children!.find(
            c => c.key === field.name
          );
          expect(additionalField).toBeDefined();
        });

        // Verify that the total number of children matches
        const expectedPropertyCount = 
          2 + // credential + password
          config.requestBodySchema.additionalFields.length;
        expect(endpoint.requestBodySchema.children!.length).toBe(expectedPropertyCount);

        // Verify that the schema key is set (should be 'credentials')
        expect(endpoint.requestBodySchema.key).toBe('credentials');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Missing Request Body Handling
   * 
   * **Feature: login-endpoint-annotation, Property 11**
   * 
   * For any operation with `x-uigen-login: true` and no requestBody, the resulting 
   * LoginEndpoint SHALL be included with requestBodySchema set to undefined.
   * 
   * This property ensures that annotated login endpoints without request bodies 
   * are still included in the loginEndpoints array, with the requestBodySchema 
   * field set to undefined. This allows the system to handle APIs that use 
   * alternative authentication methods (e.g., query parameters, headers).
   * 
   * **Validates: Requirements 4.2**
   */
  it('Property 11: includes annotated endpoints without request body', () => {
    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token')
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken'),
      fc.constant('authToken')
    );

    // Generator for response status codes
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for annotated login endpoint WITHOUT request body
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      tokenField: tokenFieldGen,
      statusCode: statusCodeGen,
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session'),
        fc.constant('Get auth token')
      ),
      hasDescription: fc.boolean(),
      description: fc.oneof(
        fc.constant('Authenticates a user and returns a token'),
        fc.constant('Login using query parameters'),
        fc.constant('Create a new session'),
        fc.constant('Obtain authentication token')
      ),
      // Whether to include additional non-login endpoints
      hasOtherEndpoints: fc.boolean()
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        const paths: Record<string, any> = {};

        // Create the annotated endpoint WITHOUT requestBody
        paths[config.path] = {
          post: {
            'x-uigen-login': true as any,
            ...(config.hasSummary && { summary: config.summary }),
            ...(config.hasDescription && { description: config.description }),
            // NO requestBody field
            responses: {
              [config.statusCode]: {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        [config.tokenField]: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        // Optionally add other non-login endpoints to ensure they don't interfere
        if (config.hasOtherEndpoints) {
          paths['/api/users'] = {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          };
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected and included
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // Verify basic endpoint properties
        expect(endpoint.path).toBe(config.path);
        expect(endpoint.method).toBe('POST');

        // CRITICAL: Verify that requestBodySchema is undefined (not null, not an empty object)
        expect(endpoint.requestBodySchema).toBeUndefined();

        // Verify that tokenPath is still extracted correctly
        expect(endpoint.tokenPath).toBeDefined();
        expect(typeof endpoint.tokenPath).toBe('string');
        // The token path should either be the field name or a path to it
        expect(endpoint.tokenPath.length).toBeGreaterThan(0);

        // Verify that description is extracted if present
        if (config.hasSummary) {
          expect(endpoint.description).toBe(config.summary);
        } else if (config.hasDescription) {
          expect(endpoint.description).toBe(config.description);
        }

        // Verify that the endpoint is still functional despite missing requestBody
        expect(endpoint).toMatchObject({
          path: config.path,
          method: 'POST',
          tokenPath: expect.any(String)
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Schema Extraction Consistency
   * 
   * **Feature: login-endpoint-annotation, Property 12**
   * 
   * For any request body schema, the schema extraction logic SHALL produce 
   * identical SchemaNode output regardless of whether the endpoint was detected 
   * via annotation or auto-detection.
   * 
   * This property ensures that the schema resolution logic is consistent across 
   * both detection methods. The same OpenAPI schema should produce the same 
   * SchemaNode structure whether the endpoint has `x-uigen-login: true` or is 
   * detected automatically by path pattern, description, or credential fields.
   * 
   * **Validates: Requirements 4.3**
   */
  it('Property 12: produces consistent schema extraction for annotation and auto-detection', () => {
    // Generator for schema property types
    const schemaTypeGen = fc.oneof(
      fc.constant('string'),
      fc.constant('number'),
      fc.constant('integer'),
      fc.constant('boolean')
    );

    // Generator for property names
    const propertyNameGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('password'),
      fc.constant('token'),
      fc.constant('userId'),
      fc.constant('apiKey'),
      fc.constant('clientId'),
      fc.constant('secret')
    );

    // Generator for a schema property
    const schemaPropertyGen = fc.record({
      name: propertyNameGen,
      type: schemaTypeGen,
      hasDescription: fc.boolean(),
      description: fc.string({ minLength: 5, maxLength: 50 }),
      hasMinLength: fc.boolean(),
      minLength: fc.integer({ min: 1, max: 100 }),
      hasMaxLength: fc.boolean(),
      maxLength: fc.integer({ min: 1, max: 200 }),
      hasPattern: fc.boolean(),
      pattern: fc.oneof(
        fc.constant('^[a-zA-Z0-9]+$'),
        fc.constant('^[a-z]+$'),
        fc.constant('^\\d+$')
      )
    });

    // Generator for request body schema
    const requestBodySchemaGen = fc.record({
      properties: fc.array(schemaPropertyGen, { minLength: 1, maxLength: 5 }),
      hasRequired: fc.boolean(),
      hasAdditionalProperties: fc.boolean()
    }).map(schema => {
      // Deduplicate property names to avoid conflicts
      const seenNames = new Set<string>();
      const uniqueProperties = schema.properties.filter(prop => {
        if (seenNames.has(prop.name)) {
          return false;
        }
        seenNames.add(prop.name);
        return true;
      });
      return {
        ...schema,
        properties: uniqueProperties
      };
    });

    fc.assert(
      fc.property(requestBodySchemaGen, (schemaConfig) => {
        // Build the request body schema properties
        const properties: Record<string, any> = {};
        schemaConfig.properties.forEach(prop => {
          const propSchema: any = {
            type: prop.type
          };

          if (prop.hasDescription) {
            propSchema.description = prop.description;
          }

          if (prop.type === 'string') {
            if (prop.hasMinLength) {
              propSchema.minLength = prop.minLength;
            }
            if (prop.hasMaxLength) {
              propSchema.maxLength = prop.maxLength;
            }
            if (prop.hasPattern) {
              propSchema.pattern = prop.pattern;
            }
          }

          properties[prop.name] = propSchema;
        });

        // Build required array (use first two properties if hasRequired is true)
        const required = schemaConfig.hasRequired && schemaConfig.properties.length >= 2
          ? [schemaConfig.properties[0].name, schemaConfig.properties[1].name]
          : undefined;

        // Create the shared request body schema
        const requestBodySchema: any = {
          type: 'object',
          properties,
          ...(required && { required }),
          ...(schemaConfig.hasAdditionalProperties && { additionalProperties: false })
        };

        // Create two specs: one with annotation, one with auto-detection
        
        // Spec 1: Annotated endpoint (can use any path)
        const annotatedSpec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Annotated API', version: '1.0.0' },
          paths: {
            '/api/custom/authenticate': {
              post: {
                'x-uigen-login': true as any,
                summary: 'Custom authentication endpoint',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: requestBodySchema
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

        // Spec 2: Auto-detected endpoint (using path pattern)
        const autoDetectedSpec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Auto-detected API', version: '1.0.0' },
          paths: {
            '/auth/login': {
              post: {
                summary: 'Login endpoint',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: requestBodySchema
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

        // Adapt both specs
        const annotatedAdapter = new OpenAPI3Adapter(annotatedSpec);
        const annotatedApp = annotatedAdapter.adapt();

        const autoDetectedAdapter = new OpenAPI3Adapter(autoDetectedSpec);
        const autoDetectedApp = autoDetectedAdapter.adapt();

        // Both should have exactly one login endpoint
        expect(annotatedApp.auth.loginEndpoints).toBeDefined();
        expect(annotatedApp.auth.loginEndpoints?.length).toBe(1);
        expect(autoDetectedApp.auth.loginEndpoints).toBeDefined();
        expect(autoDetectedApp.auth.loginEndpoints?.length).toBe(1);

        const annotatedEndpoint = annotatedApp.auth.loginEndpoints![0];
        const autoDetectedEndpoint = autoDetectedApp.auth.loginEndpoints![0];

        // Both should have request body schemas
        expect(annotatedEndpoint.requestBodySchema).toBeDefined();
        expect(autoDetectedEndpoint.requestBodySchema).toBeDefined();

        // CRITICAL: The schemas should be structurally identical
        
        // 1. Same type
        expect(annotatedEndpoint.requestBodySchema.type).toBe(autoDetectedEndpoint.requestBodySchema.type);
        expect(annotatedEndpoint.requestBodySchema.type).toBe('object');

        // 2. Same key
        expect(annotatedEndpoint.requestBodySchema.key).toBe(autoDetectedEndpoint.requestBodySchema.key);
        expect(annotatedEndpoint.requestBodySchema.key).toBe('credentials');

        // 3. Same number of children
        expect(annotatedEndpoint.requestBodySchema.children).toBeDefined();
        expect(autoDetectedEndpoint.requestBodySchema.children).toBeDefined();
        expect(annotatedEndpoint.requestBodySchema.children!.length).toBe(
          autoDetectedEndpoint.requestBodySchema.children!.length
        );
        expect(annotatedEndpoint.requestBodySchema.children!.length).toBe(
          schemaConfig.properties.length
        );

        // 4. Same children properties (order-independent comparison)
        const annotatedChildren = annotatedEndpoint.requestBodySchema.children!;
        const autoDetectedChildren = autoDetectedEndpoint.requestBodySchema.children!;

        schemaConfig.properties.forEach(prop => {
          const annotatedChild = annotatedChildren.find(c => c.key === prop.name);
          const autoDetectedChild = autoDetectedChildren.find(c => c.key === prop.name);

          // Both should have the property
          expect(annotatedChild).toBeDefined();
          expect(autoDetectedChild).toBeDefined();

          // Same type
          expect(annotatedChild!.type).toBe(autoDetectedChild!.type);

          // Same description (if present)
          if (prop.hasDescription) {
            expect(annotatedChild!.description).toBe(autoDetectedChild!.description);
            expect(annotatedChild!.description).toBe(prop.description);
          }

          // Same validation rules (if present)
          if (prop.type === 'string') {
            if (prop.hasMinLength) {
              const annotatedMinLength = annotatedChild!.validations?.find(v => v.type === 'minLength');
              const autoDetectedMinLength = autoDetectedChild!.validations?.find(v => v.type === 'minLength');
              expect(annotatedMinLength?.value).toBe(autoDetectedMinLength?.value);
              expect(annotatedMinLength?.value).toBe(prop.minLength);
            }
            if (prop.hasMaxLength) {
              const annotatedMaxLength = annotatedChild!.validations?.find(v => v.type === 'maxLength');
              const autoDetectedMaxLength = autoDetectedChild!.validations?.find(v => v.type === 'maxLength');
              expect(annotatedMaxLength?.value).toBe(autoDetectedMaxLength?.value);
              expect(annotatedMaxLength?.value).toBe(prop.maxLength);
            }
            if (prop.hasPattern) {
              const annotatedPattern = annotatedChild!.validations?.find(v => v.type === 'pattern');
              const autoDetectedPattern = autoDetectedChild!.validations?.find(v => v.type === 'pattern');
              expect(annotatedPattern?.value).toBe(autoDetectedPattern?.value);
              expect(annotatedPattern?.value).toBe(prop.pattern);
            }
          }

          // Same required status
          expect(annotatedChild!.required).toBe(autoDetectedChild!.required);
          if (required && (prop.name === schemaConfig.properties[0].name || prop.name === schemaConfig.properties[1].name)) {
            expect(annotatedChild!.required).toBe(true);
          }
        });

        // 5. Verify that the entire schema structure is deeply equal
        // This is a comprehensive check that catches any differences we might have missed
        expect(JSON.stringify(annotatedEndpoint.requestBodySchema)).toBe(
          JSON.stringify(autoDetectedEndpoint.requestBodySchema)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Token Path Detection
   * 
   * **Feature: login-endpoint-annotation, Property 13**
   * 
   * For any operation with `x-uigen-login: true` and a 200/201 response containing 
   * a recognized token field, the LoginEndpoint SHALL have the correct tokenPath 
   * extracted.
   * 
   * This property ensures that annotated login endpoints correctly detect and 
   * extract the token path from the response schema. The token path is used by 
   * the UI to extract the authentication token from the login response.
   * 
   * Recognized token fields: token, accessToken, access_token, bearerToken
   * 
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 13: detects token path from annotated endpoint responses', () => {
    // Generator for recognized token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for response status codes (200 or 201)
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token')
    );

    // Generator for additional response fields (non-token fields)
    const additionalFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('userId'),
        fc.constant('username'),
        fc.constant('email'),
        fc.constant('expiresIn'),
        fc.constant('refreshToken'),
        fc.constant('scope'),
        fc.constant('tokenType')
      ),
      type: fc.oneof(
        fc.constant('string'),
        fc.constant('number'),
        fc.constant('integer')
      )
    });

    // Generator for annotated login endpoint with token in response
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      tokenField: tokenFieldGen,
      statusCode: statusCodeGen,
      additionalFields: fc.array(additionalFieldGen, { minLength: 0, maxLength: 4 }),
      hasRequestBody: fc.boolean(),
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      )
    }).map(config => {
      // Deduplicate additional field names to avoid conflicts with token field
      const seenNames = new Set<string>([config.tokenField.toLowerCase()]);
      const uniqueFields = config.additionalFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenNames.has(fieldName)) {
          return false;
        }
        seenNames.add(fieldName);
        return true;
      });
      return {
        ...config,
        additionalFields: uniqueFields
      };
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        // Build the response schema properties
        const responseProperties: Record<string, any> = {
          [config.tokenField]: {
            type: 'string',
            description: 'Authentication token'
          }
        };

        // Add additional fields
        config.additionalFields.forEach(field => {
          responseProperties[field.name] = {
            type: field.type,
            description: `Additional field: ${field.name}`
          };
        });

        // Build the spec
        const paths: Record<string, any> = {
          [config.path]: {
            post: {
              'x-uigen-login': true as any,
              ...(config.hasSummary && { summary: config.summary }),
              ...(config.hasRequestBody && {
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
                }
              }),
              responses: {
                [config.statusCode]: {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: responseProperties
                      }
                    }
                  }
                }
              }
            }
          }
        };

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // Verify basic endpoint properties
        expect(endpoint.path).toBe(config.path);
        expect(endpoint.method).toBe('POST');

        // CRITICAL: Verify that tokenPath is correctly extracted
        expect(endpoint.tokenPath).toBeDefined();
        expect(typeof endpoint.tokenPath).toBe('string');
        
        // The token path should match the token field name exactly
        // (since it's at the root level of the response)
        expect(endpoint.tokenPath).toBe(config.tokenField);

        // Verify that the token path is not the default value
        // (unless the token field happens to be 'token')
        if (config.tokenField !== 'token') {
          expect(endpoint.tokenPath).not.toBe('token');
        }

        // Verify that the token path points to a valid field in the response
        const tokenFieldExists = Object.keys(responseProperties).includes(config.tokenField);
        expect(tokenFieldExists).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Nested Token Path Detection
   * 
   * **Feature: login-endpoint-annotation, Property 14**
   * 
   * For any operation with `x-uigen-login: true` and a response containing a 
   * nested token field (e.g., data.token, auth.accessToken), the LoginEndpoint 
   * SHALL have the correct dotted path recorded.
   * 
   * This property ensures that annotated login endpoints correctly detect and 
   * extract nested token paths from the response schema. Many APIs return tokens 
   * nested within a data wrapper or auth object, and the system must correctly 
   * build the dotted path to access the token.
   * 
   * **Validates: Requirements 5.3**
   */
  it('Property 14: detects nested token paths from annotated endpoint responses', () => {
    // Generator for recognized token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for nesting container names (first level)
    const containerNameGen = fc.oneof(
      fc.constant('data'),
      fc.constant('auth'),
      fc.constant('result'),
      fc.constant('response'),
      fc.constant('payload'),
      fc.constant('credentials')
    );

    // Generator for response status codes (200 or 201)
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token')
    );

    // Generator for additional fields in the nested object (alongside the token)
    const additionalNestedFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('userId'),
        fc.constant('expiresIn'),
        fc.constant('refreshToken'),
        fc.constant('scope')
      ),
      type: fc.oneof(
        fc.constant('string'),
        fc.constant('number'),
        fc.constant('integer')
      )
    });

    // Generator for additional fields at the root level (alongside the container)
    const additionalRootFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('status'),
        fc.constant('message'),
        fc.constant('timestamp'),
        fc.constant('requestId')
      ),
      type: fc.oneof(
        fc.constant('string'),
        fc.constant('number'),
        fc.constant('boolean')
      )
    });

    // Generator for annotated login endpoint with nested token in response
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      tokenField: tokenFieldGen,
      containerName: containerNameGen,
      statusCode: statusCodeGen,
      additionalNestedFields: fc.array(additionalNestedFieldGen, { minLength: 0, maxLength: 3 }),
      additionalRootFields: fc.array(additionalRootFieldGen, { minLength: 0, maxLength: 3 }),
      hasRequestBody: fc.boolean(),
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      )
    }).map(config => {
      // Deduplicate additional nested field names to avoid conflicts with token field
      const seenNestedNames = new Set<string>([config.tokenField.toLowerCase()]);
      const uniqueNestedFields = config.additionalNestedFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenNestedNames.has(fieldName)) {
          return false;
        }
        seenNestedNames.add(fieldName);
        return true;
      });

      // Deduplicate additional root field names to avoid conflicts with container name
      const seenRootNames = new Set<string>([config.containerName.toLowerCase()]);
      const uniqueRootFields = config.additionalRootFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenRootNames.has(fieldName)) {
          return false;
        }
        seenRootNames.add(fieldName);
        return true;
      });

      return {
        ...config,
        additionalNestedFields: uniqueNestedFields,
        additionalRootFields: uniqueRootFields
      };
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        // Build the nested object properties (contains the token field)
        const nestedProperties: Record<string, any> = {
          [config.tokenField]: {
            type: 'string',
            description: 'Authentication token'
          }
        };

        // Add additional nested fields
        config.additionalNestedFields.forEach(field => {
          nestedProperties[field.name] = {
            type: field.type,
            description: `Additional nested field: ${field.name}`
          };
        });

        // Build the root response schema properties
        const rootProperties: Record<string, any> = {
          [config.containerName]: {
            type: 'object',
            properties: nestedProperties,
            description: `Container object with authentication data`
          }
        };

        // Add additional root fields
        config.additionalRootFields.forEach(field => {
          rootProperties[field.name] = {
            type: field.type,
            description: `Additional root field: ${field.name}`
          };
        });

        // Build the spec
        const paths: Record<string, any> = {
          [config.path]: {
            post: {
              'x-uigen-login': true as any,
              ...(config.hasSummary && { summary: config.summary }),
              ...(config.hasRequestBody && {
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
                }
              }),
              responses: {
                [config.statusCode]: {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: rootProperties
                      }
                    }
                  }
                }
              }
            }
          }
        };

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // Verify basic endpoint properties
        expect(endpoint.path).toBe(config.path);
        expect(endpoint.method).toBe('POST');

        // CRITICAL: Verify that tokenPath is correctly extracted with dotted notation
        expect(endpoint.tokenPath).toBeDefined();
        expect(typeof endpoint.tokenPath).toBe('string');
        
        // The token path should be in the format: containerName.tokenField
        const expectedTokenPath = `${config.containerName}.${config.tokenField}`;
        expect(endpoint.tokenPath).toBe(expectedTokenPath);

        // Verify that the token path contains a dot (indicating nesting)
        expect(endpoint.tokenPath).toContain('.');

        // Verify that the token path is not the default value
        expect(endpoint.tokenPath).not.toBe('token');

        // Verify that the token path is not just the token field name
        expect(endpoint.tokenPath).not.toBe(config.tokenField);

        // Verify that the token path starts with the container name
        expect(endpoint.tokenPath.startsWith(config.containerName)).toBe(true);

        // Verify that the token path ends with the token field name
        expect(endpoint.tokenPath.endsWith(config.tokenField)).toBe(true);

        // Verify that the path components are correct
        const pathComponents = endpoint.tokenPath.split('.');
        expect(pathComponents.length).toBe(2);
        expect(pathComponents[0]).toBe(config.containerName);
        expect(pathComponents[1]).toBe(config.tokenField);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Token Path Default
   * 
   * **Feature: login-endpoint-annotation, Property 15**
   * 
   * For any operation with `x-uigen-login: true` and a response containing no 
   * recognized token field, the LoginEndpoint SHALL have tokenPath set to "token".
   * 
   * This property ensures that annotated login endpoints default to "token" as 
   * the tokenPath when the response schema does not contain any recognized token 
   * fields (token, accessToken, access_token, bearerToken). This provides a 
   * sensible fallback behavior for APIs with non-standard token field names.
   * 
   * **Validates: Requirements 5.4**
   */
  it('Property 15: defaults tokenPath to "token" when no recognized token field exists', () => {
    // Generator for non-token field names (fields that should NOT be recognized as tokens)
    const nonTokenFieldGen = fc.oneof(
      fc.constant('userId'),
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('id'),
      fc.constant('sessionId'),
      fc.constant('apiKey'),
      fc.constant('key'),
      fc.constant('secret'),
      fc.constant('authCode'),
      fc.constant('code'),
      fc.constant('status'),
      fc.constant('message'),
      fc.constant('data'),
      fc.constant('result'),
      fc.constant('success')
    );

    // Generator for field types
    const fieldTypeGen = fc.oneof(
      fc.constant('string'),
      fc.constant('number'),
      fc.constant('integer'),
      fc.constant('boolean')
    );

    // Generator for response status codes (200 or 201)
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token')
    );

    // Generator for response field
    const responseFieldGen = fc.record({
      name: nonTokenFieldGen,
      type: fieldTypeGen,
      hasDescription: fc.boolean(),
      description: fc.string({ minLength: 5, maxLength: 50 })
    });

    // Generator for annotated login endpoint with response WITHOUT recognized token fields
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      statusCode: statusCodeGen,
      responseFields: fc.array(responseFieldGen, { minLength: 1, maxLength: 5 }),
      hasRequestBody: fc.boolean(),
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      ),
      // Test both flat and nested structures
      useNestedStructure: fc.boolean(),
      containerName: fc.oneof(
        fc.constant('data'),
        fc.constant('result'),
        fc.constant('response'),
        fc.constant('payload')
      )
    }).map(config => {
      // Deduplicate response field names to avoid conflicts
      const seenNames = new Set<string>();
      const uniqueFields = config.responseFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenNames.has(fieldName)) {
          return false;
        }
        seenNames.add(fieldName);
        return true;
      });
      return {
        ...config,
        responseFields: uniqueFields
      };
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        // Build the response schema properties (WITHOUT recognized token fields)
        const responseProperties: Record<string, any> = {};
        
        config.responseFields.forEach(field => {
          responseProperties[field.name] = {
            type: field.type,
            ...(field.hasDescription && { description: field.description })
          };
        });

        // Ensure we don't accidentally include a recognized token field
        // (This is a safety check to ensure the test is valid)
        const recognizedTokenFields = ['token', 'accesstoken', 'access_token', 'bearertoken'];
        Object.keys(responseProperties).forEach(key => {
          expect(recognizedTokenFields).not.toContain(key.toLowerCase());
        });

        // Build the response schema (either flat or nested)
        let responseSchema: any;
        if (config.useNestedStructure) {
          // Nested structure: { containerName: { field1, field2, ... } }
          responseSchema = {
            type: 'object',
            properties: {
              [config.containerName]: {
                type: 'object',
                properties: responseProperties,
                description: 'Container object'
              }
            }
          };
        } else {
          // Flat structure: { field1, field2, ... }
          responseSchema = {
            type: 'object',
            properties: responseProperties
          };
        }

        // Build the spec
        const paths: Record<string, any> = {
          [config.path]: {
            post: {
              'x-uigen-login': true as any,
              ...(config.hasSummary && { summary: config.summary }),
              ...(config.hasRequestBody && {
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
                }
              }),
              responses: {
                [config.statusCode]: {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: responseSchema
                    }
                  }
                }
              }
            }
          }
        };

        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // Verify basic endpoint properties
        expect(endpoint.path).toBe(config.path);
        expect(endpoint.method).toBe('POST');

        // CRITICAL: Verify that tokenPath defaults to "token"
        expect(endpoint.tokenPath).toBeDefined();
        expect(typeof endpoint.tokenPath).toBe('string');
        expect(endpoint.tokenPath).toBe('token');

        // Verify that the default is used even when the response has other fields
        expect(config.responseFields.length).toBeGreaterThan(0);
        
        // Verify that none of the response fields are recognized token fields
        config.responseFields.forEach(field => {
          expect(field.name.toLowerCase()).not.toBe('token');
          expect(field.name.toLowerCase()).not.toBe('accesstoken');
          expect(field.name.toLowerCase()).not.toBe('access_token');
          expect(field.name.toLowerCase()).not.toBe('bearertoken');
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Swagger 2.0 Recognition
   * 
   * **Feature: login-endpoint-annotation, Property 17**
   * 
   * For any Swagger 2.0 operation with `x-uigen-login` annotation, the parser 
   * SHALL recognize and extract the annotation with the same behavior as 
   * OpenAPI 3.x.
   * 
   * This property ensures that the `x-uigen-login` annotation works identically 
   * in both Swagger 2.0 and OpenAPI 3.x specifications. Swagger 2.0 operations 
   * with the annotation should be detected, extracted, and processed the same 
   * way as OpenAPI 3.x operations.
   * 
   * **Validates: Requirements 7.1**
   */
  it('Property 17: recognizes x-uigen-login in Swagger 2.0 operations', () => {
    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token'),
      fc.constant('/api/v2/login'),
      fc.constant('/auth/credentials')
    );

    // Generator for annotation values (boolean or non-boolean)
    const annotationValueGen = fc.oneof(
      fc.constant(true),
      fc.constant(false),
      fc.constant('yes'), // Non-boolean - should be treated as absent
      fc.constant(1), // Non-boolean - should be treated as absent
      fc.constant({ enabled: true }), // Non-boolean - should be treated as absent
      fc.constant([true]) // Non-boolean - should be treated as absent
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for credential field names
    const credentialFieldGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('user')
    );

    // Generator for Swagger 2.0 operation with x-uigen-login
    const swagger2OperationGen = fc.record({
      path: pathGen,
      annotationValue: annotationValueGen,
      tokenField: tokenFieldGen,
      credentialField: credentialFieldGen,
      hasSummary: fc.boolean(),
      summary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      ),
      hasDescription: fc.boolean(),
      description: fc.oneof(
        fc.constant('Authenticates a user and returns a token'),
        fc.constant('Login using credentials'),
        fc.constant('Create a new session')
      ),
      // Whether to use body parameter or formData parameters
      useBodyParameter: fc.boolean(),
      // Whether to include additional non-login endpoints
      hasOtherEndpoints: fc.boolean()
    });

    fc.assert(
      fc.property(swagger2OperationGen, (config) => {
        const paths: Record<string, any> = {};

        // Create the Swagger 2.0 operation with x-uigen-login annotation
        const operation: any = {
          'x-uigen-login': config.annotationValue
        };

        // Add summary if present
        if (config.hasSummary) {
          operation.summary = config.summary;
        }

        // Add description if present
        if (config.hasDescription) {
          operation.description = config.description;
        }

        // Add parameters (either body or formData)
        if (config.useBodyParameter) {
          operation.parameters = [
            {
              name: 'body',
              in: 'body',
              schema: {
                type: 'object',
                properties: {
                  [config.credentialField]: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          ];
        } else {
          operation.parameters = [
            {
              name: config.credentialField,
              in: 'formData',
              type: 'string',
              required: true
            },
            {
              name: 'password',
              in: 'formData',
              type: 'string',
              required: true
            }
          ];
        }

        // Add response
        operation.responses = {
          '200': {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                [config.tokenField]: { type: 'string' }
              }
            }
          }
        };

        paths[config.path] = {
          post: operation
        };

        // Optionally add other non-login endpoints
        if (config.hasOtherEndpoints) {
          paths['/api/users'] = {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          };
        }

        // Create the Swagger 2.0 spec
        const swagger2Spec = {
          swagger: '2.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec using Swagger2Adapter
        const adapter = new Swagger2Adapter(swagger2Spec);
        const app = adapter.adapt();

        // Determine expected behavior based on annotation value
        const isBooleanTrue = config.annotationValue === true;
        const isBooleanFalse = config.annotationValue === false;
        const isNonBoolean = typeof config.annotationValue !== 'boolean';

        if (isBooleanTrue) {
          // x-uigen-login: true should be recognized and endpoint should be included
          expect(app.auth.loginEndpoints).toBeDefined();
          expect(app.auth.loginEndpoints?.length).toBe(1);

          const endpoint = app.auth.loginEndpoints![0];

          // Verify basic endpoint properties
          expect(endpoint.path).toBe(config.path);
          expect(endpoint.method).toBe('POST');

          // Verify token path is extracted
          expect(endpoint.tokenPath).toBeDefined();
          expect(typeof endpoint.tokenPath).toBe('string');
          expect(endpoint.tokenPath).toBe(config.tokenField);

          // Verify request body schema is extracted
          expect(endpoint.requestBodySchema).toBeDefined();
          expect(endpoint.requestBodySchema.type).toBe('object');
          expect(endpoint.requestBodySchema.children).toBeDefined();
          expect(endpoint.requestBodySchema.children!.length).toBeGreaterThan(0);

          // Verify credential field is present
          const credentialField = endpoint.requestBodySchema.children!.find(
            c => c.key === config.credentialField
          );
          expect(credentialField).toBeDefined();

          // Verify password field is present
          const passwordField = endpoint.requestBodySchema.children!.find(
            c => c.key === 'password'
          );
          expect(passwordField).toBeDefined();

          // Verify description is extracted correctly
          if (config.hasSummary) {
            expect(endpoint.description).toBe(config.summary);
          } else if (config.hasDescription) {
            expect(endpoint.description).toBe(config.description);
          }
        } else if (isBooleanFalse) {
          // x-uigen-login: false should be recognized and endpoint should be excluded
          // Even if the path or other characteristics would trigger auto-detection
          expect(app.auth.loginEndpoints?.length || 0).toBe(0);
        } else if (isNonBoolean) {
          // Non-boolean values should be treated as absent
          // The endpoint may or may not be detected depending on auto-detection
          // We just verify that the system doesn't crash and produces valid output
          expect(app.auth.loginEndpoints).toBeDefined();
          
          // If detected, verify it has valid structure
          if (app.auth.loginEndpoints && app.auth.loginEndpoints.length > 0) {
            const endpoint = app.auth.loginEndpoints[0];
            expect(endpoint.path).toBeDefined();
            expect(endpoint.method).toBe('POST');
            expect(endpoint.tokenPath).toBeDefined();
          }
        }

        // Verify that other endpoints (if present) are not detected as login endpoints
        if (config.hasOtherEndpoints) {
          const userEndpoint = app.auth.loginEndpoints?.find(e => e.path === '/api/users');
          expect(userEndpoint).toBeUndefined();
        }

        // Verify that the adapter correctly converted Swagger 2.0 to OpenAPI 3.x
        // and that the annotation was preserved through the conversion
        expect(app).toBeDefined();
        expect(app.resources).toBeDefined();
        expect(app.auth).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: Swagger 2.0 Validation Consistency
   * 
   * **Feature: login-endpoint-annotation, Property 18**
   * 
   * For any validation rule applied to `x-uigen-login` in OpenAPI 3.x (boolean-only, 
   * placement restrictions), the same rule SHALL apply to Swagger 2.0 operations.
   * 
   * This property ensures that the validation behavior for `x-uigen-login` is 
   * consistent across both OpenAPI 3.x and Swagger 2.0 specifications. Invalid 
   * annotation values (non-boolean) should be treated as absent in both formats, 
   * and invalid placements should be ignored in both formats.
   * 
   * **Validates: Requirements 7.2**
   */
  it('Property 18: applies same validation rules to Swagger 2.0 and OpenAPI 3.x', () => {
    // Generator for invalid (non-boolean) annotation values
    const invalidAnnotationGen = fc.oneof(
      fc.constant('yes'),
      fc.constant('true'),
      fc.constant('false'),
      fc.constant(1),
      fc.constant(0),
      fc.constant({ enabled: true }),
      fc.constant([true]),
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.integer(),
      fc.array(fc.boolean(), { minLength: 1, maxLength: 3 }),
      fc.record({
        value: fc.boolean(),
        enabled: fc.boolean()
      })
    );

    // Generator for paths that would trigger auto-detection
    const autoDetectablePathGen = fc.oneof(
      fc.constant('/login'),
      fc.constant('/auth/login'),
      fc.constant('/signin'),
      fc.constant('/auth/signin')
    );

    // Generator for paths that would NOT trigger auto-detection
    // These paths must NOT contain: login, signin, auth, account, session, token, user, access
    // And must NOT have login-related keywords in summary/description
    const nonAutoDetectablePathGen = fc.oneof(
      fc.constant('/api/custom'),
      fc.constant('/api/verify'),
      fc.constant('/api/v1/validate'),
      fc.constant('/api/check'),
      fc.constant('/api/process')
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for credential field names
    const credentialFieldGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('user')
    );

    // Generator for test scenarios
    const testScenarioGen = fc.record({
      invalidAnnotation: invalidAnnotationGen,
      // Test both auto-detectable and non-auto-detectable paths
      useAutoDetectablePath: fc.boolean(),
      autoDetectablePath: autoDetectablePathGen,
      nonAutoDetectablePath: nonAutoDetectablePathGen,
      tokenField: tokenFieldGen,
      credentialField: credentialFieldGen,
      hasSummary: fc.boolean(),
      // Use login-related summary for auto-detectable paths
      loginSummary: fc.oneof(
        fc.constant('Authenticate user'),
        fc.constant('Login endpoint'),
        fc.constant('Create session')
      ),
      // Use non-login summary for non-auto-detectable paths
      nonLoginSummary: fc.oneof(
        fc.constant('Process request'),
        fc.constant('Handle data'),
        fc.constant('Validate input'),
        fc.constant('Check status'),
        fc.constant('Custom endpoint')
      )
    });

    fc.assert(
      fc.property(testScenarioGen, (config) => {
        const path = config.useAutoDetectablePath 
          ? config.autoDetectablePath 
          : config.nonAutoDetectablePath;
        
        // Use appropriate summary based on path type
        const summary = config.useAutoDetectablePath 
          ? config.loginSummary 
          : config.nonLoginSummary;

        // Create OpenAPI 3.x spec with invalid annotation
        const openapi3Spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'OpenAPI 3.x Test', version: '1.0.0' },
          paths: {
            [path]: {
              post: {
                'x-uigen-login': config.invalidAnnotation as any,
                ...(config.hasSummary && { summary }),
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          [config.credentialField]: { type: 'string' },
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
                            [config.tokenField]: { type: 'string' }
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

        // Create equivalent Swagger 2.0 spec with same invalid annotation
        const swagger2Spec = {
          swagger: '2.0',
          info: { title: 'Swagger 2.0 Test', version: '1.0.0' },
          paths: {
            [path]: {
              post: {
                'x-uigen-login': config.invalidAnnotation as any,
                ...(config.hasSummary && { summary }),
                parameters: [
                  {
                    name: 'body',
                    in: 'body',
                    schema: {
                      type: 'object',
                      properties: {
                        [config.credentialField]: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                ],
                responses: {
                  '200': {
                    description: 'Success',
                    schema: {
                      type: 'object',
                      properties: {
                        [config.tokenField]: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        // Adapt both specs
        const openapi3Adapter = new OpenAPI3Adapter(openapi3Spec);
        const openapi3App = openapi3Adapter.adapt();

        const swagger2Adapter = new Swagger2Adapter(swagger2Spec);
        const swagger2App = swagger2Adapter.adapt();

        // CRITICAL: Both specs should produce the same validation behavior
        // Invalid (non-boolean) annotations should be treated as absent in both formats

        // Determine expected behavior based on whether the path is auto-detectable
        const shouldBeDetected = config.useAutoDetectablePath;

        if (shouldBeDetected) {
          // Auto-detectable paths should be detected in both formats
          // (because the invalid annotation is treated as absent, allowing auto-detection)
          expect(openapi3App.auth.loginEndpoints).toBeDefined();
          expect(openapi3App.auth.loginEndpoints?.length).toBe(1);
          expect(swagger2App.auth.loginEndpoints).toBeDefined();
          expect(swagger2App.auth.loginEndpoints?.length).toBe(1);

          // Both should detect the same path
          expect(openapi3App.auth.loginEndpoints![0].path).toBe(path);
          expect(swagger2App.auth.loginEndpoints![0].path).toBe(path);

          // Both should have POST method
          expect(openapi3App.auth.loginEndpoints![0].method).toBe('POST');
          expect(swagger2App.auth.loginEndpoints![0].method).toBe('POST');

          // Both should extract token path
          expect(openapi3App.auth.loginEndpoints![0].tokenPath).toBeDefined();
          expect(swagger2App.auth.loginEndpoints![0].tokenPath).toBeDefined();
          expect(openapi3App.auth.loginEndpoints![0].tokenPath).toBe(config.tokenField);
          expect(swagger2App.auth.loginEndpoints![0].tokenPath).toBe(config.tokenField);

          // Both should extract request body schema
          expect(openapi3App.auth.loginEndpoints![0].requestBodySchema).toBeDefined();
          expect(swagger2App.auth.loginEndpoints![0].requestBodySchema).toBeDefined();

          // Verify that both have the same number of schema children
          const openapi3Children = openapi3App.auth.loginEndpoints![0].requestBodySchema.children;
          const swagger2Children = swagger2App.auth.loginEndpoints![0].requestBodySchema.children;
          expect(openapi3Children).toBeDefined();
          expect(swagger2Children).toBeDefined();
          expect(openapi3Children!.length).toBe(swagger2Children!.length);

          // Verify that both have the credential field
          const openapi3Credential = openapi3Children!.find(c => c.key === config.credentialField);
          const swagger2Credential = swagger2Children!.find(c => c.key === config.credentialField);
          expect(openapi3Credential).toBeDefined();
          expect(swagger2Credential).toBeDefined();

          // Verify that both have the password field
          const openapi3Password = openapi3Children!.find(c => c.key === 'password');
          const swagger2Password = swagger2Children!.find(c => c.key === 'password');
          expect(openapi3Password).toBeDefined();
          expect(swagger2Password).toBeDefined();
        } else {
          // Non-auto-detectable paths should NOT be detected in either format
          // (because the invalid annotation is treated as absent, and auto-detection doesn't match)
          expect(openapi3App.auth.loginEndpoints?.length || 0).toBe(0);
          expect(swagger2App.auth.loginEndpoints?.length || 0).toBe(0);
        }

        // CRITICAL: Verify that the validation behavior is identical
        // Both should have the same number of login endpoints
        const openapi3Count = openapi3App.auth.loginEndpoints?.length || 0;
        const swagger2Count = swagger2App.auth.loginEndpoints?.length || 0;
        expect(openapi3Count).toBe(swagger2Count);

        // If endpoints were detected, verify they have the same structure
        if (openapi3Count > 0 && swagger2Count > 0) {
          const openapi3Endpoint = openapi3App.auth.loginEndpoints![0];
          const swagger2Endpoint = swagger2App.auth.loginEndpoints![0];

          // Same path
          expect(openapi3Endpoint.path).toBe(swagger2Endpoint.path);

          // Same method
          expect(openapi3Endpoint.method).toBe(swagger2Endpoint.method);

          // Same token path
          expect(openapi3Endpoint.tokenPath).toBe(swagger2Endpoint.tokenPath);

          // Same request body schema structure (both defined or both undefined)
          if (openapi3Endpoint.requestBodySchema) {
            expect(swagger2Endpoint.requestBodySchema).toBeDefined();
            expect(openapi3Endpoint.requestBodySchema.type).toBe(swagger2Endpoint.requestBodySchema.type);
            expect(openapi3Endpoint.requestBodySchema.children?.length).toBe(
              swagger2Endpoint.requestBodySchema.children?.length
            );
          } else {
            expect(swagger2Endpoint.requestBodySchema).toBeUndefined();
          }

          // Same description (if present)
          if (config.hasSummary) {
            expect(openapi3Endpoint.description).toBe(summary);
            expect(swagger2Endpoint.description).toBe(summary);
          }
        }

        // Verify that neither spec crashes or produces errors with invalid annotations
        expect(openapi3App).toBeDefined();
        expect(swagger2App).toBeDefined();
        expect(openapi3App.resources).toBeDefined();
        expect(swagger2App.resources).toBeDefined();
        expect(openapi3App.auth).toBeDefined();
        expect(swagger2App.auth).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Swagger 2.0 Output Equivalence
   * 
   * **Feature: login-endpoint-annotation, Property 19**
   * 
   * For any operation with `x-uigen-login: true`, the LoginEndpoint produced from 
   * a Swagger 2.0 spec SHALL be equivalent to the LoginEndpoint produced from an 
   * equivalent OpenAPI 3.x spec.
   * 
   * This property ensures that the `x-uigen-login` annotation produces identical 
   * LoginEndpoint objects regardless of whether the source specification is 
   * Swagger 2.0 or OpenAPI 3.x. The conversion from Swagger 2.0 to OpenAPI 3.x 
   * must preserve all relevant information (path, method, request body schema, 
   * response schema, token path, description) such that the final LoginEndpoint 
   * objects are structurally identical.
   * 
   * **Validates: Requirements 7.4**
   */
  it('Property 19: produces equivalent LoginEndpoint from Swagger 2.0 and OpenAPI 3.x', () => {
    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token'),
      fc.constant('/api/v2/login'),
      fc.constant('/auth/credentials'),
      fc.constant('/api/session'),
      fc.constant('/login')
    );

    // Generator for credential field names
    const credentialFieldGen = fc.oneof(
      fc.constant('username'),
      fc.constant('email'),
      fc.constant('user'),
      fc.constant('login'),
      fc.constant('identifier')
    );

    // Generator for password field names
    const passwordFieldGen = fc.oneof(
      fc.constant('password'),
      fc.constant('pass'),
      fc.constant('pwd'),
      fc.constant('secret')
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for response status codes (200 or 201)
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for summary text
    const summaryGen = fc.oneof(
      fc.constant('Authenticate user'),
      fc.constant('Login endpoint'),
      fc.constant('Create session'),
      fc.constant('User authentication'),
      fc.constant('Sign in to the application'),
      fc.constant('Obtain access token')
    );

    // Generator for description text
    const descriptionGen = fc.oneof(
      fc.constant('Authenticates a user and returns an access token'),
      fc.constant('Login using username and password'),
      fc.constant('Create a new authenticated session'),
      fc.constant('Authenticate with user credentials')
    );

    // Generator for additional request body fields
    const additionalRequestFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('rememberMe'),
        fc.constant('deviceId'),
        fc.constant('clientId'),
        fc.constant('domain')
      ),
      type: fc.oneof(
        fc.constant('string'),
        fc.constant('boolean'),
        fc.constant('integer')
      )
    });

    // Generator for additional response fields
    const additionalResponseFieldGen = fc.record({
      name: fc.oneof(
        fc.constant('userId'),
        fc.constant('expiresIn'),
        fc.constant('refreshToken'),
        fc.constant('scope'),
        fc.constant('tokenType')
      ),
      type: fc.oneof(
        fc.constant('string'),
        fc.constant('number'),
        fc.constant('integer')
      )
    });

    // Generator for equivalent Swagger 2.0 and OpenAPI 3.x operations
    const equivalentOperationsGen = fc.record({
      path: pathGen,
      credentialField: credentialFieldGen,
      passwordField: passwordFieldGen,
      tokenField: tokenFieldGen,
      statusCode: statusCodeGen,
      hasSummary: fc.boolean(),
      summary: summaryGen,
      hasDescription: fc.boolean(),
      description: descriptionGen,
      additionalRequestFields: fc.array(additionalRequestFieldGen, { minLength: 0, maxLength: 2 }),
      additionalResponseFields: fc.array(additionalResponseFieldGen, { minLength: 0, maxLength: 2 }),
      // Test both flat and nested token responses
      useNestedTokenResponse: fc.boolean(),
      tokenContainer: fc.oneof(
        fc.constant('data'),
        fc.constant('auth'),
        fc.constant('result')
      )
    }).map(config => {
      // Deduplicate additional request field names
      const seenRequestNames = new Set<string>([
        config.credentialField.toLowerCase(),
        config.passwordField.toLowerCase()
      ]);
      const uniqueRequestFields = config.additionalRequestFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenRequestNames.has(fieldName)) {
          return false;
        }
        seenRequestNames.add(fieldName);
        return true;
      });

      // Deduplicate additional response field names
      const seenResponseNames = new Set<string>([config.tokenField.toLowerCase()]);
      const uniqueResponseFields = config.additionalResponseFields.filter(field => {
        const fieldName = field.name.toLowerCase();
        if (seenResponseNames.has(fieldName)) {
          return false;
        }
        seenResponseNames.add(fieldName);
        return true;
      });

      return {
        ...config,
        additionalRequestFields: uniqueRequestFields,
        additionalResponseFields: uniqueResponseFields
      };
    });

    fc.assert(
      fc.property(equivalentOperationsGen, (config) => {
        // Build request body properties
        const requestProperties: Record<string, any> = {
          [config.credentialField]: { type: 'string' },
          [config.passwordField]: { type: 'string' }
        };

        config.additionalRequestFields.forEach(field => {
          requestProperties[field.name] = { type: field.type };
        });

        // Build response properties
        let responseProperties: Record<string, any>;
        
        if (config.useNestedTokenResponse) {
          // Nested token response: { tokenContainer: { token, ...otherFields } }
          const nestedProperties: Record<string, any> = {
            [config.tokenField]: { type: 'string' }
          };
          
          config.additionalResponseFields.forEach(field => {
            nestedProperties[field.name] = { type: field.type };
          });

          responseProperties = {
            [config.tokenContainer]: {
              type: 'object',
              properties: nestedProperties
            }
          };
        } else {
          // Flat token response: { token, ...otherFields }
          responseProperties = {
            [config.tokenField]: { type: 'string' }
          };
          
          config.additionalResponseFields.forEach(field => {
            responseProperties[field.name] = { type: field.type };
          });
        }

        // Create OpenAPI 3.x spec
        const openapi3Spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'OpenAPI 3.x Test', version: '1.0.0' },
          paths: {
            [config.path]: {
              post: {
                'x-uigen-login': true as any,
                ...(config.hasSummary && { summary: config.summary }),
                ...(config.hasDescription && { description: config.description }),
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: requestProperties
                      }
                    }
                  }
                },
                responses: {
                  [config.statusCode]: {
                    description: 'Success',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: responseProperties
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        // Create equivalent Swagger 2.0 spec
        const swagger2Spec = {
          swagger: '2.0',
          info: { title: 'Swagger 2.0 Test', version: '1.0.0' },
          paths: {
            [config.path]: {
              post: {
                'x-uigen-login': true as any,
                ...(config.hasSummary && { summary: config.summary }),
                ...(config.hasDescription && { description: config.description }),
                parameters: [
                  {
                    name: 'body',
                    in: 'body',
                    schema: {
                      type: 'object',
                      properties: requestProperties
                    }
                  }
                ],
                responses: {
                  [config.statusCode]: {
                    description: 'Success',
                    schema: {
                      type: 'object',
                      properties: responseProperties
                    }
                  }
                }
              }
            }
          }
        };

        // Adapt both specs
        const openapi3Adapter = new OpenAPI3Adapter(openapi3Spec);
        const openapi3App = openapi3Adapter.adapt();

        const swagger2Adapter = new Swagger2Adapter(swagger2Spec);
        const swagger2App = swagger2Adapter.adapt();

        // Both should have exactly one login endpoint
        expect(openapi3App.auth.loginEndpoints).toBeDefined();
        expect(openapi3App.auth.loginEndpoints?.length).toBe(1);
        expect(swagger2App.auth.loginEndpoints).toBeDefined();
        expect(swagger2App.auth.loginEndpoints?.length).toBe(1);

        const openapi3Endpoint = openapi3App.auth.loginEndpoints![0];
        const swagger2Endpoint = swagger2App.auth.loginEndpoints![0];

        // CRITICAL: Verify that both endpoints are structurally equivalent

        // 1. Same path (Requirement 6.1)
        expect(openapi3Endpoint.path).toBe(swagger2Endpoint.path);
        expect(openapi3Endpoint.path).toBe(config.path);

        // 2. Same method (Requirement 6.2)
        expect(openapi3Endpoint.method).toBe(swagger2Endpoint.method);
        expect(openapi3Endpoint.method).toBe('POST');

        // 3. Same description (Requirements 6.3, 6.4)
        if (config.hasSummary) {
          expect(openapi3Endpoint.description).toBe(config.summary);
          expect(swagger2Endpoint.description).toBe(config.summary);
        } else if (config.hasDescription) {
          expect(openapi3Endpoint.description).toBe(config.description);
          expect(swagger2Endpoint.description).toBe(config.description);
        } else {
          expect(openapi3Endpoint.description).toBeUndefined();
          expect(swagger2Endpoint.description).toBeUndefined();
        }
        expect(openapi3Endpoint.description).toBe(swagger2Endpoint.description);

        // 4. Same token path (Requirements 5.1, 5.2, 5.3)
        expect(openapi3Endpoint.tokenPath).toBeDefined();
        expect(swagger2Endpoint.tokenPath).toBeDefined();
        expect(openapi3Endpoint.tokenPath).toBe(swagger2Endpoint.tokenPath);
        
        if (config.useNestedTokenResponse) {
          const expectedTokenPath = `${config.tokenContainer}.${config.tokenField}`;
          expect(openapi3Endpoint.tokenPath).toBe(expectedTokenPath);
          expect(swagger2Endpoint.tokenPath).toBe(expectedTokenPath);
        } else {
          expect(openapi3Endpoint.tokenPath).toBe(config.tokenField);
          expect(swagger2Endpoint.tokenPath).toBe(config.tokenField);
        }

        // 5. Same request body schema structure (Requirement 4.1)
        expect(openapi3Endpoint.requestBodySchema).toBeDefined();
        expect(swagger2Endpoint.requestBodySchema).toBeDefined();
        
        // Both should be object type
        expect(openapi3Endpoint.requestBodySchema.type).toBe('object');
        expect(swagger2Endpoint.requestBodySchema.type).toBe('object');
        expect(openapi3Endpoint.requestBodySchema.type).toBe(swagger2Endpoint.requestBodySchema.type);

        // Both should have the same key
        expect(openapi3Endpoint.requestBodySchema.key).toBe('credentials');
        expect(swagger2Endpoint.requestBodySchema.key).toBe('credentials');
        expect(openapi3Endpoint.requestBodySchema.key).toBe(swagger2Endpoint.requestBodySchema.key);

        // Both should have children
        expect(openapi3Endpoint.requestBodySchema.children).toBeDefined();
        expect(swagger2Endpoint.requestBodySchema.children).toBeDefined();

        // Same number of children
        const expectedChildCount = 2 + config.additionalRequestFields.length;
        expect(openapi3Endpoint.requestBodySchema.children!.length).toBe(expectedChildCount);
        expect(swagger2Endpoint.requestBodySchema.children!.length).toBe(expectedChildCount);
        expect(openapi3Endpoint.requestBodySchema.children!.length).toBe(
          swagger2Endpoint.requestBodySchema.children!.length
        );

        // Verify credential field exists in both
        const openapi3Credential = openapi3Endpoint.requestBodySchema.children!.find(
          c => c.key === config.credentialField
        );
        const swagger2Credential = swagger2Endpoint.requestBodySchema.children!.find(
          c => c.key === config.credentialField
        );
        expect(openapi3Credential).toBeDefined();
        expect(swagger2Credential).toBeDefined();
        expect(openapi3Credential!.type).toBe(swagger2Credential!.type);

        // Verify password field exists in both
        const openapi3Password = openapi3Endpoint.requestBodySchema.children!.find(
          c => c.key === config.passwordField
        );
        const swagger2Password = swagger2Endpoint.requestBodySchema.children!.find(
          c => c.key === config.passwordField
        );
        expect(openapi3Password).toBeDefined();
        expect(swagger2Password).toBeDefined();
        expect(openapi3Password!.type).toBe(swagger2Password!.type);

        // Verify additional fields exist in both
        config.additionalRequestFields.forEach(field => {
          const openapi3Field = openapi3Endpoint.requestBodySchema.children!.find(
            c => c.key === field.name
          );
          const swagger2Field = swagger2Endpoint.requestBodySchema.children!.find(
            c => c.key === field.name
          );
          expect(openapi3Field).toBeDefined();
          expect(swagger2Field).toBeDefined();
          expect(openapi3Field!.type).toBe(swagger2Field!.type);
        });

        // 6. Verify complete structural equivalence
        // This is a comprehensive check that catches any differences we might have missed
        expect(JSON.stringify(openapi3Endpoint)).toBe(JSON.stringify(swagger2Endpoint));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Operation Metadata Extraction
   * 
   * **Feature: login-endpoint-annotation, Property 16**
   * 
   * For any operation with `x-uigen-login: true`, the LoginEndpoint SHALL contain 
   * the operation's path, method ("POST"), and description (from summary or 
   * description field).
   * 
   * This property ensures that annotated login endpoints correctly extract and 
   * include operation metadata in the LoginEndpoint object. The metadata includes:
   * - path: The operation's path (e.g., "/api/authenticate")
   * - method: Always "POST" for login endpoints
   * - description: Extracted from summary field if present, otherwise from 
   *   description field, or undefined if neither is present
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('Property 16: extracts operation metadata from annotated endpoints', () => {
    // Generator for paths (can be any path since we're using annotation)
    const pathGen = fc.oneof(
      fc.constant('/api/authenticate'),
      fc.constant('/api/v1/auth'),
      fc.constant('/custom/login'),
      fc.constant('/session/create'),
      fc.constant('/user/signin'),
      fc.constant('/auth/token'),
      fc.constant('/api/v2/login'),
      fc.constant('/auth/credentials'),
      fc.constant('/api/session'),
      fc.constant('/login')
    );

    // Generator for summary text
    const summaryGen = fc.oneof(
      fc.constant('Authenticate user'),
      fc.constant('Login endpoint'),
      fc.constant('Create session'),
      fc.constant('User authentication'),
      fc.constant('Sign in to the application'),
      fc.constant('Obtain access token'),
      fc.constant('Login with credentials')
    );

    // Generator for description text (different from summary)
    const descriptionGen = fc.oneof(
      fc.constant('Authenticates a user and returns an access token'),
      fc.constant('Login using username and password'),
      fc.constant('Create a new authenticated session'),
      fc.constant('Authenticate with user credentials'),
      fc.constant('Sign in to access protected resources'),
      fc.constant('Obtain an authentication token for API access'),
      fc.constant('Login endpoint for user authentication')
    );

    // Generator for token field names
    const tokenFieldGen = fc.oneof(
      fc.constant('token'),
      fc.constant('accessToken'),
      fc.constant('access_token'),
      fc.constant('bearerToken')
    );

    // Generator for response status codes (200 or 201)
    const statusCodeGen = fc.oneof(
      fc.constant('200'),
      fc.constant('201')
    );

    // Generator for metadata scenarios
    const metadataScenarioGen = fc.oneof(
      // Scenario 1: Both summary and description present (summary should be used)
      fc.record({
        hasSummary: fc.constant(true),
        hasDescription: fc.constant(true),
        summary: summaryGen,
        description: descriptionGen
      }),
      // Scenario 2: Only summary present
      fc.record({
        hasSummary: fc.constant(true),
        hasDescription: fc.constant(false),
        summary: summaryGen,
        description: fc.constant('')
      }),
      // Scenario 3: Only description present
      fc.record({
        hasSummary: fc.constant(false),
        hasDescription: fc.constant(true),
        summary: fc.constant(''),
        description: descriptionGen
      }),
      // Scenario 4: Neither summary nor description present
      fc.record({
        hasSummary: fc.constant(false),
        hasDescription: fc.constant(false),
        summary: fc.constant(''),
        description: fc.constant('')
      })
    );

    // Generator for annotated login endpoint with various metadata
    const annotatedEndpointGen = fc.record({
      path: pathGen,
      metadataScenario: metadataScenarioGen,
      tokenField: tokenFieldGen,
      statusCode: statusCodeGen,
      hasRequestBody: fc.boolean(),
      // Whether to include additional endpoints to ensure they don't interfere
      hasOtherEndpoints: fc.boolean()
    });

    fc.assert(
      fc.property(annotatedEndpointGen, (config) => {
        const paths: Record<string, any> = {};

        // Create the annotated endpoint with metadata
        const operation: any = {
          'x-uigen-login': true as any
        };

        // Add summary if present
        if (config.metadataScenario.hasSummary) {
          operation.summary = config.metadataScenario.summary;
        }

        // Add description if present
        if (config.metadataScenario.hasDescription) {
          operation.description = config.metadataScenario.description;
        }

        // Add request body if configured
        if (config.hasRequestBody) {
          operation.requestBody = {
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
          };
        }

        // Add response
        operation.responses = {
          [config.statusCode]: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    [config.tokenField]: { type: 'string' }
                  }
                }
              }
            }
          }
        };

        paths[config.path] = {
          post: operation
        };

        // Optionally add other non-login endpoints to ensure they don't interfere
        if (config.hasOtherEndpoints) {
          paths['/api/users'] = {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          };

          paths['/api/products'] = {
            post: {
              summary: 'Create product',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        price: { type: 'number' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          };
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the endpoint was detected
        expect(app.auth.loginEndpoints).toBeDefined();
        expect(app.auth.loginEndpoints?.length).toBe(1);

        const endpoint = app.auth.loginEndpoints![0];

        // CRITICAL: Verify that path is correctly extracted (Requirement 6.1)
        expect(endpoint.path).toBeDefined();
        expect(typeof endpoint.path).toBe('string');
        expect(endpoint.path).toBe(config.path);

        // CRITICAL: Verify that method is correctly extracted (Requirement 6.2)
        expect(endpoint.method).toBeDefined();
        expect(endpoint.method).toBe('POST');

        // CRITICAL: Verify that description is correctly extracted (Requirements 6.3, 6.4)
        if (config.metadataScenario.hasSummary) {
          // When summary is present, it should be used as the description (Requirement 6.3)
          expect(endpoint.description).toBeDefined();
          expect(endpoint.description).toBe(config.metadataScenario.summary);
          
          // Even if description field is also present, summary takes precedence
          if (config.metadataScenario.hasDescription) {
            expect(endpoint.description).not.toBe(config.metadataScenario.description);
          }
        } else if (config.metadataScenario.hasDescription) {
          // When only description is present (no summary), it should be used (Requirement 6.4)
          expect(endpoint.description).toBeDefined();
          expect(endpoint.description).toBe(config.metadataScenario.description);
        } else {
          // When neither summary nor description is present, description should be undefined
          expect(endpoint.description).toBeUndefined();
        }

        // Verify that the endpoint is complete and functional
        expect(endpoint).toMatchObject({
          path: config.path,
          method: 'POST',
          tokenPath: expect.any(String)
        });

        // Verify that other endpoints (if present) are not detected as login endpoints
        if (config.hasOtherEndpoints) {
          const userEndpoint = app.auth.loginEndpoints?.find(e => e.path === '/api/users');
          expect(userEndpoint).toBeUndefined();
          
          const productEndpoint = app.auth.loginEndpoints?.find(e => e.path === '/api/products');
          expect(productEndpoint).toBeUndefined();
        }

        // Verify that the total count is exactly 1
        expect(app.auth.loginEndpoints?.length).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});
