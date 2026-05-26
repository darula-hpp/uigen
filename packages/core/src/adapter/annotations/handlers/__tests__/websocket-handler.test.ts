import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketHandler } from '../websocket-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, Operation } from '../../../../ir/types.js';

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;

  beforeEach(() => {
    handler = new WebSocketHandler();
    mockUtils = {
      humanize: vi.fn(),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      meta: { title: 'Test', version: '1.0.0' },
      resources: [],
      auth: { schemes: [], globalRequired: false },
      dashboard: { enabled: true, widgets: [] },
      servers: []
    } as UIGenApp;
  });

  it('should have the correct annotation name', () => {
    expect(handler.name).toBe('x-uigen-websocket');
  });

  it('should expose static metadata', () => {
    expect(WebSocketHandler.metadata.name).toBe('x-uigen-websocket');
    expect(WebSocketHandler.metadata.targetType).toBe('operation');
  });

  describe('extract', () => {
    it('returns undefined without operation context', () => {
      const context: AnnotationContext = {
        element: { 'x-uigen-websocket': { path: '/ws/v1/board' } } as OpenAPIV3.OperationObject,
        path: '/api/v1/board',
        utils: mockUtils,
        ir: mockIR
      };
      expect(handler.extract(context)).toBeUndefined();
    });

    it('extracts a valid annotation object', () => {
      const operation = { id: 'get_board', method: 'GET', path: '/api/v1/board' } as Operation;
      const context: AnnotationContext = {
        element: {
          responses: {},
          'x-uigen-websocket': { path: '/ws/v1/board', mode: 'replace' }
        } as OpenAPIV3.OperationObject,
        path: '/api/v1/board',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR,
        operation
      };
      expect(handler.extract(context)).toEqual({ path: '/ws/v1/board', mode: 'replace' });
    });

    it('warns and returns undefined for non-object annotation', () => {
      const operation = { id: 'get_board', method: 'GET', path: '/api/v1/board' } as Operation;
      const context: AnnotationContext = {
        element: {
          responses: {},
          'x-uigen-websocket': 'invalid'
        } as OpenAPIV3.OperationObject,
        path: '/api/v1/board',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR,
        operation
      };
      expect(handler.extract(context)).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('rejects path without leading slash', () => {
      expect(handler.validate({ path: 'ws/v1/board' })).toBe(false);
    });

    it('requires appendField when mode is append', () => {
      expect(handler.validate({ path: '/ws/v1/readings', mode: 'append' })).toBe(false);
    });

    it('accepts valid replace config', () => {
      expect(handler.validate({ path: '/ws/v1/board', mode: 'replace' })).toBe(true);
    });

    it('accepts valid append config', () => {
      expect(
        handler.validate({ path: '/ws/v1/readings', mode: 'append', appendField: 'readings' })
      ).toBe(true);
    });
  });

  describe('apply', () => {
    it('sets websocketConfig on operation', () => {
      const operation = {
        id: 'get_board',
        method: 'GET',
        path: '/api/v1/board',
        parameters: [],
        responses: {},
        viewHint: 'detail'
      } as Operation;

      const context: AnnotationContext = {
        element: {} as OpenAPIV3.OperationObject,
        path: '/api/v1/board',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR,
        operation
      };

      handler.apply(
        {
          path: '/ws/v1/board',
          mode: 'replace',
          subscribe: { action: 'subscribe' }
        },
        context
      );

      expect(operation.websocketConfig).toEqual({
        path: '/ws/v1/board',
        mode: 'replace',
        subscribe: { action: 'subscribe' }
      });
    });

    it('defaults mode to replace', () => {
      const operation = {
        id: 'get_board',
        method: 'GET',
        path: '/api/v1/board',
        parameters: [],
        responses: {},
        viewHint: 'detail'
      } as Operation;

      const context: AnnotationContext = {
        element: {} as OpenAPIV3.OperationObject,
        path: '/api/v1/board',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR,
        operation
      };

      handler.apply({ path: '/ws/v1/board' }, context);

      expect(operation.websocketConfig?.mode).toBe('replace');
    });
  });
});
