import type {
  ChartConfig,
  ChartPreparedViewModel,
  SchemaNode,
} from '../ir/types.js';
import { ChartAxisTypeDetector } from './chart-axis-type-detector.js';
import { ChartSampler, type ChartSamplerOptions } from './chart-sampler.js';

export interface ChartPipelineOptions extends ChartSamplerOptions {
  itemSchema?: SchemaNode;
}

/**
 * Prepares raw list rows for chart rendering: map fields, sort, and sample.
 */
export class ChartDataPipeline {
  static prepare(
    data: unknown[],
    chartConfig: ChartConfig,
    options: ChartPipelineOptions = {},
  ): ChartPreparedViewModel {
    const mappedRows = ChartDataPipeline.mapRows(data, chartConfig);
    const yAxisFields = ChartDataPipeline.getYAxisFields(chartConfig);
    const sampleValues = mappedRows.map((row) => row[chartConfig.xAxis]);
    const xAxisType = ChartAxisTypeDetector.detect(
      chartConfig.xAxis,
      options.itemSchema,
      sampleValues,
    );

    let rows = mappedRows;
    let sortApplied = false;

    if (xAxisType === 'time') {
      rows = ChartDataPipeline.sortByXAxis(rows, chartConfig.xAxis);
      sortApplied = true;
    }

    const maxPoints = ChartSampler.resolveMaxPoints(chartConfig, options);
    const samplingStrategy = ChartSampler.resolveStrategy(chartConfig, xAxisType);
    const sampledRows = ChartSampler.sample(
      rows,
      chartConfig,
      chartConfig.xAxis,
      yAxisFields,
      samplingStrategy,
      maxPoints,
    );

    return {
      points: sampledRows,
      meta: {
        totalPoints: mappedRows.length,
        renderedPoints: sampledRows.length,
        sampled: sampledRows.length < mappedRows.length,
        xAxisType,
        sortApplied,
        samplingStrategy,
      },
    };
  }

  private static mapRows(data: unknown[], chartConfig: ChartConfig): Record<string, unknown>[] {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => {
        const transformed: Record<string, unknown> = {
          [chartConfig.xAxis]: item[chartConfig.xAxis],
        };

        for (const field of ChartDataPipeline.getYAxisFields(chartConfig)) {
          transformed[field] = item[field];
        }

        if (chartConfig.labels) {
          transformed._label = item[chartConfig.labels];
        }

        return transformed;
      });
  }

  private static sortByXAxis(rows: Record<string, unknown>[], xAxisField: string): Record<string, unknown>[] {
    return [...rows].sort((left, right) => {
      const leftValue = ChartDataPipeline.toSortableValue(left[xAxisField]);
      const rightValue = ChartDataPipeline.toSortableValue(right[xAxisField]);
      return leftValue - rightValue;
    });
  }

  private static toSortableValue(value: unknown): number {
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

    return 0;
  }

  private static getYAxisFields(chartConfig: ChartConfig): string[] {
    return Array.isArray(chartConfig.yAxis) ? chartConfig.yAxis : [chartConfig.yAxis];
  }
}
