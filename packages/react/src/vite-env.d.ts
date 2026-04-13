/// <reference types="vite/client" />

import type { UIGenApp } from '@uigen-dev/core';

declare global {
  interface Window {
    __UIGEN_CONFIG__: UIGenApp;
  }
}
