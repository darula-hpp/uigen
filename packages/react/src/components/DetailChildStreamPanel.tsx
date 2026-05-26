import { useMemo } from 'react';
import type { Operation, Resource } from '@uigen-dev/core';
import {
  DetailStreamHighlight,
  ListFieldResolver,
  ListResponseExtractor,
  NestedChildOperationResolver,
  SchemaFieldFilter
} from '@uigen-dev/core';
import { useApiCall } from '@/hooks/useApiCall';
import { useWebSocketSubscription } from '@/hooks/useWebSocketSubscription';
import { useChartFilters } from '@/hooks/useChartViewModel';
import { ChartPanel } from '@/components/charts/ChartPanel';
import { ReadOnlyDataSection } from '@/components/ReadOnlyDataSection';

interface DetailChildStreamPanelProps {
  detailOperation: Operation;
  detailPathParams: Record<string, string>;
  resources: Resource[];
  currentResource?: Resource;
}

function resolveOperationFromPool(
  operation: Operation | undefined,
  resourcePool: Resource[]
): Operation | undefined {
  if (!operation) {
    return undefined;
  }

  for (const resource of resourcePool) {
    const match = resource.operations.find((candidate) => candidate.id === operation.id);
    if (match) {
      return match;
    }
  }

  return operation;
}

/**
 * Live child list stream on a detail page: REST + WebSocket, chart or highlighted row.
 */
export function DetailChildStreamPanel({
  detailOperation,
  detailPathParams,
  resources,
  currentResource
}: DetailChildStreamPanelProps) {
  const resourcePool = useMemo(() => {
    if (resources.length > 0) {
      return resources;
    }

    return currentResource ? [currentResource] : [];
  }, [resources, currentResource]);

  const nestedListOp = useMemo(() => {
    const discovered = NestedChildOperationResolver.findNestedListOperation(
      detailOperation,
      resourcePool,
      currentResource
    );
    return resolveOperationFromPool(discovered, resourcePool);
  }, [detailOperation, resourcePool, currentResource]);

  const nestedResource = useMemo(
    () => NestedChildOperationResolver.findResourceForOperation(nestedListOp, resourcePool)
      ?? currentResource,
    [nestedListOp, resourcePool, currentResource]
  );

  const queryParams = useMemo(
    () => NestedChildOperationResolver.buildQueryDefaults(nestedListOp),
    [nestedListOp]
  );

  const streamQueryKey = useMemo(
    (): unknown[] =>
      nestedListOp
        ? [nestedListOp.id, detailPathParams, queryParams]
        : ['disabled'],
    [nestedListOp, detailPathParams, queryParams]
  );

  const enabled =
    !!nestedListOp && Object.keys(detailPathParams).length > 0;

  const { data, isLoading, error } = useApiCall({
    operation: nestedListOp,
    pathParams: detailPathParams,
    queryParams,
    enabled
  });

  const wsEnabled = enabled && !!nestedListOp?.websocketConfig;

  useWebSocketSubscription({
    operation: nestedListOp,
    queryKey: streamQueryKey,
    pathParams: detailPathParams,
    queryParams,
    enabled: wsEnabled
  });

  const listResponseSchema = nestedListOp?.responses?.['200']?.schema;
  const chartConfig = useMemo(
    () => (nestedResource ? ListFieldResolver.resolveChartConfig(nestedResource, nestedListOp) : undefined),
    [nestedResource, nestedListOp]
  );
  const itemSchema = ListFieldResolver.resolveItemSchema(nestedListOp);

  const chartFilters = useChartFilters({
    chartConfig,
    listOp: nestedListOp
  });

  const items = useMemo(() => {
    if (!data) {
      return [];
    }

    return ListResponseExtractor.extract(data, { listResponseSchema });
  }, [data, listResponseSchema]);

  const highlightedItem = useMemo(() => {
    const sortField = DetailStreamHighlight.resolveSortField(itemSchema, chartConfig);
    return DetailStreamHighlight.pick(items, itemSchema, sortField);
  }, [items, itemSchema, chartConfig]);

  const highlightFields = useMemo(() => {
    return (itemSchema?.children ?? []).filter(SchemaFieldFilter.isVisible);
  }, [itemSchema]);

  if (!nestedListOp || !enabled) {
    return null;
  }

  const panelTitle = nestedListOp.summary ?? nestedResource?.label ?? nestedResource?.name;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">Error loading {panelTitle ?? 'stream'}</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {isLoading && items.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Loading {panelTitle?.toLowerCase() ?? 'stream'}…
        </div>
      )}

      {chartConfig && (items.length > 0 || wsEnabled) && (
        <ChartPanel
          chartConfig={chartConfig}
          listOp={nestedListOp}
          itemSchema={itemSchema}
          data={items}
          filterState={chartFilters.filterState}
          onFilterChange={chartFilters.setFilterValue}
          onResetFilters={chartFilters.resetFilters}
          isLoading={isLoading}
        />
      )}

      {!chartConfig && highlightedItem && highlightFields.length > 0 && panelTitle && (
        <ReadOnlyDataSection
          variant="action-result"
          title={panelTitle}
          fields={highlightFields}
          data={highlightedItem}
          ariaLabel={panelTitle}
        />
      )}
    </div>
  );
}
