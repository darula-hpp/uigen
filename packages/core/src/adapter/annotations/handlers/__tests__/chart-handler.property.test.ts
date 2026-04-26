import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { ChartHandler } from '../chart-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp, SchemaNode, ChartType } from '../../../../ir/types.js';

// Helper functions
function makeContext(element: any, schemaNode?: SchemaNode): AnnotationContext {
  const mockUtils: AdapterUtils = {
    humanize: vi.fn((str: string) => str.charAt(0).toUpperCase() + str.slice(1)),
    resolveRef: vi.fn(),
    logError: vi.fn(),
    logWarning: vi.fn()
  };
  const mockIR: UIGenApp = { resources: [], parsingErrors: [] } as UIGenApp;

  return {
    element,
    path: 'testField',
    utils: mockUtils,
    ir: mockIR,
    schemaNode
  };
}

function createArraySchemaNode(fields: string[]): SchemaNode {
  return {
    type: 'array',
    key: 'data',
    label: 'Data',
    required: false,
    items: {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
      children: fields.map(field => ({
        type: 'string',
        key: field,
        label: field,
        required: false
      }))
    }
  };
}

// Arbitraries
const validChartType = fc.constantFrom<ChartType>('line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut');
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '');
const fieldName = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z][a-z0-9_]*$/i.test(s));

describe('ChartHandler - Property-Based Tests', () => {
  const handler = new ChartHandler();

  // Feature: x-uigen-chart, Property 1: Extraction accepts valid objects and rejects invalid types
  it('Property 1: Extraction accepts valid objects and rejects invalid types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.object(),
          fc.constant(null),
          fc.array(fc.anything()),
          fc.string(),
          fc.integer()
        ),
        (value) => {
          const element = { type: 'array', 'x-uigen-chart': value };
          const context = makeContext(element);
          const result = handler.extract(context);
          
          const isPlainObject = typeof value === 'object' && value !== null && !Array.isArray(value);
          if (isPlainObject) {
            expect(result).toBeDefined();
          } else {
            expect(result).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 2: Chart type validation
  it('Property 2: Chart type validation', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (chartType) => {
          const validTypes: ChartType[] = ['line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut'];
          const config = { chartType, xAxis: 'x', yAxis: 'y' };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          expect(result).toBe(validTypes.includes(chartType as ChartType));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 3: xAxis validation
  it('Property 3: xAxis validation', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (xAxis) => {
          const config = { chartType: 'line', xAxis, yAxis: 'y' };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          const isValid = xAxis.trim().length > 0;
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 4: yAxis validation
  it('Property 4: yAxis validation', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.array(fc.string())
        ),
        (yAxis) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          let isValid = false;
          if (typeof yAxis === 'string') {
            isValid = yAxis.trim().length > 0;
          } else if (Array.isArray(yAxis)) {
            isValid = yAxis.length > 0 && yAxis.every(s => typeof s === 'string' && s.trim().length > 0);
          }
          
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 5: Series validation
  it('Property 5: Series validation', () => {
    fc.assert(
      fc.property(
        fc.option(
          fc.array(
            fc.record({
              field: fc.string(),
              label: fc.option(fc.string(), { nil: undefined }),
              color: fc.option(fc.string(), { nil: undefined })
            })
          ),
          { nil: undefined }
        ),
        (series) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y', series };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          let isValid = true;
          if (series !== undefined) {
            if (!Array.isArray(series)) {
              isValid = false;
            } else {
              isValid = series.every(s => 
                typeof s === 'object' && 
                s !== null && 
                typeof s.field === 'string' && 
                s.field.trim().length > 0
              );
            }
          }
          
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 6: Labels validation
  it('Property 6: Labels validation', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        (labels) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y', labels };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          let isValid = true;
          if (labels !== undefined) {
            isValid = typeof labels === 'string' && labels.trim().length > 0;
          }
          
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 7: Options validation
  it('Property 7: Options validation', () => {
    fc.assert(
      fc.property(
        fc.option(
          fc.oneof(
            fc.object(),
            fc.constant(null),
            fc.array(fc.anything())
          ),
          { nil: undefined }
        ),
        (options) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y', options };
          
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = handler.validate(config);
          consoleWarnSpy.mockRestore();
          
          let isValid = true;
          if (options !== undefined) {
            isValid = typeof options === 'object' && options !== null && !Array.isArray(options);
          }
          
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 9: Series auto-generation
  it('Property 9: Series auto-generation', () => {
    fc.assert(
      fc.property(
        fc.array(fieldName, { minLength: 1, maxLength: 5 }),
        (yAxisFields) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: yAxisFields };
          const schemaNode = createArraySchemaNode(['x', ...yAxisFields]);
          const context = makeContext({ type: 'array' }, schemaNode);
          
          handler.apply(config, context);
          
          expect(schemaNode.chartConfig).toBeDefined();
          expect(schemaNode.chartConfig!.series).toBeDefined();
          expect(schemaNode.chartConfig!.series!.length).toBe(yAxisFields.length);
          
          yAxisFields.forEach((field, index) => {
            expect(schemaNode.chartConfig!.series![index].field).toBe(field);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 10: Options passthrough preservation
  it('Property 10: Options passthrough preservation', () => {
    fc.assert(
      fc.property(
        fc.object(),
        (options) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y', options };
          const schemaNode = createArraySchemaNode(['x', 'y']);
          const context = makeContext({ type: 'array' }, schemaNode);
          
          handler.apply(config, context);
          
          expect(schemaNode.chartConfig).toBeDefined();
          expect(schemaNode.chartConfig!.options).toEqual(options);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 11: Array field type requirement
  it('Property 11: Array field type requirement', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('string', 'number', 'object', 'array'),
        fc.constantFrom('string', 'number', 'object'),
        (fieldType, itemType) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y' };
          
          let schemaNode: SchemaNode;
          if (fieldType === 'array') {
            schemaNode = {
              type: 'array',
              key: 'data',
              label: 'Data',
              required: false,
              items: {
                type: itemType as any,
                key: 'item',
                label: 'Item',
                required: false,
                ...(itemType === 'object' ? {
                  children: [
                    { type: 'string', key: 'x', label: 'X', required: false },
                    { type: 'string', key: 'y', label: 'Y', required: false }
                  ]
                } : {})
              }
            };
          } else {
            schemaNode = {
              type: fieldType as any,
              key: 'data',
              label: 'Data',
              required: false
            };
          }
          
          const context = makeContext({ type: fieldType }, schemaNode);
          
          handler.apply(config, context);
          
          const shouldApply = fieldType === 'array' && itemType === 'object';
          if (shouldApply) {
            expect(schemaNode.chartConfig).toBeDefined();
          } else {
            expect(schemaNode.chartConfig).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 12: Exception safety
  it('Property 12: Exception safety', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (value) => {
          expect(() => {
            const element = { type: 'array', 'x-uigen-chart': value };
            const context = makeContext(element);
            const extracted = handler.extract(context);
            if (extracted) {
              const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
              handler.validate(extracted);
              consoleWarnSpy.mockRestore();
              
              const schemaNode = createArraySchemaNode(['x', 'y']);
              const applyContext = makeContext(element, schemaNode);
              handler.apply(extracted, applyContext);
            }
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 13: SchemaNode property preservation
  it('Property 13: SchemaNode property preservation', () => {
    fc.assert(
      fc.property(
        fc.record({
          refConfig: fc.option(fc.object()),
          fileMetadata: fc.option(fc.object()),
          uiHint: fc.option(fc.object())
        }),
        (existingProps) => {
          const config = { chartType: 'line', xAxis: 'x', yAxis: 'y' };
          const schemaNode = createArraySchemaNode(['x', 'y']);
          Object.assign(schemaNode, existingProps);
          
          const beforeProps = { ...schemaNode };
          delete (beforeProps as any).chartConfig;
          
          const context = makeContext({ type: 'array' }, schemaNode);
          handler.apply(config, context);
          
          const afterProps = { ...schemaNode };
          delete (afterProps as any).chartConfig;
          
          expect(afterProps).toEqual(beforeProps);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-chart, Property 14: JSON serialization round-trip
  it('Property 14: JSON serialization round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          chartType: validChartType,
          xAxis: nonEmptyString,
          yAxis: fc.oneof(
            nonEmptyString,
            fc.array(nonEmptyString, { minLength: 1 })
          ),
          options: fc.option(fc.jsonValue(), { nil: undefined })
        }).filter(config => config.options !== undefined), // Only test when options is defined
        (chartConfig) => {
          const serialized = JSON.stringify(chartConfig);
          const deserialized = JSON.parse(serialized);
          
          expect(deserialized).toEqual(chartConfig);
        }
      ),
      { numRuns: 100 }
    );
  });
});
