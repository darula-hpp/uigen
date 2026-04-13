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

    // Should have one resource: pet
    expect(result.resources).toHaveLength(1);
    
    const petResource = result.resources[0];
    expect(petResource.name).toBe('Pet');
    expect(petResource.slug).toBe('pet');

    // Should have 5 operations: list, create, get, update, delete
    expect(petResource.operations).toHaveLength(5);

    // Check operation view hints
    // GET /pet has query params (status, limit, offset) so it's classified as search
    const listOp = petResource.operations.find(op => op.method === 'GET' && op.path === '/pet');
    expect(listOp?.viewHint).toBe('search');

    const createOp = petResource.operations.find(op => op.method === 'POST');
    expect(createOp?.viewHint).toBe('create');

    const detailOp = petResource.operations.find(op => op.method === 'GET' && op.path === '/pet/{id}');
    expect(detailOp?.viewHint).toBe('detail');

    const updateOp = petResource.operations.find(op => op.method === 'PUT');
    expect(updateOp?.viewHint).toBe('update');

    const deleteOp = petResource.operations.find(op => op.method === 'DELETE');
    expect(deleteOp?.viewHint).toBe('delete');

    // Check schema extraction
    expect(petResource.schema.type).toBe('object');
    expect(petResource.schema.children).toBeDefined();
    expect(petResource.schema.children!.length).toBeGreaterThan(0);

    // Should have all Pet fields
    const fieldKeys = petResource.schema.children!.map(c => c.key);
    expect(fieldKeys).toContain('id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('status');
    expect(fieldKeys).toContain('category');
    expect(fieldKeys).toContain('photoUrls');
    expect(fieldKeys).toContain('tags');

    // Check field details
    const nameField = petResource.schema.children!.find(c => c.key === 'name');
    expect(nameField?.type).toBe('string');
    expect(nameField?.required).toBe(true);
    expect(nameField?.validations).toBeDefined();
    expect(nameField?.validations?.some(v => v.type === 'minLength')).toBe(true);
    expect(nameField?.validations?.some(v => v.type === 'maxLength')).toBe(true);

    const statusField = petResource.schema.children!.find(c => c.key === 'status');
    expect(statusField?.type).toBe('enum');
    expect(statusField?.enumValues).toEqual(['available', 'pending', 'sold']);
    expect(statusField?.required).toBe(true);

    // Check pagination detection
    expect(petResource.pagination).toBeDefined();
    expect(petResource.pagination?.style).toBe('offset');
    expect(petResource.pagination?.params).toEqual({
      limit: 'limit',
      offset: 'offset'
    });
  });

  it('should extract metadata correctly', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.meta.title).toBe('Petstore API');
    expect(result.meta.version).toBe('1.0.0');
    expect(result.meta.description).toBe('A simple pet store API');
  });

  it('should extract server configuration', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].url).toBe('https://petstore3.swagger.io/api/v3');
    expect(result.servers[0].description).toBe('Production server');
  });

  it('should extract authentication schemes', () => {
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const petstorePath = path.join(workspaceRoot, 'examples', 'petstore.yaml');
    const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
    const spec = jsyaml.load(petstoreContent);

    const adapter = new OpenAPI3Adapter(spec);
    const result = adapter.adapt();

    expect(result.auth.schemes).toHaveLength(1);
    expect(result.auth.schemes[0].type).toBe('bearer');
    expect(result.auth.schemes[0].name).toBe('bearerAuth');
  });
});

