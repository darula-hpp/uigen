import { corsOptions, handleOpenApiSpec } from '@/lib/api-handlers';

export const runtime = 'nodejs';

export async function GET() {
  return handleOpenApiSpec();
}

export async function OPTIONS() {
  return corsOptions();
}
