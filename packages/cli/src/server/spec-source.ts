import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

export type SpecSourceKind = 'file' | 'url';

export interface SpecSource {
  kind: SpecSourceKind;
  display: string;
  specDir: string;
  loadContent: () => Promise<string>;
}

export interface ResolveSpecSourceOptions {
  projectDir?: string;
  fetchTimeoutMs?: number;
}

const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export function isRemoteSpec(spec: string): boolean {
  return /^https?:\/\//i.test(spec.trim());
}

export function resolveSpecSource(
  spec: string,
  options: ResolveSpecSourceOptions = {}
): SpecSource {
  const trimmedSpec = spec.trim();

  if (isRemoteSpec(trimmedSpec)) {
    return createRemoteSpecSource(trimmedSpec, options);
  }

  return createFileSpecSource(trimmedSpec);
}

function createRemoteSpecSource(specUrl: string, options: ResolveSpecSourceOptions): SpecSource {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(specUrl);
  } catch {
    throw new Error(`Invalid OpenAPI spec URL: ${specUrl}`);
  }

  const specDir = resolve(process.cwd(), options.projectDir ?? '.');
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  return {
    kind: 'url',
    display: parsedUrl.toString(),
    specDir,
    loadContent: async () => fetchRemoteSpec(parsedUrl.toString(), fetchTimeoutMs),
  };
}

function createFileSpecSource(specPath: string): SpecSource {
  const resolvedSpecPath = resolve(process.cwd(), specPath);
  const specDir = dirname(resolvedSpecPath);

  if (!existsSync(resolvedSpecPath)) {
    throw new Error(`OpenAPI spec file not found: ${specPath}`);
  }

  return {
    kind: 'file',
    display: specPath,
    specDir,
    loadContent: async () => readFileSync(resolvedSpecPath, 'utf-8'),
  };
}

async function fetchRemoteSpec(specUrl: string, fetchTimeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(specUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/yaml, application/json, text/yaml, text/plain, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec from ${specUrl}: HTTP ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    if (!content.trim()) {
      throw new Error(`OpenAPI spec at ${specUrl} returned an empty response`);
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching OpenAPI spec from ${specUrl} after ${fetchTimeoutMs}ms`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to fetch OpenAPI spec from ${specUrl}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function inferProxyBaseFromSpec(spec: string): string | undefined {
  if (!isRemoteSpec(spec)) {
    return undefined;
  }

  try {
    return new URL(spec.trim()).origin;
  } catch {
    return undefined;
  }
}
