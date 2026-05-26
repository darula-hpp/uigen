---
title: x-uigen-websocket
description: Declare a WebSocket stream that augments a REST operation with live updates.
---

# x-uigen-websocket

The `x-uigen-websocket` annotation attaches a WebSocket stream to an existing REST operation. UIGen still loads data with the normal HTTP request (`useApiCall`), then merges WebSocket messages into the same React Query cache for live list, detail, and profile views.

## Purpose

Use `x-uigen-websocket` when:

- A GET endpoint has a matching WebSocket channel for live snapshots or streaming rows
- You want to avoid polling while keeping OpenAPI as the source of truth for REST
- The WebSocket payload shape matches (or appends into) the REST response

## Supported locations

| Location | Effect |
|---|---|
| Operation (OpenAPI) | Sets `websocketConfig` on the operation in IR |
| Config reconciliation (`.uigen/config.yaml`) | Merges onto the operation via `GET:/path` keys |

The generic reconciler applies this annotation like any other `x-uigen-*` key. No separate reconciler is required.

## Annotation shape

```yaml
x-uigen-websocket:
  path: /ws/v1/board
  mode: replace
  subscribe:
    action: subscribe
    channel: board
```

```yaml
x-uigen-websocket:
  path: /ws/v1/readings
  mode: append
  appendField: readings
```

## Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `path` | `string` | yes | WebSocket path on the API host. Must start with `/`. |
| `mode` | `string` | no | `replace` (default) or `append`. |
| `appendField` | `string` | when `mode: append` | Dot path to the array field that grows (e.g. `readings` or `data.samples`). |
| `subscribe` | `object` | no | Opaque JSON sent once after the socket opens. Schema is defined by your backend, not validated by UIGen. |

## Update modes

| Mode | Behavior |
|---|---|
| `replace` | Each message replaces the cached REST payload. Use for live status or full snapshots. |
| `append` | Each message (object or array) is appended to `appendField` on the cached payload. Use for telemetry streams. |

## Config example

```yaml
annotations:
  GET:/api/v1/board:
    x-uigen-websocket:
      path: /ws/v1/board
      mode: replace
```

## Dev server routing

When using `uigen serve`, the panel connects to `ws://localhost:<port>/api<path>` (same origin as REST). The `/api` proxy forwards WebSocket upgrades to your API target (`--proxy-base` or inferred from the spec). Bearer and API key credentials are sent as `x-uigen-*` query parameters and injected as headers by the proxy.

## Limitations (phase 1)

- Operation-level only (not standalone WebSocket paths in OpenAPI)
- Browser WebSocket cannot set custom auth headers; same-origin `/api` proxy is the supported dev path
- No `reconnect` or `protocols` fields yet
