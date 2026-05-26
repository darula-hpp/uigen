import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Operation } from '@uigen-dev/core';
import { WebSocketMessageMerger } from '@uigen-dev/core';
import { useOptionalApp } from '@/contexts/AppContext';
import { getSelectedServer } from '@/lib/server';

export interface UseWebSocketSubscriptionOptions {
  operation?: Operation;
  queryKey: unknown[];
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  enabled?: boolean;
}

export function resolveWebSocketPath(
  wsPath: string,
  pathParams: Record<string, string> = {}
): string {
  let resolved = wsPath.startsWith('/') ? wsPath : `/${wsPath}`;
  const matches = resolved.match(/\{([^}]+)\}/g);

  if (!matches) {
    return resolved;
  }

  for (const match of matches) {
    const paramName = match.slice(1, -1);
    const paramValue = pathParams[paramName];

    if (paramValue) {
      resolved = resolved.replace(match, encodeURIComponent(paramValue));
    }
  }

  return resolved;
}

export function isWebSocketPathResolved(
  wsPath: string,
  pathParams: Record<string, string> = {}
): boolean {
  const resolved = resolveWebSocketPath(wsPath, pathParams);
  return !/\{[^}]+\}/.test(resolved);
}

/**
 * REST uses the dev-server /api proxy; WebSockets use the OpenAPI server URL when known,
 * because Vite's WS proxy is unreliable for device backends.
 */
export function resolveWebSocketServerUrl(
  selectedServer: string | null,
  specServers: Array<{ url: string }> | undefined
): string | null {
  if (selectedServer) {
    return selectedServer;
  }

  const firstSpecServer = specServers?.[0]?.url;
  if (firstSpecServer) {
    return firstSpecServer;
  }

  return null;
}

function buildWebSocketUrl(
  wsPath: string,
  pathParams: Record<string, string>,
  serverUrl: string | null,
  pageOrigin: string
): string {
  const resolvedPath = resolveWebSocketPath(wsPath, pathParams);
  const hasUnresolvedParams = /\{[^}]+\}/.test(resolvedPath);

  if (hasUnresolvedParams) {
    return '';
  }

  if (serverUrl) {
    const base = new URL(serverUrl);
    const scheme = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${base.host}${resolvedPath}`;
  }

  const wsOrigin = pageOrigin.replace(/^http/i, 'ws');
  return `${wsOrigin}/api${resolvedPath}`;
}

function closeSocket(socket: WebSocket): void {
  switch (socket.readyState) {
    case WebSocket.OPEN:
      socket.close();
      break;
    case WebSocket.CONNECTING:
      socket.addEventListener('open', () => socket.close(), { once: true });
      break;
    default:
      break;
  }
}

/**
 * Subscribes to a WebSocket stream declared by x-uigen-websocket on a REST operation.
 * Merges incoming messages into the React Query cache used by useApiCall.
 */
const PAGINATION_QUERY_KEYS = new Set([
  'limit',
  'offset',
  'cursor',
  'page',
  'pageSize',
  'perPage'
]);

function streamFilterParams(
  queryParams: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(queryParams).filter(([key]) => !PAGINATION_QUERY_KEYS.has(key))
  );
}

function buildSubscribePayload(
  subscribe: Record<string, unknown> | undefined,
  pathParams: Record<string, string>,
  queryParams: Record<string, string>
): Record<string, unknown> | undefined {
  if (!subscribe) {
    return undefined;
  }

  const streamParams = {
    ...streamFilterParams(queryParams),
    ...pathParams
  };

  if (Object.keys(streamParams).length === 0) {
    return subscribe;
  }

  return {
    ...subscribe,
    params: streamParams
  };
}

export function useWebSocketSubscription({
  operation,
  queryKey,
  pathParams = {},
  queryParams = {},
  enabled = true
}: UseWebSocketSubscriptionOptions): void {
  const queryClient = useQueryClient();
  const appContext = useOptionalApp();
  const queryKeyRef = useRef(queryKey);

  const websocketConfig = operation?.websocketConfig;
  const pathResolved =
    !!websocketConfig && isWebSocketPathResolved(websocketConfig.path, pathParams);
  const isEnabled = enabled && !!operation && !!websocketConfig && pathResolved;

  const selectedServer = getSelectedServer();
  const webSocketServerUrl = resolveWebSocketServerUrl(
    selectedServer,
    appContext?.config?.servers
  );

  const subscribeFilterSignature = websocketConfig?.subscribe
    ? JSON.stringify(streamFilterParams(queryParams))
    : '';

  const connectionSignature = isEnabled
    ? [
        operation?.id,
        websocketConfig?.path,
        websocketConfig?.mode,
        websocketConfig?.appendField,
        JSON.stringify(websocketConfig?.subscribe),
        JSON.stringify(pathParams),
        subscribeFilterSignature,
        webSocketServerUrl
      ].join('|')
    : '';

  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  useEffect(() => {
    if (!isEnabled || !operation || !websocketConfig || !connectionSignature) {
      return;
    }

    let active = true;
    const pageOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4400';
    const url = buildWebSocketUrl(websocketConfig.path, pathParams, webSocketServerUrl, pageOrigin);

    if (!url) {
      return;
    }

    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (!active) {
        socket.close();
        return;
      }

      const subscribePayload = buildSubscribePayload(
        websocketConfig.subscribe,
        pathParams,
        queryParams
      );
      if (subscribePayload) {
        socket.send(JSON.stringify(subscribePayload));
      }
    };

    socket.onmessage = (event) => {
      if (!active) {
        return;
      }

      try {
        const incoming = JSON.parse(event.data as string) as unknown;
        queryClient.setQueryData(queryKeyRef.current, (current: unknown) =>
          WebSocketMessageMerger.merge(current, incoming, websocketConfig)
        );
      } catch {
        // Ignore non-JSON frames
      }
    };

    return () => {
      active = false;
      closeSocket(socket);
    };
  }, [connectionSignature, isEnabled, queryClient]);
}
