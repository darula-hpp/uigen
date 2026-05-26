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
  writeVercelConfig();
}

function writeVercelConfig() {
  const boardUrl = process.env.BOARD_URL?.replace(/\/$/, '');
  const rewrites = [];

  if (boardUrl) {
    // UIGen fetch uses `/api${operation.path}` (e.g. /api/api/v1/config).
    // Capture everything after the first /api/ and forward to the board app.
    rewrites.push({
      source: '/api/(.*)',
      destination: `${boardUrl}/$1`,
    });
    console.log(`[build-vercel] API proxy rewrite -> ${boardUrl}/$1`);
  } else {
    console.warn(
      '[build-vercel] BOARD_URL is not set. Deployed panel will not proxy /api/* requests. ' +
        'Add BOARD_URL in Vercel project settings, then redeploy.'
    );
  }

  rewrites.push({
    source: '/((?!api/).*)',
    destination: '/index.html',
  });

  writeFileSync(
    join(uiRoot, 'vercel.json'),
    `${JSON.stringify(
      {
        buildCommand: 'npm run build',
        outputDirectory: 'out',
        rewrites,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
