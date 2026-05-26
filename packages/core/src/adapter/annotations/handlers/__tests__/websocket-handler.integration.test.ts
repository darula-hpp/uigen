import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../../../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('WebSocketHandler integration', () => {
  it('populates operation.websocketConfig from x-uigen-websocket on GET operation', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/api/v1/board': {
          get: {
            operationId: 'get_board',
            summary: 'Board status',
            'x-uigen-websocket': {
              path: '/ws/v1/board',
              mode: 'replace',
              subscribe: { action: 'subscribe', channel: 'board' }
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object' }
                  }
                }
              }
            }
          } as OpenAPIV3.OperationObject
        }
      }
    };

    const app = new OpenAPI3Adapter(spec).adapt();
    const resource = app.resources.find((r) => r.slug === 'board');
    expect(resource).toBeDefined();

    const op = resource!.operations.find((o) => o.id === 'get_board');
    expect(op?.websocketConfig).toEqual({
      path: '/ws/v1/board',
      mode: 'replace',
      subscribe: { action: 'subscribe', channel: 'board' }
    });
  });
});
