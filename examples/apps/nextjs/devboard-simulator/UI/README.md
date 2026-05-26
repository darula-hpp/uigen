# UIGen DevBoard Control Panel

Separate UIGen app for the DevBoard simulator. Deploy with Docker on [Render](https://render.com) (free, no credit card) alongside the board Next.js app on Vercel.

## Local dev

With the board app running on `:3000`:

```bash
npm install
npm run dev
```

Open `http://localhost:4400`.

## Deploy to Render (recommended, $0)

The panel runs `uigen serve` in Docker. The built-in `/api` proxy forwards to your board app — same as local dev, no Vercel serverless workarounds.

**Cost:** $0 on Render's free web service tier. No credit card required. Services sleep after ~15 minutes idle (cold start ~30–60s on first visit). Fine for demos. See [Render free tier docs](https://render.com/docs/free).

### Option A: Dashboard (easiest)

1. Sign up at [render.com](https://render.com)
2. **New → Web Service** → connect your GitHub repo
3. Settings:

| Field | Value |
|---|---|
| **Root Directory** | `examples/apps/nextjs/devboard-simulator/UI` |
| **Runtime** | Docker |
| **Instance Type** | Free |
| **Environment variable** | `BOARD_URL` = `https://uigen-devboard-board.vercel.app` |

4. Click **Create Web Service**

Render builds from `Dockerfile` and runs `npm start`.

### Option B: Blueprint (`render.yaml`)

1. **New → Blueprint** → connect repo
2. Render picks up `UI/render.yaml`
3. Set `BOARD_URL` when prompted
4. Apply

### After deploy

Render gives you a URL like `https://uigen-devboard-panel.onrender.com`.

Set that as `NEXT_PUBLIC_PANEL_URL` on the board Vercel project and redeploy the board so the **Control Panel** link works.

**Verify:**

```bash
curl https://YOUR-PANEL.onrender.com/api/api/v1/sensors
```

You should get JSON sensor data from the board.

| Variable | Required | Example |
|---|---|---|
| `BOARD_URL` | Yes | `https://uigen-devboard-board.vercel.app` |
| `PORT` | No (set by Render) | auto |

## Deploy to Railway (optional, paid after trial)

Railway gives new accounts a one-time $5 trial credit, then $1/month on the Free plan (often tight for always-on). See `railway.toml` and [Railway pricing](https://docs.railway.com/pricing/plans).

## Deploy to Vercel (optional)

Vercel static hosting makes the proxy layer awkward. Prefer Render for the panel.

## Config

UIGen annotations live in `.uigen/config.yaml`. The OpenAPI spec is `openapi.yaml` in this folder.
