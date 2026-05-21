import { corsOptions, handleHealth } from '@/lib/api-handlers';

export const runtime = 'nodejs';

export async function GET() {
  return handleHealth();
}

export async function OPTIONS() {
  return corsOptions();
}
