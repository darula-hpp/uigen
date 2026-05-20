import { describe, it, expect } from 'vitest';
import { ListResponseExtractor } from '../list-response-extractor.js';

describe('ListResponseExtractor', () => {
  it('returns an empty array for nullish data', () => {
    expect(ListResponseExtractor.extract(null)).toEqual([]);
    expect(ListResponseExtractor.extract(undefined)).toEqual([]);
  });

  it('returns direct array responses unchanged', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(ListResponseExtractor.extract(items)).toBe(items);
  });

  it('unwraps common list wrapper keys', () => {
    expect(ListResponseExtractor.extract({ items: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(ListResponseExtractor.extract({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(ListResponseExtractor.extract({ results: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(ListResponseExtractor.extract({ records: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('unwraps a single entity nested in a wrapper key', () => {
    expect(
      ListResponseExtractor.extract({
        data: {
          hostname: 'esp32-simulator',
          telemetry_interval_ms: 2000,
        },
      }),
    ).toEqual([
      {
        hostname: 'esp32-simulator',
        telemetry_interval_ms: 2000,
      },
    ]);
  });

  it('finds the first array value in an object envelope', () => {
    expect(
      ListResponseExtractor.extract({
        services: [{ sid: 'abc' }],
        meta: { page: 1 },
      }),
    ).toEqual([{ sid: 'abc' }]);
  });

  it('treats object list responses as a single record when schema type is object', () => {
    const config = {
      hostname: 'esp32-simulator',
      telemetry_interval_ms: 2000,
      temperature_alert_celsius: 35,
    };

    expect(
      ListResponseExtractor.extract(config, {
        listResponseSchema: {
          type: 'object',
          key: 'BoardConfig',
          label: 'Board Config',
          required: false,
          children: [],
        },
      }),
    ).toEqual([config]);
  });

  it('returns an empty array for pagination-only envelopes without list data', () => {
    expect(ListResponseExtractor.extract({ total: 0, page: 1, limit: 10 })).toEqual([]);
    expect(ListResponseExtractor.extract({ count: 0, has_more: false })).toEqual([]);
  });

  it('does not treat unknown object responses as singletons without schema', () => {
    expect(
      ListResponseExtractor.extract({
        hostname: 'esp32-simulator',
        telemetry_interval_ms: 2000,
      }),
    ).toEqual([]);
  });
});
