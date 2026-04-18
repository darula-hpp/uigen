import type { AnnotationHandler, AnnotationContext } from '../types.js';

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
 * Handler for x-uigen-ignore annotation.
 * Filters operations and resources from the IR based on boolean annotation values.
 * 
 * Precedence: operation-level > path-level
 * 
 * Requirements: 4.1-4.6
 */
export class IgnoreHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-ignore';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-ignore',
    description: 'Filters operations and resources from the IR',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Ignore internal operations',
        value: true
      },
      {
        description: 'Explicitly include operation',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-ignore annotation value from the spec element.
   * Only accepts boolean values.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-ignore'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning for non-boolean values
    if (annotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof annotation}`);
    }
    
    // Check parent (path-level) if this is an operation and no operation-level annotation exists
    if (context.parent && annotation === undefined) {
      const parentAnnotation = (context.parent as any)['x-uigen-ignore'];
      if (typeof parentAnnotation === 'boolean') {
        return parentAnnotation;
      }
      // Log warning for non-boolean parent values
      if (parentAnnotation !== undefined) {
        console.warn(`x-uigen-ignore must be a boolean, found ${typeof parentAnnotation}`);
      }
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * Logs a warning for non-boolean values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    if (typeof value !== 'boolean') {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof value}`);
      return false;
    }
    return true;
  }
  
  /**
   * Apply the ignore annotation by marking the operation with __shouldIgnore flag.
   * Only marks operations when value is true (ignore).
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    if (!value) {
      return; // x-uigen-ignore: false means include (no action needed)
    }
    
    // Mark operation for removal
    if (context.operation) {
      // Set a flag that will be checked during resource extraction
      (context.operation as any).__shouldIgnore = true;
    }
  }
}
