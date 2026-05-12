import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCached, setCached, clearCache, getCacheSize } from '../cache.js';
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('cache', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `uigen-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    // Clear cache before each test
    clearCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    // Clear cache after each test
    clearCache();
  });

  describe('getCached', () => {
    it('should return null for uncached file', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'test content');

      const result = getCached(filePath);
      expect(result).toBeNull();
    });

    it('should return cached code for cached file', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'test content');

      const code = 'transpiled code';
      setCached(filePath, code);

      const result = getCached(filePath);
      expect(result).toBe(code);
    });

    it('should return null if file has been modified', async () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'original content');

      const code = 'transpiled code';
      setCached(filePath, code);

      // Wait a bit to ensure mtime changes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify the file
      writeFileSync(filePath, 'modified content');
      const now = new Date();
      utimesSync(filePath, now, now);

      const result = getCached(filePath);
      expect(result).toBeNull();
    });

    it('should return null if file no longer exists', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'test content');

      const code = 'transpiled code';
      setCached(filePath, code);

      // Delete the file
      rmSync(filePath);

      const result = getCached(filePath);
      expect(result).toBeNull();
    });

    it('should invalidate cache entry when file is modified', async () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'original content');

      setCached(filePath, 'original transpiled');

      // Verify it's cached
      expect(getCacheSize()).toBe(1);

      // Wait and modify
      await new Promise(resolve => setTimeout(resolve, 10));
      writeFileSync(filePath, 'modified content');
      const now = new Date();
      utimesSync(filePath, now, now);

      // Getting cached should invalidate the entry
      getCached(filePath);

      // Cache should be empty now
      expect(getCacheSize()).toBe(0);
    });
  });

  describe('setCached', () => {
    it('should cache code for a file', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'test content');

      const code = 'transpiled code';
      setCached(filePath, code);

      expect(getCacheSize()).toBe(1);
      expect(getCached(filePath)).toBe(code);
    });

    it('should update cache if called multiple times for same file', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'test content');

      setCached(filePath, 'first code');
      setCached(filePath, 'second code');

      expect(getCacheSize()).toBe(1);
      expect(getCached(filePath)).toBe('second code');
    });

    it('should handle non-existent files gracefully', () => {
      const filePath = join(testDir, 'nonexistent.ts');

      // Should not throw
      expect(() => setCached(filePath, 'code')).not.toThrow();

      // Cache should be empty
      expect(getCacheSize()).toBe(0);
    });

    it('should cache multiple files independently', () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');
      
      writeFileSync(file1, 'content 1');
      writeFileSync(file2, 'content 2');

      setCached(file1, 'code 1');
      setCached(file2, 'code 2');

      expect(getCacheSize()).toBe(2);
      expect(getCached(file1)).toBe('code 1');
      expect(getCached(file2)).toBe('code 2');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entries', () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');
      
      writeFileSync(file1, 'content 1');
      writeFileSync(file2, 'content 2');

      setCached(file1, 'code 1');
      setCached(file2, 'code 2');

      expect(getCacheSize()).toBe(2);

      clearCache();

      expect(getCacheSize()).toBe(0);
      expect(getCached(file1)).toBeNull();
      expect(getCached(file2)).toBeNull();
    });

    it('should work when cache is already empty', () => {
      expect(getCacheSize()).toBe(0);
      
      // Should not throw
      expect(() => clearCache()).not.toThrow();
      
      expect(getCacheSize()).toBe(0);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(getCacheSize()).toBe(0);
    });

    it('should return correct size after caching files', () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');
      const file3 = join(testDir, 'file3.ts');
      
      writeFileSync(file1, 'content 1');
      writeFileSync(file2, 'content 2');
      writeFileSync(file3, 'content 3');

      expect(getCacheSize()).toBe(0);

      setCached(file1, 'code 1');
      expect(getCacheSize()).toBe(1);

      setCached(file2, 'code 2');
      expect(getCacheSize()).toBe(2);

      setCached(file3, 'code 3');
      expect(getCacheSize()).toBe(3);
    });

    it('should not count invalidated entries', async () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'original content');

      setCached(filePath, 'code');
      expect(getCacheSize()).toBe(1);

      // Modify file
      await new Promise(resolve => setTimeout(resolve, 10));
      writeFileSync(filePath, 'modified content');
      const now = new Date();
      utimesSync(filePath, now, now);

      // Access cache (which invalidates the entry)
      getCached(filePath);

      expect(getCacheSize()).toBe(0);
    });
  });

  describe('cache key behavior', () => {
    it('should use file path as cache key', () => {
      const file1 = join(testDir, 'dir1', 'test.ts');
      const file2 = join(testDir, 'dir2', 'test.ts');
      
      mkdirSync(join(testDir, 'dir1'), { recursive: true });
      mkdirSync(join(testDir, 'dir2'), { recursive: true });
      
      writeFileSync(file1, 'content');
      writeFileSync(file2, 'content');

      setCached(file1, 'code 1');
      setCached(file2, 'code 2');

      // Different paths should be cached separately
      expect(getCached(file1)).toBe('code 1');
      expect(getCached(file2)).toBe('code 2');
      expect(getCacheSize()).toBe(2);
    });

    it('should use mtime to validate cache', async () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'content');

      setCached(filePath, 'original code');
      expect(getCached(filePath)).toBe('original code');

      // Wait and update mtime without changing content
      await new Promise(resolve => setTimeout(resolve, 10));
      const now = new Date();
      utimesSync(filePath, now, now);

      // Cache should be invalidated due to mtime change
      expect(getCached(filePath)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty code strings', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'content');

      setCached(filePath, '');
      expect(getCached(filePath)).toBe('');
    });

    it('should handle very long code strings', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'content');

      const longCode = 'x'.repeat(1000000); // 1MB of code
      setCached(filePath, longCode);
      expect(getCached(filePath)).toBe(longCode);
    });

    it('should handle special characters in file paths', () => {
      const specialDir = join(testDir, 'special-dir_123');
      mkdirSync(specialDir, { recursive: true });
      
      const filePath = join(specialDir, 'test-file_v2.ts');
      writeFileSync(filePath, 'content');

      setCached(filePath, 'code');
      expect(getCached(filePath)).toBe('code');
    });

    it('should handle concurrent cache operations', () => {
      const filePath = join(testDir, 'test.ts');
      writeFileSync(filePath, 'content');

      // Simulate concurrent operations
      setCached(filePath, 'code 1');
      const result1 = getCached(filePath);
      setCached(filePath, 'code 2');
      const result2 = getCached(filePath);

      expect(result1).toBe('code 1');
      expect(result2).toBe('code 2');
    });
  });
});
