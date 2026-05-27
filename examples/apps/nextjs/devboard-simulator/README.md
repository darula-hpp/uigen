# UIGen DevBoard Simulator

A generic Next.js REST API and **interactive board** that simulates the fictional **UIGen DevBoard v1**. The homepage is the board lab; the UIGen control panel is a **separate app** in `UI/`.

This example is **standalone** (not part of the pnpm workspace). Install with npm from each app directory.

## Two apps, one demo

| App | Directory | Deploy to | Default local URL |
|---|---|---|---|
| **Board** | `.` | Render (Docker) or Vercel (REST only) | `http://localhost:3000` |
| **Control panel** | `UI/` | Render (Docker, free) | `http://localhost:4400` |

```text
Board app (:3000)                       Panel app (:4400 or Render)
  /  board visualizer                     generated admin UI
  /api/v1/*  REST API        <----------  uigen serve /api proxy
  /ws/v1/*   WebSocket       <----------  proxied as /api/ws/v1/*
```

## Quick start (local)

**Terminal 1 — board:**
```bash
cd examples/apps/nextjs/devboard-simulator
npm install
npm run dev
```

**Terminal 2 — control panel:**
```bash
cd examples/apps/nextjs/devboard-simulator/UI
npm install
npm run dev
```

Open `http://localhost:3000` for the board. Click **Control Panel** or open `http://localhost:4400`.

Set `NEXT_PUBLIC_PANEL_URL=http://localhost:4400` in the board app `.env.local` so the header link works locally.

## Deploy (recommended: two free Render services)

Use **two** Render web services so the panel can proxy **WebSocket** upgrades to the board. No paid upgrade required; both can stay on the free tier (shared instance hours, sleep after idle).

### Option A: Blueprint (both services)

1. [render.com](https://render.com) → **New → Blueprint** → connect repo
2. Select `examples/apps/nextjs/devboard-simulator/render.yaml`
3. Apply (creates `uigen-devboard-board` and `uigen-devboard-panel`)
4. After deploy, open the **board** service → **Environment** → set  
   `NEXT_PUBLIC_PANEL_URL` = panel URL (e.g. `https://uigen-devboard-panel.onrender.com`)  
   → **Manual Deploy** on the board (rebuilds so the Control Panel link is correct)

`BOARD_URL` on the panel is wired from the board service URL via the blueprint.

### Option B: Manual (two web services)

**1. Board** (REST + WebSocket)

| Field | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator` |
| **Runtime** | Docker |
| **Instance type** | Free |
| **Health check path** | `/api/health` |

**2. Panel** (UIGen)

| Field | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator/UI` |
| **Runtime** | Docker |
| **Instance type** | Free |
| **Environment** | `BOARD_URL` = `https://YOUR-BOARD-SERVICE.onrender.com` |

Then set `NEXT_PUBLIC_PANEL_URL` on the board service to the panel URL and redeploy the board.

### Verify live streams

```bash
# REST through panel
curl https://YOUR-PANEL.onrender.com/api/api/v1/sensors

# Board health (direct)
curl https://YOUR-BOARD.onrender.com/api/health
```

In the browser devtools, WebSockets should connect to  
`wss://YOUR-PANEL.onrender.com/api/ws/v1/...` (not to Vercel).

### Vercel board only (REST, no WebSocket)

You can still deploy the board to Vercel for the visualizer and REST API, but **live UIGen streams will not work** (no `/ws/v1/*` on serverless Next). Use Render Docker for the board if you need `x-uigen-websocket` in production.

| Setting | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator` |
| **Framework** | Next.js |

> Root must include the `examples/` prefix.

## API overview

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /openapi.yaml` | OpenAPI spec |
| `GET /api/v1/state` | Full snapshot for the board visualizer |
| `GET /api/v1/board` | Chip model, firmware, uptime, network status |
| `GET/PUT /api/v1/config` | Telemetry interval, alert thresholds |
| `GET /api/v1/pins` | List all GPIO pins |
| `GET/PUT /api/v1/pins/{pin_id}` | Read or configure a pin |
| `GET /api/v1/sensors` | List sensors |
| `GET /api/v1/readings` | Telemetry history |
| `POST /api/v1/actions/blink` | Blink status LED on D0 |
| `POST /api/v1/actions/reset` | Reset simulator state |

### WebSocket streams (`npm run dev` / `npm start` / Render board Docker)

`server.ts` serves Next.js and WebSocket upgrades on `/ws/v1/*` (same payloads as matching GET endpoints, streamed every 500ms).

| WebSocket | REST equivalent |
|---|---|
| `/ws/v1/board` | `GET /api/v1/board` |
| `/ws/v1/pins` | `GET /api/v1/pins` |
| `/ws/v1/pins/{id}` | `GET /api/v1/pins/{id}` |
| `/ws/v1/sensors` | `GET /api/v1/sensors` |
| `/ws/v1/sensors/{id}` | `GET /api/v1/sensors/{id}` |
| `/ws/v1/readings` | `GET /api/v1/readings` (optional `subscribe` JSON with `sensor_id`) |
| `/ws/v1/sensors/{id}/readings` | `GET /api/v1/sensors/{id}/readings` |

The control panel enables live updates via `x-uigen-websocket` in `UI/.uigen/config.yaml`.

## Project layout

```
devboard-simulator/
├── openapi.yaml          # Canonical contract
├── Dockerfile            # Board: Next + server.ts + WebSocket
├── render.yaml           # Blueprint: board + panel
├── lib/                  # Device simulator + API handlers
├── app/                  # Board visualizer at /
├── public/assets/        # UIGen hardware logo
└── UI/                   # Control panel (Docker on Render)
    ├── Dockerfile
    ├── render.yaml       # Panel-only blueprint (optional)
    └── .uigen/config.yaml
```

## Tests

```bash
npm test
npm run build && ./tests/test_api.sh
```

## See also

- [C++ ESP32 simulator](../../cpp/esp32-simulator/) - same dual-UI pattern
- [UI/README.md](./UI/README.md) - control panel app details
