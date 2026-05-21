---
title: Electron Target
description: Run the generated React UI in a desktop window with --target electron.
---

# Electron Target

UIGen can serve the generated React SPA in a desktop window using the Electron target. Phase 1 wraps the existing web serve pipeline: the CLI still starts the local server, injects the IR, and proxies `/api` requests. Electron opens a `BrowserWindow` pointed at that URL.

## Usage

```bash
uigen serve ./openapi.yaml --target electron
npx @uigen-dev/cli serve ./openapi.yaml --target electron --proxy-base http://localhost:8000
```

The default target is `web` (browser). Pass `--target electron` to launch the desktop shell instead.

## Requirements

| Requirement | Notes |
|---|---|
| React renderer | `--renderer react` (default). Vue and Svelte are not supported for Electron yet. |
| `@uigen-dev/target-electron` | Optional npm package. Required when using Electron outside the monorepo. |

Install the target package:

```bash
pnpm add -D @uigen-dev/target-electron
# or
npm install -D @uigen-dev/target-electron
```

In the UIGen monorepo, the package lives at `targets/electron` and is linked via the workspace. Build it once before first use:

```bash
pnpm --filter @uigen-dev/target-electron build
```

## How it works

```
OpenAPI spec + .uigen/
        │
        ▼
   uigen serve (--target electron)
        │
        ├── SpecProcessor → IR
        ├── AssetLoader → theme CSS + overrides
        ├── Dev or Static server → React SPA on localhost
        └── Electron shell → BrowserWindow loads localhost URL
```

Electron is a **distribution target**, not a renderer. Renderers (`react`, future `vue` / `svelte`) live under `packages/`. Distribution shells (Electron first; Tauri and others later) live under `targets/`.

The Electron shell does not embed the SPA or run its own HTTP server in Phase 1. Closing the desktop window exits the CLI process.

## Serving modes

Electron uses the same dev/static server selection as the web target:

| Mode | When | Electron behaviour |
|---|---|---|
| **Dev** | Monorepo / no pre-built renderer in `node_modules` | Vite dev server with HMR; Electron window loads the dev URL |
| **Static** | Installed via npm/npx | Pre-built `dist/` served over HTTP; Electron window loads that URL |

Both modes support the same proxy, auth injection, and `/.uigen/assets` serving as [`uigen serve`](/docs/cli-reference/serve) in web mode.

## Monorepo testing

From the repository root:

```bash
pnpm test:electron
```

This mirrors `pnpm test:serve` but opens the meeting-minutes example in Electron instead of the browser.

## Limitations (Phase 1)

- No standalone `.dmg` / `.exe` packaging yet (`electron-builder` is planned for a later phase)
- React renderer only
- CLI must stay running while the desktop window is open
- OAuth popups and custom protocol handlers are not configured yet

## Related

- [`uigen serve`](/docs/cli-reference/serve): all serve flags including `--target`
- [How It Works](/docs/core-concepts/how-it-works): spec → IR → SPA pipeline
- [Extending UIGen](/docs/extending-uigen/overview): renderers vs distribution targets
