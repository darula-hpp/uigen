# UIGen DevBoard Control Panel

Separate UIGen app for the DevBoard simulator. Deploy this as its own Vercel project alongside the board Next.js app.

## Local dev

With the board app running on `:3000`:

```bash
npm install
npm run dev
```

Open `http://localhost:4400`.

## Vercel deploy

1. Create a Vercel project with root directory `examples/apps/nextjs/devboard-simulator/UI`
2. Set `BOARD_URL` = `https://uigen-devboard-board.vercel.app`
3. **Clear Output Directory** in Vercel project settings (leave blank)
4. Deploy

The build writes `.vercel/output/` with the static SPA and an `/api/*` proxy function. If `/api/api/v1/sensors` returns HTML instead of JSON, redeploy with the latest code.

## Config

UIGen annotations live in `.uigen/config.yaml`. The OpenAPI spec is `openapi.yaml` in this folder.
