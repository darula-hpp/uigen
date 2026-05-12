import { describe, it, expect } from 'vitest';
import {
  discoverOverrides,
  transpileOverrides,
  validateOverrides,
  createInjectionScript,
  type DiscoveryOptions,
  type DiscoveredOverride,
  type TranspileOptions,
  type TranspileResult,
  type TranspileError,
  type TranspileWarning,
  type ValidationOptions,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type InjectionOptions,
} from '../index.js';

describe('CLI Overrides Index', () => {
  describe('Function Exports', () => {
    it('should export discoverOverrides function', () => {
      expect(discoverOverrides).toBeDefined();
      expect(typeof discoverOverrides).toBe('function');
    });

    it('should export transpileOverrides function', () => {
      expect(transpileOverrides).toBeDefined();
      expect(typeof transpileOverrides).toBe('function');
    });

    it('should export validateOverrides function', () => {
      expect(validateOverrides).toBeDefined();
      expect(typeof validateOverrides).toBe('function');
    });

    it('should export createInjectionScript function', () => {
      expect(createInjectionScript).toBeDefined();
      expect(typeof createInjectionScript).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should allow using DiscoveryOptions type', () => {
      const options: DiscoveryOptions = {
        srcDir: '/test',
        verbose: true,
      };
      expect(options.srcDir).toBe('/test');
    });

    it('should allow using DiscoveredOverride type', () => {
      const override: DiscoveredOverride = {
        filePath: '/test/file.ts',
        relativePath: 'file.ts',
      };
      expect(override.filePath).toBe('/test/file.ts');
    });

    it('should allow using TranspileOptions type', () => {
      const options: TranspileOptions = {
        files: [],
        mode: 'development',
        verbose: true,
      };
      expect(options.mode).toBe('development');
    });

    it('should allow using TranspileResult type', () => {
      const result: TranspileResult = {
        code: 'test',
        errors: [],
        warnings: [],
      };
      expect(result.code).toBe('test');
    });

    it('should allow using TranspileError type', () => {
      const error: TranspileError = {
        filePath: '/test/file.ts',
        message: 'Test error',
        line: 1,
        column: 1,
      };
      expect(error.message).toBe('Test error');
    });

    it('should allow using TranspileWarning type', () => {
      const warning: TranspileWarning = {
        filePath: '/test/file.ts',
        message: 'Test warning',
      };
      expect(warning.message).toBe('Test warning');
    });

    it('should allow using ValidationOptions type', () => {
      const options: ValidationOptions = {
        code: 'test',
        files: [],
        verbose: true,
      };
      expect(options.code).toBe('test');
    });

    it('should allow using ValidationResult type', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        duplicates: new Map(),
      };
      expect(result.valid).toBe(true);
    });

    it('should allow using ValidationError type', () => {
      const error: ValidationError = {
        filePath: '/test/file.ts',
        message: 'Test error',
        targetId: 'test.id',
      };
      expect(error.message).toBe('Test error');
    });

    it('should allow using ValidationWarning type', () => {
      const warning: ValidationWarning = {
        filePath: '/test/file.ts',
        message: 'Test warning',
        targetId: 'test.id',
      };
      expect(warning.message).toBe('Test warning');
    });

    it('should allow using InjectionOptions type', () => {
      const options: InjectionOptions = {
        code: 'test',
        mode: 'production',
      };
      expect(options.mode).toBe('production');
    });
  });
});
