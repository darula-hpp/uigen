import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { AnnotationHandlerRegistry, parseSpec, Reconciler } from '@uigen-dev/core';
import { ConfigLoader } from '@uigen-dev/core/config';
import { load as parseYaml } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(__dirname, '..');
const outDir = join(uiRoot, 'out');
const require = createRequire(import.meta.url);

function loadIr() {
  const specContent = readFileSync(join(uiRoot, 'openapi.yaml'), 'utf-8');
  const rawSpec = parseYaml(specContent);

  const configPath = join(uiRoot, '.uigen/config.yaml');
  const configLoader = new ConfigLoader({ configPath, verbose: false });
  const config = configLoader.load();

  let reconciledSpec = rawSpec;
  if (config) {
    const registry = AnnotationHandlerRegistry.getInstance();
    configLoader.applyToRegistry(config, registry);
    registry.setConfigLoader(configLoader);

    const reconciler = new Reconciler({
      logLevel: 'info',
      validateOutput: true,
      strictMode: false,
    });
    reconciledSpec = reconciler.reconcile(rawSpec, config).spec;
  }

  return parseSpec(JSON.stringify(reconciledSpec));
}

function copyRendererDist(targetDir) {
  const reactPkg = dirname(require.resolve('@uigen-dev/react/package.json'));
  const distDir = join(reactPkg, 'dist');
  cpSync(distDir, targetDir, { recursive: true });
}

function injectIndexHtml(targetDir, ir, themeCss) {
  const indexPath = join(targetDir, 'index.html');
  let html = readFileSync(indexPath, 'utf-8');
  html = html.replace(
    '</head>',
    `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`
  );
  html = html.replace(
    '</head>',
    `<script>window.__UIGEN_CSS__ = ${JSON.stringify(themeCss)};</script></head>`
  );
  writeFileSync(indexPath, html);
}

async function main() {
  const ir = await loadIr();
  const themeCss = [
    readFileSync(join(uiRoot, '.uigen/base-styles.css'), 'utf-8'),
    readFileSync(join(uiRoot, '.uigen/theme.css'), 'utf-8'),
  ].join('\n');

  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true });
  }
  mkdirSync(outDir, { recursive: true });

  copyRendererDist(outDir);
  injectIndexHtml(outDir, ir, themeCss);

  mkdirSync(join(outDir, 'assets'), { recursive: true });
  cpSync(
    join(uiRoot, '.uigen/assets/logo.svg'),
    join(outDir, 'assets/uigen-hardware-logo.svg')
  );

  mkdirSync(join(outDir, '.uigen/assets'), { recursive: true });
  cpSync(join(uiRoot, '.uigen/assets/logo.svg'), join(outDir, '.uigen/assets/logo.svg'));

  console.log('Built static control panel to out/');
  writeVercelOutput();
}

function writeVercelOutput() {
  const outputRoot = join(uiRoot, '.vercel/output');
  const staticDir = join(outputRoot, 'static');
  const funcDir = join(outputRoot, 'functions/api/[...path].func');

  if (existsSync(outputRoot)) {
    rmSync(outputRoot, { recursive: true });
  }

  mkdirSync(staticDir, { recursive: true });
  cpSync(outDir, staticDir, { recursive: true });

  mkdirSync(funcDir, { recursive: true });
  cpSync(join(uiRoot, 'api/[...path].js'), join(funcDir, 'index.js'));
  writeFileSync(join(funcDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
  writeFileSync(
    join(funcDir, '.vc-config.json'),
    `${JSON.stringify(
      {
        runtime: 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
      },
      null,
      2
    )}\n`
  );

  writeFileSync(
    join(outputRoot, 'config.json'),
    `${JSON.stringify(
      {
        version: 3,
        routes: [
          { src: '/api/(.*)', dest: '/api/$1' },
          { handle: 'filesystem' },
          { src: '/(.*)', dest: '/index.html', check: true },
        ],
      },
      null,
      2
    )}\n`
  );

  console.log('[build-vercel] Wrote .vercel/output (static SPA + /api proxy function)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
