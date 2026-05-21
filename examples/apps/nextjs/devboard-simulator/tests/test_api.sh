#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${DEVBOARD_API_BASE:-http://127.0.0.1:3000}"
PORT="${DEVBOARD_API_PORT:-3000}"
CURL=(curl -fsS --max-time 5)
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "Starting Next.js DevBoard simulator on port ${PORT}..."
(cd "${ROOT_DIR}" && npm run start) &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if "${CURL[@]}" "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

"${CURL[@]}" "${BASE_URL}/api/health" | grep -q '"status":"ok"'
"${CURL[@]}" "${BASE_URL}/" | grep -q "UIGen DevBoard"
"${CURL[@]}" "${BASE_URL}/openapi.yaml" | grep -q "UIGen DevBoard Simulator"
"${CURL[@]}" "${BASE_URL}/api/v1/state?limit=5" | grep -q '"blinking"'
"${CURL[@]}" "${BASE_URL}/api/v1/board" | grep -q "UIGen DevBoard v1"
"${CURL[@]}" "${BASE_URL}/api/v1/pins" | grep -q "D0"
"${CURL[@]}" "${BASE_URL}/api/v1/pins/1" | grep -q '"id": 1'
"${CURL[@]}" -X PUT "${BASE_URL}/api/v1/pins/1" \
  -H "Content-Type: application/json" \
  -d '{"mode":"output","state":"high"}' | grep -q '"state": "high"'
"${CURL[@]}" "${BASE_URL}/api/v1/sensors" | grep -q "Ambient Temperature"
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

echo "All DevBoard simulator API and page checks passed."
