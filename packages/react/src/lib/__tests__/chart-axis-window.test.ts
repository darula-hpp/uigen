import { describe, it, expect } from 'vitest';
import {
  applyChartAxisWindow,
  applyChartAxisWindowToPrepared,
  getChartDataTimeSpanMs,
  parseChartTimestamp,
  resolveChartAxisWindowOptions,
} from '../chart-axis-window';

describe('chart-axis-window', () => {
  const points = [
    { recorded_at: '2026-01-01T00:00:00.000Z', value: 1 },
    { recorded_at: '2026-01-01T06:00:00.000Z', value: 2 },
    { recorded_at: '2026-01-01T18:00:00.000Z', value: 3 },
    { recorded_at: '2026-01-01T23:00:00.000Z', value: 4 },
  ];

  it('parses ISO timestamps', () => {
    expect(parseChartTimestamp('2026-01-01T12:00:00.000Z')).toBe(Date.parse('2026-01-01T12:00:00.000Z'));
  });

  it('returns all points when window is all', () => {
    expect(applyChartAxisWindow(points, 'recorded_at', 'all')).toHaveLength(4);
  });

  it('filters points relative to the latest timestamp', () => {
    const filtered = applyChartAxisWindow(points, 'recorded_at', '6h');

    expect(filtered).toHaveLength(2);
    expect(filtered.map((point) => point.value)).toEqual([3, 4]);
  });

  it('falls back to trailing point ratios when timestamps are identical', () => {
    const flatPoints = Array.from({ length: 10 }, (_, index) => ({
      recorded_at: '2026-01-01T12:00:00Z',
      value: index,
    }));

    const filtered = applyChartAxisWindow(flatPoints, 'recorded_at', '1m');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe(9);
  });

  it('computes data span from x-axis values', () => {
    expect(getChartDataTimeSpanMs(points, 'recorded_at')).toBe(
      Date.parse('2026-01-01T23:00:00.000Z') - Date.parse('2026-01-01T00:00:00.000Z'),
    );
  });

  it('offers only presets narrower than the loaded data span', () => {
    const fiveMinutesMs = 5 * 60 * 1000;
    const options = resolveChartAxisWindowOptions(fiveMinutesMs);

    expect(options.map((option) => option.value)).toEqual(['all', '1m']);
  });

  it('applies windowing to prepared view models for time axes', () => {
    const prepared = applyChartAxisWindowToPrepared(
      {
        points,
        meta: {
          totalPoints: 4,
          renderedPoints: 4,
          sampled: false,
          xAxisType: 'time',
          sortApplied: true,
          samplingStrategy: 'none',
        },
      },
      'recorded_at',
      '24h',
    );

    expect(prepared.points).toHaveLength(4);
    expect(prepared.meta.renderedPoints).toBe(4);
  });

  it('skips windowing for non-time axes', () => {
    const prepared = applyChartAxisWindowToPrepared(
      {
        points,
        meta: {
          totalPoints: 4,
          renderedPoints: 4,
          sampled: false,
          xAxisType: 'category',
          sortApplied: false,
          samplingStrategy: 'none',
        },
      },
      'recorded_at',
      '24h',
    );

    expect(prepared.points).toHaveLength(4);
  });
});
