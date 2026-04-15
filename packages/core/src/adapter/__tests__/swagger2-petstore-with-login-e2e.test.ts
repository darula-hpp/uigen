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

describe('Swagger2 Petstore with Login - End-to-End Test', () => {
  it('should parse swagger2-petstore-with-login.yaml and extract annotated login endpoints', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const specPath = join(workspaceRoot, 'examples', 'swagger2-petstore-with-login.yaml');
    
    // Verify the file exists
    expect(existsSync(specPath)).toBe(true);
    
    // Read and parse the spec
    const specContent = readFileSync(specPath, 'utf-8');
    const spec = jsyaml.load(specContent) as any;
    
    // Adapt the spec
    const adapter = new Swagger2Adapter(spec);
    const app = adapter.adapt();
    
    // Verify basic app structure
    expect(app.meta.title).toBe('Swagger Petstore');
    expect(app.meta.version).toBe('1.0.7');
    
    // Verify login endpoints are detected
    expect(app.auth.loginEndpoints).toBeDefined();
    expect(app.auth.loginEndpoints!.length).toBeGreaterThanOrEqual(2);
    
    // Verify annotated endpoints are prioritized (come first)
    const loginEndpoints = app.auth.loginEndpoints!;
    
    // First endpoint should be /auth/authenticate (x-uigen-login: true)
    expect(loginEndpoints[0].path).toBe('/auth/authenticate');
    expect(loginEndpoints[0].method).toBe('POST');
    expect(loginEndpoints[0].description).toBe('Authenticate user with credentials');
    expect(loginEndpoints[0].tokenPath).toBe('accessToken');
    
    // Verify request body schema
    expect(loginEndpoints[0].requestBodySchema).toBeDefined();
    expect(loginEndpoints[0].requestBodySchema.type).toBe('object');
    expect(loginEndpoints[0].requestBodySchema.children).toBeDefined();
    
    const usernameField = loginEndpoints[0].requestBodySchema.children!.find(c => c.key === 'username');
    expect(usernameField).toBeDefined();
    expect(usernameField!.type).toBe('string');
    expect(usernameField!.required).toBe(true);
    
    const passwordField = loginEndpoints[0].requestBodySchema.children!.find(c => c.key === 'password');
    expect(passwordField).toBeDefined();
    expect(passwordField!.type).toBe('string');
    expect(passwordField!.required).toBe(true);
    
    // Second endpoint should be /auth/phone-login (x-uigen-login: true)
    expect(loginEndpoints[1].path).toBe('/auth/phone-login');
    expect(loginEndpoints[1].method).toBe('POST');
    expect(loginEndpoints[1].description).toBe('Authenticate user with phone and OTP');
    expect(loginEndpoints[1].tokenPath).toBe('token');
    
    // Verify phone login request body schema
    expect(loginEndpoints[1].requestBodySchema).toBeDefined();
    const phoneField = loginEndpoints[1].requestBodySchema.children!.find(c => c.key === 'phone');
    expect(phoneField).toBeDefined();
    expect(phoneField!.type).toBe('string');
    
    const otpField = loginEndpoints[1].requestBodySchema.children!.find(c => c.key === 'otp');
    expect(otpField).toBeDefined();
    expect(otpField!.type).toBe('string');
    
    // Verify /user/login is NOT included (x-uigen-login: false)
    const excludedEndpoint = loginEndpoints.find(e => e.path === '/user/login');
    expect(excludedEndpoint).toBeUndefined();
  });
  
  it('should handle the spec without errors', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const specPath = join(workspaceRoot, 'examples', 'swagger2-petstore-with-login.yaml');
    
    const specContent = readFileSync(specPath, 'utf-8');
    const spec = jsyaml.load(specContent) as any;
    
    // Should not throw any errors
    expect(() => {
      const adapter = new Swagger2Adapter(spec);
      adapter.adapt();
    }).not.toThrow();
  });
  
  it('should extract resources from the spec', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const specPath = join(workspaceRoot, 'examples', 'swagger2-petstore-with-login.yaml');
    
    const specContent = readFileSync(specPath, 'utf-8');
    const spec = jsyaml.load(specContent) as any;
    
    const adapter = new Swagger2Adapter(spec);
    const app = adapter.adapt();
    
    // Should extract resources (Pet, Store, User, etc.)
    expect(app.resources).toBeDefined();
    expect(app.resources.length).toBeGreaterThan(0);
    
    // Verify some expected resources exist
    const petResource = app.resources.find(r => r.name.toLowerCase().includes('pet'));
    expect(petResource).toBeDefined();
  });
});
