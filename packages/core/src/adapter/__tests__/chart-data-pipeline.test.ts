import { describe, it, expect } from 'vitest';
import type { ChartConfig, SchemaNode } from '../../ir/types.js';
import { ChartQueryResolver } from '../chart-query-resolver.js';
import { ChartDataPipeline } from '../chart-data-pipeline.js';
import { ChartAxisTypeDetector } from '../chart-axis-type-detector.js';

const telemetryChartConfig: ChartConfig = {
  chartType: 'line',
  xAxis: 'recorded_at',
  yAxis: 'value',
  query: {
    limit: 500,
    params: {
      sensor_id: 'sensor_id',
    },
  },
  sampling: {
    strategy: 'auto',
    maxPoints: 120,
  },
  options: {
    title: 'Sensor Telemetry',
  },
};

const readingItemSchema: SchemaNode = {
  type: 'object',
  key: 'Reading',
  label: 'Reading',
  required: false,
  children: [
    { type: 'integer', key: 'sensor_id', label: 'Sensor', required: true },
    { type: 'number', key: 'value', label: 'Value', required: true },
    { type: 'string', key: 'recorded_at', label: 'Recorded At', required: true, format: 'date-time' },
  ],
};

function buildTelemetryRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    sensor_id: (index % 3) + 1,
    value: 20 + Math.sin(index / 8) * 5,
    recorded_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  }));
}

describe('ChartQueryResolver', () => {
  it('applies chart query limit and mapped filter params', () => {
    const params = ChartQueryResolver.resolveQueryParams(
      telemetryChartConfig,
      {
        id: 'list_readings',
        method: 'GET',
        path: '/api/v1/readings',
        viewHint: 'list',
        parameters: [
          {
            name: 'sensor_id',
            in: 'query',
            required: false,
            schema: { type: 'integer', key: 'sensor_id', label: 'Sensor', required: false },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', key: 'limit', label: 'Limit', required: false },
          },
        ],
        responses: {},
      },
      { sensor_id: 2 },
    );

    expect(params).toEqual({
      limit: '500',
      sensor_id: '2',
    });
  });
});

describe('ChartAxisTypeDetector', () => {
  it('detects time axes from schema format metadata', () => {
    const axisType = ChartAxisTypeDetector.detect(
      'recorded_at',
      readingItemSchema,
      ['2026-01-01T00:00:00Z'],
    );

    expect(axisType).toBe('time');
  });
});

describe('ChartDataPipeline', () => {
  it('sorts and downsamples dense telemetry for line charts', () => {
    const rows = buildTelemetryRows(500);
    const prepared = ChartDataPipeline.prepare(rows, telemetryChartConfig, {
      itemSchema: readingItemSchema,
    });

    expect(prepared.meta.totalPoints).toBe(500);
    expect(prepared.meta.renderedPoints).toBe(120);
    expect(prepared.meta.sampled).toBe(true);
    expect(prepared.meta.xAxisType).toBe('time');
    expect(prepared.meta.sortApplied).toBe(true);
    expect(prepared.meta.samplingStrategy).toBe('lttb');

    const timestamps = prepared.points.map((point) => Date.parse(String(point.recorded_at)));
    expect(timestamps.every((value, index) => index === 0 || value >= timestamps[index - 1])).toBe(true);
  });

  it('passes through small datasets without sampling', () => {
    const rows = buildTelemetryRows(40);
    const prepared = ChartDataPipeline.prepare(rows, {
      ...telemetryChartConfig,
      sampling: { strategy: 'none' },
    }, {
      itemSchema: readingItemSchema,
    });

    expect(prepared.meta.totalPoints).toBe(40);
    expect(prepared.meta.renderedPoints).toBe(40);
    expect(prepared.meta.sampled).toBe(false);
  });

  it('supports generic time-series configs without schema metadata', () => {
    const rows = [
      { date: '2024-01-03', revenue: 30 },
      { date: '2024-01-01', revenue: 10 },
      { date: '2024-01-02', revenue: 20 },
    ];

    const prepared = ChartDataPipeline.prepare(rows, {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'revenue',
      sampling: { strategy: 'none' },
    });

    expect(prepared.points.map((point) => point.date)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
    expect(prepared.meta.xAxisType).toBe('time');
  });
});
