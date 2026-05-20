/**
 * Server module exports
 */

export { SpecProcessor } from './spec-processor.js';
export {
  isRemoteSpec,
  resolveSpecSource,
  inferProxyBaseFromSpec,
} from './spec-source.js';
export type { SpecSource, SpecSourceKind } from './spec-source.js';
export { AssetLoader } from './asset-loader.js';
export { ProxyManager } from './proxy-manager.js';
export { DevServerStrategy } from './dev-server-strategy.js';
export { StaticServerStrategy } from './static-server-strategy.js';
export type { ServeOptions, ServerContext, ServerStrategy, Renderer } from './types.js';
export { SUPPORTED_RENDERERS } from './types.js';
