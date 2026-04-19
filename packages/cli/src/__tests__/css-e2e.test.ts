import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { handleGetCSS, handleSaveCSS } from '../middleware/config-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CSS Editor End-to-End Integration - Two-File Architecture', () => {
  const testDir = join(__dirname, '__test-css-e2e-temp__');
  const specDir = join(testDir, 'spec');
  const uigenDir = join(specDir, '.uigen');
  const baseStylesPath = join(uigenDir, 'base-styles.css');
  const themePath = join(uigenDir, 'theme.css');
  const reactPackageRoot = join(testDir, 'react-package');
  const defaultCSSPath = join(reactPackageRoot, 'src', 'index.css');

  const defaultCSS = `/* Default UIGen CSS */
body {
  margin: 0;
  font-family: system-ui;
}`;

  const customTheme = `/* Custom Theme */
.custom-class {
  color: red;
  background: blue;
}`;

  beforeEach(() => {
    // Clean up and create test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(specDir, { recursive: true });
    mkdirSync(join(reactPackageRoot, 'src'), { recursive: true });

    // Create default CSS file (for reference)
    writeFileSync(defaultCSSPath, defaultCSS, 'utf-8');
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Complete Workflow: Config Command → CSS Tab → Edit → Save → Serve Command', () => {
    it('should handle initial state with no CSS files', () => {
      // Simulate config command startup - no CSS files exist yet
      expect(existsSync(baseStylesPath)).toBe(false);
      expect(existsSync(themePath)).toBe(false);

      // Simulate CSS tab opening - should return empty strings
      const result = handleGetCSS(specDir, reactPackageRoot);

      expect(result.baseStyles).toBe('');
      expect(result.theme).toBe('');
    });

    it('should save custom theme and load it on subsequent requests', () => {
      // Step 1: User opens CSS tab - loads empty theme
      const initialResult = handleGetCSS(specDir, reactPackageRoot);
      expect(initialResult.baseStyles).toBe('');
      expect(initialResult.theme).toBe('');

      // Step 2: User edits theme and saves
      handleSaveCSS(specDir, customTheme);

      // Verify file was created
      expect(existsSync(themePath)).toBe(true);
      expect(readFileSync(themePath, 'utf-8')).toBe(customTheme);

      // Step 3: User reopens CSS tab - should load custom theme
      const updatedResult = handleGetCSS(specDir, reactPackageRoot);
      expect(updatedResult.theme).toBe(customTheme);
    });

    it('should handle multiple save operations', () => {
      // Save initial custom theme
      handleSaveCSS(specDir, customTheme);

      // Verify first save
      let result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);

      // User makes more changes
      const updatedTheme = `${customTheme}\n\n.another-class { padding: 10px; }`;
      handleSaveCSS(specDir, updatedTheme);

      // Verify updated save
      result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(updatedTheme);
    });

    it('should create .uigen directory if it does not exist', () => {
      // Ensure .uigen directory doesn't exist
      expect(existsSync(uigenDir)).toBe(false);

      // Save CSS - should create directory
      handleSaveCSS(specDir, customTheme);

      // Verify directory and file created
      expect(existsSync(uigenDir)).toBe(true);
      expect(existsSync(themePath)).toBe(true);
      expect(readFileSync(themePath, 'utf-8')).toBe(customTheme);
    });
  });

  describe('Two-File Architecture', () => {
    it('should handle base styles and theme separately', () => {
      // Create both files
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(baseStylesPath, defaultCSS, 'utf-8');
      writeFileSync(themePath, customTheme, 'utf-8');

      // Load both
      const result = handleGetCSS(specDir, reactPackageRoot);

      expect(result.baseStyles).toBe(defaultCSS);
      expect(result.theme).toBe(customTheme);
    });

    it('should not modify base-styles.css when saving theme', () => {
      // Create base styles
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(baseStylesPath, defaultCSS, 'utf-8');

      // Save theme
      handleSaveCSS(specDir, customTheme);

      // Verify base styles unchanged
      expect(readFileSync(baseStylesPath, 'utf-8')).toBe(defaultCSS);
      expect(readFileSync(themePath, 'utf-8')).toBe(customTheme);
    });

    it('should handle missing base-styles.css gracefully', () => {
      // Only create theme
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(themePath, customTheme, 'utf-8');

      // Should return empty base styles
      const result = handleGetCSS(specDir, reactPackageRoot);

      expect(result.baseStyles).toBe('');
      expect(result.theme).toBe(customTheme);
    });

    it('should handle missing theme.css gracefully', () => {
      // Only create base styles
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(baseStylesPath, defaultCSS, 'utf-8');

      // Should return empty theme
      const result = handleGetCSS(specDir, reactPackageRoot);

      expect(result.baseStyles).toBe(defaultCSS);
      expect(result.theme).toBe('');
    });
  });

  describe('CSS File Path Resolution', () => {
    it('should resolve theme path relative to spec directory', () => {
      handleSaveCSS(specDir, customTheme);

      const expectedPath = join(specDir, '.uigen', 'theme.css');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('should work with nested spec directories', () => {
      const nestedSpecDir = join(testDir, 'nested', 'spec', 'dir');
      mkdirSync(nestedSpecDir, { recursive: true });

      handleSaveCSS(nestedSpecDir, customTheme);

      const expectedPath = join(nestedSpecDir, '.uigen', 'theme.css');
      expect(existsSync(expectedPath)).toBe(true);

      const result = handleGetCSS(nestedSpecDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);
    });
  });

  describe('Error Handling Across Components', () => {
    it('should handle corrupted theme file', () => {
      // Create .uigen directory but make theme.css a directory instead of file
      mkdirSync(themePath, { recursive: true });

      // Should throw error when trying to read directory as file
      expect(() => handleGetCSS(specDir, reactPackageRoot)).toThrow(
        'Failed to read theme.css'
      );
    });

    it('should handle write permission errors', () => {
      // Create .uigen directory
      mkdirSync(uigenDir, { recursive: true });

      // Create theme.css as a directory to cause write error
      mkdirSync(themePath, { recursive: true });

      // Should throw error when trying to write to directory
      expect(() => handleSaveCSS(specDir, customTheme)).toThrow();
    });

    it('should handle base-styles.css read errors gracefully (non-fatal)', () => {
      // Create base-styles.css as a directory (will cause read error)
      mkdirSync(baseStylesPath, { recursive: true });

      // Create valid theme.css
      writeFileSync(themePath, customTheme, 'utf-8');

      // Should not throw - base styles error is non-fatal
      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.baseStyles).toBe('');
      expect(result.theme).toBe(customTheme);
    });
  });

  describe('CSS Content Validation', () => {
    it('should handle empty CSS content', () => {
      handleSaveCSS(specDir, '');

      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe('');
    });

    it('should handle CSS with special characters', () => {
      const specialCSS = `.special { content: "Hello \\"World\\""; background: url('data:image/svg+xml;utf8,<svg></svg>'); }`;
      handleSaveCSS(specDir, specialCSS);

      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(specialCSS);
    });

    it('should handle multi-line CSS with comments', () => {
      const multiLineCSS = `/* Header styles */
.header {
  background: #333;
  color: white;
}

/* Footer styles */
.footer {
  background: #666;
  padding: 20px;
}`;
      handleSaveCSS(specDir, multiLineCSS);

      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(multiLineCSS);
    });

    it('should handle large CSS files', () => {
      // Generate a large CSS file (but under 1MB limit)
      const largeCSS = Array.from({ length: 1000 }, (_, i) => 
        `.class-${i} { color: #${i.toString(16).padStart(6, '0')}; }`
      ).join('\n');

      handleSaveCSS(specDir, largeCSS);

      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(largeCSS);
      expect(result.theme.length).toBeGreaterThan(10000);
    });

    it('should reject CSS content exceeding 1MB', () => {
      // Generate CSS content larger than 1MB
      const largeCSS = 'a'.repeat(1024 * 1024 + 1);

      expect(() => handleSaveCSS(specDir, largeCSS)).toThrow(
        'CSS content exceeds maximum size'
      );
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid successive saves', () => {
      const saves = [
        '.class1 { color: red; }',
        '.class2 { color: blue; }',
        '.class3 { color: green; }',
      ];

      // Perform rapid saves
      saves.forEach((css) => handleSaveCSS(specDir, css));

      // Last save should win
      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(saves[saves.length - 1]);
    });

    it('should handle save and read operations interleaved', () => {
      handleSaveCSS(specDir, customTheme);
      let result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);

      const updatedTheme = `${customTheme}\n.new { margin: 0; }`;
      handleSaveCSS(specDir, updatedTheme);
      result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(updatedTheme);
    });
  });

  describe('CSS Injection Simulation', () => {
    it('should simulate serve command CSS loading (theme only)', () => {
      // Simulate config command initialization - create theme
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(themePath, customTheme, 'utf-8');

      // Simulate serve command loading CSS (only theme is injected)
      const result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);

      // Simulate user editing CSS
      const updatedTheme = `${customTheme}\n.new { color: green; }`;
      handleSaveCSS(specDir, updatedTheme);

      // Simulate serve command reloading CSS
      const updatedResult = handleGetCSS(specDir, reactPackageRoot);
      expect(updatedResult.theme).toBe(updatedTheme);
    });

    it('should simulate HTML injection with CSS escaping', () => {
      const cssWithQuotes = `.test { content: "Hello 'World'"; }`;
      handleSaveCSS(specDir, cssWithQuotes);

      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Simulate HTML injection (JSON.stringify for script tag)
      const injectedScript = `<script>window.__UIGEN_CSS__ = ${JSON.stringify(result.theme)};</script>`;
      
      // Verify CSS is properly escaped in script tag
      expect(injectedScript).toContain('window.__UIGEN_CSS__');
      // JSON.stringify escapes double quotes, so check for escaped version
      expect(injectedScript).toContain('\\"Hello');
      
      // Verify the script can be parsed back correctly
      const scriptMatch = injectedScript.match(/window\.__UIGEN_CSS__ = (.*);/);
      if (scriptMatch) {
        const parsedCSS = JSON.parse(scriptMatch[1]);
        expect(parsedCSS).toBe(cssWithQuotes);
      }
    });
  });

  describe('Fallback Behavior', () => {
    it('should return empty theme when theme.css is deleted', () => {
      // Create theme
      handleSaveCSS(specDir, customTheme);
      let result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);

      // Delete theme
      rmSync(themePath, { force: true });

      // Should return empty theme
      result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe('');
    });

    it('should return empty strings when .uigen directory is deleted', () => {
      // Create theme
      handleSaveCSS(specDir, customTheme);
      let result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.theme).toBe(customTheme);

      // Delete entire .uigen directory
      rmSync(uigenDir, { recursive: true, force: true });

      // Should return empty strings
      result = handleGetCSS(specDir, reactPackageRoot);
      expect(result.baseStyles).toBe('');
      expect(result.theme).toBe('');
    });
  });

  describe('Multiple Spec Files', () => {
    it('should handle CSS for multiple spec files independently', () => {
      const spec1Dir = join(testDir, 'spec1');
      const spec2Dir = join(testDir, 'spec2');
      mkdirSync(spec1Dir, { recursive: true });
      mkdirSync(spec2Dir, { recursive: true });

      const theme1 = '.spec1 { color: red; }';
      const theme2 = '.spec2 { color: blue; }';

      // Save different themes for each spec
      handleSaveCSS(spec1Dir, theme1);
      handleSaveCSS(spec2Dir, theme2);

      // Verify each spec has its own theme
      const result1 = handleGetCSS(spec1Dir, reactPackageRoot);
      const result2 = handleGetCSS(spec2Dir, reactPackageRoot);

      expect(result1.theme).toBe(theme1);
      expect(result2.theme).toBe(theme2);
    });
  });
});
