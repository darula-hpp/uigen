import type { ChartConfig, ChartSamplingStrategyName } from '../ir/types.js';

const DEFAULT_MAX_POINTS = 120;
const MIN_MAX_POINTS = 50;
const MAX_MAX_POINTS = 300;

export interface ChartSamplerOptions {
  viewportWidth?: number;
}

/**
 * Downsamples chart rows to a render-friendly point budget.
 */
export class ChartSampler {
  static resolveMaxPoints(chartConfig: ChartConfig, options: ChartSamplerOptions = {}): number {
    if (chartConfig.sampling?.maxPoints != null) {
      return chartConfig.sampling.maxPoints;
    }

    if (options.viewportWidth != null && options.viewportWidth > 0) {
      return Math.min(MAX_MAX_POINTS, Math.max(MIN_MAX_POINTS, Math.floor(options.viewportWidth / 4)));
    }

    return DEFAULT_MAX_POINTS;
  }

  static resolveStrategy(
    chartConfig: ChartConfig,
    xAxisType: 'time' | 'category' | 'number',
  ): ChartSamplingStrategyName {
    const configured = chartConfig.sampling?.strategy ?? 'auto';

    if (configured !== 'auto') {
      return configured;
    }

    switch (xAxisType) {
      case 'time':
        return chartConfig.chartType === 'bar' ? 'bucket-mean' : 'lttb';
      case 'number':
        return chartConfig.chartType === 'bar' ? 'bucket-mean' : 'lttb';
      default:
        return chartConfig.chartType === 'pie' || chartConfig.chartType === 'donut'
          ? 'none'
          : 'bucket-mean';
    }
  }

  static sample(
    rows: Record<string, unknown>[],
    chartConfig: ChartConfig,
    xAxisField: string,
    yAxisFields: string[],
    strategy: ChartSamplingStrategyName,
    maxPoints: number,
  ): Record<string, unknown>[] {
    if (strategy === 'none' || rows.length <= maxPoints) {
      return rows;
    }

    switch (strategy) {
      case 'lttb':
        return ChartSampler.sampleLttb(rows, xAxisField, yAxisFields[0], maxPoints);
      case 'bucket-mean':
        return ChartSampler.sampleBucketMean(rows, xAxisField, yAxisFields, maxPoints);
      default:
        return rows.length <= maxPoints ? rows : rows.slice(0, maxPoints);
    }
  }

  private static sampleLttb(
    rows: Record<string, unknown>[],
    xField: string,
    yField: string,
    threshold: number,
  ): Record<string, unknown>[] {
    if (rows.length <= threshold || threshold < 3) {
      return rows;
    }

    const points = rows.map((row, index) => ({
      row,
      x: ChartSampler.toNumericX(row[xField], index),
      y: ChartSampler.toNumericY(row[yField]),
    }));

    const sampled: Record<string, unknown>[] = [points[0].row];
    const bucketSize = (points.length - 2) / (threshold - 2);

    let a = 0;
    for (let i = 0; i < threshold - 2; i++) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length - 1);

      const rangeLeft = Math.floor(i * bucketSize) + 1;
      const rangeRight = Math.floor((i + 1) * bucketSize) + 1;

      let avgX = 0;
      let avgY = 0;
      let avgRangeLength = 0;
      for (let j = rangeLeft; j < rangeRight; j++) {
        avgX += points[j].x;
        avgY += points[j].y;
        avgRangeLength += 1;
      }
      avgX /= Math.max(avgRangeLength, 1);
      avgY /= Math.max(avgRangeLength, 1);

      let maxArea = -1;
      let nextA = rangeStart;
      for (let j = rangeStart; j < rangeEnd; j++) {
        const area = Math.abs(
          (points[a].x - avgX) * (points[j].y - points[a].y)
          - (points[a].x - points[j].x) * (avgY - points[a].y),
        ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          nextA = j;
        }
      }

      sampled.push(points[nextA].row);
      a = nextA;
    }

    sampled.push(points[points.length - 1].row);
    return sampled;
  }

  private static sampleBucketMean(
    rows: Record<string, unknown>[],
    xField: string,
    yFields: string[],
    bucketCount: number,
  ): Record<string, unknown>[] {
    if (rows.length <= bucketCount) {
      return rows;
    }

    const bucketSize = rows.length / bucketCount;
    const sampled: Record<string, unknown>[] = [];

    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      const start = Math.floor(bucketIndex * bucketSize);
      const end = Math.floor((bucketIndex + 1) * bucketSize);
      const bucketRows = rows.slice(start, Math.max(start + 1, end));
      const representative = { ...bucketRows[0] };

      for (const yField of yFields) {
        const values = bucketRows
          .map((row) => ChartSampler.toNumericY(row[yField]))
          .filter((value) => Number.isFinite(value));

        if (values.length > 0) {
          representative[yField] = values.reduce((sum, value) => sum + value, 0) / values.length;
        }
      }

      if (bucketIndex === 0 || bucketIndex === bucketCount - 1) {
        representative[xField] = bucketRows[0][xField];
      } else {
        representative[xField] = bucketRows[Math.floor(bucketRows.length / 2)][xField];
      }

      sampled.push(representative);
    }

    return sampled;
  }

  private static toNumericX(value: unknown, fallbackIndex: number): number {
    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsedDate = Date.parse(value);
      if (!Number.isNaN(parsedDate)) {
        return parsedDate;
      }

      const parsedNumber = Number(value);
      if (Number.isFinite(parsedNumber)) {
        return parsedNumber;
      }
    }

    return fallbackIndex;
  }

  private static toNumericY(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    return Number.NaN;
  }
}
