import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as jsyaml from 'js-yaml';

// Helper to find workspace root by looking for examples directory
function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const examplesPath = path.join(currentDir, 'examples');
    if (fs.existsSync(examplesPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

describe('Petstore Integration Test', () => {
  it('should correctly extract resources from petstore.yaml', () => {
    // Read the petstore.yaml file (from workspace root)
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    // Should have multiple resources: pet, store, user
    expect(result.resources.length).toBeGreaterThanOrEqual(3);
    
    const petResource = result.resources.find(r => r.slug === 'pet');
    expect(petResource).toBeDefined();
    expect(petResource!.name).toBe('Pet');
    expect(petResource!.slug).toBe('pet');

    // Should have multiple operations
    expect(petResource!.operations.length).toBeGreaterThan(0);

    // Check schema extraction
    expect(petResource!.schema.type).toBe('object');
    expect(petResource!.schema.children).toBeDefined();
    expect(petResource!.schema.children!.length).toBeGreaterThan(0);

    // Should have Pet fields
    const fieldKeys = petResource!.schema.children!.map(c => c.key);
    expect(fieldKeys).toContain('id');
    expect(fieldKeys).toContain('name');

    // Check field details
    const nameField = petResource!.schema.children!.find(c => c.key === 'name');
    expect(nameField?.type).toBe('string');
    expect(nameField?.required).toBe(true);

    const statusField = petResource!.schema.children!.find(c => c.key === 'status');
    if (statusField) {
      expect(statusField.type).toBe('enum');
      expect(statusField.enumValues).toEqual(['available', 'pending', 'sold']);
    }
  });

  it('should extract metadata correctly', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.meta.title).toBe('Swagger Petstore - OpenAPI 3.0');
    expect(result.meta.version).toBe('1.0.27');
  });

  it('should extract server configuration', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].url).toBe('/api/v3');
  });

  it('should extract authentication schemes', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.auth.schemes.length).toBeGreaterThan(0);
    // Petstore has apiKey and oauth2 auth
    const hasApiKey = result.auth.schemes.some(s => s.type === 'apiKey');
    expect(hasApiKey).toBe(true);
  });
});

