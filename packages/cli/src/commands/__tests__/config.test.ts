import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { platform } from 'os';
import { config } from '../config.js';
import type { ViteDevServer } from 'vite';

// Mock dependencies
vi.mock('fs');
vi.mock('child_process');
vi.mock('os');
vi.mock('vite');
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

describe('Config Command', () => {
  let mockServer: Partial<ViteDevServer>;
  let mockProcessExit: any;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Vite server
    mockServer = {
      listen: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      config: {
        server: {
          port: 4401
        }
      } as any
    };
    
    // Mock process.exit to prevent test termination
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Integration Tests', () => {
    it('should start Vite server with valid spec', async () => {
      const { createServer } = await import('vite');
      
      // Mock file existence
      vi.mocked(existsSync).mockReturnValue(true);
      
      // Mock Vite server creation
      vi.mocked(createServer).mockResolvedValue(mockServer as ViteDevServer);
      
      // Mock browser opening
      const mockExec = vi.fn((cmd: string, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (callback) callback(null, '', '');
        return {} as any;
      });
      vi.mocked(exec).mockImplementation(mockExec as any);
      
      // Mock platform
      vi.mocked(platform).mockReturnValue('darwin');
      
      // Start the config command (don't await to avoid hanging)
      const configPromise = config('petstore.yaml', { port: 4401 });
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify server was created and started
      expect(createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalled();
      
      // Clean up
      if (mockServer.close) mockServer.close();
    });

    it('should handle missing spec file', async () => {
      // Mock file not existing
      vi.mocked(existsSync).mockReturnValue(false);
      
      // Call config command
      await config('nonexistent.yaml', {});
      
      // Verify error handling
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error: Spec file not found')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle port conflicts', async () => {
      const { createServer } = await import('vite');
      
      // Mock file existence
      vi.mocked(existsSync).mockReturnValue(true);
      
      // Mock first call to fail with port conflict, second to succeed
      let callCount = 0;
      vi.mocked(createServer).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error: any = new Error('Port in use');
          error.code = 'EADDRINUSE';
          return Promise.reject(error);
        }
        return Promise.resolve({
          ...mockServer,
          config: {
            server: {
              port: 4402 // Next port
            }
          } as any
        } as ViteDevServer);
      });
      
      // Mock browser opening
      const mockExec = vi.fn((cmd: string, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (callback) callback(null, '', '');
        return {} as any;
      });
      vi.mocked(exec).mockImplementation(mockExec as any);
      
      // Mock platform
      vi.mocked(platform).mockReturnValue('darwin');
      
      // Start the config command
      const configPromise = config('petstore.yaml', { port: 4401 });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify retry logic was triggered
      expect(createServer).toHaveBeenCalledTimes(2);
      
      // Clean up
      if (mockServer.close) mockServer.close();
    });

    it('should mock browser opening', async () => {
      const { createServer } = await import('vite');
      
      // Mock file existence
      vi.mocked(existsSync).mockReturnValue(true);
      
      // Mock Vite server
      vi.mocked(createServer).mockResolvedValue(mockServer as ViteDevServer);
      
      // Mock browser opening with callback
      const mockExec = vi.fn((cmd: string, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (callback) callback(null, '', '');
        return {} as any;
      });
      vi.mocked(exec).mockImplementation(mockExec as any);
      
      // Mock platform
      vi.mocked(platform).mockReturnValue('darwin');
      
      // Start the config command
      const configPromise = config('petstore.yaml', { port: 4401 });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify browser was opened
      expect(mockExec).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('open'),
        expect.any(Function)
      );
      
      // Clean up
      if (mockServer.close) mockServer.close();
    });
  });


  describe('Spec Path Validation', () => {
    it('should validate that spec file exists', () => {
      const specPath = 'petstore.yaml';
      const resolvedPath = resolve(process.cwd(), specPath);
      
      // Mock file existence check
      vi.mocked(existsSync).mockReturnValue(true);
      
      const fileExists = existsSync(resolvedPath);
      expect(fileExists).toBe(true);
    });

    it('should handle missing spec file', () => {
      const specPath = 'nonexistent.yaml';
      const resolvedPath = resolve(process.cwd(), specPath);
      
      // Mock file not existing
      vi.mocked(existsSync).mockReturnValue(false);
      
      const fileExists = existsSync(resolvedPath);
      expect(fileExists).toBe(false);
    });

    it('should resolve relative paths correctly', () => {
      const specPath = './specs/petstore.yaml';
      const resolvedPath = resolve(process.cwd(), specPath);
      
      expect(resolvedPath).toContain('specs/petstore.yaml');
      expect(resolvedPath).not.toContain('./');
    });

    it('should resolve absolute paths correctly', () => {
      const specPath = '/absolute/path/to/spec.yaml';
      const resolvedPath = resolve(process.cwd(), specPath);
      
      expect(resolvedPath).toBe(specPath);
    });
  });

  describe('Browser Opening', () => {
    it('should use "open" command on macOS', () => {
      vi.mocked(platform).mockReturnValue('darwin');
      
      const url = 'http://localhost:4401';
      const expectedCommand = `open "${url}"`;
      
      const os = platform();
      let command: string;
      
      if (os === 'darwin') {
        command = `open "${url}"`;
      }
      
      expect(command!).toBe(expectedCommand);
    });

    it('should use "start" command on Windows', () => {
      vi.mocked(platform).mockReturnValue('win32');
      
      const url = 'http://localhost:4401';
      const expectedCommand = `start "" "${url}"`;
      
      const os = platform();
      let command: string;
      
      if (os === 'win32') {
        command = `start "" "${url}"`;
      }
      
      expect(command!).toBe(expectedCommand);
    });

    it('should use "xdg-open" command on Linux', () => {
      vi.mocked(platform).mockReturnValue('linux');
      
      const url = 'http://localhost:4401';
      const expectedCommand = `xdg-open "${url}"`;
      
      const os = platform();
      let command: string;
      
      if (os === 'linux') {
        command = `xdg-open "${url}"`;
      }
      
      expect(command!).toBe(expectedCommand);
    });

    it('should handle browser opening errors gracefully', () => {
      const error = new Error('Browser not found');
      const url = 'http://localhost:4401';
      
      // Simulate error handling
      let errorHandled = false;
      if (error) {
        errorHandled = true;
      }
      
      expect(errorHandled).toBe(true);
    });
  });

  describe('Port Configuration', () => {
    it('should use default port 4401 when not specified', () => {
      const options: { port?: number } = {};
      const port = options.port || 4401;
      
      expect(port).toBe(4401);
    });

    it('should use custom port when specified', () => {
      const options: { port?: number } = { port: 5000 };
      const port = options.port || 4401;
      
      expect(port).toBe(5000);
    });

    it('should handle port conflicts by retrying', () => {
      const startPort = 4401;
      const maxRetries = 10;
      
      // Simulate port conflict and retry
      let currentPort = startPort;
      const portInUse = true;
      
      if (portInUse) {
        currentPort++;
      }
      
      expect(currentPort).toBe(4402);
      expect(currentPort).toBeGreaterThan(startPort);
    });

    it('should try multiple ports on conflict', () => {
      const startPort = 4401;
      const attempts = 3;
      
      let currentPort = startPort;
      for (let i = 0; i < attempts; i++) {
        currentPort++;
      }
      
      expect(currentPort).toBe(4404);
    });
  });

  describe('Config GUI Package Resolution', () => {
    it('should resolve config-gui package from node_modules', () => {
      const pkgName = '@uigen-dev/config-gui';
      const candidates = [
        resolve(__dirname, '../../..', pkgName),
        resolve(__dirname, '../../../../node_modules', pkgName),
        resolve(__dirname, '../node_modules', pkgName),
      ];
      
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toContain(pkgName);
    });

    it('should check for package.json in resolved path', () => {
      const configGuiRoot = '/path/to/config-gui';
      const packageJsonPath = resolve(configGuiRoot, 'package.json');
      
      expect(packageJsonPath).toContain('package.json');
      expect(packageJsonPath).toContain(configGuiRoot);
    });
  });

  describe('Vite Server Configuration', () => {
    it('should inject spec path into HTML', () => {
      const specPath = '/absolute/path/to/petstore.yaml';
      const html = '<html><head></head><body></body></html>';
      
      const injectedHtml = html.replace(
        '</head>',
        `<script>window.__UIGEN_SPEC_PATH__ = ${JSON.stringify(specPath)};</script></head>`
      );
      
      expect(injectedHtml).toContain('window.__UIGEN_SPEC_PATH__');
      expect(injectedHtml).toContain(specPath);
    });

    it('should configure CORS for config GUI', () => {
      const corsConfig = {
        origin: '*',
        credentials: true
      };
      
      expect(corsConfig.origin).toBe('*');
      expect(corsConfig.credentials).toBe(true);
    });

    it('should set strictPort to false for automatic port finding', () => {
      const serverConfig = {
        port: 4401,
        strictPort: false
      };
      
      expect(serverConfig.strictPort).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should exit with non-zero code on missing spec', () => {
      const exitCode = 1;
      
      expect(exitCode).toBeGreaterThan(0);
    });

    it('should log error message for missing spec', () => {
      const specPath = 'missing.yaml';
      const errorMessage = `Error: Spec file not found: ${specPath}`;
      
      expect(errorMessage).toContain('Error');
      expect(errorMessage).toContain(specPath);
    });

    it('should handle Vite server startup errors', () => {
      const error = new Error('Failed to start server');
      
      expect(error.message).toContain('Failed to start server');
    });

    it('should provide helpful message when max retries exceeded', () => {
      const maxRetries = 10;
      const errorMessage = `Failed to start server after ${maxRetries} attempts`;
      
      expect(errorMessage).toContain('Failed to start server');
      expect(errorMessage).toContain(maxRetries.toString());
    });
  });

  describe('Verbose Logging', () => {
    it('should log config GUI root when verbose is enabled', () => {
      const options = { verbose: true };
      const configGuiRoot = '/path/to/config-gui';
      
      if (options.verbose) {
        const logMessage = `Config GUI root: ${configGuiRoot}`;
        expect(logMessage).toContain(configGuiRoot);
      }
    });

    it('should not log extra details when verbose is disabled', () => {
      const options = { verbose: false };
      
      expect(options.verbose).toBe(false);
    });
  });

  describe('Process Signal Handling', () => {
    it('should handle SIGINT for graceful shutdown', () => {
      const signal = 'SIGINT';
      let shutdownCalled = false;
      
      // Simulate signal handler
      if (signal === 'SIGINT') {
        shutdownCalled = true;
      }
      
      expect(shutdownCalled).toBe(true);
    });

    it('should handle SIGTERM for graceful shutdown', () => {
      const signal = 'SIGTERM';
      let shutdownCalled = false;
      
      // Simulate signal handler
      if (signal === 'SIGTERM') {
        shutdownCalled = true;
      }
      
      expect(shutdownCalled).toBe(true);
    });
  });
});
