import { describe, expect, it, beforeEach } from 'vitest';
import { DeviceSimulator, resetSimulatorForTests, LED_PIN_ID } from './device-simulator';

describe('DeviceSimulator', () => {
  beforeEach(() => {
    resetSimulatorForTests();
  });

  it('returns generic board identity', () => {
    const simulator = new DeviceSimulator();
    const board = simulator.getBoardInfo();
    expect(board.model).toBe('UIGen DevBoard v1');
    expect(board.chip).toBe('UG-CORE-M4');
    expect(board.network_connected).toBe(true);
  });

  it('toggles output pins', () => {
    const simulator = new DeviceSimulator();
    const updated = simulator.updatePin(LED_PIN_ID, { mode: 'output', state: 'high' });
    expect(updated?.state).toBe('high');

    const pin = simulator.getPin(LED_PIN_ID);
    expect(pin?.state).toBe('high');
  });

  it('advances telemetry lazily on access', () => {
    const simulator = new DeviceSimulator();
    const before = simulator.listReadings().length;

    const config = simulator.getConfig();
    simulator.updateConfig({ telemetry_interval_ms: 1 });

    const start = Date.now();
    while (Date.now() - start < 20) {
      simulator.tick(Date.now());
    }

    simulator.updateConfig(config);
    expect(simulator.listReadings().length).toBeGreaterThan(before);
  });

  it('captures manual sensor readings', () => {
    const simulator = new DeviceSimulator();
    const reading = simulator.takeReading(2);
    expect(reading.sensor_id).toBe(2);
    expect(reading.unit).toBe('C');
  });

  it('returns snapshot with pins, sensors, and events', () => {
    const simulator = new DeviceSimulator();
    simulator.updatePin(LED_PIN_ID, { mode: 'output', state: 'high' });
    const snapshot = simulator.getSnapshot(5);

    expect(snapshot.pins.length).toBeGreaterThan(0);
    expect(snapshot.sensors.length).toBe(4);
    expect(snapshot.events.some((event) => event.type === 'boot')).toBe(true);
    expect(snapshot.board.model).toBe('UIGen DevBoard v1');
  });

  it('resets simulator state', () => {
    const simulator = new DeviceSimulator();
    simulator.updatePin(LED_PIN_ID, { mode: 'output', state: 'high' });
    simulator.takeReading(2);
    simulator.reset();

    const pin = simulator.getPin(LED_PIN_ID);
    expect(pin?.state).toBe('low');
    expect(simulator.listReadings().length).toBe(0);
    expect(simulator.getSnapshot().events.some((event) => event.type === 'reset')).toBe(true);
  });

  it('rejects concurrent blink requests', () => {
    const simulator = new DeviceSimulator();
    expect(simulator.blinkLed(2, 50)).toBe(true);
    expect(simulator.blinkLed(2, 50)).toBe(false);
  });
});
