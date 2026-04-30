import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartHandler } from '../chart-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

describe('ChartHandler', () => {
  let handler: ChartHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;

  beforeEach(() => {
    handler = new ChartHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str.charAt(0).toUpperCase() + str.slice(1)),
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
      expect(handler.name).toBe('x-uigen-chart');
    });
  });

  describe('metadata', () => {
    it('should expose static metadata property', () => {
      expect(ChartHandler.metadata).toBeDefined();
    });

    it('should have correct name in metadata', () => {
      expect(ChartHandler.metadata.name).toBe('x-uigen-chart');
    });

    it('should have targetType "field" in metadata', () => {
      expect(ChartHandler.metadata.targetType).toBe('field');
    });

    it('should have applicableWhen type "array" in metadata', () => {
      expect(ChartHandler.metadata.applicableWhen?.type).toBe('array');
    });

    it('should have complete parameterSchema in metadata', () => {
      expect(ChartHandler.metadata.parameterSchema).toBeDefined();
      expect(ChartHandler.metadata.parameterSchema.properties).toBeDefined();
      expect(ChartHandler.metadata.parameterSchema.properties?.chartType).toBeDefined();
      expect(ChartHandler.metadata.parameterSchema.properties?.xAxis).toBeDefined();
      expect(ChartHandler.metadata.parameterSchema.properties?.yAxis).toBeDefined();
    });

    it('should have at least 3 examples in metadata', () => {
      expect(ChartHandler.metadata.examples).toBeDefined();
      expect(ChartHandler.metadata.examples.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('extract', () => {
    it('should return undefined when annotation is absent', () => {
      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
    });

    it('should return undefined and log warning for null annotation', () => {
      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': null } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should return undefined and log warning for array annotation', () => {
      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': [] } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should return undefined and log warning for string annotation', () => {
      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': 'invalid' } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should return undefined and log warning for number annotation', () => {
      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': 123 } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should extract valid chart annotation object', () => {
      const annotation = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      };

      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': annotation } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });
  });

  describe('validate', () => {
    describe('chartType validation', () => {
      it('should accept all valid chart types', () => {
        const validTypes = ['line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut'];
        
        for (const chartType of validTypes) {
          const result = handler.validate({
            chartType,
            xAxis: 'x',
            yAxis: 'y'
          });
          expect(result).toBe(true);
        }
      });

      it('should reject invalid chart type with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'invalid',
          xAxis: 'x',
          yAxis: 'y'
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject missing chartType with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: undefined as any,
          xAxis: 'x',
          yAxis: 'y'
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('xAxis validation', () => {
      it('should accept valid xAxis string', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });

        expect(result).toBe(true);
      });

      it('should reject missing xAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: undefined as any,
          yAxis: 'value'
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject empty string xAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: '',
          yAxis: 'value'
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject non-string xAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: 123 as any,
          yAxis: 'value'
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('yAxis validation', () => {
      it('should accept non-empty string yAxis', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });

        expect(result).toBe(true);
      });

      it('should accept array of non-empty strings yAxis', () => {
        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: ['revenue', 'expenses']
        });

        expect(result).toBe(true);
      });

      it('should reject missing yAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: undefined as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject empty string yAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: ''
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject empty array yAxis with warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: []
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject array with empty string and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: ['revenue', '']
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject array with non-string and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: ['revenue', 123] as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('series validation', () => {
      it('should accept valid series array', () => {
        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: ['revenue', 'expenses'],
          series: [
            { field: 'revenue', label: 'Revenue' },
            { field: 'expenses', label: 'Expenses' }
          ]
        });

        expect(result).toBe(true);
      });

      it('should accept undefined series', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });

        expect(result).toBe(true);
      });

      it('should reject non-array series and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: 'revenue',
          series: 'invalid' as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject series item without field and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: 'revenue',
          series: [{ label: 'Revenue' }] as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject series item with empty field and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'bar',
          xAxis: 'month',
          yAxis: 'revenue',
          series: [{ field: '', label: 'Revenue' }]
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('labels validation', () => {
      it('should accept non-empty string labels', () => {
        const result = handler.validate({
          chartType: 'pie',
          xAxis: 'category',
          yAxis: 'amount',
          labels: 'categoryName'
        });

        expect(result).toBe(true);
      });

      it('should accept undefined labels', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });

        expect(result).toBe(true);
      });

      it('should reject empty string labels and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'pie',
          xAxis: 'category',
          yAxis: 'amount',
          labels: ''
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject non-string labels and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'pie',
          xAxis: 'category',
          yAxis: 'amount',
          labels: 123 as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe('options validation', () => {
      it('should accept plain object options', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value',
          options: { title: 'My Chart' }
        });

        expect(result).toBe(true);
      });

      it('should accept undefined options', () => {
        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        });

        expect(result).toBe(true);
      });

      it('should reject null options and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value',
          options: null as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should reject array options and log warning', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = handler.validate({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value',
          options: [] as any
        });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe('apply', () => {
    it('should set chartConfig on schema node for valid annotation', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'date', label: 'Date', required: false },
            { type: 'number', key: 'value', label: 'Value', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      }, context);

      expect(schemaNode.chartConfig).toBeDefined();
      expect(schemaNode.chartConfig?.chartType).toBe('line');
      expect(schemaNode.chartConfig?.xAxis).toBe('date');
      expect(schemaNode.chartConfig?.yAxis).toBe('value');
    });

    it('should not set chartConfig for non-array field and log warning', () => {
      const schemaNode: SchemaNode = {
        type: 'string',
        key: 'data',
        label: 'Data',
        required: false
      };

      const context: AnnotationContext = {
        element: { type: 'string' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      }, context);

      expect(schemaNode.chartConfig).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should not set chartConfig for array of primitives and log warning', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'string',
          key: 'item',
          label: 'Item',
          required: false
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      }, context);

      expect(schemaNode.chartConfig).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should handle missing schema node gracefully', () => {
      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      expect(() => {
        handler.apply({
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value'
        }, context);
      }).not.toThrow();

      expect(mockUtils.logWarning).toHaveBeenCalled();
    });

    it('should preserve existing schema node properties', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: true,
        description: 'Test data',
        refConfig: {
          resource: 'test',
          valueField: 'id',
          labelField: 'name',
          filter: {}
        },
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'date', label: 'Date', required: false },
            { type: 'number', key: 'value', label: 'Value', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      }, context);

      expect(schemaNode.type).toBe('array');
      expect(schemaNode.key).toBe('data');
      expect(schemaNode.label).toBe('Data');
      expect(schemaNode.required).toBe(true);
      expect(schemaNode.description).toBe('Test data');
      expect(schemaNode.refConfig).toBeDefined();
      expect(schemaNode.chartConfig).toBeDefined();
    });

    it('should auto-generate series for multi-series configuration', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'month', label: 'Month', required: false },
            { type: 'number', key: 'revenue', label: 'Revenue', required: false },
            { type: 'number', key: 'expenses', label: 'Expenses', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'bar',
        xAxis: 'month',
        yAxis: ['revenue', 'expenses']
      }, context);

      expect(schemaNode.chartConfig?.series).toBeDefined();
      expect(schemaNode.chartConfig?.series?.length).toBe(2);
      expect(schemaNode.chartConfig?.series?.[0].field).toBe('revenue');
      expect(schemaNode.chartConfig?.series?.[1].field).toBe('expenses');
    });
  });

  describe('integration', () => {
    it('should process complete valid annotation end-to-end', () => {
      const annotation = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value',
        options: { title: 'Test Chart' }
      };

      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'date', label: 'Date', required: false },
            { type: 'number', key: 'value', label: 'Value', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': annotation } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      const extracted = handler.extract(context);
      expect(extracted).toBeDefined();

      const isValid = handler.validate(extracted!);
      expect(isValid).toBe(true);

      handler.apply(extracted!, context);
      expect(schemaNode.chartConfig).toBeDefined();
      expect(schemaNode.chartConfig?.chartType).toBe('line');
    });

    it('should handle invalid annotation gracefully end-to-end', () => {
      const annotation = {
        chartType: 'invalid',
        xAxis: '',
        yAxis: []
      };

      const context: AnnotationContext = {
        element: { type: 'array', 'x-uigen-chart': annotation } as any,
        path: 'data',
        utils: mockUtils,
        ir: mockIR
      };

      const extracted = handler.extract(context);
      expect(extracted).toBeDefined();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const isValid = handler.validate(extracted!);
      expect(isValid).toBe(false);
      consoleWarnSpy.mockRestore();
    });

    it('should work with single-series configuration', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'date', label: 'Date', required: false },
            { type: 'number', key: 'value', label: 'Value', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      }, context);

      expect(schemaNode.chartConfig).toBeDefined();
      expect(schemaNode.chartConfig?.yAxis).toBe('value');
    });

    it('should work with multi-series configuration with auto-generation', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'month', label: 'Month', required: false },
            { type: 'number', key: 'revenue', label: 'Revenue', required: false },
            { type: 'number', key: 'expenses', label: 'Expenses', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      handler.apply({
        chartType: 'bar',
        xAxis: 'month',
        yAxis: ['revenue', 'expenses']
      }, context);

      expect(schemaNode.chartConfig).toBeDefined();
      expect(Array.isArray(schemaNode.chartConfig?.yAxis)).toBe(true);
      expect(schemaNode.chartConfig?.series).toBeDefined();
      expect(schemaNode.chartConfig?.series?.length).toBe(2);
    });

    it('should work with configuration with custom options', () => {
      const schemaNode: SchemaNode = {
        type: 'array',
        key: 'data',
        label: 'Data',
        required: false,
        items: {
          type: 'object',
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            { type: 'string', key: 'date', label: 'Date', required: false },
            { type: 'number', key: 'value', label: 'Value', required: false }
          ]
        }
      };

      const context: AnnotationContext = {
        element: { type: 'array' },
        path: 'data',
        utils: mockUtils,
        ir: mockIR,
        schemaNode
      };

      const options = {
        title: 'My Chart',
        legend: { show: true, position: 'top' as const },
        responsive: true
      };

      handler.apply({
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value',
        options
      }, context);

      expect(schemaNode.chartConfig).toBeDefined();
      expect(schemaNode.chartConfig?.options).toEqual(options);
    });
  });
});
