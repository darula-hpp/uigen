import { describe, it, expect } from 'vitest';
import {
  getConfigTemplate,
  getThemeTemplate,
  getGitignoreTemplate,
  getReadmeTemplate,
  getExampleSpecTemplate,
} from '../index.js';
import { load as parseYaml } from 'js-yaml';

describe('Template Functions', () => {
  describe('getConfigTemplate', () => {
    it('should return a valid YAML string', () => {
      const template = getConfigTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
      
      // Should be valid YAML
      const parsed = parseYaml(template) as any;
      expect(parsed).toBeDefined();
      expect(parsed.version).toBe('1.0');
      expect(parsed.enabled).toEqual({});
      expect(parsed.defaults).toEqual({});
      expect(parsed.annotations).toEqual({});
    });

    it('should not contain hardcoded project-specific values', () => {
      const template = getConfigTemplate();
      expect(template).not.toContain('my-project');
      expect(template).not.toContain('example.com');
    });
  });

  describe('getThemeTemplate', () => {
    it('should return a valid CSS string', () => {
      const template = getThemeTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
      expect(template).toContain('UIGen Custom Theme');
    });

    it('should contain CSS comments and examples', () => {
      const template = getThemeTemplate();
      expect(template).toContain('/*');
      expect(template).toContain('*/');
      expect(template).toContain(':root');
      expect(template).toContain('.dark');
    });

    it('should reference base-styles.css', () => {
      const template = getThemeTemplate();
      expect(template).toContain('base-styles.css');
    });
  });

  describe('getGitignoreTemplate', () => {
    it('should return a valid gitignore string', () => {
      const template = getGitignoreTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
    });

    it('should ignore node_modules', () => {
      const template = getGitignoreTemplate();
      expect(template).toContain('node_modules/');
    });

    it('should ignore annotations.json', () => {
      const template = getGitignoreTemplate();
      expect(template).toContain('annotations.json');
    });

    it('should ignore common OS files', () => {
      const template = getGitignoreTemplate();
      expect(template).toContain('.DS_Store');
      expect(template).toContain('Thumbs.db');
    });

    it('should ignore common IDE files', () => {
      const template = getGitignoreTemplate();
      expect(template).toContain('.vscode/');
      expect(template).toContain('.idea/');
    });
  });

  describe('getReadmeTemplate', () => {
    it('should return a valid markdown string', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
    });

    it('should include the project name in the title', () => {
      const projectName = 'my-awesome-project';
      const template = getReadmeTemplate(projectName);
      expect(template).toContain(`# ${projectName}`);
    });

    it('should contain quick start instructions', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).toContain('Quick Start');
      expect(template).toContain('uigen serve');
      expect(template).toContain('uigen config');
    });

    it('should contain project structure section', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).toContain('Project Structure');
      expect(template).toContain('openapi.yaml');
      expect(template).toContain('.uigen/config.yaml');
      expect(template).toContain('.uigen/theme.css');
    });

    it('should contain AI agent skills section', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).toContain('AI Agent Skills');
      expect(template).toContain('Auto-annotation');
      expect(template).toContain('Styling');
    });

    it('should contain next steps with links', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).toContain('Next Steps');
      expect(template).toContain('https://uigen.dev/docs');
    });

    it('should not contain em dashes', () => {
      const template = getReadmeTemplate('test-project');
      expect(template).not.toContain('—');
    });

    it('should work with different project names', () => {
      const names = ['project-1', 'my_project', 'Project123', 'test'];
      names.forEach(name => {
        const template = getReadmeTemplate(name);
        expect(template).toContain(`# ${name}`);
      });
    });
  });

  describe('getExampleSpecTemplate', () => {
    it('should return a valid YAML string', () => {
      const template = getExampleSpecTemplate();
      expect(template).toBeTruthy();
      expect(typeof template).toBe('string');
      
      // Should be valid YAML
      const parsed = parseYaml(template) as any;
      expect(parsed).toBeDefined();
    });

    it('should be a valid OpenAPI 3.0 spec', () => {
      const template = getExampleSpecTemplate();
      const spec = parseYaml(template) as any;
      
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('Example API');
      expect(spec.info.version).toBe('1.0.0');
    });

    it('should contain at least one path', () => {
      const template = getExampleSpecTemplate();
      const spec = parseYaml(template) as any;
      
      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it('should contain at least one schema', () => {
      const template = getExampleSpecTemplate();
      const spec = parseYaml(template) as any;
      
      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
      expect(Object.keys(spec.components.schemas).length).toBeGreaterThan(0);
    });

    it('should contain a server URL', () => {
      const template = getExampleSpecTemplate();
      const spec = parseYaml(template) as any;
      
      expect(spec.servers).toBeDefined();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0].url).toBeDefined();
    });

    it('should use localhost as default server', () => {
      const template = getExampleSpecTemplate();
      const spec = parseYaml(template) as any;
      
      expect(spec.servers[0].url).toContain('localhost');
    });
  });

  describe('Template Integration', () => {
    it('should export all template functions', () => {
      expect(getConfigTemplate).toBeDefined();
      expect(getThemeTemplate).toBeDefined();
      expect(getGitignoreTemplate).toBeDefined();
      expect(getReadmeTemplate).toBeDefined();
      expect(getExampleSpecTemplate).toBeDefined();
    });

    it('should all return non-empty strings', () => {
      expect(getConfigTemplate().length).toBeGreaterThan(0);
      expect(getThemeTemplate().length).toBeGreaterThan(0);
      expect(getGitignoreTemplate().length).toBeGreaterThan(0);
      expect(getReadmeTemplate('test').length).toBeGreaterThan(0);
      expect(getExampleSpecTemplate().length).toBeGreaterThan(0);
    });
  });
});
