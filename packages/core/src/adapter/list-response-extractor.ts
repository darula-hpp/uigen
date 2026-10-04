import type { SchemaNode } from '../ir/types.js';

const LIST_WRAPPER_KEYS = ['items', 'data', 'results', 'records'] as const;

const NESTED_LIST_KEYS = ['items', 'data', 'results', 'records', 'content'] as const;

const PAGINATION_KEYS = new Set([
  'total',
  'count',
  'page',
  'offset',
  'limit',
  'next',
  'prev',
  'previous',
  'cursor',
  'nextCursor',
  'next_cursor',
  'previousCursor',
  'previous_cursor',
  'hasMore',
  'has_more',
  'per_page',
  'perPage',
  'pageSize',
  'page_size',
  'pageNumber',
  'page_number',
  'totalPages',
  'total_pages',
  'totalCount',
  'total_count',
  'totalElements',
  'total_elements',
  'lastPage',
  'last_page',
  'firstPage',
  'first_page',
  'numberOfElements',
  'number_of_elements',
]);

export interface ExtractListItemsOptions {
  listResponseSchema?: SchemaNode;
}

/**
 * Normalizes list/search API responses into an array of records.
 * Supports direct arrays, common wrapper envelopes, and singleton object responses.
 */
export class ListResponseExtractor {
  static extract(data: unknown, options: ExtractListItemsOptions = {}): unknown[] {
    if (data == null) {
      return [];
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (!ListResponseExtractor.isPlainObject(data)) {
      return [];
    }

    const wrappedItems = ListResponseExtractor.extractWrappedItems(data);
    if (wrappedItems) {
      return wrappedItems;
    }

    if (options.listResponseSchema?.type === 'object') {
      return [data];
    }

    return [];
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static hasPaginationMetadata(value: Record<string, unknown>): boolean {
    return Object.keys(value).some((key) => PAGINATION_KEYS.has(key));
  }

  /**
   * Unwraps a page object nested under a list wrapper, such as
   * `{ data: { content: [...], pageNumber, totalElements } }`.
   * A wrapped entity is left alone unless the object also carries pagination metadata.
   */
  private static extractNestedPageItems(value: Record<string, unknown>): unknown[] | null {
    if (!ListResponseExtractor.hasPaginationMetadata(value)) {
      return null;
    }

    for (const key of NESTED_LIST_KEYS) {
      const candidate = value[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private static isPaginationEnvelope(value: Record<string, unknown>): boolean {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return true;
    }

    return keys.every((key) => PAGINATION_KEYS.has(key));
  }

  private static extractWrappedItems(value: Record<string, unknown>): unknown[] | null {
    for (const key of LIST_WRAPPER_KEYS) {
      const wrapped = value[key];
      if (Array.isArray(wrapped)) {
        return wrapped;
      }

      if (ListResponseExtractor.isPlainObject(wrapped)) {
        const pageItems = ListResponseExtractor.extractNestedPageItems(wrapped);
        if (pageItems) {
          return pageItems;
        }

        if (!ListResponseExtractor.isPaginationEnvelope(wrapped)) {
          return [wrapped];
        }
      }
    }

    const firstArray = Object.values(value).find(Array.isArray);
    if (Array.isArray(firstArray)) {
      return firstArray;
    }

    return null;
  }
}
