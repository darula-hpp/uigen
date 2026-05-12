import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { discoverOverrides } from '../discovery.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('discoverOverrides', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `uigen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should discover .ts files in src directory', async () => {
    // Create test files
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'override1.ts'), 'export default {}');
    writeFileSync(join(srcDir, 'override2.ts'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(2);
    expect(result.map(o => o.relativePath).sort()).toEqual(['override1.ts', 'override2.ts']);
  });

  it('should discover .tsx files in src directory', async () => {
    // Create test files
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'component1.tsx'), 'export default {}');
    writeFileSync(join(srcDir, 'component2.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(2);
    expect(result.map(o => o.relativePath).sort()).toEqual(['component1.tsx', 'component2.tsx']);
  });

  it('should discover files in nested directories', async () => {
    // Create nested directory structure
    const srcDir = join(testDir, 'src');
    const overridesDir = join(srcDir, 'overrides');
    const usersDir = join(overridesDir, 'users');
    
    mkdirSync(usersDir, { recursive: true });
    writeFileSync(join(srcDir, 'root.tsx'), 'export default {}');
    writeFileSync(join(overridesDir, 'middle.tsx'), 'export default {}');
    writeFileSync(join(usersDir, 'nested.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(3);
    expect(result.map(o => o.relativePath).sort()).toEqual([
      'overrides/middle.tsx',
      'overrides/users/nested.tsx',
      'root.tsx'
    ]);
  });

  it('should exclude node_modules directory', async () => {
    // Create files in node_modules
    const srcDir = join(testDir, 'src');
    const nodeModulesDir = join(srcDir, 'node_modules');
    
    mkdirSync(nodeModulesDir, { recursive: true });
    writeFileSync(join(srcDir, 'valid.tsx'), 'export default {}');
    writeFileSync(join(nodeModulesDir, 'should-be-excluded.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('valid.tsx');
  });

  it('should exclude .uigen directory', async () => {
    // Create files in .uigen
    const srcDir = join(testDir, 'src');
    const uigenDir = join(srcDir, '.uigen');
    
    mkdirSync(uigenDir, { recursive: true });
    writeFileSync(join(srcDir, 'valid.tsx'), 'export default {}');
    writeFileSync(join(uigenDir, 'should-be-excluded.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('valid.tsx');
  });

  it('should return empty array when src directory does not exist', async () => {
    const nonExistentDir = join(testDir, 'non-existent');

    const result = await discoverOverrides({ srcDir: nonExistentDir });

    expect(result).toEqual([]);
  });

  it('should return empty array when src directory is empty', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });

    const result = await discoverOverrides({ srcDir });

    expect(result).toEqual([]);
  });

  it('should return absolute file paths', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'override.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe(join(srcDir, 'override.tsx'));
    expect(result[0].relativePath).toBe('override.tsx');
  });

  it('should handle mixed .ts and .tsx files', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'file1.ts'), 'export default {}');
    writeFileSync(join(srcDir, 'file2.tsx'), 'export default {}');
    writeFileSync(join(srcDir, 'file3.js'), 'export default {}'); // Should be excluded
    writeFileSync(join(srcDir, 'file4.txt'), 'text'); // Should be excluded

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(2);
    expect(result.map(o => o.relativePath).sort()).toEqual(['file1.ts', 'file2.tsx']);
  });

  it('should not log when verbose is false', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'override.tsx'), 'export default {}');

    // Capture console.log
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };

    await discoverOverrides({ srcDir, verbose: false });

    console.log = originalLog;
    expect(logCalled).toBe(false);
  });

  it('should log when verbose is true', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'override.tsx'), 'export default {}');

    // Capture console.log
    const originalLog = console.log;
    let logMessage = '';
    console.log = (msg: string) => { logMessage = msg; };

    await discoverOverrides({ srcDir, verbose: true });

    console.log = originalLog;
    expect(logMessage).toContain('Discovered 1 file(s)');
  });

  it('should handle deeply nested directory structures', async () => {
    const srcDir = join(testDir, 'src');
    const deepDir = join(srcDir, 'a', 'b', 'c', 'd', 'e');
    
    mkdirSync(deepDir, { recursive: true });
    writeFileSync(join(deepDir, 'deep.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('a/b/c/d/e/deep.tsx');
  });

  it('should handle special characters in filenames', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'file-with-dash.tsx'), 'export default {}');
    writeFileSync(join(srcDir, 'file_with_underscore.tsx'), 'export default {}');
    writeFileSync(join(srcDir, 'file.with.dots.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(3);
    expect(result.map(o => o.relativePath).sort()).toEqual([
      'file-with-dash.tsx',
      'file.with.dots.tsx',
      'file_with_underscore.tsx'
    ]);
  });

  it('should discover multiple files in multiple nested directories', async () => {
    const srcDir = join(testDir, 'src');
    const overridesDir = join(srcDir, 'overrides');
    const usersDir = join(overridesDir, 'users');
    const productsDir = join(overridesDir, 'products');
    
    mkdirSync(usersDir, { recursive: true });
    mkdirSync(productsDir, { recursive: true });
    
    writeFileSync(join(usersDir, 'list.tsx'), 'export default {}');
    writeFileSync(join(usersDir, 'detail.tsx'), 'export default {}');
    writeFileSync(join(productsDir, 'list.tsx'), 'export default {}');
    writeFileSync(join(productsDir, 'detail.tsx'), 'export default {}');

    const result = await discoverOverrides({ srcDir });

    expect(result).toHaveLength(4);
    expect(result.map(o => o.relativePath).sort()).toEqual([
      'overrides/products/detail.tsx',
      'overrides/products/list.tsx',
      'overrides/users/detail.tsx',
      'overrides/users/list.tsx'
    ]);
  });

  it('should log appropriate message when src directory does not exist in verbose mode', async () => {
    const nonExistentDir = join(testDir, 'non-existent');

    // Capture console.log
    const originalLog = console.log;
    let logMessage = '';
    console.log = (msg: string) => { logMessage = msg; };

    await discoverOverrides({ srcDir: nonExistentDir, verbose: true });

    console.log = originalLog;
    expect(logMessage).toContain('Source directory does not exist');
    expect(logMessage).toContain(nonExistentDir);
  });

  it('should not log when src directory does not exist and verbose is false', async () => {
    const nonExistentDir = join(testDir, 'non-existent');

    // Capture console.log
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };

    await discoverOverrides({ srcDir: nonExistentDir, verbose: false });

    console.log = originalLog;
    expect(logCalled).toBe(false);
  });
});
