import { describe, it, expect } from 'vitest';
import { ChartDateTimePresets } from '../chart-datetime-presets.js';
import { ChartDateTimeRangeResolver } from '../chart-datetime-range-resolver.js';
import { ChartFilterStateResolver } from '../chart-filter-state.js';
import { ChartQueryResolver } from '../chart-query-resolver.js';
import type { ChartConfig } from '../../ir/types.js';

describe('ChartDateTimePresets', () => {
  it('resolves known presets to ISO ranges', () => {
    const now = new Date('2026-01-15T12:00:00.000Z');
    const range = ChartDateTimePresets.resolve('last_24h', now);

    expect(range.end).toBe(now.toISOString());
    expect(range.start).toBe('2026-01-14T12:00:00.000Z');
  });

  it('returns preset labels', () => {
    expect(ChartDateTimePresets.getLabel('last_7d')).toBe('Last 7 days');
  });
});

describe('ChartDateTimeRangeResolver', () => {
  it('maps presets to start/end query params from the list operation', () => {
    const params = ChartDateTimeRangeResolver.resolveParams(
      {
        param: 'start_date',
        field: 'recorded_at',
        type: 'datetime-range',
      },
      'last_24h',
      {
        id: 'list_readings',
        method: 'GET',
        path: '/readings',
        viewHint: 'list',
        parameters: [
          {
            name: 'start_date',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'start_date', label: 'Start', required: false, format: 'date-time' },
          },
          {
            name: 'end_date',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'end_date', label: 'End', required: false, format: 'date-time' },
          },
        ],
        responses: {},
      },
    );

    expect(params.end_date).toMatch(/^2026-/);
    expect(params.start_date).toMatch(/^2026-/);
    expect(Date.parse(params.end_date)).toBeGreaterThan(Date.parse(params.start_date));
  });
});

describe('ChartFilterStateResolver', () => {
  it('builds initial state from filter defaults', () => {
    const state = ChartFilterStateResolver.buildInitialState([
      {
        param: 'sensor_id',
        field: 'sensor_id',
        type: 'ref',
        resource: 'sensors',
        default: '2',
      },
    ]);

    expect(state).toEqual({
      sensor_id: '2',
    });
  });
});

describe('ChartQueryResolver filters', () => {
  it('applies ref and datetime-range filters to query params', () => {
    const chartConfig: ChartConfig = {
      chartType: 'line',
      xAxis: 'recorded_at',
      yAxis: 'value',
      filters: [
        {
          param: 'sensor_id',
          field: 'sensor_id',
          type: 'ref',
          resource: 'sensors',
        },
        {
          param: 'start_date',
          field: 'recorded_at',
          type: 'datetime-range',
          default: 'last_24h',
        },
      ],
    };

    const params = ChartQueryResolver.resolveQueryParams(
      chartConfig,
      {
        id: 'list_readings',
        method: 'GET',
        path: '/readings',
        viewHint: 'list',
        parameters: [
          {
            name: 'sensor_id',
            in: 'query',
            required: false,
            schema: { type: 'integer', key: 'sensor_id', label: 'Sensor', required: false },
          },
          {
            name: 'start_date',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'start_date', label: 'Start', required: false, format: 'date-time' },
          },
          {
            name: 'end_date',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'end_date', label: 'End', required: false, format: 'date-time' },
          },
        ],
        responses: {},
      },
      {
        sensor_id: '3',
        recorded_at: 'last_7d',
      },
    );

    expect(params.sensor_id).toBe('3');
    expect(params.end_date).toBeTruthy();
    expect(params.start_date).toBeTruthy();
    expect(Date.parse(params.end_date)).toBeGreaterThan(Date.parse(params.start_date));
  });
});
