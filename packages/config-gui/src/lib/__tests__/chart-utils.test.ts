import { describe, it, expect } from 'vitest';
import type { SchemaNode, ChartConfig } from '@uigen-dev/core';
import {
  extractFields,
  validateChartConfig,
  getSmartDefaults,
  serializeChartConfig,
  generateDefaultSeries,
  validateOptionsJson,
  parseOptionsJson,
  ERROR_MESSAGES,
  VALID_CHART_TYPES,
} from '../chart-utils.js';

describe('VALID_CHART_TYPES constant', () => {
  it('exports all supported chart types', () => {
    expect(VALID_CHART_TYPES).toEqual([
      'line',
      'bar',
      'pie',
      'scatter',
      'area',
      'radar',
      'donut',
    ]);
  });
});

describe('ERROR_MESSAGES constant', () => {
  it('exports all error messages', () => {
    expect(ERROR_MESSAGES.CHART_TYPE_REQUIRED).toBe('Chart type is required');
    expect(ERROR_MESSAGES.X_AXIS_REQUIRED).toBe('X-axis field is required');
    expect(ERROR_MESSAGES.Y_AXIS_REQUIRED).toBe('Y-axis field is required');
    expect(ERROR_MESSAGES.X_AXIS_INVALID).toBe('X-axis field does not exist in schema');
    expect(ERROR_MESSAGES.Y_AXIS_INVALID).toBe('Y-axis field does not exist in schema');
    expect(ERROR_MESSAGES.NO_FIELDS_AVAILABLE).toBe('Array items must be objects with fields to configure charts');
    expect(ERROR_MESSAGES.INVALID_JSON).toBe('Invalid JSON syntax');
    expect(ERROR_MESSAGES.OPTIONS_NOT_OBJECT).toBe('Options must be a JSON object');
  });
});

describe('extractFields', () => {
  it('extracts fields from object schema with children', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
      children: [
        { type: 'string', key: 'date', label: 'Date', required: true, format: 'date-time' },
        { type: 'number', key: 'revenue', label: 'Revenue', required: true },
        { type: 'number', key: 'expenses', label: 'Expenses', required: false },
      ],
    };

    const fields = extractFields(schema);

    expect(fields).toEqual([
      { value: 'date', label: 'Date', type: 'string', format: 'date-time' },
      { value: 'revenue', label: 'Revenue', type: 'number', format: undefined },
      { value: 'expenses', label: 'Expenses', type: 'number', format: undefined },
    ]);
  });

  it('returns empty array for non-object schema', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'item',
      label: 'Item',
      required: false,
    };

    const fields = extractFields(schema);

    expect(fields).toEqual([]);
  });

  it('returns empty array for object schema without children', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
    };

    const fields = extractFields(schema);

    expect(fields).toEqual([]);
  });

  it('returns empty array for null/undefined schema', () => {
    expect(extractFields(null as any)).toEqual([]);
    expect(extractFields(undefined as any)).toEqual([]);
  });

  it('handles fields with various types', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
      children: [
        { type: 'string', key: 'name', label: 'Name', required: true },
        { type: 'number', key: 'count', label: 'Count', required: true },
        { type: 'integer', key: 'id', label: 'ID', required: true },
        { type: 'boolean', key: 'active', label: 'Active', required: false },
        { type: 'date', key: 'created', label: 'Created', required: false },
      ],
    };

    const fields = extractFields(schema);

    expect(fields).toHaveLength(5);
    expect(fields[0]).toEqual({ value: 'name', label: 'Name', type: 'string', format: undefined });
    expect(fields[1]).toEqual({ value: 'count', label: 'Count', type: 'number', format: undefined });
    expect(fields[2]).toEqual({ value: 'id', label: 'ID', type: 'integer', format: undefined });
    expect(fields[3]).toEqual({ value: 'active', label: 'Active', type: 'boolean', format: undefined });
    expect(fields[4]).toEqual({ value: 'created', label: 'Created', type: 'date', format: undefined });
  });
});

describe('validateChartConfig', () => {
  const availableFields = [
    { value: 'date', label: 'Date', type: 'string' as const, format: 'date-time' },
    { value: 'revenue', label: 'Revenue', type: 'number' as const },
    { value: 'expenses', label: 'Expenses', type: 'number' as const },
  ];

  it('validates a complete valid configuration', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('validates multi-series configuration', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'bar',
      xAxis: 'date',
      yAxis: ['revenue', 'expenses'],
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns error when chartType is missing', () => {
    const config: Partial<ChartConfig> = {
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.chartType).toBe(ERROR_MESSAGES.CHART_TYPE_REQUIRED);
  });

  it('returns error when chartType is invalid', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'invalid' as any,
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.chartType).toContain('Chart type must be one of:');
  });

  it('returns error when xAxis is missing', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      yAxis: 'revenue',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.xAxis).toBe(ERROR_MESSAGES.X_AXIS_REQUIRED);
  });

  it('returns error when xAxis field does not exist', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'nonexistent',
      yAxis: 'revenue',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.xAxis).toBe(ERROR_MESSAGES.X_AXIS_INVALID);
  });

  it('returns error when yAxis is missing', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.yAxis).toBe(ERROR_MESSAGES.Y_AXIS_REQUIRED);
  });

  it('returns error when yAxis field does not exist (string)', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'nonexistent',
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.yAxis).toBe(ERROR_MESSAGES.Y_AXIS_INVALID);
  });

  it('returns error when yAxis field does not exist (array)', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: ['revenue', 'nonexistent'],
    };

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.yAxis).toBe(ERROR_MESSAGES.Y_AXIS_INVALID);
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const config: Partial<ChartConfig> = {};

    const result = validateChartConfig(config, availableFields);

    expect(result.valid).toBe(false);
    expect(result.errors.chartType).toBe(ERROR_MESSAGES.CHART_TYPE_REQUIRED);
    expect(result.errors.xAxis).toBe(ERROR_MESSAGES.X_AXIS_REQUIRED);
    expect(result.errors.yAxis).toBe(ERROR_MESSAGES.Y_AXIS_REQUIRED);
  });

  it('validates all chart types', () => {
    VALID_CHART_TYPES.forEach((chartType) => {
      const config: Partial<ChartConfig> = {
        chartType,
        xAxis: 'date',
        yAxis: 'revenue',
      };

      const result = validateChartConfig(config, availableFields);

      expect(result.valid).toBe(true);
    });
  });
});

describe('getSmartDefaults', () => {
  it('returns line chart as default type', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.chartType).toBe('line');
  });

  it('selects first date field for xAxis', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'date', label: 'Date', type: 'date' as const },
      { value: 'count', label: 'Count', type: 'number' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.xAxis).toBe('date');
  });

  it('selects first date-time format field for xAxis', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'timestamp', label: 'Timestamp', type: 'string' as const, format: 'date-time' },
      { value: 'count', label: 'Count', type: 'number' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.xAxis).toBe('timestamp');
  });

  it('selects first field for xAxis when no date field exists', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'count', label: 'Count', type: 'number' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.xAxis).toBe('name');
  });

  it('selects first numeric field for yAxis', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'date', label: 'Date', type: 'date' as const },
      { value: 'revenue', label: 'Revenue', type: 'number' as const },
      { value: 'count', label: 'Count', type: 'integer' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.yAxis).toBe('revenue');
  });

  it('selects first integer field for yAxis when no number field exists', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'count', label: 'Count', type: 'integer' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.yAxis).toBe('count');
  });

  it('selects first field for yAxis when no numeric field exists', () => {
    const fields = [
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'description', label: 'Description', type: 'string' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.yAxis).toBe('name');
  });

  it('returns only chartType when no fields available', () => {
    const defaults = getSmartDefaults([]);

    expect(defaults).toEqual({
      chartType: 'line',
    });
  });

  it('handles complex field combinations', () => {
    const fields = [
      { value: 'id', label: 'ID', type: 'integer' as const },
      { value: 'name', label: 'Name', type: 'string' as const },
      { value: 'created', label: 'Created', type: 'string' as const, format: 'date-time' },
      { value: 'revenue', label: 'Revenue', type: 'number' as const },
      { value: 'active', label: 'Active', type: 'boolean' as const },
    ];

    const defaults = getSmartDefaults(fields);

    expect(defaults.chartType).toBe('line');
    expect(defaults.xAxis).toBe('created'); // First date field
    expect(defaults.yAxis).toBe('id'); // First numeric field (integer counts as numeric)
  });
});

describe('serializeChartConfig', () => {
  it('serializes basic configuration', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized).toEqual({
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
    });
  });

  it('includes series when customized', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'bar',
      xAxis: 'date',
      yAxis: ['revenue', 'expenses'],
      series: [
        { field: 'revenue', label: 'Revenue', color: '#4CAF50' },
        { field: 'expenses', label: 'Expenses', color: '#F44336' },
      ],
    };

    const serialized = serializeChartConfig(config, true);

    expect(serialized.series).toEqual([
      { field: 'revenue', label: 'Revenue', color: '#4CAF50' },
      { field: 'expenses', label: 'Expenses', color: '#F44336' },
    ]);
  });

  it('omits series when not customized', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'bar',
      xAxis: 'date',
      yAxis: ['revenue', 'expenses'],
      series: [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' },
      ],
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.series).toBeUndefined();
  });

  it('includes labels when provided', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'pie',
      xAxis: 'category',
      yAxis: 'amount',
      labels: 'categoryName',
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.labels).toBe('categoryName');
  });

  it('omits labels when not provided', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.labels).toBeUndefined();
  });

  it('includes options when provided and not empty', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
      options: {
        title: 'Sales Over Time',
        legend: { show: true },
      },
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.options).toEqual({
      title: 'Sales Over Time',
      legend: { show: true },
    });
  });

  it('omits options when not provided', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.options).toBeUndefined();
  });

  it('omits options when empty object', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
      options: {},
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.options).toBeUndefined();
  });

  it('handles multi-series yAxis', () => {
    const config: Partial<ChartConfig> = {
      chartType: 'bar',
      xAxis: 'month',
      yAxis: ['revenue', 'expenses', 'profit'],
    };

    const serialized = serializeChartConfig(config, false);

    expect(serialized.yAxis).toEqual(['revenue', 'expenses', 'profit']);
  });
});

describe('generateDefaultSeries', () => {
  const availableFields = [
    { value: 'revenue', label: 'Revenue', type: 'number' as const },
    { value: 'expenses', label: 'Expenses', type: 'number' as const },
    { value: 'profit', label: 'Profit', type: 'number' as const },
  ];

  it('generates series with labels from available fields', () => {
    const series = generateDefaultSeries(['revenue', 'expenses'], availableFields);

    expect(series).toEqual([
      { field: 'revenue', label: 'Revenue' },
      { field: 'expenses', label: 'Expenses' },
    ]);
  });

  it('uses field name as label when field not found', () => {
    const series = generateDefaultSeries(['unknown'], availableFields);

    expect(series).toEqual([
      { field: 'unknown', label: 'unknown' },
    ]);
  });

  it('handles empty yAxis array', () => {
    const series = generateDefaultSeries([], availableFields);

    expect(series).toEqual([]);
  });

  it('handles single field', () => {
    const series = generateDefaultSeries(['revenue'], availableFields);

    expect(series).toEqual([
      { field: 'revenue', label: 'Revenue' },
    ]);
  });

  it('handles multiple fields', () => {
    const series = generateDefaultSeries(['revenue', 'expenses', 'profit'], availableFields);

    expect(series).toEqual([
      { field: 'revenue', label: 'Revenue' },
      { field: 'expenses', label: 'Expenses' },
      { field: 'profit', label: 'Profit' },
    ]);
  });
});

describe('validateOptionsJson', () => {
  it('validates valid JSON object', () => {
    const result = validateOptionsJson('{"title": "My Chart"}');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates empty string as valid', () => {
    const result = validateOptionsJson('');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates whitespace-only string as valid', () => {
    const result = validateOptionsJson('   ');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns error for invalid JSON syntax', () => {
    const result = validateOptionsJson('{invalid}');

    expect(result.valid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.INVALID_JSON);
  });

  it('returns error for JSON array', () => {
    const result = validateOptionsJson('[]');

    expect(result.valid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.OPTIONS_NOT_OBJECT);
  });

  it('returns error for JSON null', () => {
    const result = validateOptionsJson('null');

    expect(result.valid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.OPTIONS_NOT_OBJECT);
  });

  it('returns error for JSON string', () => {
    const result = validateOptionsJson('"string"');

    expect(result.valid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.OPTIONS_NOT_OBJECT);
  });

  it('returns error for JSON number', () => {
    const result = validateOptionsJson('123');

    expect(result.valid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.OPTIONS_NOT_OBJECT);
  });

  it('validates complex nested object', () => {
    const json = JSON.stringify({
      title: 'Sales Chart',
      legend: { show: true, position: 'bottom' },
      tooltip: { enabled: true },
      xAxis: { showGrid: true },
    });

    const result = validateOptionsJson(json);

    expect(result.valid).toBe(true);
  });
});

describe('parseOptionsJson', () => {
  it('parses valid JSON object', () => {
    const result = parseOptionsJson('{"title": "My Chart"}');

    expect(result).toEqual({ title: 'My Chart' });
  });

  it('returns undefined for empty string', () => {
    const result = parseOptionsJson('');

    expect(result).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    const result = parseOptionsJson('   ');

    expect(result).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    const result = parseOptionsJson('{invalid}');

    expect(result).toBeUndefined();
  });

  it('returns undefined for JSON array', () => {
    const result = parseOptionsJson('[]');

    expect(result).toBeUndefined();
  });

  it('returns undefined for JSON null', () => {
    const result = parseOptionsJson('null');

    expect(result).toBeUndefined();
  });

  it('returns undefined for JSON string', () => {
    const result = parseOptionsJson('"string"');

    expect(result).toBeUndefined();
  });

  it('returns undefined for JSON number', () => {
    const result = parseOptionsJson('123');

    expect(result).toBeUndefined();
  });

  it('parses complex nested object', () => {
    const json = JSON.stringify({
      title: 'Sales Chart',
      legend: { show: true, position: 'bottom' },
      tooltip: { enabled: true },
      xAxis: { showGrid: true },
    });

    const result = parseOptionsJson(json);

    expect(result).toEqual({
      title: 'Sales Chart',
      legend: { show: true, position: 'bottom' },
      tooltip: { enabled: true },
      xAxis: { showGrid: true },
    });
  });
});

describe('integration scenarios', () => {
  it('handles complete chart configuration workflow', () => {
    // 1. Extract fields from schema
    const schema: SchemaNode = {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
      children: [
        { type: 'string', key: 'date', label: 'Date', required: true, format: 'date-time' },
        { type: 'number', key: 'revenue', label: 'Revenue', required: true },
        { type: 'number', key: 'expenses', label: 'Expenses', required: false },
      ],
    };

    const fields = extractFields(schema);
    expect(fields).toHaveLength(3);

    // 2. Get smart defaults
    const defaults = getSmartDefaults(fields);
    expect(defaults.chartType).toBe('line');
    expect(defaults.xAxis).toBe('date');
    expect(defaults.yAxis).toBe('revenue');

    // 3. Validate configuration
    const config: Partial<ChartConfig> = {
      ...defaults,
      yAxis: ['revenue', 'expenses'],
    };

    const validation = validateChartConfig(config, fields);
    expect(validation.valid).toBe(true);

    // 4. Serialize for persistence
    const serialized = serializeChartConfig(config, false);
    expect(serialized).toEqual({
      chartType: 'line',
      xAxis: 'date',
      yAxis: ['revenue', 'expenses'],
    });
  });

  it('handles chart with custom series and options', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'item',
      label: 'Item',
      required: false,
      children: [
        { type: 'string', key: 'month', label: 'Month', required: true },
        { type: 'number', key: 'revenue', label: 'Revenue', required: true },
        { type: 'number', key: 'expenses', label: 'Expenses', required: true },
      ],
    };

    const fields = extractFields(schema);
    const defaults = getSmartDefaults(fields);

    const config: Partial<ChartConfig> = {
      chartType: 'bar',
      xAxis: 'month',
      yAxis: ['revenue', 'expenses'],
      series: [
        { field: 'revenue', label: 'Total Revenue', color: '#4CAF50' },
        { field: 'expenses', label: 'Total Expenses', color: '#F44336' },
      ],
      options: {
        title: 'Monthly Financial Report',
        legend: { show: true, position: 'bottom' },
      },
    };

    const validation = validateChartConfig(config, fields);
    expect(validation.valid).toBe(true);

    const serialized = serializeChartConfig(config, true);
    expect(serialized.series).toBeDefined();
    expect(serialized.options).toBeDefined();
  });

  it('handles validation errors gracefully', () => {
    const fields = [
      { value: 'date', label: 'Date', type: 'string' as const },
      { value: 'value', label: 'Value', type: 'number' as const },
    ];

    const config: Partial<ChartConfig> = {
      chartType: 'line',
      xAxis: 'nonexistent',
      yAxis: 'value',
    };

    const validation = validateChartConfig(config, fields);
    expect(validation.valid).toBe(false);
    expect(validation.errors.xAxis).toBe(ERROR_MESSAGES.X_AXIS_INVALID);
  });
});
