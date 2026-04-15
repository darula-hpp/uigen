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

## Renderer support

Currently only `react` is available. `vue` and `svelte` renderers are planned for a future release. Passing an unknown renderer value falls back to `react` with a warning.

## Notes

- The spec file is read once at startup. Changes to the spec require restarting the server.
- The proxy forwards all requests to `/api/*` to the target server.
- Authentication headers are injected by the proxy transparently — your API never sees UIGen-specific headers.
