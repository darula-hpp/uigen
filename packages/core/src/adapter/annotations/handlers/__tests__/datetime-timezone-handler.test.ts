import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTimeTimezoneHandler } from '../datetime-timezone-handler.js';
import type { AnnotationContext } from '../../types.js';
import type { SchemaNode } from '../../../../ir/types.js';

describe('DateTimeTimezoneHandler', () => {
  let handler: DateTimeTimezoneHandler;
  let mockContext: AnnotationContext;
  let mockSchemaNode: SchemaNode;

  beforeEach(() => {
    handler = new DateTimeTimezoneHandler();
    
    mockSchemaNode = {
      type: 'string',
      key: 'testField',
      label: 'Test Field',
      required: false
    };

    mockContext = {
      element: {},
      path: '/components/schemas/Test/properties/testField',
      schemaNode: mockSchemaNode,
      utils: {
        logWarning: vi.fn(),
        logError: vi.fn()
      }
    } as any;
  });

  describe('extract()', () => {
    it('should extract valid IANA timezone identifier', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 'America/New_York' };
      const result = handler.extract(mockContext);
      expect(result).toBe('America/New_York');
    });

    it('should extract special value "local"', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 'local' };
      const result = handler.extract(mockContext);
      expect(result).toBe('local');
    });

    it('should extract special value "utc"', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 'utc' };
      const result = handler.extract(mockContext);
      expect(result).toBe('utc');
    });

    it('should extract special value "UTC"', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 'UTC' };
      const result = handler.extract(mockContext);
      expect(result).toBe('UTC');
    });

    it('should extract timezone with underscore', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 'America/Los_Angeles' };
      const result = handler.extract(mockContext);
      expect(result).toBe('America/Los_Angeles');
    });

    it('should trim whitespace from timezone string', () => {
      mockContext.element = { 'x-uigen-datetime-tz': '  Europe/London  ' };
      const result = handler.extract(mockContext);
      expect(result).toBe('Europe/London');
    });

    it('should return undefined when annotation is not present', () => {
      mockContext.element = {};
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
    });

    it('should return undefined and log warning for empty string', () => {
      mockContext.element = { 'x-uigen-datetime-tz': '' };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for whitespace-only string', () => {
      mockContext.element = { 'x-uigen-datetime-tz': '   ' };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for number', () => {
      mockContext.element = { 'x-uigen-datetime-tz': 123 };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for boolean', () => {
      mockContext.element = { 'x-uigen-datetime-tz': true };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for null', () => {
      mockContext.element = { 'x-uigen-datetime-tz': null };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for array', () => {
      mockContext.element = { 'x-uigen-datetime-tz': ['America/New_York'] };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should return undefined and log warning for object', () => {
      mockContext.element = { 'x-uigen-datetime-tz': { timezone: 'America/New_York' } };
      const result = handler.extract(mockContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
    });

    it('should handle extraction errors gracefully', () => {
      const errorContext = {
        ...mockContext,
        element: {
          get 'x-uigen-datetime-tz'() {
            throw new Error('Test error');
          }
        }
      };
      const result = handler.extract(errorContext);
      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('extraction error')
      );
    });
  });

  describe('validate()', () => {
    it('should validate special value "local"', () => {
      const result = handler.validate('local');
      expect(result).toBe(true);
    });

    it('should validate special value "utc"', () => {
      const result = handler.validate('utc');
      expect(result).toBe(true);
    });

    it('should validate special value "UTC"', () => {
      const result = handler.validate('UTC');
      expect(result).toBe(true);
    });

    it('should validate IANA timezone with slash format', () => {
      const result = handler.validate('America/New_York');
      expect(result).toBe(true);
    });

    it('should validate IANA timezone Europe/London', () => {
      const result = handler.validate('Europe/London');
      expect(result).toBe(true);
    });

    it('should validate IANA timezone Asia/Tokyo', () => {
      const result = handler.validate('Asia/Tokyo');
      expect(result).toBe(true);
    });

    it('should validate timezone abbreviation EST', () => {
      const result = handler.validate('EST');
      expect(result).toBe(true);
    });

    it('should validate timezone abbreviation PST', () => {
      const result = handler.validate('PST');
      expect(result).toBe(true);
    });

    it('should reject empty string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handler.validate('');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should reject whitespace-only string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handler.validate('   ');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('must be a non-empty string')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should reject invalid timezone format without slash', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handler.validate('InvalidTimezone');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid timezone format')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should reject timezone with numbers', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handler.validate('America/New_York123');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid timezone format')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should reject timezone with special characters', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handler.validate('America/New@York');
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid timezone format')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle validation errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Pass non-string to trigger error handling
      const result = handler.validate(null as any);
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('apply()', () => {
    it('should merge timezone into existing dateTimeConfig', () => {
      mockSchemaNode.dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date'
      };
      
      handler.apply('America/New_York', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'YYYY-MM-DD',
        inputType: 'date',
        timezone: 'America/New_York'
      });
    });

    it('should create dateTimeConfig when not present', () => {
      handler.apply('Europe/London', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'MMM DD, YYYY',
        timezone: 'Europe/London',
        inputType: 'date'
      });
    });

    it('should apply special value "local"', () => {
      handler.apply('local', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'MMM DD, YYYY',
        timezone: 'local',
        inputType: 'date'
      });
    });

    it('should apply special value "UTC"', () => {
      handler.apply('UTC', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'MMM DD, YYYY',
        timezone: 'UTC',
        inputType: 'date'
      });
    });

    it('should override existing timezone in dateTimeConfig', () => {
      mockSchemaNode.dateTimeConfig = {
        format: 'DD/MM/YYYY',
        timezone: 'America/New_York',
        inputType: 'date'
      };
      
      handler.apply('Asia/Tokyo', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig.timezone).toBe('Asia/Tokyo');
      expect(mockSchemaNode.dateTimeConfig.format).toBe('DD/MM/YYYY');
    });

    it('should log warning when schema node is missing', () => {
      mockContext.schemaNode = undefined;
      
      handler.apply('America/New_York', mockContext);
      
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('schema node not found')
      );
    });

    it('should log warning when applied to non-string field', () => {
      mockSchemaNode.type = 'number';
      
      handler.apply('America/New_York', mockContext);
      
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockSchemaNode.dateTimeConfig).toBeUndefined();
    });

    it('should log warning when applied to object field', () => {
      mockSchemaNode.type = 'object';
      
      handler.apply('Europe/London', mockContext);
      
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockSchemaNode.dateTimeConfig).toBeUndefined();
    });

    it('should log warning when applied to array field', () => {
      mockSchemaNode.type = 'array';
      
      handler.apply('Asia/Tokyo', mockContext);
      
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockSchemaNode.dateTimeConfig).toBeUndefined();
    });

    it('should handle apply errors gracefully', () => {
      // Create a schema node that throws on property access
      const errorSchemaNode = {
        type: 'string',
        key: 'test',
        label: 'Test',
        required: false,
        get dateTimeConfig() {
          throw new Error('Test error');
        },
        set dateTimeConfig(value) {
          throw new Error('Test error');
        }
      };
      mockContext.schemaNode = errorSchemaNode as any;
      
      handler.apply('America/New_York', mockContext);
      
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('apply error')
      );
    });

    it('should preserve other dateTimeConfig properties when merging', () => {
      mockSchemaNode.dateTimeConfig = {
        format: 'YYYY-MM-DD HH:mm',
        inputType: 'datetime-local',
        apiFormat: 'unix'
      } as any;
      
      handler.apply('America/Chicago', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'YYYY-MM-DD HH:mm',
        inputType: 'datetime-local',
        apiFormat: 'unix',
        timezone: 'America/Chicago'
      });
    });
  });

  describe('handler name', () => {
    it('should have correct handler name', () => {
      expect(handler.name).toBe('x-uigen-datetime-tz');
    });
  });

  describe('integration scenarios', () => {
    it('should work with DateTimeHandler when both annotations present', () => {
      // Simulate DateTimeHandler applying first
      mockSchemaNode.dateTimeConfig = {
        format: 'MM/DD/YYYY HH:mm',
        inputType: 'datetime-local'
      };
      
      // Then DateTimeTimezoneHandler applies
      handler.apply('America/New_York', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'MM/DD/YYYY HH:mm',
        inputType: 'datetime-local',
        timezone: 'America/New_York'
      });
    });

    it('should work when applied before DateTimeHandler', () => {
      // DateTimeTimezoneHandler applies first
      handler.apply('Europe/Paris', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toEqual({
        format: 'MMM DD, YYYY',
        timezone: 'Europe/Paris',
        inputType: 'date'
      });
      
      // Simulate DateTimeHandler applying after
      mockSchemaNode.dateTimeConfig.format = 'DD/MM/YYYY';
      mockSchemaNode.dateTimeConfig.inputType = 'date';
      
      expect(mockSchemaNode.dateTimeConfig.timezone).toBe('Europe/Paris');
    });
  });
});
