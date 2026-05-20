#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
BINARY="${BUILD_DIR}/esp32_simulator"
BASE_URL="${ESP32_API_BASE:-http://127.0.0.1:8080}"
PORT="${ESP32_API_PORT:-8080}"
CURL=(curl -fsS --max-time 5)
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

if [[ ! -x "${BINARY}" ]]; then
  echo "Building simulator..."
  cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}"
  cmake --build "${BUILD_DIR}" --target esp32_simulator
fi

echo "Starting ESP32 simulator on port ${PORT}..."
"${BINARY}" \
  --port "${PORT}" \
  --openapi "${ROOT_DIR}/openapi.yaml" \
  --web "${ROOT_DIR}/web" &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if "${CURL[@]}" "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

"${CURL[@]}" "${BASE_URL}/health" | grep -q '"status":"ok"'
"${CURL[@]}" "${BASE_URL}/" | grep -q "ESP32-DevKitC Simulator"
"${CURL[@]}" "${BASE_URL}/assets/app.js" | grep -q "fetchState"
"${CURL[@]}" "${BASE_URL}/openapi.yaml" | grep -q "ESP32 Board Simulator"
"${CURL[@]}" "${BASE_URL}/api/v1/state?limit=5" | grep -q '"blinking"'
"${CURL[@]}" "${BASE_URL}/api/v1/board" | grep -q "ESP32-DevKitC"
"${CURL[@]}" "${BASE_URL}/api/v1/pins" | grep -q "GPIO2"
"${CURL[@]}" "${BASE_URL}/api/v1/pins/2" | grep -q '"id": 2'
"${CURL[@]}" -X PUT "${BASE_URL}/api/v1/pins/2" \
  -H "Content-Type: application/json" \
  -d '{"mode":"output","state":"high"}' | grep -q '"state": "high"'
"${CURL[@]}" "${BASE_URL}/api/v1/sensors" | grep -q "DHT22"
"${CURL[@]}" "${BASE_URL}/api/v1/sensors/2" | grep -q '"type": "temperature"'
"${CURL[@]}" "${BASE_URL}/api/v1/sensors/2/readings?limit=5" | grep -q '"sensor_id": 2'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/sensors/2/readings" -d '' | grep -q '"value":'
"${CURL[@]}" "${BASE_URL}/api/v1/readings?sensor_id=2&limit=5" | grep -q '"unit": "C"'
"${CURL[@]}" "${BASE_URL}/api/v1/config" | grep -q "telemetry_interval_ms"
"${CURL[@]}" -X PUT "${BASE_URL}/api/v1/config" \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test-board","telemetry_interval_ms":1000}' | grep -q '"hostname": "test-board"'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/actions/blink" \
  -H "Content-Type: application/json" \
  -d '{"times":2,"interval_ms":100}' | grep -q '"status":"blinking"'
"${CURL[@]}" -X POST "${BASE_URL}/api/v1/actions/reset" -d '' | grep -q "reset_complete"

echo "All ESP32 simulator API and visual demo checks passed."
