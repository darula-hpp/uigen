import type { ChartPreparedViewModel } from '@uigen-dev/core';

export type ChartAxisWindowKey =
  | 'all'
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '6h'
  | '24h'
  | '7d';

export const CHART_AXIS_WINDOW_OPTIONS: Array<{ value: ChartAxisWindowKey; label: string }> = [
  { value: 'all', label: 'All data' },
  { value: '1m', label: 'Last 1 minute' },
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '30m', label: 'Last 30 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

const WINDOW_DURATIONS_MS: Record<Exclude<ChartAxisWindowKey, 'all'>, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const POINT_WINDOW_RATIOS: Record<Exclude<ChartAxisWindowKey, 'all'>, number> = {
  '1m': 0.1,
  '5m': 0.25,
  '15m': 0.4,
  '30m': 0.55,
  '1h': 0.7,
  '6h': 0.85,
  '24h': 0.95,
  '7d': 0.98,
};

export function parseChartTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getChartDataTimeSpanMs(
  points: Record<string, unknown>[],
  xAxisField: string,
): number | null {
  const timestamps = points
    .map((point) => parseChartTimestamp(point[xAxisField]))
    .filter((timestamp): timestamp is number => timestamp != null);

  if (timestamps.length < 2) {
    return null;
  }

  return Math.max(...timestamps) - Math.min(...timestamps);
}

export function resolveChartAxisWindowOptions(
  dataSpanMs: number | null,
): Array<{ value: ChartAxisWindowKey; label: string }> {
  const allOption = CHART_AXIS_WINDOW_OPTIONS[0];
  if (dataSpanMs == null || dataSpanMs <= 0) {
    return [
      allOption,
      ...CHART_AXIS_WINDOW_OPTIONS.filter((option) =>
        ['1m', '5m', '15m', '30m', '1h'].includes(option.value),
      ),
    ];
  }

  const narrowingOptions = CHART_AXIS_WINDOW_OPTIONS.filter(
    (option) =>
      option.value !== 'all'
      && WINDOW_DURATIONS_MS[option.value] < dataSpanMs,
  );

  if (narrowingOptions.length === 0) {
    return [
      allOption,
      ...CHART_AXIS_WINDOW_OPTIONS.filter((option) => ['1m', '5m'].includes(option.value)),
    ];
  }

  return [allOption, ...narrowingOptions];
}

export function applyChartAxisWindow(
  points: Record<string, unknown>[],
  xAxisField: string,
  window: ChartAxisWindowKey,
): Record<string, unknown>[] {
  if (window === 'all' || points.length === 0) {
    return points;
  }

  const timestamps = points
    .map((point) => parseChartTimestamp(point[xAxisField]))
    .filter((timestamp): timestamp is number => timestamp != null);

  if (timestamps.length === 0) {
    return applyPointRatioWindow(points, window as Exclude<ChartAxisWindowKey, 'all'>);
  }

  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const span = maxTimestamp - minTimestamp;

  if (span <= 0) {
    return applyPointRatioWindow(points, window as Exclude<ChartAxisWindowKey, 'all'>);
  }

  const cutoff = maxTimestamp - WINDOW_DURATIONS_MS[window];
  const filtered = points.filter((point) => {
    const timestamp = parseChartTimestamp(point[xAxisField]);
    return timestamp != null && timestamp >= cutoff;
  });

  if (filtered.length === 0) {
    return applyPointRatioWindow(points, window as Exclude<ChartAxisWindowKey, 'all'>);
  }

  return filtered;
}

function applyPointRatioWindow(
  points: Record<string, unknown>[],
  window: Exclude<ChartAxisWindowKey, 'all'>,
): Record<string, unknown>[] {
  const ratio = POINT_WINDOW_RATIOS[window];
  const count = Math.max(1, Math.ceil(points.length * ratio));
  return points.slice(-count);
}

export function applyChartAxisWindowToPrepared(
  prepared: ChartPreparedViewModel,
  xAxisField: string,
  window: ChartAxisWindowKey,
): ChartPreparedViewModel {
  if (prepared.meta.xAxisType !== 'time' || window === 'all') {
    return prepared;
  }

  const points = applyChartAxisWindow(prepared.points, xAxisField, window);

  return {
    points,
    meta: {
      ...prepared.meta,
      renderedPoints: points.length,
    },
  };
}

export function toChartRowRecords(data: unknown[]): Record<string, unknown>[] {
  return data.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );
}
