import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as electronLauncher from '../electron-launcher.js';

const spawnMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

vi.mock('module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('module')>();
  return {
    ...actual,
    createRequire: () => () => '/mock/electron/binary',
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempRoot = resolve(__dirname, '../../../.tmp-electron-launcher-test');

function createTargetPackage(name: string): string {
  const targetRoot = resolve(tempRoot, name);
  mkdirSync(resolve(targetRoot, 'dist'), { recursive: true });
  writeFileSync(resolve(targetRoot, 'package.json'), JSON.stringify({ name: '@uigen-dev/target-electron' }));
  writeFileSync(resolve(targetRoot, 'dist/main.js'), 'module.exports = {};');
  return targetRoot;
}

describe('electron-launcher', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('resolveTarget returns web by default', () => {
    expect(electronLauncher.resolveTarget(undefined)).toBe('web');
  });

  it('resolveTarget accepts electron', () => {
    expect(electronLauncher.resolveTarget('electron')).toBe('electron');
  });

  it('resolveTarget falls back to web for unknown values', () => {
    expect(electronLauncher.resolveTarget('tauri')).toBe('web');
  });

  it('buildElectronSpawnArgs includes app url and main entry', () => {
    const targetRoot = createTargetPackage('target-electron');
    const { binary, args } = electronLauncher.buildElectronSpawnArgs(4400, targetRoot);

    expect(binary).toBe('/mock/electron/binary');
    expect(args).toEqual([
      resolve(targetRoot, 'dist/main.js'),
      '--app-url=http://127.0.0.1:4400',
    ]);
  });

  it('assertElectronTargetAvailable throws when package is missing', () => {
    expect(() => electronLauncher.assertElectronTargetAvailable(null)).toThrow(
      'Electron target not found. Install it with: pnpm add -D @uigen-dev/target-electron'
    );
  });

  it('assertElectronTargetAvailable throws when main entry is missing', () => {
    const targetRoot = resolve(tempRoot, 'missing-main');
    mkdirSync(targetRoot, { recursive: true });
    writeFileSync(resolve(targetRoot, 'package.json'), JSON.stringify({ name: '@uigen-dev/target-electron' }));

    expect(() => electronLauncher.assertElectronTargetAvailable(targetRoot)).toThrow(
      'Electron target main entry not found'
    );
  });

  it('launchElectron spawns electron with expected args', async () => {
    const targetRoot = createTargetPackage('launch-target');

    let closeHandler: ((code: number) => void) | undefined;
    spawnMock.mockImplementation(() => ({
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'close') {
          closeHandler = handler as (code: number) => void;
        }
      },
    }));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as typeof process.exit);

    const launchPromise = electronLauncher.launchElectron(4400, { targetRoot });
    closeHandler?.(0);
    await launchPromise;

    expect(spawnMock).toHaveBeenCalledWith(
      '/mock/electron/binary',
      [resolve(targetRoot, 'dist/main.js'), '--app-url=http://127.0.0.1:4400'],
      expect.objectContaining({ stdio: 'inherit' })
    );
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('resolveElectronTargetRoot finds monorepo target package when present', () => {
    const targetRoot = electronLauncher.resolveElectronTargetRoot();

    expect(targetRoot).not.toBeNull();
    expect(existsSync(resolve(targetRoot!, 'package.json'))).toBe(true);
    expect(existsSync(resolve(targetRoot!, 'src/main.ts'))).toBe(true);
  });
});
