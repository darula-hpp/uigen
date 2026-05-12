/// <reference types="vite/client" />

import type { UIGenApp } from '@uigen-dev/core';

declare global {
  interface Window {
    __UIGEN_CONFIG__: UIGenApp;
    __UIGEN_CSS__?: string;
    __UIGEN_OVERRIDES__?: {
      code: string;
      mode: 'development' | 'production';
    };
    React: typeof import('react');
    getAuthHeaders: () => Record<string, string>;
  }
}
