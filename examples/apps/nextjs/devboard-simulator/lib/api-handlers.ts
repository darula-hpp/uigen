import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import {
  getSimulator,
  type BlinkRequest,
  type BoardConfig,
  type PinUpdate,
} from './device-simulator';

const PROJECT_ROOT = join(process.cwd());

function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse({ error: message, status }, status);
}

function parseIntParam(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function handleHealth(): Promise<NextResponse> {
  return jsonResponse({ status: 'ok' });
}

export async function handleOpenApiSpec(): Promise<NextResponse> {
  const content = readFileSync(join(PROJECT_ROOT, 'openapi.yaml'), 'utf-8');
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/yaml',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function handleV1Route(
  method: string,
  segments: string[],
  searchParams: URLSearchParams,
  body?: unknown
): Promise<NextResponse> {
  const simulator = getSimulator();
  const path = segments.join('/');

  switch (method) {
    case 'GET':
      switch (path) {
        case 'board':
          return jsonResponse(simulator.getBoardInfo());
        case 'state': {
          const limit = parseIntParam(searchParams.get('limit') ?? undefined, 30);
          return jsonResponse(simulator.getSnapshot(limit));
        }
        case 'config':
          return jsonResponse(simulator.getConfig());
        case 'pins':
          return jsonResponse(simulator.listPins());
        case 'sensors':
          return jsonResponse(simulator.listSensors());
        case 'readings': {
          const sensorId = parseIntParam(searchParams.get('sensor_id') ?? undefined, 0);
          const limit = parseIntParam(searchParams.get('limit') ?? undefined, 100);
          return jsonResponse(simulator.listReadings(sensorId, limit));
        }
        default: {
          const pinMatch = path.match(/^pins\/(\d+)$/);
          if (pinMatch) {
            const pin = simulator.getPin(Number.parseInt(pinMatch[1], 10));
            return pin ? jsonResponse(pin) : errorResponse('Pin not found', 404);
          }

          const sensorMatch = path.match(/^sensors\/(\d+)$/);
          if (sensorMatch) {
            const sensor = simulator.getSensor(Number.parseInt(sensorMatch[1], 10));
            return sensor ? jsonResponse(sensor) : errorResponse('Sensor not found', 404);
          }

          const readingsMatch = path.match(/^sensors\/(\d+)\/readings$/);
          if (readingsMatch) {
            const sensorId = Number.parseInt(readingsMatch[1], 10);
            if (!simulator.getSensor(sensorId)) {
              return errorResponse('Sensor not found', 404);
            }
            const limit = parseIntParam(searchParams.get('limit') ?? undefined, 100);
            return jsonResponse(simulator.listReadings(sensorId, limit));
          }

          return errorResponse('Not found', 404);
        }
      }

    case 'PUT':
      if (path === 'config') {
        const updated = simulator.updateConfig(body as Partial<BoardConfig>);
        return jsonResponse(updated);
      }

      {
        const pinMatch = path.match(/^pins\/(\d+)$/);
        if (pinMatch) {
          const pinId = Number.parseInt(pinMatch[1], 10);
          const update = body as PinUpdate;
          if (!update?.mode) {
            return errorResponse('Invalid pin update', 400);
          }
          const pin = simulator.updatePin(pinId, update);
          return pin ? jsonResponse(pin) : errorResponse('Pin not found', 404);
        }
      }
      return errorResponse('Not found', 404);

    case 'POST':
      switch (path) {
        case 'actions/blink': {
          const request = (body ?? {}) as BlinkRequest;
          const started = simulator.blinkLed(request.times ?? 3, request.interval_ms ?? 200);
          return started
            ? jsonResponse({ status: 'blinking', pin_id: 1 }, 202)
            : errorResponse('Blink already in progress', 409);
        }
        case 'actions/reset':
          simulator.reset();
          return jsonResponse({ status: 'reset_complete', pin_id: 1 });
        default: {
          const readingMatch = path.match(/^sensors\/(\d+)\/readings$/);
          if (readingMatch) {
            const sensorId = Number.parseInt(readingMatch[1], 10);
            try {
              const reading = simulator.takeReading(sensorId);
              return jsonResponse(reading, 201);
            } catch {
              return errorResponse('Sensor not found', 404);
            }
          }
          return errorResponse('Not found', 404);
        }
      }

    default:
      return errorResponse('Method not allowed', 405);
  }
}

export function corsOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
