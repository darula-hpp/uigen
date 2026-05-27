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
export { stripApiPrefix, buildProxyTargetUrl, isApiProxyPath, resolveProxyBase } from './api-path.js';
export { ApiProxy } from './api-proxy.js';
export { DevServerStrategy } from './dev-server-strategy.js';
export { StaticServerStrategy } from './static-server-strategy.js';
export { ExpoDevServerStrategy } from './expo-dev-server-strategy.js';
export { writeReactNativeGeneratedFiles } from './react-native-codegen.js';
export { resolveLanHost } from './lan-host.js';
export type { ServeOptions, ServerContext, ServerStrategy, Renderer, Target } from './types.js';
export { SUPPORTED_RENDERERS, SUPPORTED_TARGETS } from './types.js';
