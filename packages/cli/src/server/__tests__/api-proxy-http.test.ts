import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
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

describe('ApiProxy HTTP forwarding', () => {
  let backendServer: Server;
  let panelServer: Server;
  let apiProxy: ApiProxy;
  let backendPort = 0;
  let panelPort = 0;
  let backendPath = '';

  afterEach(async () => {
    await new Promise<void>((resolve) => panelServer?.close(() => resolve()));
    await new Promise<void>((resolve) => backendServer?.close(() => resolve()));
  });

  it('strips one /api prefix when OpenAPI paths already include /api', async () => {
    backendServer = createServer((req, res) => {
      backendPath = req.url ?? '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
    backendPort = await listen(backendServer);

    apiProxy = new ApiProxy(`http://127.0.0.1:${backendPort}`, new ProxyManager(), false);

    panelServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      apiProxy.handleHttp(req, res);
    });
    panelPort = await listen(panelServer);

    const response = await fetch(
      `http://127.0.0.1:${panelPort}/api/api/v1/sensors/2/readings`,
      { method: 'POST' }
    );

    expect(response.status).toBe(200);
    expect(backendPath).toBe('/api/v1/sensors/2/readings');
  });
});
