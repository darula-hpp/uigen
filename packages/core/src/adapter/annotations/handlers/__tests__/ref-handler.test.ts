import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefHandler } from '../ref-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

describe('RefHandler', () => {
  let handler: RefHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;

  beforeEach(() => {
    handler = new RefHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      resources: [],
      parsingErrors: []
    } as UIGenApp;
  });

  describe('name', () => {
    it('should have the correct annotation name', () => {
      expect(handler.name).toBe('x-uigen-ref');
    });
  });

  describe('extract', () => {
    it('should return undefined when annotation is absent', () => {
      const context: AnnotationContext = {
        element: { type: 'string' },
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
    });

    it('should return undefined and warn when annotation is a string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context: AnnotationContext = {
        element: { type: 'string', 'x-uigen-ref': 'users' } as any,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return undefined and warn when annotation is null', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context: AnnotationContext = {
        element: { type: 'string', 'x-uigen-ref': null } as any,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return undefined and warn when annotation is an array', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context: AnnotationContext = {
        element: { type: 'string', 'x-uigen-ref': [] } as any,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return the annotation object when valid', () => {
      const annotation = { resource: '/users', valueField: 'id', labelField: 'name', filter: { active: true } };

      const context: AnnotationContext = {
        element: { type: 'string', 'x-uigen-ref': annotation } as any,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });

    it('should return the annotation object when filter is absent', () => {
      const annotation = { resource: '/users', valueField: 'id', labelField: 'name' };

      const context: AnnotationContext = {
        element: { type: 'string', 'x-uigen-ref': annotation } as any,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });
  });

  describe('validate', () => {
    it('should return true when all required fields are valid', () => {
      expect(handler.validate({ resource: '/users', valueField: 'id', labelField: 'name' })).toBe(true);
    });

    it('should return false and warn when resource is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: undefined as any, valueField: 'id', labelField: 'name' })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return false when resource is an empty string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '', valueField: 'id', labelField: 'name' })).toBe(false);

      consoleWarnSpy.mockRestore();
    });

    it('should return false and warn when valueField is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '/users', valueField: undefined as any, labelField: 'name' })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return false and warn when labelField is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '/users', valueField: 'id', labelField: undefined as any })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return false and warn when filter has an object value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '/users', valueField: 'id', labelField: 'name', filter: { nested: {} } })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return false and warn when filter has an array value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '/users', valueField: 'id', labelField: 'name', filter: { ids: [1, 2] } })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return false and warn when filter has a null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(handler.validate({ resource: '/users', valueField: 'id', labelField: 'name', filter: { active: null } })).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return true when filter contains only primitives', () => {
      expect(handler.validate({
        resource: '/users',
        valueField: 'id',
        labelField: 'name',
        filter: { active: true, role: 'admin', limit: 10 }
      })).toBe(true);
    });
  });

  describe('apply', () => {
    it('should set refConfig on schemaNode with filter defaulting to {}', () => {
      const schemaNode: SchemaNode = {
        type: 'string',
        key: 'userId',
        label: 'User',
        required: false
      };

      const context: AnnotationContext = {
        element: { type: 'string' },
        path: 'userId',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({ resource: '/users', valueField: 'id', labelField: 'name' }, context);

      expect(schemaNode.refConfig).toEqual({
        resource: '/users',
        valueField: 'id',
        labelField: 'name',
        filter: {}
      });
    });

    it('should set refConfig with provided filter', () => {
      const schemaNode: SchemaNode = {
        type: 'string',
        key: 'userId',
        label: 'User',
        required: false
      };

      const context: AnnotationContext = {
        element: { type: 'string' },
        path: 'userId',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({ resource: '/users', valueField: 'id', labelField: 'name', filter: { active: true } }, context);

      expect(schemaNode.refConfig).toEqual({
        resource: '/users',
        valueField: 'id',
        labelField: 'name',
        filter: { active: true }
      });
    });

    it('should not throw when schemaNode is undefined', () => {
      const context: AnnotationContext = {
        element: { type: 'string' },
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };

      expect(() => handler.apply({ resource: '/users', valueField: 'id', labelField: 'name' }, context)).not.toThrow();
    });
  });
});
