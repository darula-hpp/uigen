import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { scaffoldProject } from '../scaffold.js';

describe('Scaffold Environment Variables Integration', () => {
  const testDir = resolve(__dirname, '../../../test-projects-env-vars');
  const projectName = 'test-env-vars-project';
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

  describe('config.yaml environment variable examples', () => {
    it('should include environment variable syntax examples in config.yaml', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, 'utf-8');
      
      // Should contain ${ENV_VAR_NAME} syntax examples
      expect(content).toContain('${');
      expect(content).toContain('}');
    });

    it('should include OAuth credential examples with environment variables', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should demonstrate OAuth use case with env vars
      expect(content).toContain('GOOGLE_CLIENT_ID');
      expect(content).toContain('GOOGLE_REDIRECT_URI');
    });

    it('should include explanatory comments about environment variables', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should explain the feature
      expect(content).toContain('environment variable');
      expect(content).toContain('${ENV_VAR_NAME}');
    });

    it('should include comments about not committing sensitive values', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should warn about security
      expect(content.toLowerCase()).toMatch(/sensitive|secret|credential|commit/);
    });

    it('should demonstrate OAuth provider configuration with env vars', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should show OAuth provider structure
      expect(content).toContain('provider:');
      expect(content).toContain('google');
      expect(content).toContain('clientId:');
      expect(content).toContain('redirectUri:');
    });

    it('should show both env var and literal value examples', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should demonstrate when to use env vars vs literals
      expect(content).toContain('${GOOGLE_CLIENT_ID}');
      expect(content).toContain('scopes:');
    });
  });

  describe('.env.example file generation', () => {
    it('should create .env.example file', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      expect(existsSync(envExamplePath)).toBe(true);
    });

    it('should include GOOGLE_CLIENT_ID in .env.example', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      expect(content).toContain('GOOGLE_CLIENT_ID');
    });

    it('should include GOOGLE_REDIRECT_URI in .env.example', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      expect(content).toContain('GOOGLE_REDIRECT_URI');
    });

    it('should include placeholder values in .env.example', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should have example values, not empty
      expect(content).toMatch(/GOOGLE_CLIENT_ID=.+/);
      expect(content).toMatch(/GOOGLE_REDIRECT_URI=.+/);
    });

    it('should include explanatory comments in .env.example', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should explain what the file is for
      expect(content).toContain('#');
      expect(content.toLowerCase()).toMatch(/uigen|environment|variable/);
    });

    it('should warn about not committing .env files', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should include security warning
      expect(content.toLowerCase()).toMatch(/never|don't|do not|commit/);
      expect(content).toContain('.env');
    });

    it('should include OAuth configuration section', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should organize by feature
      expect(content.toLowerCase()).toMatch(/oauth|google|auth/);
    });

    it('should include realistic example values', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should show what format values should be in
      expect(content).toMatch(/\.apps\.googleusercontent\.com|your-client-id/);
      expect(content).toMatch(/http:\/\/localhost|callback|redirect/);
    });
  });

  describe('.gitignore environment variable entries', () => {
    it('should include .env in .gitignore', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const gitignorePath = join(projectPath, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      
      expect(content).toMatch(/^\.env$/m);
    });

    it('should include .env.local in .gitignore', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const gitignorePath = join(projectPath, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      
      expect(content).toMatch(/\.env\.local/);
    });

    it('should not include .env.example in .gitignore', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const gitignorePath = join(projectPath, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      
      // .env.example should be tracked in git
      expect(content).not.toMatch(/\.env\.example/);
    });

    it('should have environment variables section in .gitignore', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const gitignorePath = join(projectPath, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      
      // Should have a clear section for env files
      expect(content.toLowerCase()).toMatch(/#.*environment|# env/);
    });
  });

  describe('Best practices demonstration', () => {
    it('should demonstrate when to use env vars vs literals', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configPath = join(projectPath, '.uigen/config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      
      // Should show env vars for sensitive data
      expect(content).toContain('${GOOGLE_CLIENT_ID}');
      
      // Should show literals for non-sensitive config
      expect(content).toContain('scopes:');
      expect(content).toMatch(/openid|email|profile/);
    });

    it('should include API endpoint examples', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should demonstrate API configuration
      expect(content).toMatch(/API_BASE_URL|API_URL|BASE_URL/);
    });

    it('should show localhost examples for development', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should use localhost for dev examples
      expect(content).toContain('localhost');
    });

    it('should demonstrate port configuration', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const envExamplePath = join(projectPath, '.env.example');
      const content = readFileSync(envExamplePath, 'utf-8');
      
      // Should show port configuration
      expect(content).toMatch(/PORT|:8000|:3000/);
    });
  });

  describe('Verbose output', () => {
    it('should log .env.example creation in verbose mode', async () => {
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        consoleLogs.push(args.join(' '));
      };

      await scaffoldProject(projectPath, { name: projectName }, true);

      console.log = originalLog;

      expect(consoleLogs.some(log => log.includes('.env.example'))).toBe(true);
    });

    it('should log updated .gitignore in verbose mode', async () => {
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        consoleLogs.push(args.join(' '));
      };

      await scaffoldProject(projectPath, { name: projectName }, true);

      console.log = originalLog;

      expect(consoleLogs.some(log => log.includes('.gitignore'))).toBe(true);
    });
  });

  describe('Complete workflow validation', () => {
    it('should create all env var related files together', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      // All three files should exist
      expect(existsSync(join(projectPath, '.uigen/config.yaml'))).toBe(true);
      expect(existsSync(join(projectPath, '.env.example'))).toBe(true);
      expect(existsSync(join(projectPath, '.gitignore'))).toBe(true);
    });

    it('should have consistent variable names across files', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configContent = readFileSync(join(projectPath, '.uigen/config.yaml'), 'utf-8');
      const envExampleContent = readFileSync(join(projectPath, '.env.example'), 'utf-8');

      // Variables referenced in config should be defined in .env.example
      if (configContent.includes('${GOOGLE_CLIENT_ID}')) {
        expect(envExampleContent).toContain('GOOGLE_CLIENT_ID');
      }
      if (configContent.includes('${GOOGLE_REDIRECT_URI}')) {
        expect(envExampleContent).toContain('GOOGLE_REDIRECT_URI');
      }
    });

    it('should provide a complete OAuth setup example', async () => {
      await scaffoldProject(projectPath, { name: projectName });

      const configContent = readFileSync(join(projectPath, '.uigen/config.yaml'), 'utf-8');
      const envExampleContent = readFileSync(join(projectPath, '.env.example'), 'utf-8');
      const gitignoreContent = readFileSync(join(projectPath, '.gitignore'), 'utf-8');

      // Config should reference env vars
      expect(configContent).toContain('${GOOGLE_CLIENT_ID}');
      
      // .env.example should define them
      expect(envExampleContent).toContain('GOOGLE_CLIENT_ID=');
      
      // .gitignore should protect .env
      expect(gitignoreContent).toMatch(/^\.env$/m);
    });
  });
});
