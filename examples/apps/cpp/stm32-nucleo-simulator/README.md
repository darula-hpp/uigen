# STM32 Nucleo Board Simulator

A C++ REST API and **visual web demo** that simulates a **NUCLEO-F411RE** board for embedded developers. Toggle GPIO pins on a live board diagram, watch sensor telemetry update, and drive a full admin UI from the same OpenAPI spec with UIGen.

## Demo experience

Open `http://localhost:8081` and you get:

- **Interactive board visualizer** with Arduino header pins (D0-D15, A0-A5) mapped to a Nucleo layout
- **Built-in LD2 on PA5 (D13)** that glows and blinks in real time
- **Live sensor cards** with sparkline charts (die temp, SHT31 I2C, 4-20mA loop, supply rail)
- **Event log** for pin changes, telemetry, alerts, and actions
- **REST API + OpenAPI** for UIGen to generate a full control panel on top

```text
Visual demo (C++ serves the page)     UIGen admin UI (from openapi.yaml)
http://localhost:8081                 http://localhost:4401
        |                                      |
        +-------- same REST API ----------------+
```

## Quick start

### Option 1: Docker

```bash
cd examples/apps/cpp/stm32-nucleo-simulator
docker compose up --build
```

Open `http://localhost:8081` for the visual simulator.

### Option 2: Local build

Requirements: CMake 3.20+, C++17 compiler, Git

```bash
cd examples/apps/cpp/stm32-nucleo-simulator
cmake -S . -B build
cmake --build build
./build/stm32_nucleo_simulator --web web --openapi openapi.yaml
```

## Run with UIGen

From the `UI/` directory (so `UI/.uigen/config.yaml` and theme are picked up):

```bash
cd examples/apps/cpp/stm32-nucleo-simulator/UI

# With the simulator already running on :8081
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8081 --port 4401
```

When the spec is loaded from a URL, UIGen infers `--proxy-base` from the spec origin (`http://localhost:8081`) unless you override it.

- `http://localhost:8081` - visual board simulator (hardware demo)
- `http://localhost:4401` - UIGen-generated admin UI (CRUD, charts, config forms)

The C++ server also serves the live spec at `GET /openapi.yaml`.

## API overview

| Endpoint | Description |
|---|---|
| `GET /` | Visual Nucleo simulator page |
| `GET /api/v1/state` | Full snapshot for the visual demo (pins, sensors, events) |
| `GET /health` | Health check |
| `GET /openapi.yaml` | OpenAPI spec served by the simulator |
| `GET /api/v1/board` | MCU model, firmware, uptime, ST-Link status |
| `GET/PUT /api/v1/config` | Telemetry interval, alert thresholds |
| `GET /api/v1/pins` | List all GPIO pins |
| `GET/PUT /api/v1/pins/{pin_id}` | Read or configure a pin |
| `GET /api/v1/sensors` | List sensors (SHT31, ADC, internal temp) |
| `GET /api/v1/sensors/{sensor_id}/readings` | Telemetry history for one sensor |
| `POST /api/v1/sensors/{sensor_id}/readings` | Capture a reading now |
| `GET /api/v1/readings` | All readings, optional `sensor_id` filter |
| `POST /api/v1/actions/blink` | Async blink on LD2 (PA5 / D13) |
| `POST /api/v1/actions/reset` | Reset simulator state |

## Simulated hardware

- **Board**: NUCLEO-F411RE (STM32F411RET6, 96 MHz)
- **User LED LD2**: PA5 / Arduino D13 with animated blink
- **Comms LED LD3**: Tied to ST-Link connected status in the visual demo
- **User button B1**: PC13 as input pin
- **Sensors**:
  - Internal die temperature
  - SHT31 temperature and humidity on I2C (D14/D15)
  - 4-20mA loop input on A0
  - Supply rail monitor on A1
- **Pin map**: 23 pins with visual layout metadata (`side`, `row`)

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
stm32-nucleo-simulator/
├── web/
│   ├── index.html              # Visual demo page
│   └── assets/
│       ├── app.js              # Board rendering + live polling
│       └── styles.css          # Industrial green UI theme
├── include/
│   ├── api_routes.hpp          # REST + static file routes
│   ├── board_simulator.hpp     # Nucleo state machine
│   └── json_utils.hpp          # JSON serialization
├── src/
│   ├── board_simulator.cpp
│   └── main.cpp
├── tests/
│   └── test_api.sh
├── UI/
│   ├── .uigen/config.yaml      # UIGen dashboard layout + charts
│   └── openapi.yaml
├── openapi.yaml
├── CMakeLists.txt
├── Dockerfile
└── docker-compose.yml
```

## Next steps

- Port the same OpenAPI contract to STM32CubeIDE firmware with Ethernet or USB-CDC gateway
- Add Modbus register map as a second resource group in the spec
- Wire UIGen overrides to embed the visual board inside the generated admin UI
