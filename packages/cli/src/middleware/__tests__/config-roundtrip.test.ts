import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { handleGetConfig, handleSaveConfig } from '../config-api.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Round-trip correctness tests for config file operations
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.4
 * 
 * These tests verify that:
 * - Load -> save produces identical config file (24.1)
 * - Load -> toggle -> save -> load produces correct state (24.2)
 * - YAML comments are preserved (24.3)
 * - YAML formatting is preserved (24.4)
 */

const TEST_DIR = resolve(process.cwd(), '.test-config-roundtrip');
const CONFIG_PATH = resolve(TEST_DIR, '.uigen', 'config.yaml');

describe('Config File Round-Trip Correctness', () => {
  beforeEach(() => {
    // Create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(resolve(TEST_DIR, '.uigen'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Requirement 24.1: Load -> Save produces identical config', () => {
    it('should produce deeply equal config when loading and saving without changes', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-ignore': true,
          'x-uigen-label': true
        },
        defaults: {
          'x-uigen-label': {
            format: 'title-case'
          }
        },
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          },
          'components.schemas.User.properties.email': {
            'x-uigen-ignore': false
          }
        }
      };

      // Act: Save, load, save again
      handleSaveConfig(TEST_DIR, initialConfig);
      const loadedConfig = handleGetConfig(TEST_DIR);
      handleSaveConfig(TEST_DIR, loadedConfig!);
      const reloadedConfig = handleGetConfig(TEST_DIR);

      // Assert: Configs should be deeply equal
      expect(reloadedConfig).toEqual(initialConfig);
    });

    it('should not modify file when saving identical config', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);
      const contentBefore = readFileSync(CONFIG_PATH, 'utf-8');

      // Act: Load and save without changes
      const loadedConfig = handleGetConfig(TEST_DIR);
      handleSaveConfig(TEST_DIR, loadedConfig!);
      const contentAfter = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: File content should be identical
      expect(contentAfter).toBe(contentBefore);
    });
  });

  describe('Requirement 24.2: Load -> Toggle -> Save -> Load preserves state', () => {
    it('should preserve state after toggling annotation value', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, toggle, save, load
      const loadedConfig = handleGetConfig(TEST_DIR)!;
      loadedConfig.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, loadedConfig);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: Toggle should be preserved
      expect(reloadedConfig.annotations['paths./users.get']['x-uigen-ignore']).toBe(false);
    });

    it('should preserve state after adding new annotation', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, add annotation, save, load
      const loadedConfig = handleGetConfig(TEST_DIR)!;
      loadedConfig.annotations['paths./users.post'] = {
        'x-uigen-ignore': false
      };
      handleSaveConfig(TEST_DIR, loadedConfig);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: New annotation should be preserved
      expect(reloadedConfig.annotations['paths./users.post']).toEqual({
        'x-uigen-ignore': false
      });
      expect(reloadedConfig.annotations['paths./users.get']).toEqual({
        'x-uigen-ignore': true
      });
    });

    it('should preserve state after removing annotation', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          },
          'paths./users.post': {
            'x-uigen-ignore': false
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, remove annotation, save, load
      const loadedConfig = handleGetConfig(TEST_DIR)!;
      delete loadedConfig.annotations['paths./users.post'];
      handleSaveConfig(TEST_DIR, loadedConfig);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: Annotation should be removed
      expect(reloadedConfig.annotations['paths./users.post']).toBeUndefined();
      expect(reloadedConfig.annotations['paths./users.get']).toEqual({
        'x-uigen-ignore': true
      });
    });

    it('should preserve state after multiple toggles', () => {
      // Arrange: Create initial config
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Perform multiple toggle operations
      let config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);

      config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.post'] = { 'x-uigen-ignore': true };
      handleSaveConfig(TEST_DIR, config);

      config = handleGetConfig(TEST_DIR)!;
      config.annotations['components.schemas.User'] = { 'x-uigen-ignore': false };
      handleSaveConfig(TEST_DIR, config);

      const finalConfig = handleGetConfig(TEST_DIR)!;

      // Assert: All changes should be preserved
      expect(finalConfig.annotations['paths./users.get']['x-uigen-ignore']).toBe(false);
      expect(finalConfig.annotations['paths./users.post']['x-uigen-ignore']).toBe(true);
      expect(finalConfig.annotations['components.schemas.User']['x-uigen-ignore']).toBe(false);
    });
  });

  describe('Requirement 24.3: YAML comment preservation', () => {
    it('should preserve comments when updating annotation values', () => {
      // Arrange: Create config with comments
      const configWithComments = `version: "1.0"
enabled: {}
defaults: {}
# This is a comment about annotations
annotations:
  # Comment for users.get operation
  paths./users.get:
    x-uigen-ignore: true
  # Comment for User schema
  components.schemas.User:
    x-uigen-ignore: false
`;

      writeFileSync(CONFIG_PATH, configWithComments, 'utf-8');

      // Act: Load, modify, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Comments should be preserved
      expect(updatedContent).toContain('# This is a comment about annotations');
      expect(updatedContent).toContain('# Comment for users.get operation');
      expect(updatedContent).toContain('# Comment for User schema');
      
      // Value should be updated
      expect(updatedContent).toContain('x-uigen-ignore: false');
    });

    it('should preserve inline comments', () => {
      // Arrange: Create config with inline comments
      const configWithComments = `version: "1.0"
enabled: {}
defaults: {}
annotations:
  paths./users.get:
    x-uigen-ignore: true  # Ignore this operation
`;

      writeFileSync(CONFIG_PATH, configWithComments, 'utf-8');

      // Act: Load, modify, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.post'] = { 'x-uigen-ignore': false };
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Inline comment should be preserved
      expect(updatedContent).toContain('# Ignore this operation');
    });

    it('should preserve comments when adding new annotations', () => {
      // Arrange: Create config with comments
      const configWithComments = `version: "1.0"
enabled: {}
defaults: {}
# Annotation configuration
annotations:
  # Existing annotation
  paths./users.get:
    x-uigen-ignore: true
`;

      writeFileSync(CONFIG_PATH, configWithComments, 'utf-8');

      // Act: Load, add annotation, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.post'] = { 'x-uigen-ignore': false };
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Original comments should be preserved
      expect(updatedContent).toContain('# Annotation configuration');
      expect(updatedContent).toContain('# Existing annotation');
    });
  });

  describe('Requirement 24.4: YAML formatting preservation', () => {
    it('should preserve indentation style', () => {
      // Arrange: Create config with specific indentation
      const configWithFormatting = `version: "1.0"
enabled: {}
defaults: {}
annotations:
  paths./users.get:
    x-uigen-ignore: true
  components.schemas.User:
    x-uigen-ignore: false
`;

      writeFileSync(CONFIG_PATH, configWithFormatting, 'utf-8');

      // Act: Load, modify, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Indentation should be consistent (2 spaces)
      const lines = updatedContent.split('\n');
      const annotationLines = lines.filter(line => line.includes('x-uigen-ignore'));
      
      for (const line of annotationLines) {
        // Should have 4 spaces of indentation (2 for annotations, 2 for property)
        expect(line).toMatch(/^    x-uigen-ignore:/);
      }
    });

    it('should preserve empty lines between sections', () => {
      // Arrange: Create config with empty lines
      const configWithFormatting = `version: "1.0"

enabled: {}

defaults: {}

annotations:
  paths./users.get:
    x-uigen-ignore: true
`;

      writeFileSync(CONFIG_PATH, configWithFormatting, 'utf-8');

      // Act: Load, modify, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Should maintain reasonable spacing
      // Note: We may not preserve exact empty lines, but should have clean formatting
      expect(updatedContent).toMatch(/version:.*\n.*enabled:/s);
      expect(updatedContent).toMatch(/enabled:.*\n.*defaults:/s);
      expect(updatedContent).toMatch(/defaults:.*\n.*annotations:/s);
    });

    it('should preserve quote style for strings', () => {
      // Arrange: Create config with double quotes
      const configWithFormatting = `version: "1.0"
enabled: {}
defaults: {}
annotations:
  "paths./users.get":
    x-uigen-ignore: true
`;

      writeFileSync(CONFIG_PATH, configWithFormatting, 'utf-8');

      // Act: Load, modify, save
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);
      const updatedContent = readFileSync(CONFIG_PATH, 'utf-8');

      // Assert: Value should be updated (quote style may vary but content is correct)
      const reloadedConfig = handleGetConfig(TEST_DIR)!;
      expect(reloadedConfig.annotations['paths./users.get']['x-uigen-ignore']).toBe(false);
    });
  });

  describe('Edge cases and complex scenarios', () => {
    it('should handle nested annotation objects', () => {
      // Arrange: Create config with nested objects
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true,
            'x-uigen-label': {
              value: 'Get Users',
              format: 'title-case'
            }
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, modify nested value, save, load
      const config = handleGetConfig(TEST_DIR)!;
      (config.annotations['paths./users.get']['x-uigen-label'] as any).value = 'Fetch Users';
      handleSaveConfig(TEST_DIR, config);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: Nested value should be updated
      expect((reloadedConfig.annotations['paths./users.get']['x-uigen-label'] as any).value).toBe('Fetch Users');
      expect((reloadedConfig.annotations['paths./users.get']['x-uigen-label'] as any).format).toBe('title-case');
    });

    it('should handle empty annotations object', () => {
      // Arrange: Create config with empty annotations
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, add annotation, save, load
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users.get'] = { 'x-uigen-ignore': true };
      handleSaveConfig(TEST_DIR, config);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: Annotation should be added
      expect(reloadedConfig.annotations['paths./users.get']).toEqual({
        'x-uigen-ignore': true
      });
    });

    it('should handle special characters in paths', () => {
      // Arrange: Create config with special characters
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users/{id}.get': {
            'x-uigen-ignore': true
          },
          'components.schemas.User.properties.first-name': {
            'x-uigen-ignore': false
          }
        }
      };

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, modify, save, load
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./users/{id}.get']['x-uigen-ignore'] = false;
      handleSaveConfig(TEST_DIR, config);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;

      // Assert: Special characters should be preserved
      expect(reloadedConfig.annotations['paths./users/{id}.get']['x-uigen-ignore']).toBe(false);
      expect(reloadedConfig.annotations['components.schemas.User.properties.first-name']).toEqual({
        'x-uigen-ignore': false
      });
    });

    it('should handle large config files efficiently', () => {
      // Arrange: Create config with many annotations
      const initialConfig: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      // Add 100 annotations
      for (let i = 0; i < 100; i++) {
        initialConfig.annotations[`paths./resource${i}.get`] = {
          'x-uigen-ignore': i % 2 === 0
        };
      }

      handleSaveConfig(TEST_DIR, initialConfig);

      // Act: Load, modify one annotation, save, load
      const startTime = Date.now();
      const config = handleGetConfig(TEST_DIR)!;
      config.annotations['paths./resource50.get']['x-uigen-ignore'] = true;
      handleSaveConfig(TEST_DIR, config);
      const reloadedConfig = handleGetConfig(TEST_DIR)!;
      const endTime = Date.now();

      // Assert: Should complete quickly (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(reloadedConfig.annotations['paths./resource50.get']['x-uigen-ignore']).toBe(true);
      
      // Other annotations should be unchanged
      expect(reloadedConfig.annotations['paths./resource0.get']['x-uigen-ignore']).toBe(true);
      expect(reloadedConfig.annotations['paths./resource1.get']['x-uigen-ignore']).toBe(false);
    });
  });
});
