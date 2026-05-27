import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import {
  SpecProcessor,
  AssetLoader,
  DevServerStrategy,
  StaticServerStrategy,
  ExpoDevServerStrategy,
  SUPPORTED_RENDERERS,
  inferProxyBaseFromSpec,
  type ServeOptions,
  type Renderer,
  type Target,
} from '../server/index.js';
import { launchElectron, resolveTarget } from '../targets/electron-launcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve renderer package root from node_modules
 */
function resolveRendererRoot(renderer: string): string {
  const pkgName = `@uigen-dev/${renderer}`;
  const candidates = [
    resolve(__dirname, '../../node_modules', pkgName),
    resolve(__dirname, '../../..', pkgName),
    resolve(__dirname, '../../../../node_modules', pkgName),
    resolve(__dirname, '../node_modules', pkgName),
  ];
  
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  }
  
  return resolve(__dirname, '../../../' + renderer);
}

export async function serve(specPath: string, options: ServeOptions) {
  console.log(pc.cyan('🚀 UIGen starting...\n'));

  try {
    // Process spec
    const specProcessor = new SpecProcessor();
    const { ir, specDir } = await specProcessor.process({
      specPath,
      verbose: options.verbose ?? false,
    });
    
    // Determine proxy target
    const proxyTarget =
      options.proxyBase
      ?? inferProxyBaseFromSpec(specPath)
      ?? ir.servers[0]?.url
      ?? 'http://localhost:3000';
    console.log(pc.gray(`API proxy target: ${proxyTarget}\n`));
    
    // Validate renderer
    const renderer: Renderer = (SUPPORTED_RENDERERS as readonly string[]).includes(options.renderer ?? '')
      ? (options.renderer as Renderer)
      : 'react';

    if (options.renderer && renderer !== options.renderer) {
      console.log(pc.yellow(`⚠ Unknown renderer "${options.renderer}", falling back to react\n`));
    }

    const target: Target = resolveTarget(options.target);
    if (options.target && target !== options.target) {
      console.log(pc.yellow(`⚠ Unknown target "${options.target}", falling back to web\n`));
    }

    if (target === 'electron' && renderer !== 'react') {
      console.error(pc.red('✗ Electron target currently supports only the react renderer\n'));
      process.exit(1);
    }

    if (renderer === 'react-native' && target !== 'web') {
      console.log(pc.yellow('⚠ React Native renderer uses Expo directly; ignoring --target\n'));
    }
    
    const rendererRoot = resolveRendererRoot(renderer);
    const isInstalled = rendererRoot.includes('node_modules');
    
    console.log(pc.gray(`Renderer: ${renderer} (${rendererRoot})`));
    if (target !== 'web' && renderer !== 'react-native') {
      console.log(pc.gray(`Target: ${target}`));
    }
    if (options.verbose) {
      const mode = renderer === 'react-native'
        ? 'expo'
        : isInstalled
          ? 'static'
          : 'dev';
      console.log(pc.gray(`Mode: ${mode}\n`));
    }
    
    // Load assets
    const assetLoader = new AssetLoader();
    const cssContent = assetLoader.loadCSS(specDir, options.verbose ?? false);
    const overrideScript = await assetLoader.processOverrides(
      specDir,
      isInstalled ? 'production' : 'development',
      options.verbose ?? false
    );
    
    // Create server context
    const context = {
      specDir,
      ir,
      proxyTarget,
      cssContent,
      overrideScript,
      verbose: options.verbose ?? false,
    };
    
    // Start appropriate server
    const strategy = renderer === 'react-native'
      ? new ExpoDevServerStrategy()
      : isInstalled
        ? new StaticServerStrategy()
        : new DevServerStrategy();
    
    const port = await strategy.start(context, options);

    if (target === 'electron' && renderer === 'react') {
      await launchElectron(port);
    }
    
  } catch (error) {
    console.error(pc.red('✗ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
