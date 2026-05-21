# @uigen-dev/target-electron

Electron desktop shell for UIGen. Phase 1 wraps the existing React SPA by opening a `BrowserWindow` pointed at the CLI dev server.

## Usage

From a UIGen project:

```bash
uigen serve ./openapi.yaml --target electron
uigen serve ./openapi.yaml --target electron --proxy-base http://localhost:8000
```

In the monorepo, build this package first:

```bash
pnpm --filter @uigen-dev/target-electron build
```

## How it works

1. The CLI runs the normal serve pipeline (spec processing, CSS/overrides injection, `/api` proxy).
2. The CLI starts the React SPA server on localhost.
3. This package's Electron main process opens a window loading that URL.

The Electron shell does not embed the SPA or server logic. It is a thin host around the existing web target.

## Requirements

- React renderer (`--renderer react`, default)
- `@uigen-dev/target-electron` installed (workspace-linked in the monorepo)
