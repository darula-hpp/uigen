const state = {
  snapshot: null,
  pollMs: 500,
};

const elements = {
  chipName: document.getElementById("chip-name"),
  uptime: document.getElementById("uptime"),
  heap: document.getElementById("heap"),
  wifi: document.getElementById("wifi"),
  telemetryRate: document.getElementById("telemetry-rate"),
  pinRailLeft: document.getElementById("pin-rail-left"),
  pinRailRight: document.getElementById("pin-rail-right"),
  boardLed: document.getElementById("board-led"),
  sensorCards: document.getElementById("sensor-cards"),
  eventLog: document.getElementById("event-log"),
  blinkBtn: document.getElementById("blink-btn"),
  resetBtn: document.getElementById("reset-btn"),
  pinTemplate: document.getElementById("pin-template"),
};

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function pinClasses(pin) {
  return [
    "pin-node",
    pin.mode,
    pin.state === "high" ? "high" : "",
    pin.mode === "output" ? "clickable" : "disabled",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderStatus(snapshot) {
  const { board, config } = snapshot;
  elements.chipName.textContent = board.chip;
  elements.uptime.textContent = formatUptime(board.uptime_seconds);
  elements.heap.textContent = formatBytes(board.free_heap_bytes);
  elements.wifi.textContent = board.wifi_connected
    ? `${board.wifi_ssid} (${board.wifi_rssi} dBm)`
    : "Disconnected";
  elements.telemetryRate.textContent = `${config.telemetry_interval_ms} ms`;
}

function renderPins(pins, blinking) {
  elements.pinRailLeft.innerHTML = "";
  elements.pinRailRight.innerHTML = "";

  const sorted = [...pins].sort((a, b) => a.row - b.row);
  for (const pin of sorted) {
    const node = elements.pinTemplate.content.firstElementChild.cloneNode(true);
    node.className = pinClasses(pin);
    node.dataset.pinId = String(pin.id);
    node.querySelector(".pin-id").textContent = `GPIO ${pin.id}`;
    node.querySelector(".pin-meta").textContent = `${pin.mode.toUpperCase()} · ${pin.state.toUpperCase()}`;

    if (pin.mode === "output") {
      node.addEventListener("click", () => togglePin(pin));
    }

    if (pin.side === "left") {
      elements.pinRailLeft.appendChild(node);
    } else {
      elements.pinRailRight.appendChild(node);
    }
  }

  const ledPin = pins.find((pin) => pin.id === 2);
  elements.boardLed.classList.toggle("on", ledPin?.state === "high");
  elements.boardLed.classList.toggle("blinking", blinking);
}

function drawSparkline(canvas, readings, min, max) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!readings.length) {
    return;
  }

  const range = Math.max(max - min, 0.001);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();

  readings.forEach((reading, index) => {
    const x = (index / Math.max(readings.length - 1, 1)) * (width - 12) + 6;
    const normalized = (reading.value - min) / range;
    const y = height - normalized * (height - 12) - 6;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function renderSensors(sensorSnapshots) {
  elements.sensorCards.innerHTML = "";

  for (const entry of sensorSnapshots) {
    const card = document.createElement("article");
    card.className = "sensor-card";

    const latest = entry.latest_reading;
    const value = latest ? latest.value.toFixed(latest.unit === "V" ? 2 : 1) : "--";

    card.innerHTML = `
      <header>
        <div>
          <strong>${entry.sensor.name}</strong>
          <div class="unit">${entry.sensor.type.replaceAll("_", " ")}</div>
        </div>
        <div class="value">${value}<span class="unit"> ${entry.sensor.unit}</span></div>
      </header>
      <canvas width="320" height="72"></canvas>
    `;

    const canvas = card.querySelector("canvas");
    drawSparkline(
      canvas,
      entry.recent_readings,
      entry.sensor.min_value,
      entry.sensor.max_value,
    );

    elements.sensorCards.appendChild(card);
  }
}

function renderEvents(events) {
  elements.eventLog.innerHTML = "";
  const recent = [...events].slice(-12).reverse();

  for (const event of recent) {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="type">${event.type}</span>
      <span class="message">${event.message}</span>
      <span class="time">${formatTime(event.recorded_at)}</span>
    `;
    elements.eventLog.appendChild(item);
  }
}

function render(snapshot) {
  state.snapshot = snapshot;
  renderStatus(snapshot);
  renderPins(snapshot.pins, snapshot.blinking);
  renderSensors(snapshot.sensors);
  renderEvents(snapshot.events);
}

async function fetchState() {
  const response = await fetch("/api/v1/state?limit=30");
  if (!response.ok) {
    throw new Error("Failed to fetch simulator state");
  }
  return response.json();
}

async function refresh() {
  try {
    const snapshot = await fetchState();
    render(snapshot);
  } catch (error) {
    console.error(error);
  }
}

function connectStateSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws/v1/state`);

  socket.onmessage = (event) => {
    try {
      render(JSON.parse(event.data));
    } catch (error) {
      console.error(error);
    }
  };

  socket.onclose = () => {
    window.setTimeout(connectStateSocket, 1000);
  };

  return socket;
}

async function togglePin(pin) {
  const nextState = pin.state === "high" ? "low" : "high";
  await fetch(`/api/v1/pins/${pin.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "output", state: nextState }),
  });
  await refresh();
}

async function blinkLed() {
  elements.blinkBtn.disabled = true;
  try {
    await fetch("/api/v1/actions/blink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ times: 4, interval_ms: 180 }),
    });
  } finally {
    setTimeout(() => {
      elements.blinkBtn.disabled = false;
    }, 1600);
  }
}

async function resetBoard() {
  await fetch("/api/v1/actions/reset", { method: "POST", body: "" });
  await refresh();
}

elements.blinkBtn.addEventListener("click", blinkLed);
elements.resetBtn.addEventListener("click", resetBoard);

refresh();
connectStateSocket();
