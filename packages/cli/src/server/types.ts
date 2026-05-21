/**
 * Server types and interfaces
 */

import type { UIGenApp } from '@uigen-dev/core';

export interface ServeOptions {
  port?: number;
  proxyBase?: string;
  verbose?: boolean;
  renderer?: string;
  target?: string;
}

export interface ServerContext {
  specDir: string;
  ir: UIGenApp;
  proxyTarget: string;
  cssContent: string;
  overrideScript: string;
  verbose: boolean;
}

export interface ServerStrategy {
  start(context: ServerContext, options: ServeOptions): Promise<number>;
}

export const SUPPORTED_RENDERERS = ['react', 'vue', 'svelte'] as const;
export type Renderer = typeof SUPPORTED_RENDERERS[number];

export const SUPPORTED_TARGETS = ['web', 'electron'] as const;
export type Target = typeof SUPPORTED_TARGETS[number];

export const MIME: Record<string, string> = {
  '.html':  'text/html',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
};
