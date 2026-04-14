import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, '../../dist/index.js');

describe('CLI', () => {
  describe('--version flag', () => {
    it('should print version number', () => {
      const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
      expect(output.trim()).toBe('0.1.9');
    });

    it('should exit with code 0', () => {
      const result = execSync(`node ${cliPath} --version`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      // If execSync doesn't throw, the exit code was 0
      expect(result).toBeDefined();
    });

    it('should support -V shorthand', () => {
      const output = execSync(`node ${cliPath} -V`, { encoding: 'utf-8' });
      expect(output.trim()).toBe('0.1.9');
    });
  });

  describe('--help flag', () => {
    it('should print usage information', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
      expect(output).toContain('Usage: uigen');
      expect(output).toContain('Auto-generate admin UIs from OpenAPI specs');
    });

    it('should list all commands', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
      expect(output).toContain('Commands:');
      expect(output).toContain('serve');
    });

    it('should list all options', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
      expect(output).toContain('Options:');
      expect(output).toContain('--version');
      expect(output).toContain('--help');
    });

    it('should include examples', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
      expect(output).toContain('Examples:');
      expect(output).toContain('uigen serve petstore.yaml');
    });

    it('should exit with code 0', () => {
      const result = execSync(`node ${cliPath} --help`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      // If execSync doesn't throw, the exit code was 0
      expect(result).toBeDefined();
    });

    it('should support -h shorthand', () => {
      const output = execSync(`node ${cliPath} -h`, { encoding: 'utf-8' });
      expect(output).toContain('Usage: uigen');
    });
  });

  describe('serve command help', () => {
    it('should show serve command options', () => {
      const output = execSync(`node ${cliPath} serve --help`, { encoding: 'utf-8' });
      expect(output).toContain('Usage: uigen serve');
      expect(output).toContain('--port');
      expect(output).toContain('--proxy-base');
      expect(output).toContain('--verbose');
    });

    it('should include serve command examples', () => {
      const output = execSync(`node ${cliPath} serve --help`, { encoding: 'utf-8' });
      expect(output).toContain('Examples:');
      expect(output).toContain('uigen serve petstore.yaml --port 3000');
      expect(output).toContain('uigen serve petstore.yaml --proxy-base');
    });
  });
});
