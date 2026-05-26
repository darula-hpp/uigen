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
2. Set environment variable `BOARD_URL` to the deployed board app URL
3. Leave **Output Directory** empty in the Vercel dashboard (`vercel.json` handles static output)
4. Deploy

Build output is written to `out/` as a static UIGen SPA. API calls are proxied at runtime via `api/[...path].js`, which reads `BOARD_URL` from the environment. UIGen fetches `/api/api/v1/...`; that becomes `{BOARD_URL}/api/v1/...`.

If you get Vercel `NOT_FOUND` on `/api/*`, redeploy with the latest code so the proxy function is included.

## Config

UIGen annotations live in `.uigen/config.yaml`. The OpenAPI spec is `openapi.yaml` in this folder.
