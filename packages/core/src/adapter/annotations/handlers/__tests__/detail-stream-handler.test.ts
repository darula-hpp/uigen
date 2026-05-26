import { describe, it, expect } from 'vitest';
import { DetailStreamHandler } from '../detail-stream-handler.js';
import type { AnnotationContext } from '../../types.js';
import type { Operation } from '../../../../ir/types.js';

describe('DetailStreamHandler', () => {
  const handler = new DetailStreamHandler();

  it('applies operationId to detail operations', () => {
    const operation: Operation = {
      id: 'get_sensor',
      method: 'GET',
      path: '/api/v1/sensors/{sensor_id}',
      parameters: [],
      responses: {},
      viewHint: 'detail'
    };

    const context: AnnotationContext = {
      path: 'GET:/api/v1/sensors/{sensor_id}',
      element: { 'x-uigen-detail-stream': { operationId: 'list_sensor_readings' } },
      operation,
      utils: {
        logWarning: () => {},
        logInfo: () => {}
      }
    } as AnnotationContext;

    expect(handler.validate({ operationId: 'list_sensor_readings' })).toBe(true);
    handler.apply({ operationId: 'list_sensor_readings' }, context);
    expect(operation.detailStreamConfig).toEqual({ operationId: 'list_sensor_readings' });
  });
});
