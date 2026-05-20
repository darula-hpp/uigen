import type { ChartFilterConfig } from '../ir/types.js';

/**
 * Builds and reads chart filter UI state from chart filter config.
 */
export class ChartFilterStateResolver {
  static buildInitialState(filters?: ChartFilterConfig[]): Record<string, string> {
    const state: Record<string, string> = {};

    for (const filter of filters ?? []) {
      if (filter.default == null || filter.default === '') {
        continue;
      }

      state[filter.field] = filter.default;
      state[filter.param] = filter.default;
    }

    return state;
  }

  static getValue(
    filterState: Record<string, string>,
    filter: ChartFilterConfig,
  ): string {
    return filterState[filter.field] ?? filterState[filter.param] ?? '';
  }

  static setValue(
    filterState: Record<string, string>,
    filter: ChartFilterConfig,
    value: string,
  ): Record<string, string> {
    return {
      ...filterState,
      [filter.field]: value,
      [filter.param]: value,
    };
  }
}
