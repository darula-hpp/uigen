---
title: Live Data & WebSockets
description: Wire declarative WebSocket streams into list, detail, and chart views with x-uigen-websocket.
---

# Live Data & WebSockets

UIGen supports live updates through `x-uigen-websocket`. REST stays in `openapi.yaml`; WebSocket metadata goes in `.uigen/config.yaml` and merges onto operations at reconcile time.

The UI still loads data with a normal GET (`useApiCall`), then merges WebSocket frames into the same React Query cache. Charts, tables, and detail fields update without polling.

## When to use

- Board or device snapshots that push full state (`mode: replace`)
- Telemetry history that grows over time (`mode: append`)
- Sensor detail pages with embedded child streams (`x-uigen-detail-stream`)

Skip WebSockets for health checks, mutations, and routes marked `x-uigen-ignore`.

## Config shape

Add annotations under `annotations` in `.uigen/config.yaml` using `METHOD:path` keys:

```yaml
annotations:
  GET:/api/v1/board:
    x-uigen-websocket:
      path: /ws/v1/board
      mode: replace

  GET:/api/v1/readings:
    x-uigen-websocket:
      path: /ws/v1/readings
      mode: append
      appendField: readings
      subscribe:
        sensor_id: 1
```

| Field | Description |
|---|---|
| `path` | WebSocket path on the API host (starts with `/`) |
| `mode` | `replace` (default) or `append` |
| `appendField` | Dot path to the growing array when `mode: append` |
| `subscribe` | Optional JSON sent once after the socket opens (backend-defined) |

Do **not** put `x-uigen-websocket` in `openapi.yaml`. Keep OpenAPI as a portable REST contract.

See [x-uigen-websocket](/docs/spec-annotations/x-uigen-websocket) and [x-uigen-detail-stream](/docs/spec-annotations/x-uigen-detail-stream) for the full reference.

## Backend conventions

Device examples use matching REST and WebSocket paths:

| REST | WebSocket |
|---|---|
| `GET /api/v1/board` | `/ws/v1/board` |
| `GET /api/v1/pins` | `/ws/v1/pins` |
| `GET /api/v1/readings?sensor_id=` | `/ws/v1/readings` |

Each message should be JSON with the same shape as the GET response (or an array slice for `append` mode).

## How `uigen serve` proxies WebSockets

REST and WebSocket traffic both go through the panel origin under `/api`:

- REST: `http://localhost:4400/api/api/v1/...`
- WebSocket: `ws://localhost:4400/api/ws/v1/...`

The CLI forwards HTTP and WebSocket upgrades to `--proxy-base` (or the spec's active server). Auth credentials travel as `x-uigen-*` query parameters on WebSocket upgrades and are injected as headers upstream.

See [uigen serve](/docs/cli-reference/serve) for proxy details and environment switcher behavior.

## Detail page child streams

Pin a nested list GET on a detail view with `x-uigen-detail-stream`:

```yaml
annotations:
  GET:/api/v1/sensors/{sensor_id}:
    x-uigen-detail-stream:
      operationId: listSensorReadings
```

Pair with `x-uigen-websocket` on the child list GET for a live chart or highlighted latest row on the detail page.

## Live charts

When a list response has `x-uigen-chart` and `x-uigen-websocket`, the chart updates on each frame without replaying enter animations (animations are off by default on refresh; opt in with `options.animate: true`).

Dense line charts hide per-point dots when more than 24 sampled points are rendered. Override with `options.showDots`.

See [List View](/docs/views-and-components/list-view) and [x-uigen-chart](/docs/spec-annotations/x-uigen-chart).

## Example projects

| Example | What it demonstrates |
|---|---|
| [ESP32 simulator](/docs/guides/example-apps) | GPIO, sensors, telemetry charts, detail child streams |
| [DevBoard (Next.js)](/docs/guides/example-apps) | Board visualizer + panel, Render deploy with WebSocket proxy |

Ask your AI to run the **configure-websockets** skill (`.agents/skills/configure-websockets.md`) against your project.

## Deployment note

Serverless hosts (for example Vercel on the board app alone) typically cannot serve `/ws/v1/*`. Deploy the API with WebSocket support (Docker on Render, custom `server.ts`, or embedded firmware) and proxy through the UIGen panel.

## Next steps

- [AI Agent Skills](/docs/guides/ai-agent-skills)
- [Example Apps](/docs/guides/example-apps)
- [Detail View](/docs/views-and-components/detail-view)
