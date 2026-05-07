import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTimeHandler } from '../datetime-handler.js';
import type { AnnotationContext } from '../../types.js';
import type { SchemaNode } from '../../../../ir/types.js';

describe('DateTimeHandler', () => {
  let handler: DateTimeHandler;
  let mockContext: AnnotationContext;

  beforeEach(() => {
    handler = new DateTimeHandler();
    
    // Create mock context
    mockContext = {
      element: {},
      path: '/test/field',
      utils: {
        humanize: vi.fn((str: string) => str),
        resolveRef: vi.fn(),
        logError: vi.fn(),
        logWarning: vi.fn()
      },
      ir: {} as any,
      schemaNode: {
        type: 'string',
        key: 'testField',
        label: 'Test Field',
        required: false
      } as SchemaNode
    };
  });

  describe('extract()', () => {
    it('should extract valid string format', () => {
      // Requirement 2.1, 2.2
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const result = handler.extract(mockContext);

      expect(result).toEqual({
        format: 'YYYY-MM-DD'
      });
    });

    it('should extract valid object format with timezone', () => {
      // Requirement 2.2
      mockContext.element = {
        'x-uigen-datetime': {
          format: 'MM/DD/YYYY HH:mm',
          timezone: 'America/New_York'
        }
      };

      const result = handler.extract(mockContext);

      expect(result).toEqual({
        format: 'MM/DD/YYYY HH:mm',
        timezone: 'America/New_York'
      });
    });

    it('should extract object format without timezone', () => {
      // Requirement 2.2
      mockContext.element = {
        'x-uigen-datetime': {
          format: 'DD-MM-YYYY'
        }
      };

      const result = handler.extract(mockContext);

      expect(result).toEqual({
        format: 'DD-MM-YYYY'
      });
    });

    it('should return undefined when annotation is not present', () => {
      // Requirement 2.1
      mockContext.element = {};

      const result = handler.extract(mockContext);

      expect(result).toBeUndefined();
    });

    it('should reject number type and log warning', () => {
      // Requirement 2.3
      mockContext.element = {
        'x-uigen-datetime': 123
      };

      const result = handler.extract(mockContext);

      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a string or object')
      );
    });

    it('should reject boolean type and log warning', () => {
      // Requirement 2.3
      mockContext.element = {
        'x-uigen-datetime': true
      };

      const result = handler.extract(mockContext);

      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a string or object')
      );
    });

    it('should reject null and log warning', () => {
      // Requirement 2.4
      mockContext.element = {
        'x-uigen-datetime': null
      };

      const result = handler.extract(mockContext);

      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a string or object')
      );
    });

    it('should reject array and log warning', () => {
      // Requirement 2.4
      mockContext.element = {
        'x-uigen-datetime': ['YYYY-MM-DD']
      };

      const result = handler.extract(mockContext);

      expect(result).toBeUndefined();
      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('must be a string or object')
      );
    });
  });

  describe('validate()', () => {
    it('should accept valid date format pattern', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'YYYY-MM-DD'
      });

      expect(result).toBe(true);
    });

    it('should accept valid datetime format pattern', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'YYYY-MM-DD HH:mm:ss'
      });

      expect(result).toBe(true);
    });

    it('should accept valid time format pattern', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'HH:mm:ss'
      });

      expect(result).toBe(true);
    });

    it('should accept US date format', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'MM/DD/YYYY'
      });

      expect(result).toBe(true);
    });

    it('should accept EU date format', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'DD/MM/YYYY'
      });

      expect(result).toBe(true);
    });

    it('should accept 12-hour time format', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'hh:mm A'
      });

      expect(result).toBe(true);
    });

    it('should accept format with timezone tokens', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'YYYY-MM-DDTHH:mm:ssZ'
      });

      expect(result).toBe(true);
    });

    it('should accept format with milliseconds', () => {
      // Requirement 3.2, 3.4
      const result = handler.validate({
        format: 'HH:mm:ss.SSS'
      });

      expect(result).toBe(true);
    });

    it('should accept format with all valid separators', () => {
      // Requirement 3.4
      const result = handler.validate({
        format: 'YYYY-MM-DD HH:mm:ss'
      });

      expect(result).toBe(true);
    });

    it('should reject empty string format', () => {
      // Requirement 3.1
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({
        format: ''
      });

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('format is required')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should reject format with no valid tokens', () => {
      // Requirement 3.5
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({
        format: 'invalid-format'
      });

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid format pattern')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should reject format with invalid characters', () => {
      // Requirement 3.5
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({
        format: 'YYYY-MM-DD@HH:mm'
      });

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid format pattern')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should accept valid timezone', () => {
      // Requirement 3.2
      const result = handler.validate({
        format: 'YYYY-MM-DD',
        timezone: 'America/New_York'
      });

      expect(result).toBe(true);
    });

    it('should reject empty timezone', () => {
      // Requirement 3.1
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({
        format: 'YYYY-MM-DD',
        timezone: ''
      });

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('timezone must be a non-empty string')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('detectInputType()', () => {
    it('should detect date input for date-only format', () => {
      // Requirement 6.1
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('date');
    });

    it('should detect date input for EU date format', () => {
      // Requirement 6.1
      mockContext.element = {
        'x-uigen-datetime': 'DD/MM/YYYY'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('date');
    });

    it('should detect time input for time-only format', () => {
      // Requirement 6.2
      mockContext.element = {
        'x-uigen-datetime': 'HH:mm:ss'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('time');
    });

    it('should detect time input for 12-hour format', () => {
      // Requirement 6.2
      mockContext.element = {
        'x-uigen-datetime': 'hh:mm A'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('time');
    });

    it('should detect datetime-local input for datetime format', () => {
      // Requirement 6.3
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD HH:mm'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('datetime-local');
    });

    it('should detect datetime-local input for format with timezone', () => {
      // Requirement 6.4
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DDTHH:mm:ssZ'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig?.inputType).toBe('datetime-local');
    });
  });

  describe('apply()', () => {
    it('should set dateTimeConfig on schema node', () => {
      // Requirement 5.1, 5.2, 5.3, 5.4, 7.1
      mockContext.element = {
        'x-uigen-datetime': {
          format: 'YYYY-MM-DD HH:mm',
          timezone: 'America/New_York'
        }
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig).toEqual({
        format: 'YYYY-MM-DD HH:mm',
        timezone: 'America/New_York',
        inputType: 'datetime-local'
      });
    });

    it('should set dateTimeConfig without timezone', () => {
      // Requirement 5.1, 5.2, 5.4
      mockContext.element = {
        'x-uigen-datetime': 'DD/MM/YYYY'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.schemaNode?.dateTimeConfig).toEqual({
        format: 'DD/MM/YYYY',
        timezone: undefined,
        inputType: 'date'
      });
    });

    it('should log warning when schema node not found', () => {
      // Requirement 7.4
      mockContext.schemaNode = undefined;
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('schema node not found')
      );
    });

    it('should log warning when field type is not string', () => {
      // Requirement 7.1, 7.2
      mockContext.schemaNode!.type = 'number';
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockContext.schemaNode?.dateTimeConfig).toBeUndefined();
    });

    it('should not apply to object fields', () => {
      // Requirement 7.3
      mockContext.schemaNode!.type = 'object';
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockContext.schemaNode?.dateTimeConfig).toBeUndefined();
    });

    it('should not apply to array fields', () => {
      // Requirement 7.3
      mockContext.schemaNode!.type = 'array';
      mockContext.element = {
        'x-uigen-datetime': 'YYYY-MM-DD'
      };

      const annotation = handler.extract(mockContext);
      expect(annotation).toBeDefined();
      
      handler.validate(annotation!);
      handler.apply(annotation!, mockContext);

      expect(mockContext.utils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('can only be applied to string fields')
      );
      expect(mockContext.schemaNode?.dateTimeConfig).toBeUndefined();
    });
  });

  describe('handler name', () => {
    it('should have correct annotation name', () => {
      // Requirement 1.1
      expect(handler.name).toBe('x-uigen-datetime');
    });
  });

  describe('error handling', () => {
    it('should not throw exceptions during extract', () => {
      // Requirement 7.4
      mockContext.element = {
        'x-uigen-datetime': { toString: () => { throw new Error('test error'); } }
      };

      expect(() => handler.extract(mockContext)).not.toThrow();
    });

    it('should not throw exceptions during validate', () => {
      // Requirement 7.4
      const invalidValue = { format: null as any };

      expect(() => handler.validate(invalidValue)).not.toThrow();
    });

    it('should not throw exceptions during apply', () => {
      // Requirement 7.4
      mockContext.schemaNode = null as any;
      const value = { format: 'YYYY-MM-DD' };

      expect(() => handler.apply(value, mockContext)).not.toThrow();
    });
  });
});
