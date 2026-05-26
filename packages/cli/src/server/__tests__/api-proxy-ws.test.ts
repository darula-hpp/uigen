import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ApiProxy } from '../api-proxy.js';
import { ProxyManager } from '../proxy-manager.js';

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind server'));
        return;
      }
      resolve(address.port);
    });
  });
}

function waitForMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for WebSocket message')), 5000);
    socket.once('message', (data) => {
      clearTimeout(timeout);
      resolve(String(data));
    });
    socket.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe('ApiProxy WebSocket upgrades', () => {
  let backendServer: Server;
  let backendWss: WebSocketServer;
  let panelServer: Server;
  let apiProxy: ApiProxy;
  let backendPort = 0;
  let panelPort = 0;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      panelServer?.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      backendWss?.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      backendServer?.close(() => resolve());
    });
  });

  it('forwards /api WebSocket upgrades to the proxy target', async () => {
    backendServer = createServer();
    backendWss = new WebSocketServer({ server: backendServer });
    backendWss.on('connection', (ws) => {
      ws.send(JSON.stringify({ ok: true }));
    });
    backendPort = await listen(backendServer);

    const proxyManager = new ProxyManager();
    apiProxy = new ApiProxy(`http://127.0.0.1:${backendPort}`, proxyManager, false);

    panelServer = createServer((req, res) => {
      if (req.url?.startsWith('/api')) {
        apiProxy.handleHttp(req, res);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    apiProxy.attachUpgradeHandler(panelServer);
    panelPort = await listen(panelServer);

    const client = new WebSocket(`ws://127.0.0.1:${panelPort}/api/ws/v1/test`);
    const payload = await waitForMessage(client);
    client.close();

    expect(JSON.parse(payload)).toEqual({ ok: true });
  });

  it('injects bearer auth from query params on upgrade', async () => {
    let receivedAuth: string | undefined;

    backendServer = createServer();
    backendWss = new WebSocketServer({
      server: backendServer,
      verifyClient: (info, done) => {
        receivedAuth = info.req.headers.authorization;
        done(true);
      }
    });
    backendWss.on('connection', (ws) => {
      ws.send('authenticated');
    });
    backendPort = await listen(backendServer);

    apiProxy = new ApiProxy(`http://127.0.0.1:${backendPort}`, new ProxyManager(), false);

    panelServer = createServer();
    apiProxy.attachUpgradeHandler(panelServer);
    panelPort = await listen(panelServer);

    const client = new WebSocket(
      `ws://127.0.0.1:${panelPort}/api/ws/v1/board?x-uigen-auth=test-token`
    );
    const payload = await waitForMessage(client);
    client.close();

    expect(payload).toBe('authenticated');
    expect(receivedAuth).toBe('Bearer test-token');
  });
});
