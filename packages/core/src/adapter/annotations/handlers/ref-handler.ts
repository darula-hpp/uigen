import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * Internal shape of the raw x-uigen-ref annotation before validation.
 */
interface RefAnnotation {
  resource: string;
  valueField: string;
  labelField: string;
  filter?: Record<string, unknown>;
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
      items?: any;
      properties?: Record<string, any>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-ref annotation.
 * Declares that a schema field references another resource, driving
 * select/autocomplete widgets in forms and label resolution in list/detail views.
 *
 * Requirements: 1.1-1.6, 2.1-2.7, 3.1-3.6
 */
export class RefHandler implements AnnotationHandler<RefAnnotation> {
  public readonly name = 'x-uigen-ref';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-ref',
    description: 'Links a field to another resource for select/autocomplete widgets',
    targetType: 'field',
    parameterSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Target resource name' },
        valueField: { type: 'string', description: 'Field to use as value' },
        labelField: { type: 'string', description: 'Field to use as label' },
        filter: { type: 'object', description: 'Optional filter criteria' }
      },
      required: ['resource', 'valueField', 'labelField']
    },
    examples: [
      {
        description: 'Link user role to Role resource',
        value: { resource: 'Role', valueField: 'id', labelField: 'name' }
      }
    ]
  };

  /**
   * Extract the x-uigen-ref annotation value from the spec element.
   * Only accepts plain objects (not null, not arrays).
   *
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): RefAnnotation | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-ref'];

    if (annotation === undefined) {
      return undefined;
    }

    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      console.warn(`x-uigen-ref must be a plain object, found ${annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation}`);
      return undefined;
    }

    return annotation as RefAnnotation;
  }

  /**
   * Validate that the annotation has all required fields as non-empty strings,
   * and that filter values (if present) are all primitives.
   *
   * @param value - The extracted annotation object
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: RefAnnotation): boolean {
    if (typeof value.resource !== 'string' || value.resource.trim() === '') {
      console.warn('x-uigen-ref: "resource" must be a non-empty string');
      return false;
    }

    if (typeof value.valueField !== 'string' || value.valueField.trim() === '') {
      console.warn('x-uigen-ref: "valueField" must be a non-empty string');
      return false;
    }

    if (typeof value.labelField !== 'string' || value.labelField.trim() === '') {
      console.warn('x-uigen-ref: "labelField" must be a non-empty string');
      return false;
    }

    if (value.filter !== undefined) {
      for (const [key, val] of Object.entries(value.filter)) {
        if (val === null || typeof val === 'object' || Array.isArray(val)) {
          console.warn(`x-uigen-ref: filter value for key "${key}" must be a primitive (string, number, or boolean)`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Apply the ref annotation by setting refConfig on the schema node.
   *
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: RefAnnotation, context: AnnotationContext): void {
    if (context.schemaNode) {
      context.schemaNode.refConfig = {
        resource: value.resource,
        valueField: value.valueField,
        labelField: value.labelField,
        filter: (value.filter ?? {}) as Record<string, string | number | boolean>
      };
    }
  }
}
