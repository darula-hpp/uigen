# UIGen DevBoard Control Panel

Separate UIGen app for the DevBoard simulator. Deploy with Docker on [Render](https://render.com) (free, no credit card) alongside the **board** app (also on Render Docker for WebSocket support).

## Local dev

With the board app running on `:3000`:

```bash
npm install
npm run dev
```

Open `http://localhost:4400`.

## Deploy to Render (recommended, $0)

The panel runs `uigen serve` in Docker. The `/api` proxy forwards REST and WebSocket upgrades to the **board** service.

**Important:** `BOARD_URL` must point at a board host that runs `server.ts` (Render Docker for the board). A Vercel-only board has REST but **no** `/ws/v1/*`, so live streams fail in the browser.

**Cost:** $0 on Render's free web service tier. Services sleep after ~15 minutes idle. See [Render free tier docs](https://render.com/docs/free).

### Option A: Blueprint (board + panel)

Use the combined blueprint at `../render.yaml` (repo path `examples/apps/nextjs/devboard-simulator/render.yaml`). It creates both services and sets `BOARD_URL` from the board's public URL.

### Option B: Panel only (manual)

1. Deploy the **board** first (see [../README.md](../README.md)) and note its URL.
2. **New → Web Service** → connect repo
3. Settings:

| Field | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator/UI` |
| **Runtime** | Docker |
| **Instance Type** | Free |
| **Environment variable** | `BOARD_URL` = `https://YOUR-BOARD.onrender.com` |

4. Click **Create Web Service**

Render builds from `Dockerfile` and runs `npm start`.

### Option C: This folder's `render.yaml` (panel only)

1. **New → Blueprint** → connect repo
2. Set root to `examples/apps/nextjs/devboard-simulator/UI` or use `UI/render.yaml`
3. Set `BOARD_URL` when prompted (board Render URL)

### After deploy

1. Set `NEXT_PUBLIC_PANEL_URL` on the **board** Render service to your panel URL (e.g. `https://uigen-devboard-panel.onrender.com`).
2. **Redeploy the board** so the homepage Control Panel link is correct.

**Verify:**

```bash
curl https://YOUR-PANEL.onrender.com/api/api/v1/sensors
```

You should get JSON sensor data from the board.

Open the panel in the browser; Network tab should show  
`wss://YOUR-PANEL.onrender.com/api/ws/v1/...` succeeding (not failing to Vercel).

| Variable | Required | Example |
|---|---|---|
| `BOARD_URL` | Yes | `https://uigen-devboard-board.onrender.com` |
| `PORT` | No (set by Render) | auto |

## Deploy to Railway (optional, paid after trial)

See `railway.toml` and [Railway pricing](https://docs.railway.com/pricing/plans).

## Deploy to Vercel (optional)

Vercel static hosting makes the proxy layer awkward. Prefer Render for the panel.

## Config

UIGen annotations live in `.uigen/config.yaml`. The OpenAPI spec is `openapi.yaml` in this folder.
