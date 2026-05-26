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
2. Set environment variable `BOARD_URL` to the deployed board app URL (**before** the first deploy)
3. Deploy (or redeploy after changing `BOARD_URL`)

Build output is written to `out/` as a static UIGen SPA. The build also writes a Vercel rewrite that proxies `/api/*` to `BOARD_URL`. UIGen fetches `/api/api/v1/...`; that becomes `{BOARD_URL}/api/v1/...`.

If you get Vercel `NOT_FOUND` on `/api/*`, `BOARD_URL` was not set when the build ran. Add it in project settings and redeploy.

## Config

UIGen annotations live in `.uigen/config.yaml`. The OpenAPI spec is `openapi.yaml` in this folder.
