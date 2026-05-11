import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { build } from '../build.js';

const TEST_DIR = resolve(process.cwd(), 'test-build-output');
const TEST_PROJECT_DIR = resolve(process.cwd(), 'test-build-project');

describe('build command', () => {
  beforeEach(() => {
    // Clean up any existing test directories
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (existsSync(TEST_PROJECT_DIR)) {
      rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }

    // Create test project structure
    mkdirSync(TEST_PROJECT_DIR, { recursive: true });
    mkdirSync(resolve(TEST_PROJECT_DIR, '.uigen/assets'), { recursive: true });
    
    // Create test files
    writeFileSync(
      resolve(TEST_PROJECT_DIR, '.uigen/config.yaml'),
      'version: 1.0\n'
    );
    writeFileSync(
      resolve(TEST_PROJECT_DIR, '.uigen/theme.css'),
      ':root { --primary: blue; }\n'
    );
    writeFileSync(
      resolve(TEST_PROJECT_DIR, '.uigen/base-styles.css'),
      'body { margin: 0; }\n'
    );
    writeFileSync(
      resolve(TEST_PROJECT_DIR, '.uigen/assets/logo.svg'),
      '<svg></svg>\n'
    );
    writeFileSync(
      resolve(TEST_PROJECT_DIR, 'openapi.yaml'),
      'openapi: 3.0.0\ninfo:\n  title: Test API\n  version: 1.0.0\n'
    );
    writeFileSync(
      resolve(TEST_PROJECT_DIR, 'annotations.json'),
      '{"annotations": []}\n'
    );

    // Change to test project directory
    process.chdir(TEST_PROJECT_DIR);
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (existsSync(TEST_PROJECT_DIR)) {
      rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
  });

  it('should copy .uigen directory to build folder', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    await build('openapi.yaml', { output: TEST_DIR });

    expect(existsSync(resolve(TEST_DIR, '.uigen'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, '.uigen/config.yaml'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, '.uigen/theme.css'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, '.uigen/base-styles.css'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, '.uigen/assets/logo.svg'))).toBe(true);

    mockExit.mockRestore();
  });

  it('should copy OpenAPI spec to build folder', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    await build('openapi.yaml', { output: TEST_DIR });

    expect(existsSync(resolve(TEST_DIR, 'openapi.yaml'))).toBe(true);

    mockExit.mockRestore();
  });

  it('should copy annotations.json if it exists', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    await build('openapi.yaml', { output: TEST_DIR });

    expect(existsSync(resolve(TEST_DIR, 'annotations.json'))).toBe(true);

    mockExit.mockRestore();
  });

  it('should use default build directory when output not specified', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const defaultBuildDir = resolve(TEST_PROJECT_DIR, 'build');
    
    await build('openapi.yaml', {});

    expect(existsSync(resolve(defaultBuildDir, '.uigen'))).toBe(true);
    expect(existsSync(resolve(defaultBuildDir, 'openapi.yaml'))).toBe(true);

    // Clean up
    if (existsSync(defaultBuildDir)) {
      rmSync(defaultBuildDir, { recursive: true, force: true });
    }

    mockExit.mockRestore();
  });

  it('should clean output directory when clean option is true', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Create output directory with existing content
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(resolve(TEST_DIR, 'old-file.txt'), 'old content');

    await build('openapi.yaml', { output: TEST_DIR, clean: true });

    expect(existsSync(resolve(TEST_DIR, 'old-file.txt'))).toBe(false);
    expect(existsSync(resolve(TEST_DIR, '.uigen'))).toBe(true);

    mockExit.mockRestore();
  });

  it('should exit with error when .uigen directory does not exist', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Remove .uigen directory
    rmSync(resolve(TEST_PROJECT_DIR, '.uigen'), { recursive: true, force: true });

    await build('openapi.yaml', { output: TEST_DIR });

    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should exit with error when spec file does not exist', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await build('nonexistent.yaml', { output: TEST_DIR });

    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should handle missing annotations.json gracefully', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Remove annotations.json
    rmSync(resolve(TEST_PROJECT_DIR, 'annotations.json'), { force: true });

    await build('openapi.yaml', { output: TEST_DIR });

    expect(existsSync(resolve(TEST_DIR, '.uigen'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, 'openapi.yaml'))).toBe(true);
    expect(existsSync(resolve(TEST_DIR, 'annotations.json'))).toBe(false);

    mockExit.mockRestore();
  });
});
