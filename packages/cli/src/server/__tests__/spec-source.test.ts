import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import {
  inferProxyBaseFromSpec,
  isRemoteSpec,
  resolveSpecSource,
} from '../spec-source.js';

describe('spec-source', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = join(tmpdir(), `uigen-spec-source-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isRemoteSpec', () => {
    it('detects http and https URLs', () => {
      expect(isRemoteSpec('http://localhost:8080/openapi.yaml')).toBe(true);
      expect(isRemoteSpec('https://api.example.com/openapi.yaml')).toBe(true);
    });

    it('treats local paths as file specs', () => {
      expect(isRemoteSpec('openapi.yaml')).toBe(false);
      expect(isRemoteSpec('./specs/openapi.yaml')).toBe(false);
      expect(isRemoteSpec('/absolute/path/openapi.yaml')).toBe(false);
    });
  });

  describe('inferProxyBaseFromSpec', () => {
    it('returns origin for remote specs', () => {
      expect(inferProxyBaseFromSpec('http://localhost:8080/openapi.yaml')).toBe('http://localhost:8080');
    });

    it('returns undefined for local specs', () => {
      expect(inferProxyBaseFromSpec('openapi.yaml')).toBeUndefined();
    });
  });

  describe('resolveSpecSource file specs', () => {
    it('loads content from a local file and resolves specDir', async () => {
      const specPath = join(tempDir, 'openapi.yaml');
      writeFileSync(specPath, 'openapi: 3.0.0\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}\n', 'utf-8');

      const source = resolveSpecSource('openapi.yaml');
      expect(source.kind).toBe('file');
      expect(source.specDir).toBe(process.cwd());

      const content = await source.loadContent();
      expect(content).toContain('title: Test');
    });

    it('throws when local spec file is missing', () => {
      expect(() => resolveSpecSource('missing.yaml')).toThrow('OpenAPI spec file not found: missing.yaml');
    });
  });

  describe('resolveSpecSource url specs', () => {
    it('loads content from a remote URL and uses cwd as specDir', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'openapi: 3.0.0\ninfo:\n  title: Remote\n  version: 1.0.0\npaths: {}\n',
      });
      vi.stubGlobal('fetch', fetchMock);

      const source = resolveSpecSource('http://localhost:8080/openapi.yaml');
      expect(source.kind).toBe('url');
      expect(source.specDir).toBe(process.cwd());
      expect(source.display).toBe('http://localhost:8080/openapi.yaml');

      const content = await source.loadContent();
      expect(content).toContain('title: Remote');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/openapi.yaml',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: expect.stringContaining('application/yaml'),
          }),
        })
      );
    });

    it('throws for non-OK HTTP responses', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'missing',
      }));

      const source = resolveSpecSource('http://localhost:8080/openapi.yaml');
      await expect(source.loadContent()).rejects.toThrow('HTTP 404 Not Found');
    });

    it('throws for network failures', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

      const source = resolveSpecSource('http://localhost:8080/openapi.yaml');
      await expect(source.loadContent()).rejects.toThrow('connection refused');
    });
  });
});
