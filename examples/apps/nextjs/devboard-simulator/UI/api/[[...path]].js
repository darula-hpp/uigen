export default async function handler(request) {
  const boardUrl = process.env.BOARD_URL;
  if (!boardUrl) {
    return new Response(JSON.stringify({ error: 'BOARD_URL is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/api\/?/, '');
  const target = new URL(`/api/${path}${incoming.search}`, boardUrl.replace(/\/$/, ''));

  const headers = new Headers(request.headers);
  headers.delete('host');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
