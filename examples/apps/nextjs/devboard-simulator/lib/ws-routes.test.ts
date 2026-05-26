import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseWsPath,
  buildWsPayload,
  sensorIdFromSubscribe
} from './ws-routes';
import { resetSimulatorForTests } from './device-simulator';

describe('ws-routes', () => {
  beforeEach(() => {
    resetSimulatorForTests();
  });

  it('parses known websocket paths', () => {
    expect(parseWsPath('/ws/v1/board')).toEqual({ kind: 'board' });
    expect(parseWsPath('/ws/v1/pins/2')).toEqual({ kind: 'pin', pinId: 2 });
    expect(parseWsPath('/ws/v1/sensors/3/readings')).toEqual({
      kind: 'sensor_readings',
      sensorId: 3
    });
  });

  it('returns null for unknown paths', () => {
    expect(parseWsPath('/api/v1/board')).toBeNull();
    expect(parseWsPath('/ws/v1/state')).toBeNull();
  });

  it('buildWsPayload mirrors REST board shape', () => {
    const payload = buildWsPayload({ kind: 'board' }) as { model: string };
    expect(payload.model).toBe('UIGen DevBoard v1');
  });

  it('sensorIdFromSubscribe reads params.sensor_id', () => {
    expect(
      sensorIdFromSubscribe(
        JSON.stringify({ action: 'subscribe', params: { sensor_id: '2' } })
      )
    ).toBe(2);
  });

  it('filters readings websocket by subscribe sensor_id', () => {
    const all = buildWsPayload({ kind: 'readings' }, 0) as Array<{ sensor_id: number }>;
    const filtered = buildWsPayload({ kind: 'readings' }, 2) as Array<{ sensor_id: number }>;

    expect(all.length).toBeGreaterThan(0);
    expect(filtered.every((reading) => reading.sensor_id === 2)).toBe(true);
  });
});
