# ESP32 Board Simulator

A C++ REST API and **visual web demo** that simulates an **ESP32-DevKitC** board for hardware developers. Toggle GPIO pins on a live board diagram, watch sensor telemetry update, and drive a full admin UI from the same OpenAPI spec with UIGen.

## Demo experience

Open `http://localhost:8080` and you get:

- **Interactive board visualizer** with left/right GPIO rails mapped to a DevKitC layout
- **Built-in LED on GPIO2** that glows and blinks in real time
- **Live sensor cards** with sparkline charts (DHT22 temp/humidity, battery voltage, CPU temp)
- **Event log** for pin changes, telemetry, alerts, and actions
- **REST API + OpenAPI** for UIGen to generate a full control panel on top

```text
Visual demo (C++ serves the page)     UIGen admin UI (from openapi.yaml)
http://localhost:8080                 http://localhost:4400
        |                                      |
        +-------- same REST API ----------------+
```

## Quick start

### Option 1: Docker

```bash
cd examples/apps/cpp/esp32-simulator
docker compose up --build
```

Open `http://localhost:8080` for the visual simulator.

### Option 2: Local build

Requirements: CMake 3.20+, C++17 compiler, Git

```bash
cd examples/apps/cpp/esp32-simulator
cmake -S . -B build
cmake --build build
./build/esp32_simulator --web web --openapi openapi.yaml
```

## Run with UIGen

From this directory (so `.uigen/config.yaml` is picked up):

```bash
# With the simulator already running on :8080
npx @uigen-dev/cli@latest serve http://localhost:8080/openapi.yaml

# Or use the local spec file
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8080
```

When the spec is loaded from a URL, UIGen infers `--proxy-base` from the spec origin (`http://localhost:8080`) unless you override it.

- `http://localhost:8080` - visual board simulator (hardware demo)
- `http://localhost:4400` - UIGen-generated admin UI (CRUD, charts, config forms)

The C++ server also serves the live spec at `GET /openapi.yaml`.

## API overview

| Endpoint | Description |
|---|---|
| `GET /` | Visual ESP32 simulator page |
| `GET /api/v1/state` | Full snapshot for the visual demo (pins, sensors, events) |
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

## Simulated hardware

- **Board**: ESP32-DevKitC (ESP32-D0WDQ6)
- **Built-in LED**: GPIO2 with animated blink
- **Sensors**:
  - Internal CPU temperature
  - DHT22 temperature and humidity on GPIO4
  - Battery voltage on GPIO34 (ADC)
- **GPIO map**: 20 pins with visual layout metadata (`side`, `row`)

Telemetry runs in a background thread. The visual page polls `/api/v1/state` every 500ms.

## Tests

Integration tests cover the REST API and visual demo assets:

```bash
chmod +x tests/test_api.sh
./tests/test_api.sh
```

Or via CTest after building:

```bash
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

## Project layout

```
esp32-simulator/
├── web/
│   ├── index.html              # Visual demo page
│   └── assets/
│       ├── app.js              # Board rendering + live polling
│       └── styles.css          # Hardware lab UI theme
├── include/
│   ├── api_routes.hpp          # REST + static file routes
│   ├── board_simulator.hpp     # ESP32 state machine
│   └── json_utils.hpp          # JSON serialization
├── src/
│   ├── board_simulator.cpp
│   └── main.cpp
├── tests/
│   └── test_api.sh
├── .uigen/
│   ├── config.yaml             # UIGen dashboard layout + charts
│   └── theme.css
├── openapi.yaml
├── CMakeLists.txt
├── Dockerfile
└── docker-compose.yml
```

## Next steps

- Flash real ESP32 firmware implementing the same API contract
- Add WebSocket streaming for sub-second chart updates
- Wire UIGen overrides to embed the visual board inside the generated admin UI
