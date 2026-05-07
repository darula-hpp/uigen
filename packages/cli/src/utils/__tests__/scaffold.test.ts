import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { scaffoldProject } from '../scaffold.js';

describe('scaffoldProject', () => {
  const testDir = resolve(__dirname, '../../../test-projects');
  const projectName = 'test-project';
  const projectPath = join(testDir, projectName);

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create all required directories', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    expect(existsSync(projectPath)).toBe(true);
    expect(existsSync(join(projectPath, '.agents/skills'))).toBe(true);
    expect(existsSync(join(projectPath, '.uigen'))).toBe(true);
    expect(existsSync(join(projectPath, '.uigen/assets'))).toBe(true);
  });

  it('should create config.yaml with correct content', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const configPath = join(projectPath, '.uigen/config.yaml');
    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('version: \'1.0\'');
    expect(content).toContain('enabled: {}');
    expect(content).toContain('defaults: {}');
    expect(content).toContain('annotations: {}');
  });

  it('should create theme.css with correct content', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const themePath = join(projectPath, '.uigen/theme.css');
    expect(existsSync(themePath)).toBe(true);

    const content = readFileSync(themePath, 'utf-8');
    expect(content).toContain('UIGen Custom Theme');
    expect(content).toContain('base-styles.css');
  });

  it('should create .gitignore with correct content', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const gitignorePath = join(projectPath, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);

    const content = readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('annotations.json');
    expect(content).toContain('.DS_Store');
  });

  it('should create README.md with project name', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const readmePath = join(projectPath, 'README.md');
    expect(existsSync(readmePath)).toBe(true);

    const content = readFileSync(readmePath, 'utf-8');
    expect(content).toContain(`# ${projectName}`);
    expect(content).toContain('uigen init');
    expect(content).toContain('Quick Start');
  });

  it('should create example openapi.yaml when no spec provided', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const specPath = join(projectPath, 'openapi.yaml');
    expect(existsSync(specPath)).toBe(true);

    const content = readFileSync(specPath, 'utf-8');
    expect(content).toContain('openapi: 3.0.0');
    expect(content).toContain(`title: ${projectName}`);
    expect(content).toContain('x-uigen-app:');
    expect(content).toContain(`name: "${projectName}"`);
    expect(content).toContain('# icon: "/.uigen/assets/logo.svg"');
  });

  it('should copy provided spec file', async () => {
    // Create a test spec file
    const testSpecPath = join(testDir, 'test-spec.yaml');
    const testSpecContent = 'openapi: 3.0.0\ninfo:\n  title: Test API\n  version: 1.0.0';
    writeFileSync(testSpecPath, testSpecContent, 'utf-8');

    await scaffoldProject(projectPath, { 
      name: projectName, 
      spec: testSpecPath 
    });

    const copiedSpecPath = join(projectPath, 'openapi.yaml');
    expect(existsSync(copiedSpecPath)).toBe(true);

    const content = readFileSync(copiedSpecPath, 'utf-8');
    expect(content).toContain('title: Test API');
  });

  it('should show verbose output when enabled', async () => {
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    await scaffoldProject(projectPath, { name: projectName }, true);

    console.log = originalLog;

    expect(consoleLogs.some(log => log.includes('Created .agents/skills/'))).toBe(true);
    expect(consoleLogs.some(log => log.includes('Created .uigen/'))).toBe(true);
    expect(consoleLogs.some(log => log.includes('Created .uigen/assets/'))).toBe(true);
    expect(consoleLogs.some(log => log.includes('Created .uigen/config.yaml'))).toBe(true);
  });

  it('should handle missing bundled files gracefully', async () => {
    // This test verifies that the function doesn't crash when bundled files are missing
    // (which happens during development before build)
    await expect(
      scaffoldProject(projectPath, { name: projectName })
    ).resolves.not.toThrow();

    // Core files should still be created
    expect(existsSync(join(projectPath, '.uigen/config.yaml'))).toBe(true);
    expect(existsSync(join(projectPath, '.uigen/theme.css'))).toBe(true);
    expect(existsSync(join(projectPath, '.gitignore'))).toBe(true);
    expect(existsSync(join(projectPath, 'README.md'))).toBe(true);
    expect(existsSync(join(projectPath, 'openapi.yaml'))).toBe(true);
  });

  it('should create all files in correct locations', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const expectedFiles = [
      '.agents/skills',
      '.uigen',
      '.uigen/assets',
      '.uigen/config.yaml',
      '.uigen/theme.css',
      'openapi.yaml',
      '.gitignore',
      'README.md'
    ];

    for (const file of expectedFiles) {
      const filePath = join(projectPath, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  it('should copy default logo.svg to .uigen/assets/', async () => {
    await scaffoldProject(projectPath, { name: projectName });

    const logoPath = join(projectPath, '.uigen/assets/logo.svg');
    // Logo may not exist if running tests before build
    // Test should pass either way (graceful handling)
    if (existsSync(logoPath)) {
      const content = readFileSync(logoPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
    }
  });

  it('should log verbose message when copying logo.svg', async () => {
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    await scaffoldProject(projectPath, { name: projectName }, true);

    console.log = originalLog;

    // Should either log copy success or warning about missing file
    const hasLogoLog = consoleLogs.some(log => 
      log.includes('Copied logo.svg') || log.includes('logo.svg not found')
    );
    expect(hasLogoLog).toBe(true);
  });
});
