import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Sign-Up Annotation - Property Tests', () => {
  /**
   * Property 7: Sign-Up Endpoint Creation
   * 
   * **Feature: auth-flow-annotations, Property 7**
   * 
   * For any POST operation annotated with `x-uigen-sign-up: true`, the parser 
   * SHALL append a SignUpEndpoint entry to AuthConfig.signUpEndpoints containing 
   * the operation's path, method (always 'POST'), requestBodySchema (if present), 
   * and description (preferring summary over description).
   * 
   * This property ensures that annotated sign-up endpoints are correctly extracted 
   * and added to the IR with all required fields.
   * 
   * **Validates: Requirements 8.1, 8.3, 8.4, 8.5**
   */
  it('Property 7: creates sign-up endpoint from annotated operation', () => {
    // Generator for sign-up paths
    const pathGen = fc.oneof(
      fc.constant('/auth/register'),
      fc.constant('/api/sign-up'),
      fc.constant('/signup'),
      fc.constant('/api/v1/auth/register'),
      fc.constant('/user/register')
    );

    // Generator for field names
    const fieldNameGen = fc.oneof(
      fc.constant('email'),
      fc.constant('username'),
      fc.constant('password'),
      fc.constant('firstName'),
      fc.constant('lastName'),
      fc.constant('phone')
    );

    // Generator for field types
    const fieldTypeGen = fc.oneof(
      fc.constant('string'),
      fc.constant('number'),
      fc.constant('integer'),
      fc.constant('boolean')
    );

    // Generator for request body schema
    const requestBodySchemaGen = fc.record({
      fields: fc.array(
        fc.record({
          name: fieldNameGen,
          type: fieldTypeGen
        }),
        { minLength: 1, maxLength: 5 }
      )
    }).map(schema => {
      // Deduplicate field names
      const seenNames = new Set<string>();
      const uniqueFields = schema.fields.filter(field => {
        if (seenNames.has(field.name)) {
          return false;
        }
        seenNames.add(field.name);
        return true;
      });
      return { fields: uniqueFields };
    });

    // Generator for descriptions
    const summaryGen = fc.option(
      fc.oneof(
        fc.constant('Register new user'),
        fc.constant('Sign up endpoint'),
        fc.constant('Create user account')
      ),
      { nil: undefined }
    );

    const descriptionGen = fc.option(
      fc.oneof(
        fc.constant('Allows users to create a new account'),
        fc.constant('User registration endpoint'),
        fc.constant('Sign up for the service')
      ),
      { nil: undefined }
    );

    // Generator for annotated sign-up endpoint
    const endpointGen = fc.record({
      path: pathGen,
      requestBodySchema: requestBodySchemaGen,
      summary: summaryGen,
      description: descriptionGen,
      hasRequestBody: fc.boolean()
    });

    fc.assert(
      fc.property(endpointGen, (config) => {
        const paths: Record<string, any> = {};

        // Build request body if present
        const requestBody = config.hasRequestBody ? {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: config.requestBodySchema.fields.reduce((acc, field) => {
                  acc[field.name] = { type: field.type };
                  return acc;
                }, {} as Record<string, any>)
              }
            }
          }
        } : undefined;

        // Create the annotated operation
        paths[config.path] = {
          post: {
            'x-uigen-sign-up': true,
            ...(config.summary && { summary: config.summary }),
            ...(config.description && { description: config.description }),
            ...(requestBody && { requestBody }),
            responses: {
              '201': {
                description: 'User created'
              }
            }
          }
        };

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that signUpEndpoints is defined and has one entry
        expect(app.auth.signUpEndpoints).toBeDefined();
        expect(app.auth.signUpEndpoints?.length).toBe(1);

        const endpoint = app.auth.signUpEndpoints![0];

        // Verify path (Requirement 8.1)
        expect(endpoint.path).toBe(config.path);

        // Verify method is always POST (Requirement 8.1)
        expect(endpoint.method).toBe('POST');

        // Verify requestBodySchema (Requirements 8.3, 8.4)
        if (config.hasRequestBody) {
          expect(endpoint.requestBodySchema).toBeDefined();
          expect(endpoint.requestBodySchema?.type).toBe('object');
          expect(endpoint.requestBodySchema?.children).toBeDefined();
          expect(endpoint.requestBodySchema?.children?.length).toBe(config.requestBodySchema.fields.length);
          
          // Verify all fields are present
          config.requestBodySchema.fields.forEach(field => {
            const schemaField = endpoint.requestBodySchema?.children?.find(c => c.key === field.name);
            expect(schemaField).toBeDefined();
          });
        } else {
          expect(endpoint.requestBodySchema).toBeUndefined();
        }

        // Verify description (Requirement 8.5)
        // Should prefer summary over description
        if (config.summary) {
          expect(endpoint.description).toBe(config.summary);
        } else if (config.description) {
          expect(endpoint.description).toBe(config.description);
        } else {
          expect(endpoint.description).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Explicit Exclusion Enforcement
   * 
   * **Feature: auth-flow-annotations, Property 8**
   * 
   * For any POST operation annotated with `x-uigen-sign-up: false`, the parser 
   * SHALL exclude that operation from AuthConfig.signUpEndpoints, regardless of 
   * whether heuristic detection would otherwise include it.
   * 
   * This property ensures that explicit exclusion annotations are respected, 
   * allowing API authors to prevent false positives from auto-detection.
   * 
   * **Validates: Requirement 8.2**
   */
  it('Property 8: excludes operations with annotation false', () => {
    // Generator for sign-up-like paths that would normally be auto-detected
    const signUpPathGen = fc.oneof(
      fc.constant('/auth/register'),
      fc.constant('/api/sign-up'),
      fc.constant('/signup'),
      fc.constant('/register')
    );

    // Generator for sign-up-like descriptions
    const signUpDescriptionGen = fc.oneof(
      fc.constant('Register new user'),
      fc.constant('Sign up endpoint'),
      fc.constant('Create user account')
    );

    // Generator for a spec with explicitly excluded endpoint
    const specGen = fc.record({
      excludedPath: signUpPathGen,
      excludedDescription: signUpDescriptionGen,
      // Whether to include a valid sign-up endpoint for comparison
      hasValidEndpoint: fc.boolean(),
      validPath: fc.constant('/api/v1/register')
    });

    fc.assert(
      fc.property(specGen, (config) => {
        const paths: Record<string, any> = {};

        // Create the excluded endpoint with annotation false
        paths[config.excludedPath] = {
          post: {
            'x-uigen-sign-up': false,
            summary: config.excludedDescription,
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created'
              }
            }
          }
        };

        // Optionally add a valid sign-up endpoint
        if (config.hasValidEndpoint) {
          paths[config.validPath] = {
            post: {
              'x-uigen-sign-up': true,
              summary: 'Valid sign-up',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
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

        // Verify that the excluded endpoint is NOT in signUpEndpoints
        const excludedEndpoint = app.auth.signUpEndpoints?.find(
          e => e.path === config.excludedPath
        );
        expect(excludedEndpoint).toBeUndefined();

        // Verify the count matches expectations
        if (config.hasValidEndpoint) {
          expect(app.auth.signUpEndpoints?.length).toBe(1);
          const validEndpoint = app.auth.signUpEndpoints?.find(
            e => e.path === config.validPath
          );
          expect(validEndpoint).toBeDefined();
        } else {
          expect(app.auth.signUpEndpoints?.length || 0).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Multiple Endpoint Collection
   * 
   * **Feature: auth-flow-annotations, Property 9**
   * 
   * For any OpenAPI spec with N POST operations where M have `x-uigen-sign-up: true`, 
   * the parser SHALL produce exactly M entries in AuthConfig.signUpEndpoints, one 
   * for each annotated operation.
   * 
   * This property ensures that multiple sign-up endpoints can be defined and all 
   * are correctly collected in the IR.
   * 
   * **Validates: Requirement 7.5**
   */
  it('Property 9: collects multiple sign-up endpoints', () => {
    // Generator for unique paths
    const uniquePathsGen = fc.uniqueArray(
      fc.oneof(
        fc.constant('/auth/register'),
        fc.constant('/api/sign-up'),
        fc.constant('/signup'),
        fc.constant('/api/v1/register'),
        fc.constant('/user/register'),
        fc.constant('/account/create'),
        fc.constant('/api/v2/signup')
      ),
      { minLength: 1, maxLength: 5 }
    );

    // Generator for a spec with multiple sign-up endpoints
    const specGen = fc.record({
      paths: uniquePathsGen,
      // How many should have annotation true
      annotatedCount: fc.integer({ min: 0, max: 5 })
    }).chain(config => {
      // Ensure annotatedCount doesn't exceed paths length
      const actualAnnotatedCount = Math.min(config.annotatedCount, config.paths.length);
      return fc.constant({
        ...config,
        annotatedCount: actualAnnotatedCount
      });
    });

    fc.assert(
      fc.property(specGen, (config) => {
        const paths: Record<string, any> = {};

        // Add annotated endpoints
        for (let i = 0; i < config.annotatedCount; i++) {
          paths[config.paths[i]] = {
            post: {
              'x-uigen-sign-up': true,
              summary: `Sign up ${i}`,
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          };
        }

        // Add non-annotated endpoints
        for (let i = config.annotatedCount; i < config.paths.length; i++) {
          paths[config.paths[i]] = {
            post: {
              summary: `Other endpoint ${i}`,
              responses: {
                '200': {
                  description: 'Success'
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

        // Verify that exactly M endpoints are in signUpEndpoints
        expect(app.auth.signUpEndpoints?.length || 0).toBe(config.annotatedCount);

        // Verify that all annotated endpoints are present
        for (let i = 0; i < config.annotatedCount; i++) {
          const endpoint = app.auth.signUpEndpoints?.find(
            e => e.path === config.paths[i]
          );
          expect(endpoint).toBeDefined();
          expect(endpoint?.method).toBe('POST');
        }

        // Verify that non-annotated endpoints are NOT present
        for (let i = config.annotatedCount; i < config.paths.length; i++) {
          const endpoint = app.auth.signUpEndpoints?.find(
            e => e.path === config.paths[i]
          );
          expect(endpoint).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
