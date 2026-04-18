import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Password Reset Annotation - Property Tests', () => {
  /**
   * Property 6: Password Reset Endpoint Creation
   * 
   * **Feature: auth-flow-annotations, Property 6**
   * 
   * For any POST operation annotated with `x-uigen-password-reset: true`, the 
   * parser SHALL append a PasswordResetEndpoint entry to 
   * AuthConfig.passwordResetEndpoints containing the operation's path, method 
   * (always 'POST'), requestBodySchema (if present), and description (preferring 
   * summary over description).
   * 
   * This property ensures that annotated password reset endpoints are correctly 
   * extracted and added to the IR with all required fields.
   * 
   * **Validates: Requirements 6.1, 6.3, 6.4, 6.5**
   */
  it('Property 6: creates password reset endpoint from annotated operation', () => {
    // Generator for password reset paths
    const pathGen = fc.oneof(
      fc.constant('/auth/reset-password'),
      fc.constant('/api/password-reset'),
      fc.constant('/reset'),
      fc.constant('/api/v1/auth/reset'),
      fc.constant('/user/password/reset')
    );

    // Generator for field names
    const fieldNameGen = fc.oneof(
      fc.constant('email'),
      fc.constant('username'),
      fc.constant('token'),
      fc.constant('newPassword'),
      fc.constant('code')
    );

    // Generator for field types
    const fieldTypeGen = fc.oneof(
      fc.constant('string'),
      fc.constant('number'),
      fc.constant('integer')
    );

    // Generator for request body schema
    const requestBodySchemaGen = fc.record({
      fields: fc.array(
        fc.record({
          name: fieldNameGen,
          type: fieldTypeGen
        }),
        { minLength: 1, maxLength: 4 }
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
        fc.constant('Reset user password'),
        fc.constant('Password reset endpoint'),
        fc.constant('Request password reset')
      ),
      { nil: undefined }
    );

    const descriptionGen = fc.option(
      fc.oneof(
        fc.constant('Allows users to reset their password'),
        fc.constant('Send password reset request'),
        fc.constant('Initiate password reset flow')
      ),
      { nil: undefined }
    );

    // Generator for annotated password reset endpoint
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
            'x-uigen-password-reset': true,
            ...(config.summary && { summary: config.summary }),
            ...(config.description && { description: config.description }),
            ...(requestBody && { requestBody }),
            responses: {
              '200': {
                description: 'Success'
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

        // Verify that passwordResetEndpoints is defined and has one entry
        expect(app.auth.passwordResetEndpoints).toBeDefined();
        expect(app.auth.passwordResetEndpoints?.length).toBe(1);

        const endpoint = app.auth.passwordResetEndpoints![0];

        // Verify path (Requirement 6.1)
        expect(endpoint.path).toBe(config.path);

        // Verify method is always POST (Requirement 6.1)
        expect(endpoint.method).toBe('POST');

        // Verify requestBodySchema (Requirements 6.3, 6.4)
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

        // Verify description (Requirement 6.5)
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
   * For any POST operation annotated with `x-uigen-password-reset: false`, the 
   * parser SHALL exclude that operation from AuthConfig.passwordResetEndpoints, 
   * regardless of whether heuristic detection would otherwise include it.
   * 
   * This property ensures that explicit exclusion annotations are respected, 
   * allowing API authors to prevent false positives from auto-detection.
   * 
   * **Validates: Requirement 6.2**
   */
  it('Property 8: excludes operations with annotation false', () => {
    // Generator for password-reset-like paths that would normally be auto-detected
    const passwordResetPathGen = fc.oneof(
      fc.constant('/auth/reset-password'),
      fc.constant('/api/password-reset'),
      fc.constant('/reset-password'),
      fc.constant('/password/reset')
    );

    // Generator for password-reset-like descriptions
    const passwordResetDescriptionGen = fc.oneof(
      fc.constant('Reset user password'),
      fc.constant('Password reset endpoint'),
      fc.constant('Request password reset')
    );

    // Generator for a spec with explicitly excluded endpoint
    const specGen = fc.record({
      excludedPath: passwordResetPathGen,
      excludedDescription: passwordResetDescriptionGen,
      // Whether to include a valid password reset endpoint for comparison
      hasValidEndpoint: fc.boolean(),
      validPath: fc.constant('/api/v1/reset')
    });

    fc.assert(
      fc.property(specGen, (config) => {
        const paths: Record<string, any> = {};

        // Create the excluded endpoint with annotation false
        paths[config.excludedPath] = {
          post: {
            'x-uigen-password-reset': false,
            summary: config.excludedDescription,
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' }
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
        };

        // Optionally add a valid password reset endpoint
        if (config.hasValidEndpoint) {
          paths[config.validPath] = {
            post: {
              'x-uigen-password-reset': true,
              summary: 'Valid password reset',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' }
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

        // Verify that the excluded endpoint is NOT in passwordResetEndpoints
        const excludedEndpoint = app.auth.passwordResetEndpoints?.find(
          e => e.path === config.excludedPath
        );
        expect(excludedEndpoint).toBeUndefined();

        // Verify the count matches expectations
        if (config.hasValidEndpoint) {
          expect(app.auth.passwordResetEndpoints?.length).toBe(1);
          const validEndpoint = app.auth.passwordResetEndpoints?.find(
            e => e.path === config.validPath
          );
          expect(validEndpoint).toBeDefined();
        } else {
          expect(app.auth.passwordResetEndpoints?.length || 0).toBe(0);
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
   * For any OpenAPI spec with N POST operations where M have 
   * `x-uigen-password-reset: true`, the parser SHALL produce exactly M entries in 
   * AuthConfig.passwordResetEndpoints, one for each annotated operation.
   * 
   * This property ensures that multiple password reset endpoints can be defined 
   * and all are correctly collected in the IR.
   * 
   * **Validates: Requirement 5.5**
   */
  it('Property 9: collects multiple password reset endpoints', () => {
    // Generator for unique paths
    const uniquePathsGen = fc.uniqueArray(
      fc.oneof(
        fc.constant('/auth/reset-password'),
        fc.constant('/api/password-reset'),
        fc.constant('/reset'),
        fc.constant('/api/v1/reset'),
        fc.constant('/user/password/reset'),
        fc.constant('/account/reset'),
        fc.constant('/api/v2/password/reset')
      ),
      { minLength: 1, maxLength: 5 }
    );

    // Generator for a spec with multiple password reset endpoints
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
              'x-uigen-password-reset': true,
              summary: `Password reset ${i}`,
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' }
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

        // Verify that exactly M endpoints are in passwordResetEndpoints
        expect(app.auth.passwordResetEndpoints?.length || 0).toBe(config.annotatedCount);

        // Verify that all annotated endpoints are present
        for (let i = 0; i < config.annotatedCount; i++) {
          const endpoint = app.auth.passwordResetEndpoints?.find(
            e => e.path === config.paths[i]
          );
          expect(endpoint).toBeDefined();
          expect(endpoint?.method).toBe('POST');
        }

        // Verify that non-annotated endpoints are NOT present
        for (let i = config.annotatedCount; i < config.paths.length; i++) {
          const endpoint = app.auth.passwordResetEndpoints?.find(
            e => e.path === config.paths[i]
          );
          expect(endpoint).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
