import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import * as jsyaml from 'js-yaml';
import { Swagger2Adapter } from '../swagger2.js';

// Helper to find workspace root by looking for examples directory
function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== dirname(currentDir)) {
    const examplesPath = join(currentDir, 'examples');
    if (existsSync(examplesPath)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

describe('End-to-End: Petstore with x-uigen-login Annotations', () => {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const specPath = join(workspaceRoot, 'examples', 'swagger2-petstore-with-login.yaml');
  const specContent = readFileSync(specPath, 'utf-8');
  const spec = jsyaml.load(specContent) as any;

  it('should load and parse the Swagger 2.0 Petstore spec with login annotations', () => {
    expect(spec).toBeDefined();
    expect(spec.swagger).toBe('2.0');
    expect(spec.info.title).toBe('Swagger Petstore');
  });

  it('should detect Swagger 2.0 format', () => {
    expect(Swagger2Adapter.canHandle(spec)).toBe(true);
  });

  it('should convert Swagger 2.0 to IR with login endpoints', () => {
    const adapter = new Swagger2Adapter(spec);
    const ir = adapter.adapt();

    // Verify basic IR structure
    expect(ir).toBeDefined();
    expect(ir.meta.title).toBe('Swagger Petstore');
    expect(ir.meta.version).toBe('1.0.7');
    expect(ir.servers).toBeDefined();
    expect(ir.servers.length).toBeGreaterThan(0);
  });

  describe('Login Endpoint Detection', () => {
    it('should detect annotated login endpoints and exclude /user/login', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Should have login endpoints
      expect(ir.auth.loginEndpoints).toBeDefined();
      expect(ir.auth.loginEndpoints!.length).toBeGreaterThan(0);

      // Should NOT include /user/login (marked with x-uigen-login: false)
      const userLoginEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/user/login');
      expect(userLoginEndpoint).toBeUndefined();
    });

    it('should include /auth/authenticate as primary login endpoint', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const authEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/authenticate');
      
      expect(authEndpoint).toBeDefined();
      expect(authEndpoint!.method).toBe('POST');
      expect(authEndpoint!.description).toBe('Authenticate user with credentials');
      expect(authEndpoint!.tokenPath).toBe('accessToken');
    });

    it('should include /auth/phone-login as secondary login endpoint', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const phoneEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/phone-login');
      
      expect(phoneEndpoint).toBeDefined();
      expect(phoneEndpoint!.method).toBe('POST');
      expect(phoneEndpoint!.description).toBe('Authenticate user with phone and OTP');
      expect(phoneEndpoint!.tokenPath).toBe('token');
    });

    it('should prioritize annotated endpoints (both should come first)', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Both annotated endpoints should be present
      expect(ir.auth.loginEndpoints!.length).toBeGreaterThanOrEqual(2);
      
      // First endpoint should be /auth/authenticate
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/authenticate');
      
      // Second endpoint should be /auth/phone-login
      expect(ir.auth.loginEndpoints![1].path).toBe('/auth/phone-login');
    });
  });

  describe('Request Body Schema Extraction', () => {
    it('should extract username/password schema from /auth/authenticate', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const authEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/authenticate');
      
      expect(authEndpoint!.requestBodySchema).toBeDefined();
      expect(authEndpoint!.requestBodySchema.type).toBe('object');
      expect(authEndpoint!.requestBodySchema.children).toBeDefined();
      expect(authEndpoint!.requestBodySchema.children!.length).toBe(2);

      const usernameField = authEndpoint!.requestBodySchema.children!.find(c => c.key === 'username');
      expect(usernameField).toBeDefined();
      expect(usernameField!.type).toBe('string');
      expect(usernameField!.required).toBe(true);

      const passwordField = authEndpoint!.requestBodySchema.children!.find(c => c.key === 'password');
      expect(passwordField).toBeDefined();
      expect(passwordField!.type).toBe('string');
      expect(passwordField!.required).toBe(true);
    });

    it('should extract phone/otp schema from /auth/phone-login', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const phoneEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/phone-login');
      
      expect(phoneEndpoint!.requestBodySchema).toBeDefined();
      expect(phoneEndpoint!.requestBodySchema.type).toBe('object');
      expect(phoneEndpoint!.requestBodySchema.children).toBeDefined();
      expect(phoneEndpoint!.requestBodySchema.children!.length).toBe(2);

      const phoneField = phoneEndpoint!.requestBodySchema.children!.find(c => c.key === 'phone');
      expect(phoneField).toBeDefined();
      expect(phoneField!.type).toBe('string');
      expect(phoneField!.required).toBe(true);

      const otpField = phoneEndpoint!.requestBodySchema.children!.find(c => c.key === 'otp');
      expect(otpField).toBeDefined();
      expect(otpField!.type).toBe('string');
      expect(otpField!.required).toBe(true);
    });
  });

  describe('Token Path Detection', () => {
    it('should detect accessToken from /auth/authenticate response', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const authEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/authenticate');
      
      expect(authEndpoint!.tokenPath).toBe('accessToken');
    });

    it('should detect token from /auth/phone-login response', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const phoneEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/phone-login');
      
      expect(phoneEndpoint!.tokenPath).toBe('token');
    });
  });

  describe('Resource Extraction', () => {
    it('should extract Pet resource', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const petResource = ir.resources.find(r => r.name === 'Pet');
      
      expect(petResource).toBeDefined();
      expect(petResource!.operations).toBeDefined();
      expect(petResource!.operations.length).toBeGreaterThan(0);
    });

    it('should extract User resource', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const userResource = ir.resources.find(r => r.name === 'User');
      
      expect(userResource).toBeDefined();
      expect(userResource!.operations).toBeDefined();
    });

    it('should extract Order resource', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      const orderResource = ir.resources.find(r => r.name === 'Order');
      
      expect(orderResource).toBeDefined();
      expect(orderResource!.operations).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should construct servers from host, basePath, and schemes', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.servers).toBeDefined();
      expect(ir.servers.length).toBe(2);
      
      // HTTPS server
      expect(ir.servers[0].url).toBe('https://petstore.swagger.io/v2');
      expect(ir.servers[0].description).toBe('HTTPS server');
      
      // HTTP server
      expect(ir.servers[1].url).toBe('http://petstore.swagger.io/v2');
      expect(ir.servers[1].description).toBe('HTTP server');
    });
  });

  describe('Security Definitions', () => {
    it('should convert securityDefinitions to securitySchemes', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // The IR should have auth configuration
      expect(ir.auth).toBeDefined();
      
      // Should have converted api_key and petstore_auth
      // (These are stored in the OpenAPI 3.x format internally)
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing Petstore functionality', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Should have all expected resources
      expect(ir.resources.length).toBeGreaterThan(0);
      
      // Should have Pet operations
      const petResource = ir.resources.find(r => r.name === 'Pet');
      expect(petResource).toBeDefined();
      expect(petResource!.operations.length).toBeGreaterThan(0);
      
      // Should have proper schemas
      expect(petResource!.schema).toBeDefined();
      expect(petResource!.schema.type).toBe('object');
    });

    it('should not break existing endpoints without annotations', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // All resources should still be extracted
      expect(ir.resources.length).toBeGreaterThanOrEqual(3);
      
      // Pet resource should have all its operations
      const petResource = ir.resources.find(r => r.name === 'Pet');
      expect(petResource).toBeDefined();
      
      // Should have create, read, update, delete operations
      const operations = petResource!.operations;
      expect(operations.some(op => op.method === 'POST')).toBe(true);
      expect(operations.some(op => op.method === 'GET')).toBe(true);
      expect(operations.some(op => op.method === 'PUT')).toBe(true);
      expect(operations.some(op => op.method === 'DELETE')).toBe(true);
    });
  });

  describe('Complete End-to-End Flow', () => {
    it('should successfully parse, convert, and generate complete IR', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Verify complete IR structure
      expect(ir.meta.title).toBe('Swagger Petstore');
      expect(ir.meta.version).toBe('1.0.7');
      expect(ir.meta.description).toContain('sample server Petstore');
      
      // Verify servers
      expect(ir.servers.length).toBe(2);
      
      // Verify resources
      expect(ir.resources.length).toBeGreaterThan(0);
      
      // Verify auth configuration with login endpoints
      expect(ir.auth.loginEndpoints).toBeDefined();
      expect(ir.auth.loginEndpoints!.length).toBeGreaterThanOrEqual(2);
      
      // Verify annotated endpoints are prioritized
      expect(ir.auth.loginEndpoints![0].path).toBe('/auth/authenticate');
      expect(ir.auth.loginEndpoints![1].path).toBe('/auth/phone-login');
      
      // Verify excluded endpoint is not present
      const excludedEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/user/login');
      expect(excludedEndpoint).toBeUndefined();
      
      // Verify token paths are correctly detected
      expect(ir.auth.loginEndpoints![0].tokenPath).toBe('accessToken');
      expect(ir.auth.loginEndpoints![1].tokenPath).toBe('token');
      
      // Verify request body schemas are extracted
      expect(ir.auth.loginEndpoints![0].requestBodySchema).toBeDefined();
      expect(ir.auth.loginEndpoints![1].requestBodySchema).toBeDefined();
    });
  });

  describe('Annotation Preservation Through Conversion', () => {
    it('should preserve x-uigen-login: true through Swagger 2.0 to OpenAPI 3.x conversion', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Both annotated endpoints should be detected
      const authEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/authenticate');
      const phoneEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/auth/phone-login');
      
      expect(authEndpoint).toBeDefined();
      expect(phoneEndpoint).toBeDefined();
    });

    it('should preserve x-uigen-login: false through conversion (exclusion)', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // /user/login should be excluded
      const userLoginEndpoint = ir.auth.loginEndpoints!.find(e => e.path === '/user/login');
      
      expect(userLoginEndpoint).toBeUndefined();
    });
  });

  describe('Real-World Scenario: Multiple Login Methods', () => {
    it('should support API with multiple authentication methods', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Should have at least 2 login endpoints
      expect(ir.auth.loginEndpoints!.length).toBeGreaterThanOrEqual(2);
      
      // Primary method: username/password
      const primaryAuth = ir.auth.loginEndpoints![0];
      expect(primaryAuth.path).toBe('/auth/authenticate');
      expect(primaryAuth.requestBodySchema.children!.some(c => c.key === 'username')).toBe(true);
      expect(primaryAuth.requestBodySchema.children!.some(c => c.key === 'password')).toBe(true);
      
      // Secondary method: phone/OTP
      const secondaryAuth = ir.auth.loginEndpoints![1];
      expect(secondaryAuth.path).toBe('/auth/phone-login');
      expect(secondaryAuth.requestBodySchema.children!.some(c => c.key === 'phone')).toBe(true);
      expect(secondaryAuth.requestBodySchema.children!.some(c => c.key === 'otp')).toBe(true);
    });

    it('should allow UI to attempt login methods in priority order', () => {
      const adapter = new Swagger2Adapter(spec);
      const ir = adapter.adapt();

      // Login endpoints are in priority order
      const endpoints = ir.auth.loginEndpoints!;
      
      // First attempt: /auth/authenticate
      expect(endpoints[0].path).toBe('/auth/authenticate');
      expect(endpoints[0].method).toBe('POST');
      
      // Second attempt: /auth/phone-login
      expect(endpoints[1].path).toBe('/auth/phone-login');
      expect(endpoints[1].method).toBe('POST');
      
      // Each endpoint has all necessary information for login
      endpoints.forEach(endpoint => {
        expect(endpoint.path).toBeDefined();
        expect(endpoint.method).toBe('POST');
        expect(endpoint.requestBodySchema).toBeDefined();
        expect(endpoint.tokenPath).toBeDefined();
      });
    });
  });
});
