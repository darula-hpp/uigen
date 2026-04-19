import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';

/**
 * Unit tests for initializeCSS function
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 *
 * These tests verify that:
 * - CSS initialization copies default CSS when custom doesn't exist (8.1, 8.2)
 * - CSS initialization skips when custom CSS already exists (8.1)
 * - CSS initialization creates .uigen directory if needed (8.3)
 * - CSS initialization handles missing default CSS gracefully (8.2)
 * - CSS initialization logs appropriate messages (8.4)
 */

// Import after setting up mocks so we get the real implementation
import { initializeCSS } from '../config.js';

describe('initializeCSS', () => {
  const testDir = resolve(__dirname, '__test-css-init-temp__');
  const specDir = resolve(testDir, 'spec');
  const reactPackageRoot = resolve(testDir, 'react');

  beforeEach(() => {
    mkdirSync(specDir, { recursive: true });
    mkdirSync(resolve(reactPackageRoot, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('Requirement 8.2 - Copy default CSS when custom does not exist', () => {
    it('should copy default CSS to .uigen/index.css when custom CSS does not exist', () => {
      // Arrange
      const defaultContent = '/* Default UIGen CSS */\n.root { box-sizing: border-box; }';
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), defaultContent, 'utf-8');

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert
      const customCSSPath = resolve(specDir, '.uigen/index.css');
      expect(existsSync(customCSSPath)).toBe(true);
      expect(readFileSync(customCSSPath, 'utf-8')).toBe(defaultContent);
    });
  });

  describe('Requirement 8.1 - Skip when custom CSS already exists', () => {
    it('should not overwrite existing custom CSS', () => {
      // Arrange
      const existingContent = '/* My custom CSS */\n.custom { color: red; }';
      const defaultContent = '/* Default CSS */';
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(resolve(uigenDir, 'index.css'), existingContent, 'utf-8');
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), defaultContent, 'utf-8');

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert - custom CSS should remain unchanged
      const customCSSPath = resolve(specDir, '.uigen/index.css');
      expect(readFileSync(customCSSPath, 'utf-8')).toBe(existingContent);
    });
  });

  describe('Requirement 8.3 - Create .uigen directory if needed', () => {
    it('should create .uigen directory when it does not exist', () => {
      // Arrange
      const defaultContent = '/* Default CSS */';
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), defaultContent, 'utf-8');
      const uigenDir = resolve(specDir, '.uigen');
      expect(existsSync(uigenDir)).toBe(false);

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert
      expect(existsSync(uigenDir)).toBe(true);
      expect(existsSync(resolve(uigenDir, 'index.css'))).toBe(true);
    });
  });

  describe('Requirement 8.2 - Handle missing default CSS gracefully', () => {
    it('should not throw when default CSS file does not exist', () => {
      // Arrange - no default CSS file created

      // Act & Assert - should not throw
      expect(() => initializeCSS(specDir, reactPackageRoot)).not.toThrow();
    });

    it('should not create custom CSS when default CSS is missing', () => {
      // Arrange - no default CSS file

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert
      const customCSSPath = resolve(specDir, '.uigen/index.css');
      expect(existsSync(customCSSPath)).toBe(false);
    });
  });

  describe('Requirement 8.4 - Log appropriate messages', () => {
    it('should log success message after copying default CSS', () => {
      // Arrange
      const defaultContent = '/* Default CSS */';
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), defaultContent, 'utf-8');
      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized CSS file')
      );
    });

    it('should log warning when default CSS is missing', () => {
      // Arrange - no default CSS
      const warnSpy = vi.spyOn(console, 'warn');

      // Act
      initializeCSS(specDir, reactPackageRoot);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Default CSS file not found')
      );
    });

    it('should log verbose message when custom CSS already exists', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(resolve(uigenDir, 'index.css'), '/* existing */', 'utf-8');
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), '/* default */', 'utf-8');
      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      initializeCSS(specDir, reactPackageRoot, true);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
    });

    it('should not log verbose message when verbose is false and custom CSS exists', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(resolve(uigenDir, 'index.css'), '/* existing */', 'utf-8');
      writeFileSync(resolve(reactPackageRoot, 'src/index.css'), '/* default */', 'utf-8');
      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      initializeCSS(specDir, reactPackageRoot, false);

      // Assert - no log when not verbose
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
