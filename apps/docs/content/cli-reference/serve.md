---
title: uigen serve
description: Serve a generated UI from an OpenAPI or Swagger spec file.
---

# uigen serve

The `serve` command reads an API spec and starts a local server with a fully generated UI.

## Usage

```bash
uigen serve <spec> [options]
npx @uigen-dev/cli serve <spec> [options]
```

`<spec>` can be a local file path or a remote URL.

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--port` | `number` | `4400` | Port to listen on |
| `--proxy-base` | `string` | From spec `servers[0].url` | Override the API proxy target URL |
| `--renderer` | `string` | `react` | Renderer to use (`react`; `vue` and `svelte` are planned) |
| `--target` | `string` | `web` | Serve target (`web`, `electron`) |
| `--verbose` | `boolean` | `false` | Log detailed proxy request/response information |

## Examples

### Local file

```bash
uigen serve ./openapi.yaml
```

### Remote URL

```bash
uigen serve https://petstore3.swagger.io/api/v3/openapi.json
```

### Custom port

```bash
uigen serve ./openapi.yaml --port 8080
```

### Custom proxy base

Override the API target when it differs from the spec's `servers` field:

```bash
uigen serve ./openapi.yaml --proxy-base http://localhost:3001
```

### Verbose proxy logging

```bash
uigen serve ./openapi.yaml --verbose
```

### Electron desktop target

Open the generated UI in an Electron window instead of the browser:

```bash
uigen serve ./openapi.yaml --target electron
uigen serve ./openapi.yaml --target electron --proxy-base http://localhost:8000
```

See [Electron Target](/docs/cli-reference/electron-target) for installation, monorepo setup, and Phase 1 limitations.

### Verbose proxy logging

```bash
uigen serve ./openapi.yaml --verbose
```

With `--verbose`, the CLI logs each proxied request and response:

```
→ GET /api/users
← GET /api/users 200 (42ms)
  [Auth] Bearer token
```

## Serving modes

The CLI operates in two modes depending on how it was installed:

### Dev mode

Used when running from the monorepo (no pre-built renderer in `node_modules`). Starts a Vite dev server with hot module replacement.

### Static mode

Used when installed via npm or npx. Serves the pre-built `dist/` directory with a plain Node.js HTTP server. Vite is not required at runtime.

Both modes expose the same URL and behaviour.

## Serve targets

| Target | Description |
|---|---|
| `web` (default) | Open the UI in your browser at `http://localhost:<port>` |
| `electron` | Open the UI in a desktop window via `@uigen-dev/target-electron` |

See [Electron Target](/docs/cli-reference/electron-target) for setup and requirements.

## Renderer support

Currently only `react` is available. `vue` and `svelte` renderers are planned for a future release. Passing an unknown renderer value falls back to `react` with a warning.

## API and WebSocket proxy

REST and WebSocket traffic both go through the panel origin under `/api`:

- REST: `http://localhost:<port>/api/v1/...`
- WebSocket: `ws://localhost:<port>/api/ws/v1/...`

The proxy strips one `/api` prefix and forwards to `--proxy-base` (or the URL from the environment switcher).

### Environment switcher

When the UI selects a different server, REST sends `x-uigen-server` on `/api` requests. WebSockets pass the same value as a query parameter; the proxy routes both to that host and strips UIGen-specific parameters before the request reaches your API.

### Authentication

Bearer and API key credentials are sent as `x-uigen-*` headers on REST. WebSockets use the same names as query parameters; the proxy injects them as headers on the upstream connection.

## Notes

- The spec file is read once at startup. Changes to the spec require restarting the server.
- The proxy forwards HTTP and WebSocket upgrades on `/api/*` to the resolved target server.
- UIGen-specific headers and query params are removed before your API sees the request.
