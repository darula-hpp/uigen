# Skill: Configure WebSocket Live Updates

See repository skill: `SKILLS/configure-websockets.md`

For this ESP32 example, add `x-uigen-websocket` only in `UI/.uigen/config.yaml` under `GET:/api/v1/...` keys. Do not add WebSocket annotations to `openapi.yaml`; reconciliation merges config onto operations.

Backend paths are implemented in `include/ws_routes.hpp` (`/ws/v1/board`, `/ws/v1/pins`, etc.).
