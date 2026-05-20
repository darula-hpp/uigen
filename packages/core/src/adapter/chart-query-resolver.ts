import type { ChartConfig, Operation } from '../ir/types.js';
import { ChartDateTimeRangeResolver } from './chart-datetime-range-resolver.js';

const DEFAULT_LIMIT_PARAM = 'limit';

/**
 * Resolves chart-specific API query parameters from chart config and list operation metadata.
 */
export class ChartQueryResolver {
  static resolveQueryParams(
    chartConfig: ChartConfig,
    listOp?: Operation,
    filterState: Record<string, string | number | boolean> = {},
  ): Record<string, string> {
    const params: Record<string, string> = {};

    if (chartConfig.query?.limit != null) {
      const limitParam = ChartQueryResolver.resolveLimitParam(listOp);
      params[limitParam] = String(chartConfig.query.limit);
    }

    const paramMap = chartConfig.query?.params ?? {};
    for (const [stateKey, paramName] of Object.entries(paramMap)) {
      const value = filterState[stateKey];
      if (value != null && value !== '') {
        params[paramName] = String(value);
      }
    }

    for (const filter of chartConfig.filters ?? []) {
      const value = filterState[filter.field] ?? filterState[filter.param];
      if (value == null || value === '') {
        continue;
      }

      if (filter.type === 'datetime-range') {
        Object.assign(
          params,
          ChartDateTimeRangeResolver.resolveParams(filter, String(value), listOp),
        );
        continue;
      }

      params[filter.param] = String(value);
    }

    return params;
  }

  private static resolveLimitParam(listOp?: Operation): string {
    const queryParameters = listOp?.parameters.filter((parameter) => parameter.in === 'query') ?? [];
    const preferredNames = ['limit', 'pageSize', 'page_size'];

    for (const name of preferredNames) {
      const match = queryParameters.find((parameter) => parameter.name === name);
      if (match) {
        return match.name;
      }
    }

    return DEFAULT_LIMIT_PARAM;
  }
}
