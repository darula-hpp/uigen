import { describe, it, expect } from 'vitest';
import type { Operation, Resource } from '@uigen-dev/core';
import { NestedChildOperationResolver } from '@uigen-dev/core';

describe('NestedChildOperationResolver (react consumer)', () => {
  const flatListOp: Operation = {
    id: 'list_events',
    method: 'GET',
    path: '/api/v1/events',
    parameters: [
      {
        name: 'item_id',
        in: 'query',
        required: false,
        schema: { type: 'string', key: 'item_id', label: 'Item Id', required: false }
      }
    ],
    responses: {},
    viewHint: 'list'
  };

  const eventsResource: Resource = {
    name: 'Events',
    slug: 'events',
    schema: { key: 'Event', type: 'object', children: [] },
    operations: [
      flatListOp,
      {
        id: 'list_item_events',
        method: 'GET',
        path: '/api/v1/items/{item_id}/events',
        parameters: [],
        responses: {},
        viewHint: 'list'
      }
    ],
    relationships: []
  };

  it('infers parent query param from nested list path', () => {
    expect(
      NestedChildOperationResolver.inferParentQueryParamName(flatListOp, eventsResource, [
        eventsResource
      ])
    ).toBe('item_id');
  });
});
