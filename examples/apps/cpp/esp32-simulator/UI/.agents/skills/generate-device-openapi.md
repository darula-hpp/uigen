# Skill: Generate Device OpenAPI for UIGen

## Overview

This skill helps hardware and embedded engineers **author `openapi.yaml`** for a device REST API so it can be fed to UIGen. It runs **before** `auto-annotate` and `uigen serve`.

**Pipeline:**
```text
1. generate-device-openapi  →  openapi.yaml        (this skill)
2. auto-annotate            →  .uigen/config.yaml
3. uigen serve openapi.yaml --proxy-base http://<device>
```

## When to Use

Use when the user:
- Has firmware or a simulator with HTTP endpoints but **no OpenAPI file**
- Asks how to "get UIGen working with my ESP32 / embedded device"
- Has curl commands, Postman collections, C struct definitions, or route tables
- Wants a **contract-first** API doc like the ESP32 simulator example

Do **not** use when:
- OpenAPI already exists and only needs UIGen annotations → use `auto-annotate.md`
- The API is Python/FastAPI → use `app.openapi()` / `export_openapi.py` instead

## How the ESP32 Example Was Written (Reference Model)

The ESP32 `openapi.yaml` was **not generated from C++**. It was **contract-first**:

1. **Define device resources** (board, pins, sensors, readings, config, actions)
2. **Design JSON shapes** to match what firmware will send on the wire
3. **Write `openapi.yaml`** as the canonical contract
4. **Implement C++** (`api_routes.hpp`, `board_simulator.hpp`) to match the contract
5. **Serve the same file** at `GET /openapi.yaml`

Schemas mirror C++ structs (`Pin`, `Reading`, `BoardConfig`). Enums in YAML match string serializers in `json_utils.hpp` (`input`/`output`, `low`/`high`).

**Gold example:** `examples/apps/cpp/esp32-simulator/openapi.yaml`

---

## Step 1: Inventory Inputs

Gather whatever the user has. Prefer concrete artifacts over guesses.

| Input | What to extract |
|---|---|
| **Route table / handler list** | Method, path, purpose |
| **C/C++ structs** | Field names, types → JSON schema properties |
| **Sample JSON responses** | Property types, enums, nested objects |
| **curl / Postman** | Endpoints, query params, request bodies |
| **User interview** | Resources, IDs, read-only vs writable fields |

Ask if missing:
- Base URL (`http://192.168.4.1`, `http://localhost:8080`)
- API prefix (`/api/v1`)
- Auth (usually none on LAN devices)
- Which endpoints are **internal only** (health, debug snapshot) vs user-facing

---

## Step 2: Design UIGen-Friendly Resources

UIGen works best with predictable REST patterns:

| Pattern | OpenAPI shape | UIGen view |
|---|---|---|
| List collection | `GET /resources` → `array` of object | ListView + table |
| Get one | `GET /resources/{id}` | DetailView |
| Update settings | `GET` + `PUT` same path, object body | FormView |
| Device action | `POST /actions/...` | Action form |
| Telemetry history | `GET /readings` → array + `limit`, filters | ListView + chart |

**Naming conventions for embedded:**
- Plural resources: `/pins`, `/sensors`, `/readings`
- Path IDs: `{pin_id}`, `{sensor_id}` (integer is fine)
- Actions namespace: `/actions/blink`, `/actions/reset`
- Config singleton: `/config` (GET + PUT)

**Avoid** unless necessary:
- RPC-style POST for reads (UIGen prefers GET lists)
- Deeply nested paths without list endpoints
- Opaque binary bodies (use JSON)

---

## Step 3: Write `components/schemas`

Map firmware types to OpenAPI (OpenAPI 3.1):

| C/C++ | OpenAPI |
|---|---|
| `int`, `int32_t` | `integer` |
| `double`, `float` | `number` / `format: float` |
| `bool` | `boolean` |
| `std::string`, `char[]` | `string` |
| enum class | `string` + `enum: [...]` |
| ISO timestamp string | `string`, `format: date-time` |
| optional field | omit from `required` |

Create:
- **Full resource schema** (e.g. `Pin`, `Reading`)
- **Update schema** when PUT accepts a subset (e.g. `PinUpdate` with only writable fields)
- **Error schema** reused for 4xx responses

Use `example` values hardware folks recognize (GPIO numbers, units, chip names).

---

## Step 4: Write `paths`

For each endpoint:

```yaml
/api/v1/readings:
  get:
    tags: [readings]
    summary: List all readings
    operationId: list_readings          # unique, snake_case
    parameters:
      - name: sensor_id
        in: query
        schema:
          type: integer
      - name: limit
        in: query
        schema:
          type: integer
          default: 100
          maximum: 500
    responses:
      '200':
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Reading'
```

**Rules:**
- Every operation needs unique `operationId`
- List endpoints return **`type: array`** at the top level (not wrapped) when possible
- Include `servers` with the device base URL
- Document query params the firmware actually supports (`limit`, `sensor_id`)
- Mark non-UI routes clearly in summary/description (health, raw state snapshot)

---

## Step 5: Mark Internal vs User-Facing Endpoints

Endpoints often exist but should not appear in UIGen sidebar. Document them anyway; `auto-annotate` will add `x-uigen-ignore` later.

Typical **ignore** candidates:
- `GET /health`
- `GET /openapi.yaml`
- `GET /api/v1/state` (visual demo snapshot only)

Typical **user-facing**:
- pins, sensors, readings, config, actions

Note these in comments or a short checklist for the auto-annotate step.

---

## Step 6: Validate Before Handoff

After writing `openapi.yaml`:

1. **YAML syntax** — valid indentation, no tabs
2. **Unique operationIds** across all paths
3. **$ref targets exist** under `components/schemas`
4. **Try UIGen parse:**
   ```bash
   uigen serve openapi.yaml --proxy-base http://localhost:8080
   ```
5. **Optional:** hit live device with curl and compare response shape to schema

Fix mismatches in the **spec** if the device behavior is authoritative, or note firmware bugs if the contract should win.

---

## Step 7: Hand Off to Auto-Annotate

Once `openapi.yaml` exists, run **`SKILLS/auto-annotate.md`** to generate `.uigen/config.yaml`:

- Labels for sidebar ("Telemetry History", "Configure Pin")
- `x-uigen-ignore` on internal routes
- `x-uigen-chart` on telemetry list responses
- `x-uigen-ref` for foreign keys (`sensor_id` → sensors)
- Layout hints (sidebar app, centered action forms)

Tell the user:
```bash
uigen serve openapi.yaml --proxy-base http://<device-ip>:<port>
```

---

## Starter Template

```yaml
openapi: 3.1.0
info:
  title: My Device API
  description: REST API for device management and telemetry.
  version: 1.0.0
servers:
  - url: http://192.168.4.1
    description: Device AP mode
tags:
  - name: board
  - name: config
  - name: readings
paths:
  /health:
    get:
      tags: [board]
      summary: Health check
      operationId: health_check
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
        status:
          type: integer
```

Expand paths and schemas from the user's inventory.

---

## Input-Specific Workflows

### From C struct headers

```cpp
struct Reading {
  int id;
  int sensor_id;
  double value;
  std::string unit;
  std::string recorded_at;
};
```

→ `Reading` schema with `integer`, `number`, `string`, `format: date-time` on `recorded_at`

### From curl

```bash
curl http://192.168.4.1/api/v1/pins/2
# {"id":2,"name":"GPIO2","mode":"output","state":"low",...}
```

→ infer `GET /api/v1/pins/{pin_id}`, create `Pin` schema from JSON keys

### From Postman collection

- Export collection to OpenAPI if available
- **Tighten** loose schemas (replace generic `object` with named `$ref` schemas)
- Rename tags/summaries for clarity
- Then run auto-annotate

### From existing route registration (ESP-IDF style)

```c
httpd_uri_t readings_uri = { .uri = "/api/v1/readings", .method = HTTP_GET, ... };
```

→ one OpenAPI path per registered URI; infer response from handler JSON output

---

## UIGen Quality Checklist

Before finishing, verify:

- [ ] At least one **array GET** for main telemetry or resource list
- [ ] Detail routes use `{id}` path param with integer or string schema
- [ ] Writable config uses **GET + PUT** on same path
- [ ] Time-series fields use `format: date-time` on timestamp columns
- [ ] Query `limit` on history endpoints (enables chart `query.limit` later)
- [ ] `servers.url` matches where `uigen serve --proxy-base` will point
- [ ] Error responses reference shared `Error` schema

---

## Output Summary

When done, report:

```text
✓ Generated openapi.yaml
  - N paths, M schemas
  - Server: http://...
  - User-facing resources: ...
  - Internal routes (ignore later): ...

Next steps:
1. Run auto-annotate skill → .uigen/config.yaml
2. uigen serve openapi.yaml --proxy-base http://<device>
3. Implement or verify firmware matches the contract
```

---

## Related Skills

| Skill | When |
|---|---|
| `auto-annotate.md` | After OpenAPI exists; writes `.uigen/config.yaml` |
| `generate-landing-page-content.md` | Optional marketing page |
| `create-overrides.md` | Custom React views (e.g. embed board visualizer) |

## Reference Implementation

- Spec: `examples/apps/cpp/esp32-simulator/openapi.yaml`
- Firmware: `examples/apps/cpp/esp32-simulator/include/api_routes.hpp`
- UIGen config: `examples/apps/cpp/esp32-simulator/UI/.uigen/config.yaml`
