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
 * Handler for x-uigen-login annotation.
 * Marks operations as login endpoints or excludes them from auto-detection.
 * 
 * Values:
 * - true: explicitly mark as login endpoint
 * - false: explicitly exclude from auto-detection
 * - undefined: allow auto-detection
 * 
 * Requirements: 6.1-6.6
 */
export class LoginHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-login';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-login',
    description: 'Marks operations as login endpoints or excludes them from auto-detection',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Explicitly mark as login endpoint',
        value: true
      },
      {
        description: 'Explicitly exclude from auto-detection',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-login annotation value from the spec element.
   * Only accepts boolean values.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-login'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * All boolean values are valid (true and false both have meaning).
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    // All boolean values are valid
    return typeof value === 'boolean';
  }
  
  /**
   * Apply the login annotation by marking the operation with __loginAnnotation flag.
   * The adapter will use this during login endpoint detection.
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    if (!context.operation) {
      return; // Only applies to operations
    }
    
    // Mark operation with login annotation status
    // The adapter will use this during login endpoint detection
    (context.operation as any).__loginAnnotation = value;
  }
}
