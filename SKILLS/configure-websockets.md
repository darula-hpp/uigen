# Skill: Configure WebSocket Live Updates

## Overview

This skill wires live WebSocket streams into UIGen list, detail, and profile views. REST stays in `openapi.yaml`; WebSocket metadata goes in `.uigen/config.yaml` and is merged onto operations by the reconciler (`GET:/path` keys).

## Critical understanding

### What this skill does

- Implements or points to a backend WebSocket path that mirrors a GET response shape
- Adds `x-uigen-websocket` under `annotations` in `.uigen/config.yaml` (not in OpenAPI)
- Ensures `uigen serve` proxies WebSocket upgrades on `/api` (`ws: true` on the API proxy)

### What stays out of OpenAPI

Do **not** put `x-uigen-websocket` in `openapi.yaml` for UIGen apps. The generic `AnnotationMerger` applies config annotations to operations at reconcile time. OpenAPI remains a portable REST contract; UIGen customization lives in config.

## Config shape

```yaml
annotations:
  GET:/api/v1/board:
    x-uigen-websocket:
      path: /ws/v1/board
      mode: replace

  GET:/api/v1/readings:
    x-uigen-websocket:
      path: /ws/v1/readings
      mode: replace
      subscribe:
        action: subscribe
        channel: readings
        params:
          sensor_id: 1
```

| Field | Required | Description |
|---|---|---|
| `path` | yes | WebSocket path on the API host (starts with `/`) |
| `mode` | no | `replace` (default) or `append` |
| `appendField` | when `mode: append` | Dot path to the growing array on the cached REST payload |
| `subscribe` | no | Opaque JSON sent once after the socket opens (backend-defined) |

## AI agent workflow

### Step 1: Pick GET operations that should be live

Good candidates:

- Board/profile snapshots (`GET:/api/v1/board`)
- Resource lists (`GET:/api/v1/pins`, `GET:/api/v1/sensors`)
- Detail views (`GET:/api/v1/pins/{pin_id}`)
- Telemetry (`GET:/api/v1/readings`, sensor-scoped readings)

Skip:

- Health, OpenAPI spec, internal demo-only routes (`x-uigen-ignore`)
- Mutations (POST/PUT/DELETE)

### Step 2: Implement backend WebSocket paths

Path naming convention used in device examples:

| REST | WebSocket |
|---|---|
| `GET /api/v1/board` | `/ws/v1/board` |
| `GET /api/v1/pins` | `/ws/v1/pins` |
| `GET /api/v1/pins/{id}` | `/ws/v1/pins/{id}` |
| `GET /api/v1/readings?sensor_id=` | `/ws/v1/readings` (+ optional `subscribe` JSON) |

Each message should be JSON with the same shape as the GET response (or an array slice for `append` mode).

### Step 3: Add config annotations only

Edit `UI/.uigen/config.yaml` (or project `.uigen/config.yaml`):

```yaml
  GET:/api/v1/board:
    x-uigen-profile: true
    x-uigen-websocket:
      path: /ws/v1/board
      mode: replace
```

Use the exact REST path template from OpenAPI (`{pin_id}`, `{sensor_id}`, etc.) as the config key. The `path` value is the WebSocket URL path on the backend.

### Step 4: Serve with API proxy

```bash
cd UI
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8080
```

REST and WebSockets both use the panel origin with the `/api` prefix (e.g. `ws://localhost:4400/api/ws/v1/...`). `uigen serve` proxies HTTP and WebSocket upgrades to `--proxy-base`, matching REST behavior. Auth tokens are passed as `x-uigen-*` query params on the WebSocket URL and injected as headers by the proxy (browsers cannot set WebSocket headers).

### Step 5: Verify

- Initial load still uses REST (`useApiCall`)
- Live updates merge into the same React Query cache (`useWebSocketSubscription`)
- List/detail/profile views refresh without polling

## Example: ESP32 simulator

Backend (C++): `register_ws_routes()` streams JSON every 500ms on `/ws/v1/*`.

Config (`examples/apps/cpp/esp32-simulator/UI/.uigen/config.yaml`):

- `GET:/api/v1/board` → `/ws/v1/board`
- `GET:/api/v1/pins` → `/ws/v1/pins`
- `GET:/api/v1/pins/{pin_id}` → `/ws/v1/pins/{pin_id}`
- `GET:/api/v1/sensors` → `/ws/v1/sensors`
- `GET:/api/v1/sensors/{sensor_id}` → `/ws/v1/sensors/{sensor_id}`
- `GET:/api/v1/readings` → `/ws/v1/readings` (with optional `subscribe`)
- `GET:/api/v1/sensors/{sensor_id}/readings` → `/ws/v1/sensors/{sensor_id}/readings`

Visual demo page at `http://localhost:8080` may use raw `WebSocket` to `/ws/v1/state` directly; that route stays `x-uigen-ignore` in config.

## Limitations (phase 1)

- Operation-level only; no standalone WebSocket paths in OpenAPI
- Path param substitution requires all `{param}` placeholders in `path` to be filled before connecting
- Browser WebSocket cannot set auth headers; UIGen passes `x-uigen-*` query params through the `/api` proxy

## Related docs

- [`x-uigen-websocket`](/docs/spec-annotations/x-uigen-websocket) annotation reference
- `packages/core/src/reconciler` applies `GET:/path` annotations via `AnnotationMerger`
