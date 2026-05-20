import { describe, it, expect } from 'vitest';
import type { Operation } from '@uigen-dev/core';
import { resolvePathParams } from '../resolve-path-params';

const baseOperation: Operation = {
  id: 'test',
  method: 'POST',
  path: '/placeholder',
  summary: 'Test',
  parameters: [],
  responses: {},
  viewHint: 'action',
};

describe('resolvePathParams', () => {
  it('maps route id to {id} when the operation path uses id', () => {
    const operation: Operation = {
      ...baseOperation,
      path: '/users/{id}/approve',
    };

    expect(resolvePathParams(operation, '123')).toEqual({ id: '123' });
  });

  it('maps route id to custom parameter names like sensor_id', () => {
    const operation: Operation = {
      ...baseOperation,
      path: '/api/v1/sensors/{sensor_id}/readings',
    };

    expect(resolvePathParams(operation, '2')).toEqual({ sensor_id: '2' });
  });

  it('uses the last path parameter for nested resource actions', () => {
    const operation: Operation = {
      ...baseOperation,
      path: '/users/{userId}/posts/{postId}/archive',
    };

    expect(resolvePathParams(operation, 'post-42')).toEqual({ postId: 'post-42' });
  });

  it('returns an empty object when id is missing', () => {
    const operation: Operation = {
      ...baseOperation,
      path: '/api/v1/sensors/{sensor_id}/readings',
    };

    expect(resolvePathParams(operation, undefined)).toEqual({});
  });
});
