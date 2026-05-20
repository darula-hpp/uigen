import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartFilters, useChartViewModel } from '../useChartViewModel';
import type { ChartConfig } from '@uigen-dev/core';

const chartConfig: ChartConfig = {
  chartType: 'line',
  xAxis: 'recorded_at',
  yAxis: 'value',
  query: { limit: 500 },
  filters: [
    {
      param: 'sensor_id',
      field: 'sensor_id',
      type: 'ref',
      resource: 'sensors',
      default: '1',
    },
  ],
};

describe('useChartFilters', () => {
  it('builds query params from initial filter defaults', () => {
    const { result } = renderHook(() => useChartFilters({ chartConfig, listOp: undefined }));

    expect(result.current.queryParams.sensor_id).toBe('1');
    expect(result.current.hasFilters).toBe(true);
  });

  it('updates query params when filter values change', () => {
    const { result } = renderHook(() => useChartFilters({ chartConfig, listOp: undefined }));

    act(() => {
      result.current.setFilterValue(
        {
          param: 'sensor_id',
          field: 'sensor_id',
          type: 'ref',
          resource: 'sensors',
        },
        '4',
      );
    });

    expect(result.current.queryParams.sensor_id).toBe('4');
  });
});

describe('useChartViewModel', () => {
  it('prepares chart data from fetched rows', () => {
    const { result } = renderHook(() => useChartViewModel({
      chartConfig,
      data: [
        { recorded_at: '2026-01-02T00:00:00Z', value: 2 },
        { recorded_at: '2026-01-01T00:00:00Z', value: 1 },
      ],
      itemSchema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
        children: [
          { type: 'string', key: 'recorded_at', label: 'Recorded At', required: true, format: 'date-time' },
          { type: 'number', key: 'value', label: 'Value', required: true },
        ],
      },
    }));

    expect(result.current.prepared.points).toHaveLength(2);
    expect(result.current.prepared.meta.sortApplied).toBe(true);
  });
});
