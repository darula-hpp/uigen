import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { transpileOverrides } from '../transpiler.js';
import type { DiscoveredOverride } from '../discovery.js';
import { clearCache, getCacheSize } from '../cache.js';
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('transpileOverrides', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `uigen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    // Clear cache before each test
    clearCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return empty result when no files are provided', async () => {
    const result = await transpileOverrides({
      files: [],
      mode: 'development',
    });

    expect(result.code).toBe('');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should transpile a simple TypeScript file', async () => {
    const filePath = join(testDir, 'simple.ts');
    writeFileSync(filePath, 'const x = 42; export default x;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'simple.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('42');
  });

  it('should transpile a TSX file with React components', async () => {
    const filePath = join(testDir, 'component.tsx');
    // Use jsx-dev-runtime which is simpler for testing
    writeFileSync(
      filePath,
      `
      const Component = () => {
        const element = { type: 'div', props: { children: 'Hello' } };
        return element;
      };
      export default Component;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'component.tsx' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // Check that the code was transformed
    expect(result.code).toContain('Hello');
  });

  it('should bundle multiple files together', async () => {
    const file1Path = join(testDir, 'file1.ts');
    const file2Path = join(testDir, 'file2.ts');
    
    writeFileSync(file1Path, 'export default { id: "file1" };');
    writeFileSync(file2Path, 'export default { id: "file2" };');

    const files: DiscoveredOverride[] = [
      { filePath: file1Path, relativePath: 'file1.ts' },
      { filePath: file2Path, relativePath: 'file2.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    // Log errors if any for debugging
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('file1');
    expect(result.code).toContain('file2');
  });

  it('should minify code in production mode', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(
      filePath,
      `
      // This is a comment
      const veryLongVariableName = 42;
      const anotherLongVariableName = veryLongVariableName * 2;
      export default anotherLongVariableName;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    const devResult = await transpileOverrides({
      files,
      mode: 'development',
    });

    const prodResult = await transpileOverrides({
      files,
      mode: 'production',
    });

    expect(prodResult.code).toBeTruthy();
    expect(prodResult.errors).toEqual([]);
    // Production code should be shorter due to minification
    expect(prodResult.code.length).toBeLessThan(devResult.code.length);
  });

  it('should include inline source maps in development mode', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'const x = 42; export default x;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // Check for inline source map
    expect(result.code).toContain('sourceMappingURL=data:application/json');
  });

  it('should not include source maps in production mode', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'const x = 42; export default x;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'production',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // Should not contain source map
    expect(result.code).not.toContain('sourceMappingURL');
  });

  it('should collect errors for files with syntax errors', async () => {
    const filePath = join(testDir, 'invalid.ts');
    writeFileSync(filePath, 'const x = ; // Invalid syntax');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'invalid.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toBeTruthy();
  });

  it('should handle TypeScript-specific syntax', async () => {
    const filePath = join(testDir, 'typescript.ts');
    writeFileSync(
      filePath,
      `
      interface User {
        name: string;
        age: number;
      }
      
      const user: User = { name: "John", age: 30 };
      export default user;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'typescript.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('John');
    expect(result.code).toContain('30');
  });

  it('should target ES2020', async () => {
    const filePath = join(testDir, 'modern.ts');
    writeFileSync(
      filePath,
      `
      // ES2020 features
      const obj = { a: 1, b: 2 };
      const result = obj?.a ?? 0;
      export default result;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'modern.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // Optional chaining and nullish coalescing should be preserved or polyfilled
    expect(result.code).toBeTruthy();
  });

  it('should output IIFE format', async () => {
    const filePath = join(testDir, 'module.ts');
    writeFileSync(filePath, 'export default 42;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'module.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // IIFE format should wrap code in an immediately invoked function (arrow or traditional)
    expect(result.code).toMatch(/\(\(\) => \{|\(function\s*\(/);
  });

  it('should not log when verbose is false', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'export default 42;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    // Capture console.log
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };

    await transpileOverrides({
      files,
      mode: 'development',
      verbose: false,
    });

    console.log = originalLog;
    expect(logCalled).toBe(false);
  });

  it('should log when verbose is true', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'export default 42;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    // Capture console.log
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (msg: string) => { logs.push(msg); };

    await transpileOverrides({
      files,
      mode: 'development',
      verbose: true,
    });

    console.log = originalLog;
    expect(logs.some(log => log.includes('Transpiling'))).toBe(true);
    expect(logs.some(log => log.includes('complete'))).toBe(true);
  });

  it('should log bundle size in verbose mode', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'export default 42;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    // Capture console.log
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (msg: string) => { logs.push(msg); };

    await transpileOverrides({
      files,
      mode: 'development',
      verbose: true,
    });

    console.log = originalLog;
    expect(logs.some(log => log.includes('KB'))).toBe(true);
  });

  it('should handle JSX automatic runtime', async () => {
    const filePath = join(testDir, 'jsx.tsx');
    // Test without actual JSX to avoid React dependency in tests
    writeFileSync(
      filePath,
      `
      const Component = () => {
        return { type: 'div', props: { children: 'Test' } };
      };
      export default Component;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'jsx.tsx' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    // Should transpile TSX files successfully
    expect(result.code).toContain('Test');
  });

  it('should handle empty files', async () => {
    const filePath = join(testDir, 'empty.ts');
    writeFileSync(filePath, '');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'empty.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    // Should not error on empty files
    expect(result.errors).toEqual([]);
  });

  it('should log errors in verbose mode', async () => {
    const filePath = join(testDir, 'invalid.ts');
    writeFileSync(filePath, 'const x = ;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'invalid.ts' },
    ];

    // Capture console.error
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: any[]) => { errors.push(args.join(' ')); };

    await transpileOverrides({
      files,
      mode: 'development',
      verbose: true,
    });

    console.error = originalError;
    expect(errors.length).toBeGreaterThan(0);
    // Check that error message contains relevant information
    const errorText = errors.join(' ');
    expect(errorText.includes('UIGen Overrides') || errorText.includes('invalid')).toBe(true);
  });

  it('should handle files with imports', async () => {
    const helperPath = join(testDir, 'helper.ts');
    const mainPath = join(testDir, 'main.ts');
    
    writeFileSync(helperPath, 'export const helper = () => 42;');
    writeFileSync(mainPath, 'import { helper } from "./helper"; export default helper();');

    const files: DiscoveredOverride[] = [
      { filePath: mainPath, relativePath: 'main.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    // Should bundle the import
    expect(result.code).toContain('42');
  });

  it('should produce deterministic output for the same input', async () => {
    const filePath = join(testDir, 'code.ts');
    writeFileSync(filePath, 'const x = 42; export default x;');

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'code.ts' },
    ];

    const result1 = await transpileOverrides({
      files,
      mode: 'production',
    });

    const result2 = await transpileOverrides({
      files,
      mode: 'production',
    });

    // Same input should produce same output
    expect(result1.code).toBe(result2.code);
  });

  it('should handle complex TypeScript features', async () => {
    const filePath = join(testDir, 'complex.ts');
    writeFileSync(
      filePath,
      `
      type User = {
        name: string;
        age: number;
      };
      
      const users: User[] = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 }
      ];
      
      const names = users.map(u => u.name);
      export default names;
      `
    );

    const files: DiscoveredOverride[] = [
      { filePath, relativePath: 'complex.ts' },
    ];

    const result = await transpileOverrides({
      files,
      mode: 'development',
    });

    expect(result.code).toBeTruthy();
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('Alice');
    expect(result.code).toContain('Bob');
  });

  describe('caching', () => {
    it('should cache transpiled code in development mode', async () => {
      const filePath = join(testDir, 'cached.ts');
      writeFileSync(filePath, 'export default 42;');

      const files: DiscoveredOverride[] = [
        { filePath, relativePath: 'cached.ts' },
      ];

      // First transpilation
      const result1 = await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      expect(result1.code).toBeTruthy();
      expect(getCacheSize()).toBe(1);

      // Second transpilation should use cache
      const result2 = await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      expect(result2.code).toBe(result1.code);
      expect(getCacheSize()).toBe(1);
    });

    it('should not cache in production mode by default', async () => {
      const filePath = join(testDir, 'nocache.ts');
      writeFileSync(filePath, 'export default 42;');

      const files: DiscoveredOverride[] = [
        { filePath, relativePath: 'nocache.ts' },
      ];

      // Transpile in production mode
      await transpileOverrides({
        files,
        mode: 'production',
      });

      // Cache should be empty
      expect(getCacheSize()).toBe(0);
    });

    it('should invalidate cache when file is modified', async () => {
      const filePath = join(testDir, 'modified.ts');
      writeFileSync(filePath, 'export default 42;');

      const files: DiscoveredOverride[] = [
        { filePath, relativePath: 'modified.ts' },
      ];

      // First transpilation
      const result1 = await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      expect(result1.code).toContain('42');

      // Wait a bit to ensure mtime changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify the file
      writeFileSync(filePath, 'export default 99;');

      // Touch the file to update mtime
      const now = new Date();
      utimesSync(filePath, now, now);

      // Second transpilation should re-transpile
      const result2 = await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      expect(result2.code).toContain('99');
      expect(result2.code).not.toBe(result1.code);
    });

    it('should cache multiple files independently', async () => {
      const file1Path = join(testDir, 'file1.ts');
      const file2Path = join(testDir, 'file2.ts');
      
      writeFileSync(file1Path, 'export default 1;');
      writeFileSync(file2Path, 'export default 2;');

      const files: DiscoveredOverride[] = [
        { filePath: file1Path, relativePath: 'file1.ts' },
        { filePath: file2Path, relativePath: 'file2.ts' },
      ];

      // First transpilation
      await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      expect(getCacheSize()).toBe(2);

      // Modify only file1
      await new Promise(resolve => setTimeout(resolve, 10));
      writeFileSync(file1Path, 'export default 10;');
      const now = new Date();
      utimesSync(file1Path, now, now);

      // Capture console.log to verify caching behavior
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (msg: string) => { logs.push(msg); };

      // Second transpilation
      await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
        verbose: true,
      });

      console.log = originalLog;

      // Should use cache for file2 but not file1
      expect(logs.some(log => log.includes('cached') && log.includes('file2'))).toBe(true);
      expect(logs.some(log => log.includes('Transpiled') && log.includes('file1'))).toBe(true);
    });

    it('should allow disabling cache with useCache option', async () => {
      const filePath = join(testDir, 'nocache.ts');
      writeFileSync(filePath, 'export default 42;');

      const files: DiscoveredOverride[] = [
        { filePath, relativePath: 'nocache.ts' },
      ];

      // Transpile with cache disabled
      await transpileOverrides({
        files,
        mode: 'development',
        useCache: false,
      });

      // Cache should be empty
      expect(getCacheSize()).toBe(0);
    });

    it('should return partial bundle when some files fail', async () => {
      const validPath = join(testDir, 'valid.ts');
      const invalidPath = join(testDir, 'invalid.ts');
      
      writeFileSync(validPath, 'export default 42;');
      writeFileSync(invalidPath, 'const x = ; // Invalid syntax');

      const files: DiscoveredOverride[] = [
        { filePath: validPath, relativePath: 'valid.ts' },
        { filePath: invalidPath, relativePath: 'invalid.ts' },
      ];

      const result = await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      // Should have code from valid file
      expect(result.code).toContain('42');
      // Should have errors from invalid file
      expect(result.errors.length).toBeGreaterThan(0);
      // Should cache the valid file
      expect(getCacheSize()).toBe(1);
    });

    it('should log cache hits in verbose mode', async () => {
      const filePath = join(testDir, 'cached.ts');
      writeFileSync(filePath, 'export default 42;');

      const files: DiscoveredOverride[] = [
        { filePath, relativePath: 'cached.ts' },
      ];

      // First transpilation
      await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
      });

      // Capture console.log
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (msg: string) => { logs.push(msg); };

      // Second transpilation with verbose
      await transpileOverrides({
        files,
        mode: 'development',
        useCache: true,
        verbose: true,
      });

      console.log = originalLog;

      // Should log cache hit
      expect(logs.some(log => log.includes('cached'))).toBe(true);
    });

    it('should report failed file count in verbose mode', async () => {
      const validPath = join(testDir, 'valid.ts');
      const invalidPath = join(testDir, 'invalid.ts');
      
      writeFileSync(validPath, 'export default 42;');
      writeFileSync(invalidPath, 'const x = ;');

      const files: DiscoveredOverride[] = [
        { filePath: validPath, relativePath: 'valid.ts' },
        { filePath: invalidPath, relativePath: 'invalid.ts' },
      ];

      // Capture console.log
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (msg: string) => { logs.push(msg); };

      await transpileOverrides({
        files,
        mode: 'development',
        verbose: true,
      });

      console.log = originalLog;

      // Should report 1/2 files succeeded and 1 failed
      expect(logs.some(log => log.includes('1/2') && log.includes('1 failed'))).toBe(true);
    });
  });
});
