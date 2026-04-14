import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSpec } from '@uigen-dev/core';

/**
 * Integration test for serve command
 * Validates that the serve command can parse specs and prepare for serving
 * Requirements: 21.1-21.10
 */
describe('Serve Command Integration', () => {
  it('should parse petstore.yaml successfully', async () => {
    const specPath = resolve(process.cwd(), 'examples/petstore.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    
    const ir = await parseSpec(specContent);
    
    expect(ir).toBeDefined();
    expect(ir.meta).toBeDefined();
    expect(ir.meta.title).toBe('Swagger Petstore - OpenAPI 3.0');
    expect(ir.resources).toBeDefined();
    expect(ir.resources.length).toBeGreaterThan(0);
  });

  it('should have valid IR structure for serving', async () => {
    const specPath = resolve(process.cwd(), 'examples/petstore.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    
    const ir = await parseSpec(specContent);
    
    // Verify all required top-level fields exist
    expect(ir.meta).toBeDefined();
    expect(ir.resources).toBeDefined();
    expect(ir.auth).toBeDefined();
    expect(ir.dashboard).toBeDefined();
    expect(ir.servers).toBeDefined();
    
    // Verify resources have operations
    expect(ir.resources.length).toBeGreaterThan(0);
    ir.resources.forEach(resource => {
      expect(resource.name).toBeDefined();
      expect(resource.slug).toBeDefined();
      expect(resource.operations).toBeDefined();
      expect(Array.isArray(resource.operations)).toBe(true);
    });
  });

  it('should serialize IR to JSON for injection', async () => {
    const specPath = resolve(process.cwd(), 'examples/petstore.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    
    const ir = await parseSpec(specContent);
    
    // Verify IR can be serialized to JSON (required for injection into React app)
    const serialized = JSON.stringify(ir);
    expect(serialized).toBeDefined();
    expect(serialized.length).toBeGreaterThan(0);
    
    // Verify it can be deserialized back
    const deserialized = JSON.parse(serialized);
    expect(deserialized).toEqual(ir);
  });

  it('should handle server configuration from spec', async () => {
    const specPath = resolve(process.cwd(), 'examples/petstore.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    
    const ir = await parseSpec(specContent);
    
    // Verify servers are extracted
    expect(ir.servers).toBeDefined();
    expect(Array.isArray(ir.servers)).toBe(true);
    
    // If servers exist, verify they have required fields
    if (ir.servers.length > 0) {
      ir.servers.forEach(server => {
        expect(server.url).toBeDefined();
        expect(typeof server.url).toBe('string');
      });
    }
  });
});
