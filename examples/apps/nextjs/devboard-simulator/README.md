# UIGen DevBoard Simulator

A generic Next.js REST API and **interactive board** that simulates the fictional **UIGen DevBoard v1**. The homepage is the board lab; the UIGen control panel is a **separate app** in `UI/`.

This example is **standalone** (not part of the pnpm workspace). Install with npm from each app directory.

## Two apps, one demo

| App | Directory | Vercel root | Default local URL |
|---|---|---|---|
| **Board** | `.` | `devboard-simulator/` | `http://localhost:3000` |
| **Control panel** | `UI/` | `devboard-simulator/UI` | `http://localhost:4400` |

```text
Board app (:3000)                       Panel app (:4400 or Vercel #2)
  /  board visualizer                     generated admin UI
  /api/v1/*  REST API        <----------  /api/* proxy to board
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

## Deploy to Vercel (two projects)

### 1. Board app

- **Root directory:** `examples/apps/nextjs/devboard-simulator`
- **Framework:** Next.js
- **Env:** `NEXT_PUBLIC_PANEL_URL` = your panel Vercel URL (after step 2)

```bash
cd examples/apps/nextjs/devboard-simulator
npm install
npm run build
vercel deploy
```

### 2. Control panel app

- **Root directory:** `examples/apps/nextjs/devboard-simulator/UI`
- **Build command:** `npm run build`
- **Output directory:** `out`
- **Env:** `BOARD_URL` = your board Vercel URL (e.g. `https://devboard-board.vercel.app`)

```bash
cd examples/apps/nextjs/devboard-simulator/UI
npm install
npm run build
vercel deploy
```

The panel build packages the UIGen renderer as static files and uses a serverless `/api/*` proxy to the board app.

Then set `NEXT_PUBLIC_PANEL_URL` on the board project to the panel URL and redeploy the board app so the header link points to the live panel.

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

## Project layout

```
devboard-simulator/
├── openapi.yaml          # Canonical contract
├── lib/                  # Device simulator + API handlers
├── app/                  # Board visualizer at /
├── public/assets/        # UIGen hardware logo
└── UI/                   # Separate control panel app (own package.json, vercel.json)
    ├── scripts/build-vercel.mjs
    └── api/[[...path]].js   # Proxies /api/* to BOARD_URL
```

## Tests

```bash
npm test
npm run build && ./tests/test_api.sh
```

## See also

- [C++ ESP32 simulator](../../cpp/esp32-simulator/) - same dual-UI pattern
- [UI/README.md](./UI/README.md) - control panel app details
