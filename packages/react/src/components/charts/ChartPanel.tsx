import type { ChartConfig, ChartFilterConfig, Operation, SchemaNode } from '@uigen-dev/core';
import { ChartAxisTypeDetector, ChartDataPipeline } from '@uigen-dev/core';
import { ChartVisualization } from '@/components/ChartVisualization';
import { ChartFilterControls } from '@/components/charts/ChartFilterControls';
import { ChartAxisWindowControls } from '@/components/charts/ChartAxisWindowControls';
import {
  applyChartAxisWindow,
  getChartDataTimeSpanMs,
  resolveChartAxisWindowOptions,
  toChartRowRecords,
  type ChartAxisWindowKey,
} from '@/lib/chart-axis-window';
import { useEffect, useMemo, useState } from 'react';

interface ChartPanelProps {
  chartConfig: ChartConfig;
  listOp?: Operation;
  itemSchema?: SchemaNode;
  data: unknown[];
  filterState: Record<string, string>;
  onFilterChange: (filter: ChartFilterConfig, value: string) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ChartPanel({
  chartConfig,
  listOp,
  itemSchema,
  data,
  filterState,
  onFilterChange,
  onResetFilters,
  isLoading = false,
  className = '',
}: ChartPanelProps) {
  const [axisWindow, setAxisWindow] = useState<ChartAxisWindowKey>('all');
  const hasFilters = (chartConfig.filters?.length ?? 0) > 0;
  const rowRecords = useMemo(() => toChartRowRecords(data), [data]);

  const xAxisType = useMemo(
    () => ChartAxisTypeDetector.detect(
      chartConfig.xAxis,
      itemSchema,
      rowRecords.map((row) => row[chartConfig.xAxis]),
    ),
    [chartConfig.xAxis, itemSchema, rowRecords],
  );

  const dataSpanMs = useMemo(
    () => (xAxisType === 'time' ? getChartDataTimeSpanMs(rowRecords, chartConfig.xAxis) : null),
    [xAxisType, rowRecords, chartConfig.xAxis],
  );

  const axisWindowOptions = useMemo(
    () => resolveChartAxisWindowOptions(dataSpanMs),
    [dataSpanMs],
  );

  useEffect(() => {
    if (!axisWindowOptions.some((option) => option.value === axisWindow)) {
      setAxisWindow('all');
    }
  }, [axisWindow, axisWindowOptions]);

  const windowedData = useMemo(() => {
    if (axisWindow === 'all' || xAxisType !== 'time') {
      return data;
    }

    return applyChartAxisWindow(rowRecords, chartConfig.xAxis, axisWindow);
  }, [axisWindow, chartConfig.xAxis, data, rowRecords, xAxisType]);

  const prepared = useMemo(
    () => ChartDataPipeline.prepare(windowedData, chartConfig, { itemSchema }),
    [windowedData, chartConfig, itemSchema],
  );

  const showAxisWindow = xAxisType === 'time';
  const sourceCount = rowRecords.length;
  const windowedCount = toChartRowRecords(windowedData).length;

  return (
    <div className={`space-y-4 ${className}`} data-testid="chart-panel">
      {(hasFilters || showAxisWindow) && (
        <div className="flex flex-wrap items-end gap-4">
          {hasFilters && (
            <ChartFilterControls
              filters={chartConfig.filters!}
              listOp={listOp}
              filterState={filterState}
              onFilterChange={(filter, value) => onFilterChange(filter, value)}
              onReset={onResetFilters}
            />
          )}
          {showAxisWindow && (
            <ChartAxisWindowControls
              value={axisWindow}
              options={axisWindowOptions}
              onChange={setAxisWindow}
            />
          )}
        </div>
      )}

      {axisWindow !== 'all' && windowedCount < sourceCount && (
        <p className="text-sm text-muted-foreground">
          Showing {windowedCount} of {sourceCount} points in selected range
        </p>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      ) : (
        <ChartVisualization
          prepared={prepared}
          chartConfig={chartConfig}
          itemSchema={itemSchema}
          chartKey={axisWindow}
        />
      )}
    </div>
  );
}
