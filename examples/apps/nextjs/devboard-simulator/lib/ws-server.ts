import type { Server as HttpServer, IncomingMessage } from 'http';
import { Socket } from 'net';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  buildWsPayload,
  parseWsPath,
  sensorIdFromSubscribe,
  WS_STREAM_INTERVAL_MS,
  type WsRoute
} from './ws-routes';

function isWebSocketUpgrade(request: IncomingMessage): boolean {
  return request.headers.upgrade?.toLowerCase() === 'websocket';
}

function startStream(socket: WebSocket, route: WsRoute, filterSensorId = 0): void {
  const sendPayload = () => {
    if (socket.readyState !== socket.OPEN) {
      return;
    }

    const payload = buildWsPayload(
      route,
      route.kind === 'readings' ? filterSensorId : 0
    );
    socket.send(JSON.stringify(payload));
  };

  sendPayload();
  const timer = setInterval(sendPayload, WS_STREAM_INTERVAL_MS);

  socket.on('close', () => clearInterval(timer));
  socket.on('error', () => clearInterval(timer));
}

function handleConnection(socket: WebSocket, route: WsRoute): void {
  if (route.kind !== 'readings') {
    startStream(socket, route);
    return;
  }

  let started = false;
  const begin = (message: string) => {
    if (started) {
      return;
    }
    started = true;
    const filterSensorId = sensorIdFromSubscribe(message);
    startStream(socket, route, filterSensorId);
  };

  socket.once('message', (data) => begin(String(data)));
  setTimeout(() => begin(''), 100);
}

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (!isWebSocketUpgrade(request)) {
      socket.destroy();
      return;
    }

    const host = request.headers.host ?? 'localhost';
    const url = new URL(request.url ?? '/', `http://${host}`);
    const route = parseWsPath(url.pathname);

    if (!route) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket as Socket, head, (ws) => {
      handleConnection(ws, route);
    });
  });

  return wss;
}
