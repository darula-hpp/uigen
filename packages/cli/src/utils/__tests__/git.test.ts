import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { initGitRepo } from '../git.js';

const execAsync = promisify(exec);

describe('initGitRepo', () => {
  const testDir = resolve(__dirname, '../../../test-projects');
  const projectName = 'test-git-project';
  const projectPath = join(testDir, projectName);

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(projectPath, { recursive: true });

    // Create a dummy file to commit
    writeFileSync(join(projectPath, 'README.md'), '# Test Project', 'utf-8');
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should initialize git repository successfully', async () => {
    const result = await initGitRepo(projectPath);

    expect(result.success).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(existsSync(join(projectPath, '.git'))).toBe(true);
  });

  it('should create initial commit', async () => {
    await initGitRepo(projectPath);

    // Check that a commit was created
    const { stdout } = await execAsync('git log --oneline', { cwd: projectPath });
    expect(stdout).toContain('Initial commit from uigen init');
  });

  it('should include all files in initial commit', async () => {
    // Create multiple files
    writeFileSync(join(projectPath, 'file1.txt'), 'content1', 'utf-8');
    writeFileSync(join(projectPath, 'file2.txt'), 'content2', 'utf-8');

    await initGitRepo(projectPath);

    // Check that files are tracked
    const { stdout } = await execAsync('git ls-files', { cwd: projectPath });
    expect(stdout).toContain('README.md');
    expect(stdout).toContain('file1.txt');
    expect(stdout).toContain('file2.txt');
  });

  it('should show verbose output when enabled', async () => {
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    await initGitRepo(projectPath, true);

    console.log = originalLog;

    expect(consoleLogs.some(log => log.includes('Initialized git repository'))).toBe(true);
    expect(consoleLogs.some(log => log.includes('Created initial commit'))).toBe(true);
  });

  it('should not show verbose output when disabled', async () => {
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    await initGitRepo(projectPath, false);

    console.log = originalLog;

    expect(consoleLogs.length).toBe(0);
  });

  it('should handle git init on existing repo gracefully', async () => {
    // Initialize once
    await initGitRepo(projectPath);
    
    // Add a new file for the second commit
    writeFileSync(join(projectPath, 'newfile.txt'), 'new content', 'utf-8');
    
    // Try to initialize again - should still succeed (git init is idempotent)
    const result = await initGitRepo(projectPath);
    
    // Git init on an existing repo is actually fine, so this should succeed
    expect(result.success).toBe(true);
  });

  it('should handle commit failure gracefully', async () => {
    // Remove the README file so there's nothing to commit
    rmSync(join(projectPath, 'README.md'));

    const result = await initGitRepo(projectPath);

    // Should fail because there's nothing to commit
    expect(result.success).toBe(false);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('Git initialization failed');
  });

  it('should work with nested directory structures', async () => {
    // Create nested directories
    const nestedDir = join(projectPath, 'src', 'components');
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(nestedDir, 'Component.tsx'), 'export const Component = () => {};', 'utf-8');

    await initGitRepo(projectPath);

    // Check that nested files are tracked
    const { stdout } = await execAsync('git ls-files', { cwd: projectPath });
    expect(stdout).toContain('src/components/Component.tsx');
  });

  it('should respect .gitignore if present', async () => {
    // Create .gitignore
    writeFileSync(join(projectPath, '.gitignore'), 'ignored.txt\n', 'utf-8');
    writeFileSync(join(projectPath, 'ignored.txt'), 'should be ignored', 'utf-8');
    writeFileSync(join(projectPath, 'tracked.txt'), 'should be tracked', 'utf-8');

    await initGitRepo(projectPath);

    // Check that .gitignore is respected
    const { stdout } = await execAsync('git ls-files', { cwd: projectPath });
    expect(stdout).toContain('tracked.txt');
    expect(stdout).toContain('.gitignore');
    expect(stdout).not.toContain('ignored.txt');
  });

  it('should return success false with warning message on error', async () => {
    // Use an invalid path to trigger an error
    const invalidPath = '/nonexistent/path/that/does/not/exist';

    const result = await initGitRepo(invalidPath);

    expect(result.success).toBe(false);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('Git initialization failed');
  });

  it('should handle special characters in commit message', async () => {
    await initGitRepo(projectPath);

    // Verify the commit message is properly escaped
    const { stdout } = await execAsync('git log --format=%s', { cwd: projectPath });
    expect(stdout.trim()).toBe('Initial commit from uigen init');
  });

  it('should return result object with correct structure', async () => {
    const result = await initGitRepo(projectPath);
    
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    
    // warning is optional
    if (result.warning) {
      expect(typeof result.warning).toBe('string');
    }
  });
});
