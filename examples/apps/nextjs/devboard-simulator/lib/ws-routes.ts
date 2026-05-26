import { getSimulator } from './device-simulator';

export const WS_STREAM_INTERVAL_MS = 500;
export const WS_READINGS_LIMIT = 100;

export type WsRouteKind =
  | 'board'
  | 'pins'
  | 'sensors'
  | 'readings'
  | 'pin'
  | 'sensor'
  | 'sensor_readings';

export interface WsRoute {
  kind: WsRouteKind;
  pinId?: number;
  sensorId?: number;
}

export function parseWsPath(pathname: string): WsRoute | null {
  const path = pathname.replace(/\/$/, '');

  switch (path) {
    case '/ws/v1/board':
      return { kind: 'board' };
    case '/ws/v1/pins':
      return { kind: 'pins' };
    case '/ws/v1/sensors':
      return { kind: 'sensors' };
    case '/ws/v1/readings':
      return { kind: 'readings' };
    default:
      break;
  }

  const pinMatch = path.match(/^\/ws\/v1\/pins\/(\d+)$/);
  if (pinMatch) {
    return { kind: 'pin', pinId: Number.parseInt(pinMatch[1], 10) };
  }

  const sensorReadingsMatch = path.match(/^\/ws\/v1\/sensors\/(\d+)\/readings$/);
  if (sensorReadingsMatch) {
    return {
      kind: 'sensor_readings',
      sensorId: Number.parseInt(sensorReadingsMatch[1], 10)
    };
  }

  const sensorMatch = path.match(/^\/ws\/v1\/sensors\/(\d+)$/);
  if (sensorMatch) {
    return { kind: 'sensor', sensorId: Number.parseInt(sensorMatch[1], 10) };
  }

  return null;
}

export function sensorIdFromSubscribe(message: string): number {
  if (!message.trim()) {
    return 0;
  }

  try {
    const body = JSON.parse(message) as Record<string, unknown>;
    if (typeof body.sensor_id === 'number') {
      return body.sensor_id;
    }
    if (typeof body.sensor_id === 'string') {
      return Number.parseInt(body.sensor_id, 10) || 0;
    }

    const params = body.params;
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      const record = params as Record<string, unknown>;
      if (typeof record.sensor_id === 'number') {
        return record.sensor_id;
      }
      if (typeof record.sensor_id === 'string') {
        return Number.parseInt(record.sensor_id, 10) || 0;
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

export function buildWsPayload(route: WsRoute, filterSensorId = 0): unknown {
  const simulator = getSimulator();

  switch (route.kind) {
    case 'board':
      return simulator.getBoardInfo();
    case 'pins':
      return simulator.listPins();
    case 'sensors':
      return simulator.listSensors();
    case 'readings': {
      const sensorId = filterSensorId > 0 ? filterSensorId : 0;
      return simulator.listReadings(sensorId, WS_READINGS_LIMIT);
    }
    case 'pin': {
      if (route.pinId === undefined) {
        return { error: 'Pin not found', status: 404 };
      }
      const pin = simulator.getPin(route.pinId);
      return pin ?? { error: 'Pin not found', status: 404 };
    }
    case 'sensor': {
      if (route.sensorId === undefined) {
        return { error: 'Sensor not found', status: 404 };
      }
      const sensor = simulator.getSensor(route.sensorId);
      return sensor ?? { error: 'Sensor not found', status: 404 };
    }
    case 'sensor_readings': {
      if (route.sensorId === undefined) {
        return { error: 'Sensor not found', status: 404 };
      }
      if (!simulator.getSensor(route.sensorId)) {
        return { error: 'Sensor not found', status: 404 };
      }
      return simulator.listReadings(route.sensorId, WS_READINGS_LIMIT);
    }
    default:
      return { error: 'Not found', status: 404 };
  }
}
