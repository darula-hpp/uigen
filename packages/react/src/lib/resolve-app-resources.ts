import type { Resource, UIGenApp } from '@uigen-dev/core';

/**
 * Resolves app resources from React context or the CLI-injected global config.
 */
export function resolveAppResources(config?: UIGenApp, currentResource?: Resource): Resource[] {
  if (config?.resources?.length) {
    return config.resources;
  }

  if (typeof window !== 'undefined' && window.__UIGEN_CONFIG__?.resources?.length) {
    return window.__UIGEN_CONFIG__.resources;
  }

  return currentResource ? [currentResource] : [];
}
