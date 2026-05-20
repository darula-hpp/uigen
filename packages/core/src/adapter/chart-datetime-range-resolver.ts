import type { ChartFilterConfig, Operation } from '../ir/types.js';
import { ChartDateTimePresets } from './chart-datetime-presets.js';

const START_PARAM_NAMES = ['start_date', 'start', 'from', 'since', 'begin'];
const END_PARAM_NAMES = ['end_date', 'end', 'to', 'until'];

/**
 * Maps datetime-range filter state to OpenAPI query parameters.
 */
export class ChartDateTimeRangeResolver {
  static resolveParams(
    filter: ChartFilterConfig,
    value: string,
    listOp?: Operation,
  ): Record<string, string> {
    const range = ChartDateTimePresets.resolve(value);
    const { startParam, endParam } = ChartDateTimeRangeResolver.resolveParamNames(filter, listOp);

    return {
      [startParam]: range.start,
      [endParam]: range.end,
    };
  }

  private static resolveParamNames(
    filter: ChartFilterConfig,
    listOp?: Operation,
  ): { startParam: string; endParam: string } {
    const queryParams = listOp?.parameters.filter((parameter) => parameter.in === 'query') ?? [];
    const names = new Set(queryParams.map((parameter) => parameter.name));

    if (names.has(filter.param)) {
      return {
        startParam: filter.param,
        endParam: ChartDateTimeRangeResolver.findEndParam(filter.param, names),
      };
    }

    for (let index = 0; index < START_PARAM_NAMES.length; index += 1) {
      const startParam = START_PARAM_NAMES[index];
      const endParam = END_PARAM_NAMES[index];
      if (names.has(startParam) && names.has(endParam)) {
        return { startParam, endParam };
      }
    }

    return {
      startParam: `${filter.param}_start`,
      endParam: `${filter.param}_end`,
    };
  }

  private static findEndParam(startParam: string, names: Set<string>): string {
    const pairs: Record<string, string> = {
      start_date: 'end_date',
      start: 'end',
      from: 'to',
      since: 'until',
      begin: 'end',
    };

    const paired = pairs[startParam];
    if (paired && names.has(paired)) {
      return paired;
    }

    const suffixCandidate = `${startParam}_end`;
    if (names.has(suffixCandidate)) {
      return suffixCandidate;
    }

    for (const endParam of END_PARAM_NAMES) {
      if (names.has(endParam)) {
        return endParam;
      }
    }

    return `${startParam}_end`;
  }
}
