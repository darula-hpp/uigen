#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
BINARY="${BUILD_DIR}/stm32_nucleo_simulator"
BASE_URL="${STM32_API_BASE:-http://localhost:8081}"
PORT="${STM32_API_PORT:-8081}"
CURL=(curl -fsS --max-time 5)
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

if command -v lsof >/dev/null 2>&1; then
  lsof -ti ":${PORT}" | xargs kill -9 2>/dev/null || true
  sleep 0.3
fi

if [[ ! -x "${BINARY}" ]]; then
  echo "Building simulator..."
  cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}"
  cmake --build "${BUILD_DIR}" --target stm32_nucleo_simulator
fi

echo "Starting STM32 Nucleo simulator on port ${PORT}..."
"${BINARY}" \
  --port "${PORT}" \
  --openapi "${ROOT_DIR}/openapi.yaml" \
  --web "${ROOT_DIR}/web" &
SERVER_PID=$!

for _ in $(seq 1 50); do
  if "${CURL[@]}" "${BASE_URL}/health" >/dev/null 2>&1; then
    if "${CURL[@]}" "${BASE_URL}/" | grep -q "NUCLEO-F411RE Simulator"; then
      break
    fi
  fi
  sleep 0.2
done

"${CURL[@]}" "${BASE_URL}/health" | grep -q '"status":"ok"'
"${CURL[@]}" "${BASE_URL}/" | grep -q "NUCLEO-F411RE Simulator"
"${CURL[@]}" "${BASE_URL}/assets/app.js" | grep -q "fetchState"
"${CURL[@]}" "${BASE_URL}/openapi.yaml" | grep -q "STM32 Nucleo Board Simulator"
"${CURL[@]}" "${BASE_URL}/api/v1/state?limit=5" | grep -q '"blinking"'
"${CURL[@]}" "${BASE_URL}/api/v1/board" | grep -q "NUCLEO-F411RE"
"${CURL[@]}" "${BASE_URL}/api/v1/board" | grep -q "stlink_connected"
"${CURL[@]}" "${BASE_URL}/api/v1/pins" | grep -q "D13 (PA5 / LD2)"
"${CURL[@]}" "${BASE_URL}/api/v1/pins/13" | grep -q '"id": 13'
"${CURL[@]}" -X PUT "${BASE_URL}/api/v1/pins/13" \
  -H "Content-Type: application/json" \
  -d '{"mode":"output","state":"high"}' | grep -q '"state": "high"'
"${CURL[@]}" "${BASE_URL}/api/v1/sensors" | grep -q "SHT31"
"${CURL[@]}" "${BASE_URL}/api/v1/sensors/2" | grep -q '"type": "temperature"'
"${CURL[@]}" "${BASE_URL}/api/v1/sensors/4/readings?limit=5" | grep -q '"sensor_id": 4'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/sensors/2/readings" -d '' | grep -q '"value":'
"${CURL[@]}" "${BASE_URL}/api/v1/readings?sensor_id=2&limit=5" | grep -q '"unit": "C"'
"${CURL[@]}" "${BASE_URL}/api/v1/config" | grep -q "telemetry_interval_ms"
"${CURL[@]}" -X PUT "${BASE_URL}/api/v1/config" \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test-nucleo","telemetry_interval_ms":1000}' | grep -q '"hostname": "test-nucleo"'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/actions/blink" \
  -H "Content-Type: application/json" \
  -d '{"times":2,"interval_ms":100}' | grep -q '"pin_id":13'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/actions/reset" -d '' | grep -q "reset_complete"

echo "All STM32 Nucleo simulator API and visual demo checks passed."
