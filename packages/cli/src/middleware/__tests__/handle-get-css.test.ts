import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { handleGetCSS } from '../config-api.js';

/**
 * Unit tests for handleGetCSS function
 * 
 * Requirements: 5.1, 5.2, 5.3, 10.1
 * 
 * These tests verify that:
 * - GET endpoint returns base styles and theme separately (5.1, 5.2)
 * - GET endpoint handles missing files gracefully (5.3)
 * - File read errors are handled appropriately (10.1)
 */

describe('handleGetCSS', () => {
  const testDir = resolve(__dirname, '__test-css-temp__');
  const specDir = resolve(testDir, 'spec');
  const reactPackageRoot = resolve(testDir, 'react-package');
  
  beforeEach(() => {
    // Create test directories
    mkdirSync(specDir, { recursive: true });
    mkdirSync(resolve(reactPackageRoot, 'src'), { recursive: true });
    
    // Create default CSS file (not used anymore, but kept for compatibility)
    writeFileSync(
      resolve(reactPackageRoot, 'src/index.css'),
      '/* Default CSS */\nbody { margin: 0; }',
      'utf-8'
    );
  });
  
  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Both files exist', () => {
    it('should return base styles and theme content', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(
        resolve(uigenDir, 'base-styles.css'),
        '/* Base Styles */\nbody { margin: 0; }',
        'utf-8'
      );
      writeFileSync(
        resolve(uigenDir, 'theme.css'),
        '/* Custom Theme */\n.custom { color: red; }',
        'utf-8'
      );
      
      // Act
      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Assert
      expect(result.baseStyles).toContain('Base Styles');
      expect(result.baseStyles).toContain('body { margin: 0; }');
      expect(result.theme).toContain('Custom Theme');
      expect(result.theme).toContain('.custom { color: red; }');
    });
  });
  
  describe('Only theme exists', () => {
    it('should return empty base styles and theme content', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(
        resolve(uigenDir, 'theme.css'),
        '/* Custom Theme */\n.custom { color: red; }',
        'utf-8'
      );
      
      // Act
      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Assert
      expect(result.baseStyles).toBe('');
      expect(result.theme).toContain('Custom Theme');
      expect(result.theme).toContain('.custom { color: red; }');
    });
  });
  
  describe('Only base styles exist', () => {
    it('should return base styles and empty theme', () => {
      // Arrange
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      writeFileSync(
        resolve(uigenDir, 'base-styles.css'),
        '/* Base Styles */\nbody { margin: 0; }',
        'utf-8'
      );
      
      // Act
      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Assert
      expect(result.baseStyles).toContain('Base Styles');
      expect(result.theme).toBe('');
    });
  });
  
  describe('No CSS files exist', () => {
    it('should return empty strings for both', () => {
      // Act
      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Assert
      expect(result.baseStyles).toBe('');
      expect(result.theme).toBe('');
    });
  });
  
  describe('Error handling', () => {
    it('should handle base-styles.css read errors gracefully (non-fatal)', () => {
      // Arrange - create base-styles.css as a directory (will cause read error)
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      const baseStylesPath = resolve(uigenDir, 'base-styles.css');
      mkdirSync(baseStylesPath); // Create directory with same name
      
      // Create valid theme.css
      writeFileSync(
        resolve(uigenDir, 'theme.css'),
        '/* Theme */\n.test { color: blue; }',
        'utf-8'
      );
      
      // Act
      const result = handleGetCSS(specDir, reactPackageRoot);
      
      // Assert - base styles error is non-fatal, theme should still load
      expect(result.baseStyles).toBe('');
      expect(result.theme).toContain('Theme');
    });
    
    it('should throw error when theme.css read fails', () => {
      // Arrange - create theme.css as a directory (will cause read error)
      const uigenDir = resolve(specDir, '.uigen');
      mkdirSync(uigenDir, { recursive: true });
      const themePath = resolve(uigenDir, 'theme.css');
      mkdirSync(themePath); // Create directory with same name
      
      // Act & Assert
      expect(() => handleGetCSS(specDir, reactPackageRoot)).toThrow(
        'Failed to read theme.css'
      );
    });
  });
});
