import type { ChartConfig, SchemaNode } from '../ir/types.js';

/**
 * Picks one row to highlight on a detail-embedded child stream (e.g. latest reading).
 */
export class DetailStreamHighlight {
  static pick(
    items: unknown[],
    itemSchema?: SchemaNode,
    sortField?: string
  ): Record<string, unknown> | null {
    const records = items.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    );

    if (records.length === 0) {
      return null;
    }

    const field = sortField ?? DetailStreamHighlight.resolveSortField(itemSchema);
    if (!field) {
      return records[records.length - 1];
    }

    return records.reduce((latest, item) => {
      const latestValue = String(latest[field] ?? '');
      const itemValue = String(item[field] ?? '');
      return itemValue >= latestValue ? item : latest;
    });
  }

  static resolveSortField(
    itemSchema?: SchemaNode,
    chartConfig?: ChartConfig
  ): string | undefined {
    if (chartConfig?.xAxis) {
      return chartConfig.xAxis;
    }

    const children = itemSchema?.children ?? [];
    const dateField = children.find(
      (field) => field.format === 'date-time' || field.format === 'datetime'
    );

    return dateField?.key;
  }
}
