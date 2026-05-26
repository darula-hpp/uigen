import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { attachWebSocketServer } from './lib/ws-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? '/', true);
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error('Request handler error:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  attachWebSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`DevBoard ready at http://${hostname}:${port}`);
    console.log(`WebSocket streams at ws://${hostname}:${port}/ws/v1/...`);
  });
});
