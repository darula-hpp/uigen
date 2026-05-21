import { NextRequest } from 'next/server';
import { corsOptions, handleV1Route } from '@/lib/api-handlers';

export const runtime = 'nodejs';

async function parseBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined;
  }
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

async function dispatch(request: NextRequest, segments: string[]) {
  const body = request.method === 'GET' ? undefined : await parseBody(request);
  return handleV1Route(
    request.method,
    segments,
    request.nextUrl.searchParams,
    body
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params;
  return dispatch(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params;
  return dispatch(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await context.params;
  return dispatch(request, path);
}

export async function OPTIONS() {
  return corsOptions();
}
