---
title: Example Apps
description: Reference applications demonstrating UIGen with web APIs and embedded device simulators.
---

# Example Apps

The UIGen repository includes example applications you can clone and run locally. Each example follows a **contract-first** pattern: an OpenAPI spec defines the API, and UIGen generates the admin UI from that spec.

## Meeting Minutes (FastAPI)

A full-stack document automation app with templates, meetings, PDF generation, authentication, and file uploads.

**Location:** [`examples/apps/fastapi/meeting-minutes`](https://github.com/darula-hpp/uigen/tree/main/examples/apps/fastapi/meeting-minutes)

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/fastapi/meeting-minutes

# Backend
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# UIGen (from project root or monorepo)
npx @uigen-dev/cli serve openapi.yaml --proxy-base http://localhost:8000
```

| URL | What you get |
|---|---|
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `http://localhost:4400` | UIGen admin UI |

**Blog walkthrough:** [Building a Meeting Minutes App](/blog/building-meeting-minutes-app)

---

## ESP32 Board Simulator (C++)

A C++ REST API simulating an ESP32-DevKitC with GPIO control, DHT22 sensors, telemetry, and device actions. Includes a visual board demo page and a UIGen control panel.

**Location:** [`examples/apps/cpp/esp32-simulator`](https://github.com/darula-hpp/uigen/tree/main/examples/apps/cpp/esp32-simulator)

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/cpp/esp32-simulator
docker compose up --build

# UIGen — run from UI/ so .uigen/config.yaml is picked up
cd UI
npx @uigen-dev/cli serve openapi.yaml --proxy-base http://localhost:8080
```

| URL | What you get |
|---|---|
| `http://localhost:8080` | Interactive board diagram, sensor cards, event log |
| `http://localhost:4400` | Generated control panel: pins, settings, telemetry charts, actions |

**Blog walkthrough:** [How to Create a UI for Your ESP32 IoT App](/blog/create-ui-for-esp32-iot-app)

---

## STM32 Nucleo Simulator (C++)

Same contract-first pattern as ESP32, targeting a NUCLEO-F411RE with Arduino header pins, I2C sensors, 4-20mA analog input, and ST-Link status.

**Location:** [`examples/apps/cpp/stm32-nucleo-simulator`](https://github.com/darula-hpp/uigen/tree/main/examples/apps/cpp/stm32-nucleo-simulator)

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/cpp/stm32-nucleo-simulator
docker compose up --build

# UIGen — run from UI/
cd UI
npx @uigen-dev/cli serve openapi.yaml --proxy-base http://localhost:8081 --port 4401
```

| URL | What you get |
|---|---|
| `http://localhost:8081` | Nucleo board diagram, LD2 blink, sensor cards |
| `http://localhost:4401` | Generated control panel |

---

## Hardware examples: run UIGen from `UI/`

The C++ simulators keep UIGen config in a `UI/` subdirectory:

```
esp32-simulator/
├── openapi.yaml          # Canonical contract (simulator root)
├── web/                  # Visual demo page
└── UI/
    ├── openapi.yaml
    └── .uigen/
        ├── config.yaml   # Charts, labels, refs
        └── theme.css
```

Always `cd` into `UI/` before running `uigen serve`. The simulator itself runs from the example root (`docker compose up`).

---

## UIGen DevBoard (Next.js)

A generic board simulator with the **board visualizer as the homepage** and a **separate UIGen control panel app** in `UI/`. Deploy both to Vercel as two projects.

**Board app:** [`examples/apps/nextjs/devboard-simulator`](https://github.com/darula-hpp/uigen/tree/main/examples/apps/nextjs/devboard-simulator)

**Panel app:** [`examples/apps/nextjs/devboard-simulator/UI`](https://github.com/darula-hpp/uigen/tree/main/examples/apps/nextjs/devboard-simulator/UI)

```bash
# Terminal 1 — board
cd examples/apps/nextjs/devboard-simulator
npm install && npm run dev

# Terminal 2 — panel
cd examples/apps/nextjs/devboard-simulator/UI
npm install && npm run dev
```

| URL | What you get |
|---|---|
| `http://localhost:3000` | Quad-zone DevBoard visualizer (homepage) |
| `http://localhost:4400` | Generated control panel |
| `http://localhost:3000/openapi.yaml` | Live OpenAPI spec |

**Vercel:** create two projects. Set `BOARD_URL` on the panel project and `NEXT_PUBLIC_PANEL_URL` on the board project to each other's URLs.

## Other specs

For quick testing without a backend:

```bash
npx @uigen-dev/cli serve https://petstore3.swagger.io/api/v3/openapi.json
```

Petstore YAML files are in the repo root `examples/` directory.

## Next steps

- [Quick Start](/docs/getting-started/quick-start)
- [Spec Annotations](/docs/spec-annotations/overview)
- [How to Style UIGen Applications](/blog/styling-uigen-apps-with-ai)
