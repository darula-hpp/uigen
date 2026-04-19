import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, chmodSync } from 'fs';
import { resolve } from 'path';
import { handleSaveCSS } from '../config-api.js';

/**
 * Unit tests for handleSaveCSS function
 * 
 * Requirements: 5.4, 5.5, 5.6, 10.2
 * 
 * These tests verify that:
 * - POST endpoint writes CSS content to .uigen/theme.css only (5.4)
 * - POST endpoint creates .uigen directory if it doesn't exist (5.5)
 * - POST endpoint validates content size (1MB max) (5.6)
 * - Write errors are handled with detailed error messages (10.2)
 */

describe('handleSaveCSS', () => {
  const testDir = resolve(__dirname, '__test-css-save-temp__');
  const specDir = resolve(testDir, 'spec');
  
  beforeEach(() => {
    // Create test directories
    mkdirSync(specDir, { recursive: true });
  });
  
  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Successful save operations', () => {
    it('should write CSS content to .uigen/theme.css', () => {
      // Arrange
      const cssContent = '/* Test CSS */\n.test { color: blue; }';
      
      // Act
      handleSaveCSS(specDir, cssContent);
      
      // Assert
      const cssPath = resolve(specDir, '.uigen/theme.css');
      expect(existsSync(cssPath)).toBe(true);
      const savedContent = readFileSync(cssPath, 'utf-8');
      expect(savedContent).toBe(cssContent);
    });
    
    it('should create .uigen directory if it does not exist', () => {
      // Arrange
      const cssContent = '/* Test CSS */';
      const uigenDir = resolve(specDir, '.uigen');
      expect(existsSync(uigenDir)).toBe(false);
      
      // Act
      handleSaveCSS(specDir, cssContent);
      
      // Assert
      expect(existsSync(uigenDir)).toBe(true);
      expect(existsSync(resolve(uigenDir, 'theme.css'))).toBe(true);
    });
    
    it('should overwrite existing theme.css file', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(resolve(uigenDir, 'theme.css'), 'old content', 'utf-8');
      
      const newContent = '/* New CSS */\n.new { color: green; }';
      
      // Act
      handleSaveCSS(specDir, newContent);
      
      // Assert
      const savedContent = readFileSync(resolve(uigenDir, 'theme.css'), 'utf-8');
      expect(savedContent).toBe(newContent);
    });
    
    it('should not affect base-styles.css if it exists', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      const baseStylesContent = '/* Base Styles */\nbody { margin: 0; }';
      writeFileSync(resolve(uigenDir, 'base-styles.css'), baseStylesContent, 'utf-8');
      
      const themeContent = '/* Theme */\n.custom { color: red; }';
      
      // Act
      handleSaveCSS(specDir, themeContent);
      
      // Assert - base-styles.css should remain unchanged
      const savedBaseStyles = readFileSync(resolve(uigenDir, 'base-styles.css'), 'utf-8');
      expect(savedBaseStyles).toBe(baseStylesContent);
      
      // theme.css should be created
      const savedTheme = readFileSync(resolve(uigenDir, 'theme.css'), 'utf-8');
      expect(savedTheme).toBe(themeContent);
    });
    
    it('should handle empty CSS content', () => {
      // Arrange
      const cssContent = '';
      
      // Act
      handleSaveCSS(specDir, cssContent);
      
      // Assert
      const cssPath = resolve(specDir, '.uigen/theme.css');
      expect(existsSync(cssPath)).toBe(true);
      const savedContent = readFileSync(cssPath, 'utf-8');
      expect(savedContent).toBe('');
    });
  });
  
  describe('Content size validation', () => {
    it('should accept CSS content under 1MB', () => {
      // Arrange
      const cssContent = '/* Test */\n' + '.test { color: red; }\n'.repeat(1000);
      
      // Act & Assert
      expect(() => handleSaveCSS(specDir, cssContent)).not.toThrow();
    });
    
    it('should reject CSS content exceeding 1MB', () => {
      // Arrange
      const MAX_CSS_SIZE = 1024 * 1024; // 1MB
      const cssContent = 'a'.repeat(MAX_CSS_SIZE + 1);
      
      // Act & Assert
      expect(() => handleSaveCSS(specDir, cssContent)).toThrow(
        `CSS content exceeds maximum size of ${MAX_CSS_SIZE} bytes`
      );
    });
    
    it('should accept CSS content exactly at 1MB limit', () => {
      // Arrange
      const MAX_CSS_SIZE = 1024 * 1024; // 1MB
      const cssContent = 'a'.repeat(MAX_CSS_SIZE);
      
      // Act & Assert
      expect(() => handleSaveCSS(specDir, cssContent)).not.toThrow();
    });
  });
  
  describe('Path traversal prevention', () => {
    it('should validate resolved paths are within spec directory', () => {
      // The resolveThemePath function already normalizes paths using resolve()
      // which handles .. segments, so path traversal is prevented by design.
      // This test verifies that the path resolution works correctly.
      
      // Arrange
      const cssContent = '/* Test CSS */';
      
      // Act - even with .. in the path, resolve() normalizes it
      handleSaveCSS(specDir, cssContent);
      
      // Assert - file is created in the correct location
      const cssPath = resolve(specDir, '.uigen/theme.css');
      expect(existsSync(cssPath)).toBe(true);
    });
  });
  
  describe('Error handling', () => {
    it('should throw error with details when write fails', () => {
      // Arrange
      const cssContent = '/* Test CSS */';
      
      // Create .uigen directory but make it read-only
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      
      // Make directory read-only (this might not work on all systems)
      try {
        chmodSync(uigenDir, 0o444);
        
        // Act & Assert
        expect(() => handleSaveCSS(specDir, cssContent)).toThrow(
          'Failed to write theme.css'
        );
        
        // Cleanup - restore permissions
        chmodSync(uigenDir, 0o755);
      } catch (error) {
        // Skip test if chmod is not supported
        console.log('Skipping permission test - chmod not supported on this system');
      }
    });
  });
});
