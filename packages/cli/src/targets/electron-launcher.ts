import { spawn, type ChildProcess } from 'child_process';
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SUPPORTED_TARGETS, type Target } from '../server/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_PACKAGE = '@uigen-dev/target-electron';
const INSTALL_HINT = 'Install it with: pnpm add -D @uigen-dev/target-electron';

export function resolveTarget(value: string | undefined): Target {
  if (value && (SUPPORTED_TARGETS as readonly string[]).includes(value)) {
    return value as Target;
  }
  return 'web';
}

export function resolveElectronTargetRoot(): string | null {
  const candidates = [
    resolve(__dirname, '../../node_modules', TARGET_PACKAGE),
    resolve(__dirname, '../../../node_modules', TARGET_PACKAGE),
    resolve(__dirname, '../../../../node_modules', TARGET_PACKAGE),
    resolve(__dirname, '../../../../../node_modules', TARGET_PACKAGE),
    resolve(__dirname, '../../../../targets/electron'),
  ];

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return null;
}

export function resolveElectronMainPath(targetRoot: string): string {
  return resolve(targetRoot, 'dist/main.js');
}

export function resolveElectronBinary(targetRoot: string): string {
  const require = createRequire(resolve(targetRoot, 'package.json'));
  return require('electron') as string;
}

export function buildElectronSpawnArgs(port: number, targetRoot: string): {
  binary: string;
  args: string[];
} {
  const mainPath = resolveElectronMainPath(targetRoot);
  const appUrl = `http://127.0.0.1:${port}`;

  return {
    binary: resolveElectronBinary(targetRoot),
    args: [mainPath, `--app-url=${appUrl}`],
  };
}

export function assertElectronTargetAvailable(targetRoot: string | null): asserts targetRoot is string {
  if (!targetRoot) {
    throw new Error(`Electron target not found. ${INSTALL_HINT}`);
  }

  const mainPath = resolveElectronMainPath(targetRoot);
  if (!existsSync(mainPath)) {
    throw new Error(
      `Electron target main entry not found at ${mainPath}. Build @uigen-dev/target-electron first.`
    );
  }
}

export interface LaunchElectronOptions {
  targetRoot?: string;
}

export async function launchElectron(port: number, options?: LaunchElectronOptions): Promise<void> {
  const targetRoot = options?.targetRoot ?? resolveElectronTargetRoot();
  assertElectronTargetAvailable(targetRoot);

  const { binary, args } = buildElectronSpawnArgs(port, targetRoot);

  await new Promise<void>((resolveLaunch, reject) => {
    const child: ChildProcess = spawn(binary, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolveLaunch();
      process.exit(code ?? 0);
    });
  });
}
