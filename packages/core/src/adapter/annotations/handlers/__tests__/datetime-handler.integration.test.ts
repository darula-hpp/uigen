import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnnotationHandlerRegistry } from '../../registry.js';
import { DateTimeHandler } from '../datetime-handler.js';
import { DateTimeTimezoneHandler } from '../datetime-timezone-handler.js';
import { LabelHandler } from '../label-handler.js';
import type { SchemaNode } from '../../../../ir/types.js';

/**
 * Integration tests for DateTimeHandler with annotation registry.
 * 
 * Tests verify:
 * - Handler registration in registry
 * - Annotation extraction and validation
 * - Interaction with other handlers
 * - Config precedence (tested in config integration tests)
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4
 */
describe('DateTimeHandler - Integration Tests', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new DateTimeHandler());
    registry.register(new DateTimeTimezoneHandler());
    registry.register(new LabelHandler());
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Handler registration', () => {
    it('should register DateTimeHandler in the annotation registry', () => {
      // Requirement 1.1, 1.2
      const handler = registry.get('x-uigen-datetime');
      
      expect(handler).toBeDefined();
      expect(handler?.name).toBe('x-uigen-datetime');
    });

    it('should register DateTimeTimezoneHandler in the annotation registry', () => {
      // Requirement 1.1, 1.2
      const handler = registry.get('x-uigen-datetime-tz');
      
      expect(handler).toBeDefined();
      expect(handler?.name).toBe('x-uigen-datetime-tz');
    });

    it('should be included in getAll() handlers list', () => {
      // Requirement 1.3
      const allHandlers = registry.getAll();
      const datetimeHandler = allHandlers.find(h => h.name === 'x-uigen-datetime');
      const timezoneHandler = allHandlers.find(h => h.name === 'x-uigen-datetime-tz');
      
      expect(datetimeHandler).toBeDefined();
      expect(datetimeHandler).toBeInstanceOf(DateTimeHandler);
      expect(timezoneHandler).toBeDefined();
      expect(timezoneHandler).toBeInstanceOf(DateTimeTimezoneHandler);
    });

    it('should process handlers in correct order', () => {
      // Requirement 1.4 - datetime handlers should be processed after priority handlers
      const allHandlers = registry.getAll();
      const handlerNames = allHandlers.map(h => h.name);
      
      // DateTimeHandler should be in the list
      expect(handlerNames).toContain('x-uigen-datetime');
      expect(handlerNames).toContain('x-uigen-datetime-tz');
    });
  });

  describe('Annotation extraction and validation', () => {
    it('should extract simple string format annotation', () => {
      // Requirement 2.1, 2.2
      const handler = new DateTimeHandler();
      const mockContext = {
        element: { 'x-uigen-datetime': 'YYYY-MM-DD' },
        path: 'User.created_at',
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      const result = handler.extract(mockContext);
      
      expect(result).toBeDefined();
      expect(result?.format).toBe('YYYY-MM-DD');
    });

    it('should extract object format annotation with timezone', () => {
      // Requirement 2.2, 4.1
      const handler = new DateTimeHandler();
      const mockContext = {
        element: {
          'x-uigen-datetime': {
            format: 'MM/DD/YYYY HH:mm',
            timezone: 'America/New_York'
          }
        },
        path: 'Event.start_time',
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      const result = handler.extract(mockContext);
      
      expect(result).toBeDefined();
      expect(result?.format).toBe('MM/DD/YYYY HH:mm');
      expect(result?.timezone).toBe('America/New_York');
    });

    it('should validate format patterns correctly', () => {
      // Requirement 3.1, 3.2, 3.3, 3.4, 3.5
      const handler = new DateTimeHandler();
      
      // Valid patterns
      expect(handler.validate({ format: 'YYYY-MM-DD' })).toBe(true);
      expect(handler.validate({ format: 'MM/DD/YYYY HH:mm' })).toBe(true);
      expect(handler.validate({ format: 'DD-MM-YYYY' })).toBe(true);
      expect(handler.validate({ format: 'HH:mm:ss' })).toBe(true);
      expect(handler.validate({ format: 'YYYY-MM-DDTHH:mm:ssZ' })).toBe(true);
      
      // Invalid patterns
      expect(handler.validate({ format: '' })).toBe(false);
      expect(handler.validate({ format: 'invalid' })).toBe(false);
      expect(handler.validate({ format: '###' })).toBe(false);
    });

    it('should apply dateTimeConfig to schema node', () => {
      // Requirement 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4
      const handler = new DateTimeHandler();
      const mockSchemaNode: SchemaNode = {
        key: 'created_at',
        type: 'string',
        required: false,
        properties: []
      };
      const mockContext = {
        element: { 'x-uigen-datetime': 'YYYY-MM-DD HH:mm' },
        path: 'User.created_at',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      handler.apply({ format: 'YYYY-MM-DD HH:mm' }, mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toBeDefined();
      expect(mockSchemaNode.dateTimeConfig?.format).toBe('YYYY-MM-DD HH:mm');
      expect(mockSchemaNode.dateTimeConfig?.inputType).toBe('datetime-local');
    });

    it('should detect correct input types', () => {
      // Requirement 6.1, 6.2, 6.3, 6.4, 6.5
      const handler = new DateTimeHandler();
      
      // Date-only format
      const dateNode: SchemaNode = {
        key: 'date',
        type: 'string',
        required: false,
        properties: []
      };
      handler.apply({ format: 'YYYY-MM-DD' }, {
        element: {},
        path: 'Event.date',
        schemaNode: dateNode,
        utils: { logWarning: () => {}, logError: () => {} }
      } as any);
      expect(dateNode.dateTimeConfig?.inputType).toBe('date');
      
      // Time-only format
      const timeNode: SchemaNode = {
        key: 'time',
        type: 'string',
        required: false,
        properties: []
      };
      handler.apply({ format: 'HH:mm:ss' }, {
        element: {},
        path: 'Event.time',
        schemaNode: timeNode,
        utils: { logWarning: () => {}, logError: () => {} }
      } as any);
      expect(timeNode.dateTimeConfig?.inputType).toBe('time');
      
      // DateTime format
      const datetimeNode: SchemaNode = {
        key: 'datetime',
        type: 'string',
        required: false,
        properties: []
      };
      handler.apply({ format: 'YYYY-MM-DD HH:mm' }, {
        element: {},
        path: 'Event.datetime',
        schemaNode: datetimeNode,
        utils: { logWarning: () => {}, logError: () => {} }
      } as any);
      expect(datetimeNode.dateTimeConfig?.inputType).toBe('datetime-local');
      
      // DateTime with timezone token
      const datetimeTzNode: SchemaNode = {
        key: 'datetime_tz',
        type: 'string',
        required: false,
        properties: []
      };
      handler.apply({ format: 'YYYY-MM-DDTHH:mm:ssZ' }, {
        element: {},
        path: 'Event.datetime_tz',
        schemaNode: datetimeTzNode,
        utils: { logWarning: () => {}, logError: () => {} }
      } as any);
      expect(datetimeTzNode.dateTimeConfig?.inputType).toBe('datetime-local');
    });
  });

  describe('Timezone handler integration', () => {
    it('should extract and validate timezone annotation', () => {
      // Requirement 4.1, 4.2, 4.3, 4.4
      const handler = new DateTimeTimezoneHandler();
      const mockContext = {
        element: { 'x-uigen-datetime-tz': 'America/New_York' },
        path: 'Event.start_time',
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      const result = handler.extract(mockContext);
      
      expect(result).toBe('America/New_York');
      expect(handler.validate(result!)).toBe(true);
    });

    it('should accept special timezone values', () => {
      // Requirement 4.3
      const handler = new DateTimeTimezoneHandler();
      
      expect(handler.validate('local')).toBe(true);
      expect(handler.validate('utc')).toBe(true);
      expect(handler.validate('UTC')).toBe(true);
    });

    it('should apply timezone to existing dateTimeConfig', () => {
      // Requirement 4.5, 4.6
      const handler = new DateTimeTimezoneHandler();
      const mockSchemaNode: SchemaNode = {
        key: 'start_time',
        type: 'string',
        required: false,
        properties: [],
        dateTimeConfig: {
          format: 'YYYY-MM-DD HH:mm',
          inputType: 'datetime-local'
        }
      };
      const mockContext = {
        element: { 'x-uigen-datetime-tz': 'Europe/London' },
        path: 'Event.start_time',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      handler.apply('Europe/London', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig?.timezone).toBe('Europe/London');
      expect(mockSchemaNode.dateTimeConfig?.format).toBe('YYYY-MM-DD HH:mm');
      expect(mockSchemaNode.dateTimeConfig?.inputType).toBe('datetime-local');
    });

    it('should create dateTimeConfig if not present', () => {
      // Requirement 4.5, 4.6
      const handler = new DateTimeTimezoneHandler();
      const mockSchemaNode: SchemaNode = {
        key: 'timestamp',
        type: 'string',
        required: false,
        properties: []
      };
      const mockContext = {
        element: { 'x-uigen-datetime-tz': 'UTC' },
        path: 'Log.timestamp',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      handler.apply('UTC', mockContext);
      
      expect(mockSchemaNode.dateTimeConfig).toBeDefined();
      expect(mockSchemaNode.dateTimeConfig?.timezone).toBe('UTC');
      expect(mockSchemaNode.dateTimeConfig?.inputType).toBe('date'); // Default when created from timezone-only
      expect(mockSchemaNode.dateTimeConfig?.format).toBe('MMM DD, YYYY'); // Default format
    });
  });

  describe('Interaction with other handlers', () => {
    it('should work alongside label handler', () => {
      // Requirement 16.2
      const datetimeHandler = new DateTimeHandler();
      const labelHandler = new LabelHandler();
      
      const mockSchemaNode: SchemaNode = {
        key: 'birth_date',
        type: 'string',
        required: false,
        properties: []
      };
      
      const mockContext = {
        element: {
          'x-uigen-datetime': 'MM/DD/YYYY',
          'x-uigen-label': 'Date of Birth'
        },
        path: 'User.birth_date',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      // Apply both handlers
      datetimeHandler.apply({ format: 'MM/DD/YYYY' }, mockContext);
      labelHandler.apply('Date of Birth', mockContext);
      
      // Both annotations should be applied
      expect(mockSchemaNode.dateTimeConfig).toBeDefined();
      expect(mockSchemaNode.dateTimeConfig?.format).toBe('MM/DD/YYYY');
      expect(mockSchemaNode.label).toBe('Date of Birth');
    });

    it('should not affect fields without datetime annotations', () => {
      const handler = new DateTimeHandler();
      const mockSchemaNode: SchemaNode = {
        key: 'name',
        type: 'string',
        required: false,
        properties: []
      };
      const mockContext = {
        element: {},
        path: 'User.name',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: () => {},
          logError: () => {}
        }
      } as any;

      const result = handler.extract(mockContext);
      
      expect(result).toBeUndefined();
      expect(mockSchemaNode.dateTimeConfig).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should log warning for invalid field type', () => {
      // Requirement 7.1, 7.2, 7.3
      const handler = new DateTimeHandler();
      const warnings: string[] = [];
      const mockSchemaNode: SchemaNode = {
        key: 'count',
        type: 'number',
        required: false,
        properties: []
      };
      const mockContext = {
        element: { 'x-uigen-datetime': 'YYYY-MM-DD' },
        path: 'Stats.count',
        schemaNode: mockSchemaNode,
        utils: {
          logWarning: (msg: string) => warnings.push(msg),
          logError: () => {}
        }
      } as any;

      handler.apply({ format: 'YYYY-MM-DD' }, mockContext);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('can only be applied to string fields');
      expect(mockSchemaNode.dateTimeConfig).toBeUndefined();
    });

    it('should handle missing schema node gracefully', () => {
      // Requirement 7.4
      const handler = new DateTimeHandler();
      const warnings: string[] = [];
      const mockContext = {
        element: { 'x-uigen-datetime': 'YYYY-MM-DD' },
        path: 'User.created_at',
        schemaNode: undefined,
        utils: {
          logWarning: (msg: string) => warnings.push(msg),
          logError: () => {}
        }
      } as any;

      handler.apply({ format: 'YYYY-MM-DD' }, mockContext);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('schema node not found');
    });
  });
});


