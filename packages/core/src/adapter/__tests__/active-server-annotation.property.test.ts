import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Active Server Annotation - Property Tests', () => {
  /**
   * Property 1: Boolean Annotation Extraction
   * 
   * **Feature: auth-flow-annotations, Property 1**
   * 
   * For any server object containing an `x-uigen-active-server` annotation with a 
   * boolean value, the handler's extract() method SHALL return that boolean value.
   * 
   * This property ensures that the ActiveServerHandler correctly extracts boolean 
   * values from server objects, which is the foundation for all subsequent 
   * processing.
   * 
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1: extracts boolean values from x-uigen-active-server annotation', () => {
    // Generator for server URLs
    const serverUrlGen = fc.oneof(
      fc.constant('https://api.example.com'),
      fc.constant('http://localhost:3000'),
      fc.constant('https://staging.api.example.com'),
      fc.constant('https://prod.api.example.com/v1'),
      fc.constant('http://dev.api.example.com:8080')
    );

    // Generator for server descriptions
    const serverDescriptionGen = fc.oneof(
      fc.constant('Production server'),
      fc.constant('Staging server'),
      fc.constant('Development server'),
      fc.constant('Local server'),
      fc.constant(undefined)
    );

    // Generator for boolean annotation values
    const booleanValueGen = fc.boolean();

    // Generator for a server with boolean annotation
    const serverWithBooleanGen = fc.record({
      url: serverUrlGen,
      description: serverDescriptionGen,
      annotationValue: booleanValueGen,
      // Whether to include other servers without annotation
      hasOtherServers: fc.boolean(),
      otherServerCount: fc.integer({ min: 0, max: 3 })
    });

    fc.assert(
      fc.property(serverWithBooleanGen, (config) => {
        const servers: OpenAPIV3.ServerObject[] = [];

        // Add the annotated server
        servers.push({
          url: config.url,
          ...(config.description && { description: config.description }),
          'x-uigen-active-server': config.annotationValue
        } as any);

        // Add other servers without annotation
        if (config.hasOtherServers) {
          for (let i = 0; i < config.otherServerCount; i++) {
            servers.push({
              url: `https://other${i}.example.com`,
              description: `Other server ${i}`
            });
          }
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          servers,
          paths: {}
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that servers are extracted
        expect(app.servers).toBeDefined();
        expect(app.servers.length).toBeGreaterThan(0);

        // Verify that the annotated server is in the servers array
        const annotatedServer = app.servers.find(s => s.url === config.url);
        expect(annotatedServer).toBeDefined();
        expect(annotatedServer?.url).toBe(config.url);
        if (config.description) {
          expect(annotatedServer?.description).toBe(config.description);
        }

        // Verify activeServer behavior based on annotation value
        if (config.annotationValue === true) {
          // When annotation is true, activeServer should be set
          expect(app.activeServer).toBeDefined();
          expect(app.activeServer?.url).toBe(config.url);
          if (config.description) {
            expect(app.activeServer?.description).toBe(config.description);
          }
        } else {
          // When annotation is false, activeServer should not be set
          // (unless another server has true, but we don't have that in this test)
          expect(app.activeServer).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Non-Boolean Annotation Rejection
   * 
   * **Feature: auth-flow-annotations, Property 2**
   * 
   * For any server object containing an `x-uigen-active-server` annotation with a 
   * non-boolean value, the handler's extract() method SHALL return undefined and 
   * log a warning.
   * 
   * This property ensures that the ActiveServerHandler gracefully handles invalid 
   * annotation values by treating them as absent, maintaining parser stability.
   * 
   * **Validates: Requirement 2.3**
   */
  it('Property 2: rejects non-boolean values in x-uigen-active-server annotation', () => {
    // Generator for server URLs
    const serverUrlGen = fc.oneof(
      fc.constant('https://api.example.com'),
      fc.constant('http://localhost:3000'),
      fc.constant('https://staging.api.example.com')
    );

    // Generator for non-boolean annotation values
    const nonBooleanValueGen = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double(),
      fc.constant(null),
      fc.constant({}),
      fc.constant([]),
      fc.record({ value: fc.boolean() })
    );

    // Generator for a server with non-boolean annotation
    const serverWithNonBooleanGen = fc.record({
      url: serverUrlGen,
      description: fc.option(fc.string(), { nil: undefined }),
      annotationValue: nonBooleanValueGen
    });

    fc.assert(
      fc.property(serverWithNonBooleanGen, (config) => {
        // Create the spec with non-boolean annotation
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          servers: [
            {
              url: config.url,
              ...(config.description && { description: config.description }),
              'x-uigen-active-server': config.annotationValue
            } as any
          ],
          paths: {}
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that the server is still in the servers array
        expect(app.servers).toBeDefined();
        expect(app.servers.length).toBeGreaterThan(0);
        const server = app.servers.find(s => s.url === config.url);
        expect(server).toBeDefined();

        // Verify that activeServer is NOT set (annotation was rejected)
        expect(app.activeServer).toBeUndefined();

        // Note: We can't easily verify the warning was logged without mocking,
        // but the behavior (undefined activeServer) confirms the rejection
      }),
      { numRuns: 100 }
    );
  });
});

  /**
   * Property 3: Active Server Application
   * 
   * **Feature: auth-flow-annotations, Property 3**
   * 
   * For any OpenAPI spec with exactly one server object annotated with 
   * `x-uigen-active-server: true`, the parser SHALL set `UIGenApp.activeServer` 
   * to a ServerConfig object containing the url and description fields from that 
   * server object.
   * 
   * This property ensures that the active server annotation correctly populates 
   * the activeServer field in the IR with the complete server configuration.
   * 
   * **Validates: Requirements 3.1, 3.4**
   */
  it('Property 3: sets activeServer when exactly one server has annotation true', () => {
    // Generator for server URLs
    const serverUrlGen = fc.oneof(
      fc.constant('https://api.example.com'),
      fc.constant('http://localhost:3000'),
      fc.constant('https://staging.api.example.com'),
      fc.constant('https://prod.api.example.com/v1'),
      fc.constant('http://dev.api.example.com:8080')
    );

    // Generator for server descriptions
    const serverDescriptionGen = fc.option(
      fc.oneof(
        fc.constant('Production server'),
        fc.constant('Staging server'),
        fc.constant('Development server'),
        fc.constant('Local server'),
        fc.constant('Main API server')
      ),
      { nil: undefined }
    );

    // Generator for a spec with one active server
    const specWithActiveServerGen = fc.record({
      activeServerUrl: serverUrlGen,
      activeServerDescription: serverDescriptionGen,
      // Number of other servers without annotation
      otherServerCount: fc.integer({ min: 0, max: 5 })
    });

    fc.assert(
      fc.property(specWithActiveServerGen, (config) => {
        const servers: OpenAPIV3.ServerObject[] = [];

        // Add the active server
        servers.push({
          url: config.activeServerUrl,
          ...(config.activeServerDescription && { description: config.activeServerDescription }),
          'x-uigen-active-server': true
        } as any);

        // Add other servers without annotation
        for (let i = 0; i < config.otherServerCount; i++) {
          servers.push({
            url: `https://other${i}.example.com`,
            description: `Other server ${i}`
          });
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          servers,
          paths: {}
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that activeServer is set
        expect(app.activeServer).toBeDefined();
        expect(app.activeServer).not.toBeNull();

        // Verify that activeServer has the correct URL
        expect(app.activeServer?.url).toBe(config.activeServerUrl);

        // Verify that activeServer has the correct description
        if (config.activeServerDescription) {
          expect(app.activeServer?.description).toBe(config.activeServerDescription);
        } else {
          expect(app.activeServer?.description).toBeUndefined();
        }

        // Verify that activeServer is a ServerConfig object with correct structure
        expect(typeof app.activeServer?.url).toBe('string');
        expect(app.activeServer?.url.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Active Server Inclusion Invariant
   * 
   * **Feature: auth-flow-annotations, Property 4**
   * 
   * For any OpenAPI spec where `UIGenApp.activeServer` is set, that server SHALL 
   * also appear in the `UIGenApp.servers` array with matching url and description 
   * fields.
   * 
   * This property ensures that the active server is not removed from the servers 
   * array, maintaining consistency between the two representations.
   * 
   * **Validates: Requirement 3.2**
   */
  it('Property 4: active server appears in servers array', () => {
    // Generator for server URLs
    const serverUrlGen = fc.oneof(
      fc.constant('https://api.example.com'),
      fc.constant('http://localhost:3000'),
      fc.constant('https://staging.api.example.com'),
      fc.constant('https://prod.api.example.com/v1')
    );

    // Generator for server descriptions
    const serverDescriptionGen = fc.option(
      fc.oneof(
        fc.constant('Production server'),
        fc.constant('Staging server'),
        fc.constant('Development server')
      ),
      { nil: undefined }
    );

    // Generator for a spec with active server
    const specGen = fc.record({
      activeServerUrl: serverUrlGen,
      activeServerDescription: serverDescriptionGen,
      otherServerCount: fc.integer({ min: 0, max: 5 })
    });

    fc.assert(
      fc.property(specGen, (config) => {
        const servers: OpenAPIV3.ServerObject[] = [];

        // Add the active server
        servers.push({
          url: config.activeServerUrl,
          ...(config.activeServerDescription && { description: config.activeServerDescription }),
          'x-uigen-active-server': true
        } as any);

        // Add other servers
        for (let i = 0; i < config.otherServerCount; i++) {
          servers.push({
            url: `https://other${i}.example.com`,
            description: `Other server ${i}`
          });
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          servers,
          paths: {}
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that activeServer is set
        expect(app.activeServer).toBeDefined();

        // Verify that the active server appears in the servers array
        const activeServerInArray = app.servers.find(
          s => s.url === app.activeServer?.url
        );
        expect(activeServerInArray).toBeDefined();

        // Verify that the server in the array has matching properties
        expect(activeServerInArray?.url).toBe(app.activeServer?.url);
        expect(activeServerInArray?.description).toBe(app.activeServer?.description);

        // Verify that the servers array contains all servers (active + others)
        expect(app.servers.length).toBe(1 + config.otherServerCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Multiple Active Server Conflict Resolution
   * 
   * **Feature: auth-flow-annotations, Property 5**
   * 
   * For any OpenAPI spec with N server objects where M > 1 have 
   * `x-uigen-active-server: true`, the parser SHALL set `UIGenApp.activeServer` 
   * to the first annotated server and log warnings for the remaining M-1 servers.
   * 
   * This property ensures that conflicts are resolved deterministically by using 
   * the first occurrence, preventing ambiguity in the IR.
   * 
   * **Validates: Requirement 2.5**
   */
  it('Property 5: uses first server when multiple have annotation true', () => {
    // Generator for server URLs (must be unique)
    const uniqueServerUrlsGen = fc.uniqueArray(
      fc.oneof(
        fc.constant('https://api1.example.com'),
        fc.constant('https://api2.example.com'),
        fc.constant('https://api3.example.com'),
        fc.constant('https://api4.example.com'),
        fc.constant('https://api5.example.com'),
        fc.constant('http://localhost:3000'),
        fc.constant('http://localhost:4000'),
        fc.constant('http://localhost:5000')
      ),
      { minLength: 2, maxLength: 5 }
    );

    // Generator for server descriptions
    const serverDescriptionGen = fc.option(
      fc.string({ minLength: 5, maxLength: 50 }),
      { nil: undefined }
    );

    // Generator for a spec with multiple active servers
    const specGen = fc.record({
      serverUrls: uniqueServerUrlsGen,
      // How many of the servers should have x-uigen-active-server: true
      activeServerCount: fc.integer({ min: 2, max: 5 })
    }).chain(config => {
      // Ensure activeServerCount doesn't exceed serverUrls length
      const actualActiveCount = Math.min(config.activeServerCount, config.serverUrls.length);
      return fc.constant({
        ...config,
        activeServerCount: actualActiveCount
      });
    });

    fc.assert(
      fc.property(specGen, serverDescriptionGen, (config, description) => {
        const servers: OpenAPIV3.ServerObject[] = [];

        // Add servers with x-uigen-active-server: true for the first N servers
        for (let i = 0; i < config.activeServerCount; i++) {
          servers.push({
            url: config.serverUrls[i],
            ...(description && { description: `${description} ${i}` }),
            'x-uigen-active-server': true
          } as any);
        }

        // Add remaining servers without annotation
        for (let i = config.activeServerCount; i < config.serverUrls.length; i++) {
          servers.push({
            url: config.serverUrls[i],
            ...(description && { description: `${description} ${i}` })
          });
        }

        // Create the spec
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          servers,
          paths: {}
        };

        // Adapt the spec
        const adapter = new OpenAPI3Adapter(spec);
        const app = adapter.adapt();

        // Verify that activeServer is set
        expect(app.activeServer).toBeDefined();

        // Verify that activeServer is the FIRST server with annotation true
        expect(app.activeServer?.url).toBe(config.serverUrls[0]);

        // Verify that the servers array still contains all servers
        expect(app.servers.length).toBe(config.serverUrls.length);

        // Verify that all servers are in the array
        config.serverUrls.forEach(url => {
          const server = app.servers.find(s => s.url === url);
          expect(server).toBeDefined();
        });

        // Note: We can't easily verify the warnings were logged without mocking,
        // but the behavior (first server wins) confirms the conflict resolution
      }),
      { numRuns: 100 }
    );
  });
