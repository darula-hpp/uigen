import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { WebSocketConfig, WebSocketMergeMode } from '../../../ir/types.js';

const VALID_MODES: WebSocketMergeMode[] = ['replace', 'append'];

/**
 * Raw x-uigen-websocket annotation before normalization.
 */
interface WebSocketAnnotation {
  path: string;
  mode?: string;
  appendField?: string;
  subscribe?: Record<string, unknown>;
}

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
      description?: string;
      enum?: string[];
      items?: unknown;
      properties?: Record<string, unknown>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-websocket annotation.
 * Attaches live WebSocket streaming config to REST operations.
 */
export class WebSocketHandler implements AnnotationHandler<WebSocketAnnotation> {
  public readonly name = 'x-uigen-websocket';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-websocket',
    description:
      'Declares a WebSocket stream that augments a REST operation with live updates',
    targetType: 'operation',
    parameterSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'WebSocket path on the API host (must start with /)'
        },
        mode: {
          type: 'enum',
          enum: ['replace', 'append'],
          description: 'How incoming messages merge into cached REST data'
        },
        appendField: {
          type: 'string',
          description: 'Dot path to array field when mode is append'
        },
        subscribe: {
          type: 'object',
          description: 'Optional JSON sent once after the socket opens'
        }
      },
      required: ['path']
    },
    examples: [
      {
        description: 'Live snapshot replacement',
        value: {
          path: '/ws/v1/board',
          mode: 'replace'
        }
      },
      {
        description: 'Append telemetry readings to a list field',
        value: {
          path: '/ws/v1/readings',
          mode: 'append',
          appendField: 'readings'
        }
      },
      {
        description: 'Subscribe message on connect',
        value: {
          path: '/ws/v1/state',
          mode: 'replace',
          subscribe: { action: 'subscribe', channel: 'state' }
        }
      }
    ]
  };

  extract(context: AnnotationContext): WebSocketAnnotation | undefined {
    if (!context.operation) {
      return undefined;
    }

    const element = context.element as Record<string, unknown>;
    const annotation = element['x-uigen-websocket'];

    if (annotation === undefined) {
      return undefined;
    }

    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      context.utils.logWarning(
        `x-uigen-websocket at ${context.path} must be a plain object, found ${
          annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
        }`
      );
      return undefined;
    }

    return annotation as WebSocketAnnotation;
  }

  validate(value: WebSocketAnnotation): boolean {
    if (typeof value.path !== 'string' || value.path.trim() === '' || !value.path.startsWith('/')) {
      console.warn('x-uigen-websocket: path is required and must start with /');
      return false;
    }

    const mode = (value.mode ?? 'replace') as WebSocketMergeMode;
    if (!VALID_MODES.includes(mode)) {
      console.warn(`x-uigen-websocket: mode must be one of: ${VALID_MODES.join(', ')}`);
      return false;
    }

    if (mode === 'append') {
      if (typeof value.appendField !== 'string' || value.appendField.trim() === '') {
        console.warn('x-uigen-websocket: appendField is required when mode is append');
        return false;
      }
    }

    if (value.subscribe !== undefined) {
      if (
        typeof value.subscribe !== 'object' ||
        value.subscribe === null ||
        Array.isArray(value.subscribe)
      ) {
        console.warn('x-uigen-websocket: subscribe must be a plain object when provided');
        return false;
      }
    }

    return true;
  }

  apply(value: WebSocketAnnotation, context: AnnotationContext): void {
    if (!context.operation) {
      return;
    }

    const mode = (value.mode ?? 'replace') as WebSocketMergeMode;
    const config: WebSocketConfig = {
      path: value.path.trim(),
      mode
    };

    if (mode === 'append' && value.appendField) {
      config.appendField = value.appendField.trim();
    }

    if (value.subscribe !== undefined) {
      config.subscribe = value.subscribe;
    }

    context.operation.websocketConfig = config;
  }
}
