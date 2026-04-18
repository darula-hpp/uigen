import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { PasswordResetEndpoint } from '../../../ir/types.js';

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
 * Handler for x-uigen-password-reset annotation.
 * Marks operations as password reset endpoints or excludes them from auto-detection.
 * 
 * Values:
 * - true: explicitly mark as password reset endpoint
 * - false: explicitly exclude from auto-detection
 * - undefined: allow auto-detection
 * 
 * Requirements: 5.1, 9.1
 */
export class PasswordResetHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-password-reset';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-password-reset',
    description: 'Marks operations as password reset endpoints or excludes them from auto-detection',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Explicitly mark as password reset endpoint',
        value: true
      },
      {
        description: 'Explicitly exclude from auto-detection',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-password-reset annotation value from the operation object.
   * Only accepts boolean values.
   * 
   * Requirements: 5.1, 5.2
   * 
   * @param context - The annotation context containing the operation element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-password-reset'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning for non-boolean values (Requirement 5.3)
    if (annotation !== undefined) {
      context.utils.logWarning(
        `x-uigen-password-reset annotation must be a boolean, got ${typeof annotation} at ${context.method?.toUpperCase()} ${context.path}`
      );
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * All boolean values are valid (true and false both have meaning).
   * 
   * Requirements: 5.1, 5.2
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    // All boolean values are valid
    return typeof value === 'boolean';
  }
  
  /**
   * Apply the password reset annotation by marking the operation.
   * The adapter's detectPasswordResetEndpoints method will handle the actual endpoint creation.
   * 
   * Requirements: 6.1, 6.2
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    if (!context.operation) {
      return; // Only applies to operations
    }
    
    // Mark operation with annotation status (Requirement 6.1, 6.2)
    // The adapter will use this during password reset endpoint detection
    (context.operation as any).__passwordResetAnnotation = value;
  }
}
