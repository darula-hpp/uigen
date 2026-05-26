# UIGen DevBoard Simulator

A generic Next.js REST API and **interactive board** that simulates the fictional **UIGen DevBoard v1**. The homepage is the board lab; the UIGen control panel is a **separate app** in `UI/`.

This example is **standalone** (not part of the pnpm workspace). Install with npm from each app directory.

## Two apps, one demo

| App | Directory | Deploy to | Default local URL |
|---|---|---|---|
| **Board** | `.` | Vercel | `http://localhost:3000` |
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

## Deploy (board on Vercel, panel on Render)

### 1. Board app (Vercel)

In the Vercel dashboard (**Add New Project → Import repo → Configure**):

| Setting | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator` |
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install` |

> **Important:** The root must include the `examples/` prefix. If you use `apps/nextjs/devboard-simulator` (without `examples/`), the build will fail with `Cannot find module 'next/dist/compiled/next-server/server.runtime.prod.js'`.

Deploy the board first. Note the URL (e.g. `https://uigen-devboard-board.vercel.app`).

### 2. Control panel (Render, Docker, $0)

1. Sign up at [render.com](https://render.com) — no credit card for the free tier
2. **New → Web Service** → connect your repo
3. **Root Directory:** `examples/apps/nextjs/devboard-simulator/UI`
4. **Runtime:** Docker | **Instance type:** Free
5. **Environment:** `BOARD_URL` = `https://uigen-devboard-board.vercel.app`
6. Deploy

Free services sleep after ~15 minutes idle (cold start on wake). See [UI/README.md](./UI/README.md) for Blueprint (`render.yaml`) and details.

Then set `NEXT_PUBLIC_PANEL_URL` on the board Vercel project to your Render URL (e.g. `https://uigen-devboard-panel.onrender.com`) and redeploy the board.

### Other hosts (optional)

- **Railway** — trial credits, then usage-based; see `UI/railway.toml`
- **Vercel** — static panel + proxy is fragile; not recommended

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

### WebSocket streams (local dev / `npm start`)

`npm run dev` and `npm start` use `server.ts`, which serves Next.js and WebSocket upgrades on `/ws/v1/*` (same payloads as the matching GET endpoints, streamed every 500ms).

| WebSocket | REST equivalent |
|---|---|
| `/ws/v1/board` | `GET /api/v1/board` |
| `/ws/v1/pins` | `GET /api/v1/pins` |
| `/ws/v1/pins/{id}` | `GET /api/v1/pins/{id}` |
| `/ws/v1/sensors` | `GET /api/v1/sensors` |
| `/ws/v1/sensors/{id}` | `GET /api/v1/sensors/{id}` |
| `/ws/v1/readings` | `GET /api/v1/readings` (optional `subscribe` JSON with `sensor_id`) |
| `/ws/v1/sensors/{id}/readings` | `GET /api/v1/sensors/{id}/readings` |

The control panel enables live updates via `x-uigen-websocket` in `UI/.uigen/config.yaml`. Vercel serverless deploy does not host WebSockets; use local or a long-running Node host for streams.

## Project layout

```
devboard-simulator/
├── openapi.yaml          # Canonical contract
├── lib/                  # Device simulator + API handlers
├── app/                  # Board visualizer at /
├── public/assets/        # UIGen hardware logo
└── UI/                   # Control panel (Docker: Render, optional Railway)
    ├── Dockerfile
    ├── railway.toml
    ├── render.yaml
    └── scripts/build-vercel.mjs   # optional Vercel static build
```

## Tests

```bash
npm test
npm run build && ./tests/test_api.sh
```

## See also

- [C++ ESP32 simulator](../../cpp/esp32-simulator/) - same dual-UI pattern
- [UI/README.md](./UI/README.md) - control panel app details
