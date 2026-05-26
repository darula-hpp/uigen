import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { DetailStreamConfig } from '../../../ir/types.js';

interface DetailStreamAnnotation {
  operationId: string;
}

interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
      description?: string;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-detail-stream on detail GET operations.
 * Pins which nested list operation to embed on the detail page.
 */
export class DetailStreamHandler implements AnnotationHandler<DetailStreamAnnotation> {
  public readonly name = 'x-uigen-detail-stream';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-detail-stream',
    description:
      'Selects a nested list GET operation to show as a live stream panel on the detail view',
    targetType: 'operation',
    parameterSchema: {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
          description: 'OpenAPI operationId of the nested list GET to embed'
        }
      },
      required: ['operationId']
    },
    examples: [
      {
        description: 'Embed sensor readings on sensor detail',
        value: { operationId: 'list_sensor_readings' }
      }
    ]
  };

  extract(context: AnnotationContext): DetailStreamAnnotation | undefined {
    if (!context.operation || context.operation.viewHint !== 'detail') {
      return undefined;
    }

    const element = context.element as Record<string, unknown>;
    const annotation = element['x-uigen-detail-stream'];

    if (annotation === undefined) {
      return undefined;
    }

    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      context.utils.logWarning(
        `x-uigen-detail-stream at ${context.path} must be a plain object`
      );
      return undefined;
    }

    return annotation as DetailStreamAnnotation;
  }

  validate(value: DetailStreamAnnotation): boolean {
    if (typeof value.operationId !== 'string' || value.operationId.trim() === '') {
      console.warn('x-uigen-detail-stream: operationId is required');
      return false;
    }

    return true;
  }

  apply(value: DetailStreamAnnotation, context: AnnotationContext): void {
    if (!context.operation) {
      return;
    }

    const config: DetailStreamConfig = {
      operationId: value.operationId.trim()
    };

    context.operation.detailStreamConfig = config;
  }
}
