---
title: "How to Create a UI for Your ESP32 IoT App"
author: "Olebogeng Mbedzi"
date: "2026-05-20"
excerpt: "Build a full admin panel for GPIO, sensors, and device actions from an OpenAPI spec. Walk through the ESP32 simulator example: contract-first API design, UIGen serve, and config annotations for charts and labels."
tags: ["tutorial", "esp32", "iot", "embedded", "openapi", "example-app"]
---

## Introduction

You finished the firmware. Your ESP32 exposes REST endpoints for GPIO, sensor readings, and device config. Now you need a control panel: pin tables, settings forms, telemetry charts, and action buttons.

The usual path is painful. You wire up a React dashboard by hand, duplicate validation rules from your API, and rebuild the same CRUD screens every time you add a sensor. For embedded projects, that frontend work often never happens. You ship curl commands and a serial monitor instead.

There is a better approach. Define your device API as **OpenAPI**, implement the firmware to match that contract, and let UIGen generate the admin UI automatically. No RainMaker. No hand-built React.

This tutorial walks through the [ESP32 Board Simulator](https://github.com/darula-hpp/uigen/tree/main/examples/apps/cpp/esp32-simulator) in the UIGen repo. It is a C++ REST server that simulates an ESP32-DevKitC with GPIO, DHT22 sensors, telemetry history, and device actions. The same `openapi.yaml` drives both the simulator and a generated control panel.

By the end, you will know how to:

- Run the visual demo and UIGen admin side by side
- Structure an OpenAPI spec for embedded devices
- Start UIGen from the `UI/` directory so config and theme load correctly
- Add charts, labels, and references with `.uigen/config.yaml`
- Apply the same workflow to real firmware on your board

---

## Two UIs, One API

The ESP32 example deliberately separates two experiences:

```text
Visual demo (C++ serves the page)     UIGen admin UI (from openapi.yaml)
http://localhost:8080                 http://localhost:4400
        |                                      |
        +-------- same REST API ----------------+
```

**Visual demo** (`http://localhost:8080`): A custom hardware lab page with an interactive board diagram, live sensor cards, sparkline charts, and an event log. This is what you might build for a product demo or trade show.

**UIGen admin** (`http://localhost:4400`): A generated control panel with list views, edit forms, telemetry charts, and action buttons. This is what you use day to day to configure pins, adjust thresholds, and inspect telemetry.

Both talk to the same REST API. The visual demo uses `GET /api/v1/state` for efficient polling. UIGen uses the standard CRUD endpoints defined in the OpenAPI spec. You do not have to choose one or the other. Contract-first design lets you add either surface without rewriting the backend.

---

## Part 1: Run the Example

### Start the simulator

Clone the repo and start the C++ simulator with Docker:

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/cpp/esp32-simulator
docker compose up --build
```

Open `http://localhost:8080`. You should see the DevKitC board diagram with GPIO rails, a glowing LED on GPIO2, live DHT22 and battery sensor cards, and an event log.

Alternatively, build locally with CMake 3.20+ and a C++17 compiler:

```bash
cmake -S . -B build
cmake --build build
./build/esp32_simulator --web web --openapi openapi.yaml
```

### Start the UIGen admin UI

UIGen must run from the **`UI/` directory** so it picks up `UI/.uigen/config.yaml` and `UI/.uigen/theme.css`:

```bash
cd uigen/examples/apps/cpp/esp32-simulator/UI
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8080
```

Open `http://localhost:4400`. You get a sidebar with Board Status, Pins, Sensors, Telemetry History, Settings, and device actions.

| URL | What you get |
|---|---|
| `http://localhost:8080` | Interactive board diagram, live GPIO/sensor cards, event log |
| `http://localhost:4400` | Generated control panel: pin config, settings forms, telemetry table + charts, blink/reset actions |

The simulator also serves the live spec at `GET /openapi.yaml`. You can point UIGen at the URL instead of the local file:

```bash
npx @uigen-dev/cli@latest serve http://localhost:8080/openapi.yaml
```

When the spec is loaded from a URL, UIGen infers `--proxy-base` from the spec origin unless you override it.

---

## Part 2: Design the OpenAPI Contract

The ESP32 example is **contract-first**. The `openapi.yaml` was written before the C++ implementation, not generated from it. Firmware (or the simulator) implements the contract. That keeps the UI stable even when you swap C++ for MicroPython or Arduino.

### Resources that map cleanly to UIGen views

| Device concept | OpenAPI pattern | UIGen view |
|---|---|---|
| Board status | `GET /api/v1/board` → object | Profile / detail view |
| GPIO pins | `GET /api/v1/pins`, `GET/PUT /api/v1/pins/{pin_id}` | List + edit form |
| Sensors | `GET /api/v1/sensors` | List view |
| Telemetry | `GET /api/v1/readings` with filters | List + line chart |
| Settings | `GET` + `PUT /api/v1/config` | Settings form |
| Actions | `POST /api/v1/actions/blink`, `POST /api/v1/actions/reset` | Action forms |

### Example schema: Pin

```yaml
Pin:
  type: object
  required: [id, name, mode, state]
  properties:
    id:
      type: integer
      description: GPIO number
    name:
      type: string
      example: GPIO2 (Built-in LED)
    mode:
      type: string
      enum: [input, output]
    state:
      type: string
      enum: [low, high]
    supports_adc:
      type: boolean
    adc_voltage:
      type: number
      format: float
```

Enums in YAML (`input`/`output`, `low`/`high`) match the string serializers in firmware. JSON shapes on the wire must match the spec exactly.

### Internal endpoints vs user-facing endpoints

Some routes exist only for the visual demo or health checks. Mark them in config so they do not clutter the admin UI:

```yaml
GET:/health:
  x-uigen-ignore: true
GET:/openapi.yaml:
  x-uigen-ignore: true
GET:/api/v1/state:
  x-uigen-ignore: true
```

The visual demo page polls `/api/v1/state` for a full snapshot (pins, sensors, events). UIGen uses the granular CRUD endpoints instead.

### Starting from scratch

If you have curl output, C struct headers, or a route table but no OpenAPI file yet, use the **Generate Device OpenAPI** agent skill in the ESP32 example (`UI/.agents/skills/generate-device-openapi.md`). It walks through inventorying endpoints, designing UIGen-friendly resources, and writing a spec that matches embedded conventions.

Pipeline:

```text
1. generate-device-openapi  →  openapi.yaml
2. auto-annotate            →  .uigen/config.yaml
3. uigen serve openapi.yaml --proxy-base http://<device>
```

---

## Part 3: What UIGen Generates

From the ESP32 spec alone, UIGen produces:

**Board Status** (`GET /api/v1/board`): Chip model, firmware version, uptime, free heap, WiFi status, and signal strength in a profile layout.

**Pins** (`GET /api/v1/pins`): Sortable table of all GPIO pins with mode and state. Click a pin to view details or open the configure form (`PUT /api/v1/pins/{pin_id}`).

**Sensors** (`GET /api/v1/sensors`): Connected sensors (DHT22 temperature/humidity, battery ADC, internal CPU temp) with type and range metadata.

**Telemetry History** (`GET /api/v1/readings`): Paginated table of sensor readings with timestamps. With config annotations, this becomes a line chart filtered by sensor.

**Settings** (`GET/PUT /api/v1/config`): Forms for hostname, telemetry interval, temperature alert threshold, auto-blink on alert, and ADC resolution.

**Actions**: Forms for `POST /api/v1/actions/blink` (blink count, interval) and `POST /api/v1/actions/reset`.

All of this comes from the OpenAPI spec structure. No React components to write.

---

## Part 4: Customize with `.uigen/config.yaml`

Raw specs use technical field names. Config annotations improve labels, hide internal fields, link related resources, and add charts.

The ESP32 example keeps annotations in `UI/.uigen/config.yaml` so the source `openapi.yaml` stays clean and portable.

### App branding and layout

```yaml
annotations:
  document:
    x-uigen-app:
      name: ESP32 Control Panel
      icon: /.uigen/assets/logo.svg
    x-uigen-layout:
      type: sidebar
      metadata:
        sidebarWidth: 260
        sidebarCollapsible: true
```

### Human-readable labels

```yaml
  Board.wifi_rssi:
    x-uigen-label: WiFi Signal (dBm)
  BoardConfig.telemetry_interval_ms:
    x-uigen-label: Telemetry Interval (ms)
  Pin.mode:
    x-uigen-label: Pin Mode
```

### Foreign key references

Link sensor readings back to sensors and pins with dropdowns instead of raw IDs:

```yaml
  Reading.sensor_id:
    x-uigen-ref:
      resource: Sensors
      valueField: id
      labelField: name
  Sensor.pin_id:
    x-uigen-ref:
      resource: Pins
      valueField: id
      labelField: name
```

### Telemetry charts

Add a line chart to the readings list with sensor filtering:

```yaml
  '#/paths/~1api~1v1~1readings/get/responses/200/content/application~1json/schema':
    x-uigen-chart:
      chartType: line
      xAxis: recorded_at
      yAxis: value
      query:
        limit: 500
        params:
          sensor_id: sensor_id
      sampling:
        strategy: auto
        maxPoints: 120
      filters:
        - param: sensor_id
          field: sensor_id
          type: ref
          resource: sensors
      options:
        title: Sensor Telemetry
```

See the [x-uigen-chart reference](/docs/spec-annotations/x-uigen-chart) for full options.

### Hide layout-only fields

Pin schemas include `side` and `row` for the visual demo layout. Hide them from admin forms:

```yaml
  Pin.side:
    x-uigen-ignore: true
  Pin.row:
    x-uigen-ignore: true
```

### Auto-annotate with AI

Instead of writing config by hand, tell an AI agent:

```
Use the auto-annotate skill to analyze openapi.yaml and add appropriate annotations
```

The skill detects list/detail patterns, foreign keys, datetime fields, and chart candidates. It writes to `.uigen/config.yaml`. Refresh the browser to see changes.

---

## Part 5: Theme the Control Panel

Custom styles live in `UI/.uigen/theme.css`. The ESP32 example uses a hardware lab palette: dark background, green accent, monospace telemetry values.

UIGen injects your theme at runtime via `window.__UIGEN_CSS__`. Edit colors, typography, and component styles without touching the React bundle.

For a full walkthrough, see [How to Style UIGen Applications](/blog/styling-uigen-apps-with-ai).

Quick example:

```css
:root {
  --primary: #00ff88;
  --primary-foreground: #0a0f0a;
  --background: #0d1117;
  --foreground: #e6edf3;
}
```

Restart `uigen serve` or refresh after editing `theme.css`.

---

## Part 6: From Simulator to Real Firmware

The simulator is a stand-in for your ESP32. The workflow for production firmware is the same:

1. **Keep `openapi.yaml` as the contract.** Version it alongside your firmware.
2. **Implement the same routes** on the device (`/api/v1/pins`, `/api/v1/readings`, etc.).
3. **Serve the spec** at `GET /openapi.yaml` from flash or SPIFFS if you want live discovery.
4. **Point UIGen at the device:**

```bash
cd my-firmware/UI
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://192.168.4.1
```

Replace `192.168.4.1` with your ESP32 AP address or mDNS hostname.

5. **Iterate on config, not React.** Add charts, hide debug fields, and tune labels in `.uigen/config.yaml`.

The visual demo page (`web/`) is optional. Many embedded projects only need the UIGen admin. Others embed a custom dashboard for end users and keep UIGen for engineers.

---

## API Reference

The simulator exposes these endpoints (full details in the [example README](https://github.com/darula-hpp/uigen/tree/main/examples/apps/cpp/esp32-simulator)):

| Endpoint | Description |
|---|---|
| `GET /` | Visual ESP32 simulator page |
| `GET /api/v1/state` | Full snapshot for the visual demo |
| `GET /health` | Health check |
| `GET /openapi.yaml` | OpenAPI spec served by the simulator |
| `GET /api/v1/board` | Chip model, firmware, uptime, WiFi status |
| `GET/PUT /api/v1/config` | Telemetry interval, alert thresholds |
| `GET /api/v1/pins` | List all GPIO pins |
| `GET/PUT /api/v1/pins/{pin_id}` | Read or configure a pin |
| `GET /api/v1/sensors` | List sensors (DHT22, ADC, internal temp) |
| `GET /api/v1/sensors/{sensor_id}/readings` | Telemetry history for one sensor |
| `POST /api/v1/sensors/{sensor_id}/readings` | Capture a reading now |
| `GET /api/v1/readings` | All readings, optional `sensor_id` filter |
| `POST /api/v1/actions/blink` | Async blink on GPIO2 built-in LED |
| `POST /api/v1/actions/reset` | Reset simulator state |

### Simulated hardware

- **Board**: ESP32-DevKitC (ESP32-D0WDQ6)
- **Built-in LED**: GPIO2 with animated blink
- **Sensors**: Internal CPU temperature, DHT22 on GPIO4, battery voltage on GPIO34 (ADC)
- **GPIO map**: 20 pins with visual layout metadata

Run integration tests:

```bash
cd examples/apps/cpp/esp32-simulator
chmod +x tests/test_api.sh
./tests/test_api.sh
```

---

## Project Layout

```
esp32-simulator/
├── web/                        # Visual demo (optional product UI)
│   ├── index.html
│   └── assets/
├── include/                    # C++ REST layer
│   ├── api_routes.hpp
│   └── board_simulator.hpp
├── src/
│   ├── board_simulator.cpp
│   └── main.cpp
├── openapi.yaml                # Contract (canonical)
├── UI/                         # UIGen project — run serve from here
│   ├── openapi.yaml
│   ├── .uigen/
│   │   ├── config.yaml         # Labels, charts, refs, layout
│   │   └── theme.css           # Custom theme
│   └── .agents/skills/         # AI skills for spec + config
├── tests/test_api.sh
├── Dockerfile
└── docker-compose.yml
```

---

## Conclusion

Building an admin UI for ESP32 projects does not require a separate frontend codebase. Define your device API in OpenAPI, implement the firmware to match, and run UIGen from the `UI/` directory. Annotations in `.uigen/config.yaml` turn a raw spec into a polished control panel with charts, references, and readable labels.

The ESP32 simulator shows the full loop: contract-first spec, C++ implementation, visual demo for hardware storytelling, and UIGen admin for day-to-day control. The same pattern works for STM32 Nucleo and any board that speaks REST.

Try it now:

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/examples/apps/cpp/esp32-simulator
docker compose up --build

# In another terminal
cd uigen/examples/apps/cpp/esp32-simulator/UI
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8080
```

Visit `http://localhost:8080` for the board demo and `http://localhost:4400` for the generated admin UI.

---

## Further Reading

- [ESP32 Simulator README](https://github.com/darula-hpp/uigen/tree/main/examples/apps/cpp/esp32-simulator) - Full API docs, local build, and tests
- [x-uigen-chart Reference](/docs/spec-annotations/x-uigen-chart) - Line, bar, and area charts from list endpoints
- [x-uigen-ref Reference](/docs/spec-annotations/x-uigen-ref) - Foreign key dropdowns between resources
- [How to Style UIGen Applications](/blog/styling-uigen-apps-with-ai) - Theme customization with AI or manual CSS
- [Introducing the UIGen Config Command](/blog/uigen-config-command) - Visual annotation management
- [Building a Meeting Minutes App](/blog/building-meeting-minutes-app) - Contract-first workflow for web APIs
