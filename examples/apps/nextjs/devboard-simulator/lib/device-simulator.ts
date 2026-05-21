export type PinMode = 'input' | 'output' | 'input_pullup' | 'input_pulldown' | 'analog';
export type PinState = 'low' | 'high';
export type PinSide = 'left' | 'right' | 'top' | 'bottom';
export type SensorType = 'temperature' | 'humidity' | 'voltage' | 'internal_temperature';

export interface BoardInfo {
  model: string;
  chip: string;
  mac_address: string;
  firmware_version: string;
  cpu_mhz: number;
  free_memory_bytes: number;
  uptime_seconds: number;
  network_connected: boolean;
  network_ssid: string;
  network_rssi: number;
}

export interface BoardConfig {
  hostname: string;
  telemetry_interval_ms: number;
  temperature_alert_celsius: number;
  auto_blink_on_alert: boolean;
  adc_resolution_bits: number;
}

export interface Pin {
  id: number;
  name: string;
  mode: PinMode;
  state: PinState;
  supports_adc: boolean;
  adc_voltage?: number;
  side: PinSide;
  row: number;
}

export interface Sensor {
  id: number;
  name: string;
  type: SensorType;
  unit: string;
  pin_id: number;
  min_value: number;
  max_value: number;
}

export interface Reading {
  id: number;
  sensor_id: number;
  value: number;
  unit: string;
  recorded_at: string;
}

export interface SimulationEvent {
  id: number;
  type: string;
  message: string;
  recorded_at: string;
}

export interface SensorSnapshot {
  sensor: Sensor;
  latest_reading?: Reading;
  recent_readings: Reading[];
}

export interface BoardSnapshot {
  board: BoardInfo;
  config: BoardConfig;
  pins: Pin[];
  sensors: SensorSnapshot[];
  events: SimulationEvent[];
  blinking: boolean;
}

export interface PinUpdate {
  mode: PinMode;
  state?: PinState;
}

export interface BlinkRequest {
  times?: number;
  interval_ms?: number;
}

const LED_PIN_ID = 1;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nowIso8601(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

interface PinDefinition {
  id: number;
  name: string;
  mode: PinMode;
  state: PinState;
  adc: boolean;
  side: PinSide;
  row: number;
}

export class DeviceSimulator {
  private board: BoardInfo;
  private config: BoardConfig;
  private pins: Pin[] = [];
  private sensors: Sensor[] = [];
  private readings: Reading[] = [];
  private events: SimulationEvent[] = [];
  private nextReadingId = 1;
  private nextEventId = 1;
  private blinking = false;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = Date.now();
  private lastTelemetryAt = Date.now();
  private rng = mulberry32(42);

  constructor() {
    this.board = {
      model: 'UIGen DevBoard v1',
      chip: 'UG-CORE-M4',
      mac_address: '02:UG:EN:00:01:00',
      firmware_version: '1.0.0-sim',
      cpu_mhz: 120,
      free_memory_bytes: 287744,
      uptime_seconds: 0,
      network_connected: true,
      network_ssid: 'Lab-Network',
      network_rssi: -58,
    };

    this.config = {
      hostname: 'devboard-simulator',
      telemetry_interval_ms: 2000,
      temperature_alert_celsius: 35.0,
      auto_blink_on_alert: true,
      adc_resolution_bits: 12,
    };

    this.initializePins();
    this.initializeSensors();
    this.recordEvent('boot', 'UIGen DevBoard simulator started');

    for (const sensor of this.sensors) {
      this.takeReading(sensor.id);
    }
  }

  private initializePins(): void {
    const definitions: PinDefinition[] = [
      { id: 1, name: 'D0 (Status LED)', mode: 'output', state: 'low', adc: false, side: 'top', row: 2 },
      { id: 2, name: 'D1', mode: 'output', state: 'low', adc: false, side: 'top', row: 0 },
      { id: 3, name: 'D2', mode: 'output', state: 'low', adc: false, side: 'top', row: 1 },
      { id: 4, name: 'D3', mode: 'input_pullup', state: 'high', adc: false, side: 'top', row: 3 },
      { id: 5, name: 'D4', mode: 'input', state: 'low', adc: false, side: 'top', row: 4 },
      { id: 10, name: 'P0 (3V3)', mode: 'output', state: 'high', adc: false, side: 'left', row: 0 },
      { id: 11, name: 'P1 (5V)', mode: 'output', state: 'high', adc: false, side: 'left', row: 1 },
      { id: 12, name: 'P2 (Enable)', mode: 'input_pullup', state: 'high', adc: false, side: 'left', row: 2 },
      { id: 13, name: 'P3 (Reset)', mode: 'input', state: 'low', adc: false, side: 'left', row: 3 },
      { id: 20, name: 'I2C SDA', mode: 'input_pullup', state: 'high', adc: false, side: 'right', row: 0 },
      { id: 21, name: 'I2C SCL', mode: 'input_pullup', state: 'high', adc: false, side: 'right', row: 1 },
      { id: 22, name: 'SPI MOSI', mode: 'output', state: 'low', adc: false, side: 'right', row: 2 },
      { id: 23, name: 'UART TX', mode: 'output', state: 'low', adc: false, side: 'right', row: 3 },
      { id: 30, name: 'A0', mode: 'analog', state: 'low', adc: true, side: 'bottom', row: 0 },
      { id: 31, name: 'A1', mode: 'analog', state: 'low', adc: true, side: 'bottom', row: 1 },
      { id: 32, name: 'A2', mode: 'analog', state: 'low', adc: true, side: 'bottom', row: 2 },
      { id: 33, name: 'A3', mode: 'input', state: 'low', adc: false, side: 'bottom', row: 3 },
      { id: 34, name: 'A4', mode: 'input', state: 'low', adc: false, side: 'bottom', row: 4 },
    ];

    this.pins = definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      mode: definition.mode,
      state: definition.state,
      supports_adc: definition.adc,
      adc_voltage: definition.adc ? 0 : undefined,
      side: definition.side,
      row: definition.row,
    }));
  }

  private initializeSensors(): void {
    this.sensors = [
      { id: 1, name: 'Die Temperature', type: 'internal_temperature', unit: 'C', pin_id: 0, min_value: 20, max_value: 85 },
      { id: 2, name: 'Ambient Temperature', type: 'temperature', unit: 'C', pin_id: 33, min_value: -40, max_value: 80 },
      { id: 3, name: 'Humidity', type: 'humidity', unit: '%', pin_id: 33, min_value: 0, max_value: 100 },
      { id: 4, name: 'Rail Voltage', type: 'voltage', unit: 'V', pin_id: 30, min_value: 0, max_value: 5.0 },
    ];
  }

  private uptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  private recordEvent(type: string, message: string): void {
    this.events.push({
      id: this.nextEventId++,
      type,
      message,
      recorded_at: nowIso8601(),
    });

    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  private simulateSensorValue(sensor: Sensor): number {
    const phase = this.uptimeSeconds() / 10;
    const noise = () => (this.rng() - 0.5);

    switch (sensor.type) {
      case 'internal_temperature':
        return 38.0 + Math.sin(phase) * 2.5 + noise();
      case 'temperature':
        return 24.0 + Math.sin(phase / 2) * 4.0 + noise();
      case 'humidity':
        return 55.0 + Math.cos(phase / 3) * 10.0 + noise();
      case 'voltage':
        return 3.7 + Math.sin(phase / 4) * 0.2 + noise() * 0.05;
      default:
        return 0;
    }
  }

  tick(now = Date.now()): void {
    while (now - this.lastTelemetryAt >= this.config.telemetry_interval_ms) {
      this.lastTelemetryAt += this.config.telemetry_interval_ms;

      for (const sensor of this.sensors) {
        this.readings.push({
          id: this.nextReadingId++,
          sensor_id: sensor.id,
          value: this.simulateSensorValue(sensor),
          unit: sensor.unit,
          recorded_at: nowIso8601(),
        });
      }

      if (this.readings.length > 500) {
        this.readings = this.readings.slice(-500);
      }

      for (const pin of this.pins) {
        if (pin.supports_adc) {
          pin.adc_voltage = this.simulateSensorValue({
            id: 0,
            name: '',
            type: 'voltage',
            unit: 'V',
            pin_id: pin.id,
            min_value: 0,
            max_value: 3.3,
          });
        }
      }

      const dieTemp = this.simulateSensorValue(this.sensors[0]);
      if (this.config.auto_blink_on_alert && dieTemp >= this.config.temperature_alert_celsius) {
        this.recordEvent('alert', 'Die temperature exceeded alert threshold');
      }
    }
  }

  getBoardInfo(): BoardInfo {
    this.tick();
    return {
      ...this.board,
      uptime_seconds: this.uptimeSeconds(),
      free_memory_bytes: Math.max(163840, 320000 - this.uptimeSeconds() * 42),
    };
  }

  getConfig(): BoardConfig {
    this.tick();
    return { ...this.config };
  }

  updateConfig(partial: Partial<BoardConfig>): BoardConfig {
    this.tick();
    this.config = { ...this.config, ...partial };
    this.recordEvent('config', 'Board configuration updated');
    return { ...this.config };
  }

  listPins(): Pin[] {
    this.tick();
    return this.pins.map((pin) => ({ ...pin }));
  }

  getPin(pinId: number): Pin | null {
    this.tick();
    const pin = this.pins.find((entry) => entry.id === pinId);
    return pin ? { ...pin } : null;
  }

  updatePin(pinId: number, update: PinUpdate): Pin | null {
    this.tick();
    const pin = this.pins.find((entry) => entry.id === pinId);
    if (!pin) {
      return null;
    }

    pin.mode = update.mode;
    if (update.state) {
      pin.state = update.state;
    }

    if (pin.supports_adc) {
      pin.adc_voltage = this.simulateSensorValue({
        id: 0,
        name: '',
        type: 'voltage',
        unit: 'V',
        pin_id: pin.id,
        min_value: 0,
        max_value: 3.3,
      });
    }

    this.recordEvent('pin', `${pin.name} set to ${pin.state === 'high' ? 'HIGH' : 'LOW'}`);
    return { ...pin };
  }

  listSensors(): Sensor[] {
    this.tick();
    return this.sensors.map((sensor) => ({ ...sensor }));
  }

  getSensor(sensorId: number): Sensor | null {
    this.tick();
    const sensor = this.sensors.find((entry) => entry.id === sensorId);
    return sensor ? { ...sensor } : null;
  }

  listReadings(sensorId = 0, limit = 100): Reading[] {
    this.tick();
    let filtered = this.readings;
    if (sensorId > 0) {
      filtered = filtered.filter((reading) => reading.sensor_id === sensorId);
    }
    if (limit > 0 && filtered.length > limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered.map((reading) => ({ ...reading }));
  }

  takeReading(sensorId: number): Reading {
    this.tick();
    const sensor = this.sensors.find((entry) => entry.id === sensorId);
    if (!sensor) {
      throw new Error('Sensor not found');
    }

    const reading: Reading = {
      id: this.nextReadingId++,
      sensor_id: sensor.id,
      value: this.simulateSensorValue(sensor),
      unit: sensor.unit,
      recorded_at: nowIso8601(),
    };

    this.readings.push(reading);
    if (this.readings.length > 500) {
      this.readings = this.readings.slice(-500);
    }

    this.recordEvent('sensor', `${sensor.name} sampled at ${reading.value}${sensor.unit}`);
    return { ...reading };
  }

  blinkLed(times = 3, intervalMs = 200): boolean {
    this.tick();
    if (this.blinking) {
      return false;
    }

    this.blinking = true;
    this.recordEvent('action', 'Blinking status LED on D0');

    let step = 0;
    const totalSteps = times * 2;

    const runStep = () => {
      const high = step % 2 === 0;
      this.updatePin(LED_PIN_ID, { mode: 'output', state: high ? 'high' : 'low' });
      step += 1;

      if (step >= totalSteps) {
        this.blinking = false;
        this.blinkTimer = null;
        this.recordEvent('action', 'LED blink sequence finished');
        return;
      }

      this.blinkTimer = setTimeout(runStep, intervalMs);
    };

    this.blinkTimer = setTimeout(runStep, intervalMs);
    return true;
  }

  reset(): void {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }

    this.startedAt = Date.now();
    this.lastTelemetryAt = Date.now();
    this.readings = [];
    this.events = [];
    this.nextReadingId = 1;
    this.nextEventId = 1;
    this.blinking = false;
    this.rng = mulberry32(42);
    this.initializePins();
    this.initializeSensors();
    this.recordEvent('reset', 'Simulator state reset to defaults');
  }

  getSnapshot(readingLimit = 30): BoardSnapshot {
    this.tick();
    const board = this.getBoardInfo();

    const sensors: SensorSnapshot[] = this.sensors.map((sensor) => {
      const recent = this.readings.filter((reading) => reading.sensor_id === sensor.id);
      const trimmed = recent.length > readingLimit ? recent.slice(-readingLimit) : recent;
      return {
        sensor: { ...sensor },
        recent_readings: trimmed.map((reading) => ({ ...reading })),
        latest_reading: trimmed.length > 0 ? { ...trimmed[trimmed.length - 1] } : undefined,
      };
    });

    return {
      board,
      config: { ...this.config },
      pins: this.pins.map((pin) => ({ ...pin })),
      sensors,
      events: this.events.map((event) => ({ ...event })),
      blinking: this.blinking,
    };
  }
}

const globalForSimulator = globalThis as typeof globalThis & {
  __devboardSimulator?: DeviceSimulator;
};

export function getSimulator(): DeviceSimulator {
  if (!globalForSimulator.__devboardSimulator) {
    globalForSimulator.__devboardSimulator = new DeviceSimulator();
  }
  return globalForSimulator.__devboardSimulator;
}

export function resetSimulatorForTests(): void {
  globalForSimulator.__devboardSimulator = new DeviceSimulator();
}

export { LED_PIN_ID };
