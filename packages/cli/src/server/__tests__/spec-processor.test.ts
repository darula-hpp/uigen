import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SpecProcessor } from '../spec-processor.js';

describe('SpecProcessor remote specs', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = join(tmpdir(), `uigen-spec-processor-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, '.uigen'), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses a remote OpenAPI spec and applies local config from cwd', async () => {
    writeFileSync(
      join(tempDir, '.uigen/config.yaml'),
      `version: '1.0'
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: Remote Board UI
`,
      'utf-8'
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => `openapi: 3.0.0
info:
  title: Remote API
  version: 1.0.0
paths:
  /items:
    get:
      summary: List items
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
`,
    }));

    const processor = new SpecProcessor();
    const result = await processor.process({
      specPath: 'http://localhost:8080/openapi.yaml',
      verbose: false,
    });

    expect(result.ir.meta.title).toBe('Remote API');
    expect(result.ir.appConfig?.name).toBe('Remote Board UI');
    expect(result.specDir).toBe(process.cwd());
  });
});
