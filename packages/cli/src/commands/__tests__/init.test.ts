import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { init } from '../init.js';

// Mock dependencies
vi.mock('fs');
vi.mock('picocolors', () => ({
  default: {
    cyan: (s: string) => s,
    gray: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s
  }
}));

// Mock utility modules
vi.mock('../../utils/prompts.js', () => ({
  promptForOptions: vi.fn()
}));

vi.mock('../../utils/scaffold.js', () => ({
  scaffoldProject: vi.fn()
}));

vi.mock('../../utils/git.js', () => ({
  initGitRepo: vi.fn()
}));

describe('Init Command', () => {
  let mockProcessExit: any;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock process.exit to prevent test termination
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Non-Interactive Mode (--yes flag)', () => {
    it('should create project with default name when no name provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      // Mock directory doesn't exist
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      // Mock successful git init
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init(undefined, { yes: true });
      
      // Verify directory creation
      expect(mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('my-uigen-project'),
        { recursive: true }
      );
      
      // Verify scaffolding was called
      expect(scaffoldProject).toHaveBeenCalled();
      
      // Verify git init was called
      expect(initGitRepo).toHaveBeenCalled();
    });

    it('should create project with provided name', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('my-app'),
        { recursive: true }
      );
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.stringContaining('my-app'),
        expect.objectContaining({
          name: 'my-app',
          dir: 'my-app'
        }),
        undefined
      );
    });

    it('should use custom directory when --dir flag provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, dir: './custom-path' });
      
      expect(mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('custom-path'),
        { recursive: true }
      );
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.stringContaining('custom-path'),
        expect.objectContaining({
          dir: './custom-path'
        }),
        undefined
      );
    });

    it('should pass spec file to scaffold when provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, spec: 'openapi.yaml' });
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: 'openapi.yaml'
        }),
        undefined
      );
    });

    it('should skip git init when --no-git flag provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      await init('my-app', { yes: true, git: false });
      
      expect(scaffoldProject).toHaveBeenCalled();
      expect(initGitRepo).not.toHaveBeenCalled();
    });

    it('should enable verbose logging when --verbose flag provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, verbose: true });
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        true
      );
      
      expect(initGitRepo).toHaveBeenCalledWith(
        expect.any(String),
        true
      );
    });
  });

  describe('Interactive Mode', () => {
    it('should call promptForOptions when --yes flag not provided', async () => {
      const { promptForOptions } = await import('../../utils/prompts.js');
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      // Mock prompt response
      vi.mocked(promptForOptions).mockResolvedValue({
        name: 'my-app',
        dir: 'my-app',
        git: true,
        autoAnnotate: false
      });
      
      await init('my-app', {});
      
      expect(promptForOptions).toHaveBeenCalledWith('my-app', {});
    });

    it('should pass options to promptForOptions', async () => {
      const { promptForOptions } = await import('../../utils/prompts.js');
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      vi.mocked(promptForOptions).mockResolvedValue({
        name: 'my-app',
        dir: 'my-app',
        spec: 'api.yaml',
        git: true,
        autoAnnotate: true
      });
      
      const options = { spec: 'api.yaml', dir: './custom' };
      await init('my-app', options);
      
      expect(promptForOptions).toHaveBeenCalledWith('my-app', options);
    });
  });

  describe('Error Handling', () => {
    it('should fail when directory already exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      
      await init('existing-project', { yes: true });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Error: Directory 'existing-project' already exists")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should show helpful message when directory exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      
      await init('existing-project', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Choose a different name or remove the existing directory')
      );
    });

    it('should handle scaffold errors gracefully', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      // Mock scaffold error
      vi.mocked(scaffoldProject).mockRejectedValue(new Error('Scaffold failed'));
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        'Scaffold failed'
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle git init errors gracefully', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      // Mock git init failure with warning
      vi.mocked(initGitRepo).mockResolvedValue({
        success: false,
        warning: 'Git not found'
      });
      
      await init('my-app', { yes: true });
      
      // Should not exit, just show warning
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Git not found')
      );
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should show stack trace in verbose mode', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:1:1';
      vi.mocked(scaffoldProject).mockRejectedValue(error);
      
      await init('my-app', { yes: true, verbose: true });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(error.stack)
      );
    });
  });

  describe('Git Repository Initialization', () => {
    it('should initialize git by default', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(initGitRepo).toHaveBeenCalled();
    });

    it('should show success message when git init succeeds', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Git repository initialized')
      );
    });

    it('should show warning when git init fails', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({
        success: false,
        warning: 'Git not installed'
      });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Git not installed')
      );
    });
  });

  describe('Success Message', () => {
    it('should display project structure', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Project structure:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('.git/')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('.uigen/')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('openapi.yaml')
      );
    });

    it('should show next steps', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Next steps:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('cd my-app')
      );
    });

    it('should show auto-annotate guidance when spec provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, spec: 'api.yaml' });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('auto-annotate')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('.agents/skills/auto-annotate.md')
      );
    });

    it('should show spec creation guidance when no spec provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Add your OpenAPI spec')
      );
    });

    it('should show documentation link', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('https://uigen.dev/docs/getting-started')
      );
    });
  });

  describe('Directory Path Resolution', () => {
    it('should resolve project path relative to cwd', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      const expectedPath = resolve(process.cwd(), 'my-app');
      expect(mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });

    it('should handle relative paths in --dir option', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, dir: './nested/path' });
      
      const expectedPath = resolve(process.cwd(), './nested/path');
      expect(mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });

    it('should create directory with recursive option', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true });
      
      expect(mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('Configuration Object', () => {
    it('should build correct config for default options', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init(undefined, { yes: true });
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'my-uigen-project',
          dir: 'my-uigen-project',
          git: true
        }),
        undefined
      );
    });

    it('should include spec in config when provided', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, spec: 'custom.yaml' });
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          spec: 'custom.yaml'
        }),
        undefined
      );
    });

    it('should respect git option in config', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      
      await init('my-app', { yes: true, git: false });
      
      expect(scaffoldProject).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          git: false
        }),
        undefined
      );
      expect(initGitRepo).not.toHaveBeenCalled();
    });
  });

  describe('Verbose Output', () => {
    it('should log project path in verbose mode', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, verbose: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Project path:')
      );
    });

    it('should not log extra details without verbose flag', async () => {
      const { scaffoldProject } = await import('../../utils/scaffold.js');
      const { initGitRepo } = await import('../../utils/git.js');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(initGitRepo).mockResolvedValue({ success: true });
      
      await init('my-app', { yes: true, verbose: false });
      
      // Should not contain verbose-only messages
      const calls = mockConsoleLog.mock.calls.flat();
      const hasProjectPath = calls.some(call => 
        typeof call === 'string' && call.includes('Project path:')
      );
      expect(hasProjectPath).toBe(false);
    });
  });
});
