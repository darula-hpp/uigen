import { describe, it, expect } from 'vitest';
import type { ConfigFile, ConfigValidationResult, ConfigValidationError } from '../types.js';

describe('Config Types', () => {
  describe('ConfigFile', () => {
    it('should accept a valid config file structure', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-ref': true,
          'x-uigen-ignore': false,
        },
        defaults: {
          'x-uigen-label': {},
          'x-uigen-ref': {},
        },
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address',
          },
          'User.role': {
            'x-uigen-ref': {
              resource: 'Role',
              valueField: 'id',
              labelField: 'name',
            },
          },
        },
      };

      expect(config.version).toBe('1.0');
      expect(config.enabled['x-uigen-label']).toBe(true);
      expect(config.annotations['User.email']).toBeDefined();
    });

    it('should allow empty enabled, defaults, and annotations', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
      };

      expect(config.version).toBe('1.0');
      expect(Object.keys(config.enabled)).toHaveLength(0);
    });
  });

  describe('ConfigValidationResult', () => {
    it('should represent a valid config', () => {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
      };

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should represent an invalid config with errors', () => {
      const result: ConfigValidationResult = {
        valid: false,
        errors: [
          {
            path: 'enabled.x-uigen-unknown',
            message: 'Unknown annotation name',
            value: true,
          },
        ],
      };

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('enabled.x-uigen-unknown');
    });
  });

  describe('ConfigValidationError', () => {
    it('should contain path and message', () => {
      const error: ConfigValidationError = {
        path: 'defaults.x-uigen-ref.resource',
        message: 'Invalid resource name',
      };

      expect(error.path).toBe('defaults.x-uigen-ref.resource');
      expect(error.message).toBe('Invalid resource name');
    });

    it('should optionally contain the invalid value', () => {
      const error: ConfigValidationError = {
        path: 'enabled.x-uigen-label',
        message: 'Expected boolean',
        value: 'true',
      };

      expect(error.value).toBe('true');
    });
  });
});
