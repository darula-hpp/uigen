import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { SignUpEndpoint } from '../../../ir/types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | 'server';
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
 * Handler for x-uigen-signup annotation.
 * Marks operations as sign-up/registration endpoints or excludes them from auto-detection.
 * 
 * Values:
 * - true: explicitly mark as sign-up endpoint
 * - false: explicitly exclude from auto-detection
 * - undefined: allow auto-detection
 * 
 * Requirements: 7.1, 9.1
 */
export class SignUpHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-signup';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-signup',
    description: 'Marks operations as sign-up/registration endpoints or excludes them from auto-detection',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Explicitly mark as sign-up endpoint',
        value: true
      },
      {
        description: 'Explicitly exclude from auto-detection',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-signup annotation value from the operation object.
   * Only accepts boolean values.
   * 
   * Requirements: 7.1, 7.2
   * 
   * @param context - The annotation context containing the operation element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-signup'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning for non-boolean values (Requirement 7.3)
    if (annotation !== undefined) {
      context.utils.logWarning(
        `x-uigen-signup annotation must be a boolean, got ${typeof annotation} at ${context.method?.toUpperCase()} ${context.path}`
      );
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * All boolean values are valid (true and false both have meaning).
   * 
   * Requirements: 7.1, 7.2
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    // All boolean values are valid
    return typeof value === 'boolean';
  }
  
  /**
   * Apply the sign-up annotation by marking the operation.
   * The adapter's detectSignUpEndpoints method will handle the actual endpoint creation.
   * 
   * Requirements: 8.1, 8.2
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    if (!context.operation) {
      return; // Only applies to operations
    }
    
    // Mark operation with annotation status (Requirement 8.1, 8.2)
    // The adapter will use this during sign-up endpoint detection
    (context.operation as any).__signUpAnnotation = value;
  }
}
