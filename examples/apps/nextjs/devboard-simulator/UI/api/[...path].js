/**
 * Proxies UIGen API calls to the board app.
 *
 * UIGen fetch uses `/api${operation.path}` (e.g. /api/api/v1/config).
 * Strip one /api prefix, same as `uigen serve --proxy-base`.
 */
export default async function handler(req, res) {
  const boardUrl = process.env.BOARD_URL?.replace(/\/$/, '');
  if (!boardUrl) {
    res.status(500).json({ error: 'BOARD_URL is not configured' });
    return;
  }

  const requestUrl = req.url ?? '/';
  const queryIndex = requestUrl.indexOf('?');
  const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : requestUrl.slice(queryIndex);

  const upstreamPath = pathname.replace(/^\/api/, '') || '/';
  const target = `${boardUrl}${upstreamPath}${search}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'host' || value === undefined) {
      continue;
    }
    headers[key] = value;
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : req.body,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') {
        return;
      }
      res.setHeader(key, value);
    });

    const body = Buffer.from(await upstream.arrayBuffer());
    res.send(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy failed';
    res.status(502).json({ error: 'Proxy failed', message });
  }
}
