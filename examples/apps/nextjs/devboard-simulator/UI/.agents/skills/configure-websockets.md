# Skill: Configure WebSocket Live Updates

See repository skill: `SKILLS/configure-websockets.md`

For this DevBoard example:

- Add `x-uigen-websocket` only in `UI/.uigen/config.yaml` under `GET:/path` keys
- Do not add WebSocket annotations to `openapi.yaml`
- Backend paths are implemented in `lib/ws-routes.ts` and served by `server.ts` at `/ws/v1/*`
- Run the board with `npm run dev` (custom server required for WebSocket upgrades)
