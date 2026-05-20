import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChartConfig, ChartFilterConfig, ChartPreparedViewModel, Operation, SchemaNode } from '@uigen-dev/core';
import {
  ChartDataPipeline,
  ChartFilterStateResolver,
  ChartQueryResolver,
} from '@uigen-dev/core';

const EMPTY_PREPARED: ChartPreparedViewModel = {
  points: [],
  meta: {
    totalPoints: 0,
    renderedPoints: 0,
    sampled: false,
    xAxisType: 'category',
    sortApplied: false,
    samplingStrategy: 'none',
  },
};

export interface UseChartFiltersOptions {
  chartConfig?: ChartConfig;
  listOp?: Operation;
}

export function useChartFilters({ chartConfig, listOp }: UseChartFiltersOptions) {
  const [filterState, setFilterState] = useState<Record<string, string>>(() =>
    ChartFilterStateResolver.buildInitialState(chartConfig?.filters),
  );

  useEffect(() => {
    setFilterState(ChartFilterStateResolver.buildInitialState(chartConfig?.filters));
  }, [chartConfig?.filters]);

  const queryParams = useMemo(() => {
    if (!chartConfig) {
      return {};
    }

    return ChartQueryResolver.resolveQueryParams(chartConfig, listOp, filterState);
  }, [chartConfig, listOp, filterState]);

  const setFilterValue = useCallback((filter: ChartFilterConfig, value: string) => {
    setFilterState((current) => ChartFilterStateResolver.setValue(current, filter, value));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState(ChartFilterStateResolver.buildInitialState(chartConfig?.filters));
  }, [chartConfig?.filters]);

  return {
    filterState,
    setFilterValue,
    resetFilters,
    queryParams,
    hasFilters: (chartConfig?.filters?.length ?? 0) > 0,
  };
}

export interface UseChartViewModelOptions extends UseChartFiltersOptions {
  itemSchema?: SchemaNode;
  data: unknown[];
}

export function useChartViewModel({
  chartConfig,
  listOp,
  itemSchema,
  data,
}: UseChartViewModelOptions) {
  const filters = useChartFilters({ chartConfig, listOp });

  const prepared = useMemo(() => {
    if (!chartConfig) {
      return EMPTY_PREPARED;
    }

    return ChartDataPipeline.prepare(data, chartConfig, { itemSchema });
  }, [chartConfig, itemSchema, data]);

  return {
    ...filters,
    prepared,
  };
}
