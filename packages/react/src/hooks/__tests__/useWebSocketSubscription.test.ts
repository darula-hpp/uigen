import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useWebSocketSubscription,
  resolveWebSocketServerUrl
} from '../useWebSocketSubscription';
import type { Operation } from '@uigen-dev/core';

vi.mock('@/lib/server', () => ({
  getSelectedServer: vi.fn(() => null)
}));

vi.mock('@/contexts/AppContext', () => ({
  useOptionalApp: vi.fn(() => ({
    config: { servers: [{ url: 'http://127.0.0.1:8080' }] }
  }))
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = vi.fn();
  close = vi.fn();
}

describe('useWebSocketSubscription', () => {
  const operation: Operation = {
    id: 'get_board',
    method: 'GET',
    path: '/api/v1/board',
    parameters: [],
    responses: {},
    viewHint: 'detail',
    websocketConfig: {
      path: '/ws/v1/board',
      mode: 'replace',
      subscribe: { action: 'subscribe' }
    }
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData([operation.id, {}, {}], { uptime: 1 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  it('resolves websocket server from spec when none is selected in session', () => {
    expect(
      resolveWebSocketServerUrl(null, [{ url: 'http://127.0.0.1:8080' }])
    ).toBe('http://127.0.0.1:8080');
    expect(resolveWebSocketServerUrl('http://custom', [{ url: 'http://127.0.0.1:8080' }])).toBe(
      'http://custom'
    );
    expect(resolveWebSocketServerUrl(null, [])).toBeNull();
  });

  it('connects to the OpenAPI server host when spec defines servers', async () => {
    renderHook(
      () =>
        useWebSocketSubscription({
          operation,
          queryKey: [operation.id, {}, {}],
          enabled: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    expect(MockWebSocket.instances[0].url).toBe('ws://127.0.0.1:8080/ws/v1/board');
  });

  it('sends subscribe payload on open and merges replace messages into cache', async () => {
    renderHook(
      () =>
        useWebSocketSubscription({
          operation,
          queryKey: [operation.id, {}, {}],
          enabled: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const socket = MockWebSocket.instances[0];
    socket.onopen?.();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ action: 'subscribe' }));

    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ uptime: 99 }) });
    });

    expect(queryClient.getQueryData([operation.id, {}, {}])).toEqual({ uptime: 99 });
  });

  it('includes non-pagination query params in subscribe payload', async () => {
    const readingsOperation: Operation = {
      ...operation,
      id: 'list_readings',
      path: '/api/v1/readings',
      websocketConfig: {
        path: '/ws/v1/readings',
        mode: 'replace',
        subscribe: { action: 'subscribe', channel: 'readings' }
      }
    };

    renderHook(
      () =>
        useWebSocketSubscription({
          operation: readingsOperation,
          queryKey: [readingsOperation.id, {}, { sensor_id: '2', limit: '10' }],
          queryParams: { sensor_id: '2', limit: '10' },
          enabled: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const socket = MockWebSocket.instances[0];
    socket.onopen?.();
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        action: 'subscribe',
        channel: 'readings',
        params: { sensor_id: '2' }
      })
    );
  });

  it('reconnects when subscribe filter params change but not for pagination-only changes', async () => {
    const readingsOperation: Operation = {
      ...operation,
      id: 'list_readings',
      path: '/api/v1/readings',
      websocketConfig: {
        path: '/ws/v1/readings',
        mode: 'replace',
        subscribe: { action: 'subscribe', channel: 'readings' }
      }
    };

    const { rerender } = renderHook(
      ({ queryParams }) =>
        useWebSocketSubscription({
          operation: readingsOperation,
          queryKey: [readingsOperation.id, {}, queryParams],
          queryParams,
          enabled: true
        }),
      {
        wrapper,
        initialProps: { queryParams: { sensor_id: '1', limit: '10' } }
      }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    rerender({ queryParams: { sensor_id: '1', limit: '20' } });
    expect(MockWebSocket.instances).toHaveLength(1);

    rerender({ queryParams: { sensor_id: '2', limit: '20' } });
    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(2);
    });
  });

  it('substitutes path parameters into the websocket path', async () => {
    const pinOperation: Operation = {
      ...operation,
      id: 'get_pin',
      path: '/api/v1/pins/{pin_id}',
      websocketConfig: {
        path: '/ws/v1/pins/{pin_id}',
        mode: 'replace'
      }
    };

    renderHook(
      () =>
        useWebSocketSubscription({
          operation: pinOperation,
          queryKey: [pinOperation.id, { pin_id: '2' }, {}],
          pathParams: { pin_id: '2' },
          enabled: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    expect(MockWebSocket.instances[0].url).toBe('ws://127.0.0.1:8080/ws/v1/pins/2');
  });

  it('does not connect when path parameters are unresolved', () => {
    const pinOperation: Operation = {
      ...operation,
      id: 'get_pin',
      path: '/api/v1/pins/{pin_id}',
      websocketConfig: {
        path: '/ws/v1/pins/{pin_id}',
        mode: 'replace'
      }
    };

    renderHook(
      () =>
        useWebSocketSubscription({
          operation: pinOperation,
          queryKey: [pinOperation.id, {}, {}],
          pathParams: {},
          enabled: true
        }),
      { wrapper }
    );

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not reconnect when only the react-query key changes', async () => {
    const { rerender } = renderHook(
      ({ queryParams }) =>
        useWebSocketSubscription({
          operation,
          queryKey: [operation.id, {}, queryParams],
          enabled: true
        }),
      {
        wrapper,
        initialProps: { queryParams: { limit: '10' } }
      }
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    rerender({ queryParams: { limit: '20' } });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].close).not.toHaveBeenCalled();
  });

  it('does not connect when disabled', () => {
    renderHook(
      () =>
        useWebSocketSubscription({
          operation,
          queryKey: [operation.id, {}, {}],
          enabled: false
        }),
      { wrapper }
    );

    expect(MockWebSocket.instances).toHaveLength(0);
  });
});
