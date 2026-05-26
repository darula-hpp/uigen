import { describe, it, expect } from 'vitest';
import type { Operation, Resource } from '../../ir/types.js';
import { NestedChildOperationResolver } from '../nested-child-operation-resolver.js';

describe('NestedChildOperationResolver', () => {
  const detailOp: Operation = {
    id: 'get_sensor',
    method: 'GET',
    path: '/api/v1/sensors/{sensor_id}',
    parameters: [],
    responses: {},
    viewHint: 'detail'
  };

  const nestedListOp: Operation = {
    id: 'list_sensor_readings',
    method: 'GET',
    path: '/api/v1/sensors/{sensor_id}/readings',
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', key: 'limit', label: 'Limit', required: false, default: 100 }
      }
    ],
    responses: {},
    viewHint: 'list'
  };

  const sensorsResource: Resource = {
    name: 'Sensors',
    slug: 'sensors',
    schema: { key: 'Sensor', type: 'object', children: [] },
    operations: [detailOp, nestedListOp],
    relationships: []
  };

  it('uses x-uigen-detail-stream operationId when configured on detail op', () => {
    const detailWithStream: Operation = {
      ...detailOp,
      detailStreamConfig: { operationId: 'list_sensor_readings' }
    };

    expect(
      NestedChildOperationResolver.findNestedListOperation(detailWithStream, [sensorsResource])
    ).toEqual(nestedListOp);
  });

  it('finds nested list operation by path prefix', () => {
    expect(
      NestedChildOperationResolver.findNestedListOperation(detailOp, [sensorsResource])
    ).toEqual(nestedListOp);
  });

  it('finds nested collection when viewHint is detail but response is an array', () => {
    const misclassifiedNestedOp: Operation = {
      ...nestedListOp,
      viewHint: 'detail',
      responses: {
        '200': {
          schema: { type: 'array', key: 'readings', label: 'Readings', required: false, items: { type: 'object', key: 'Reading', label: 'Reading', required: false } }
        }
      }
    };

    expect(
      NestedChildOperationResolver.findNestedListOperation(detailOp, [
        { ...sensorsResource, operations: [detailOp, misclassifiedNestedOp] }
      ])
    ).toEqual(misclassifiedNestedOp);
  });

  it('hides hasMany link when relationship path is nested under detail', () => {
    expect(
      NestedChildOperationResolver.shouldHideEmbeddedHasMany(
        {
          target: 'readings',
          type: 'hasMany',
          path: '/api/v1/sensors/{sensor_id}/readings'
        },
        detailOp
      )
    ).toBe(true);
    expect(
      NestedChildOperationResolver.shouldHideEmbeddedHasMany(
        { target: 'pins', type: 'hasMany', path: '/api/v1/pins' },
        detailOp
      )
    ).toBe(false);
  });

  it('finds nested list on current resource when app resources are empty', () => {
    expect(
      NestedChildOperationResolver.findNestedListOperation(detailOp, [], sensorsResource)
    ).toEqual(nestedListOp);
  });

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

  it('infers parent query param from nested list path on the same resource', () => {
    expect(
      NestedChildOperationResolver.inferParentQueryParamName(flatListOp, eventsResource)
    ).toBe('item_id');
  });

  it('infers parent query param from nested list path on another resource', () => {
    const flatReadingsOp: Operation = {
      id: 'list_readings',
      method: 'GET',
      path: '/api/v1/readings',
      parameters: [
        {
          name: 'sensor_id',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'sensor_id', label: 'Sensor Id', required: false }
        }
      ],
      responses: {},
      viewHint: 'list'
    };

    const readingsResource: Resource = {
      name: 'Readings',
      slug: 'readings',
      schema: { key: 'Reading', type: 'object', children: [] },
      operations: [flatReadingsOp],
      relationships: []
    };

    const sensorsResource: Resource = {
      name: 'Sensors',
      slug: 'sensors',
      schema: { key: 'Sensor', type: 'object', children: [] },
      operations: [
        {
          id: 'list_sensor_readings',
          method: 'GET',
          path: '/api/v1/sensors/{sensor_id}/readings',
          parameters: [],
          responses: {},
          viewHint: 'list'
        }
      ],
      relationships: []
    };

    expect(
      NestedChildOperationResolver.inferParentQueryParamName(
        flatReadingsOp,
        readingsResource,
        [readingsResource, sensorsResource]
      )
    ).toBe('sensor_id');
  });
});
