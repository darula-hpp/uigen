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
 * Handler for x-uigen-profile annotation.
 * Marks resources as profile resources for specialized rendering.
 * 
 * Values:
 * - true: explicitly mark as profile resource
 * - false: explicitly exclude from profile treatment
 * - undefined: allow default behavior
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
export class ProfileHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-profile';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-profile',
    description: 'Marks a resource as a profile resource for specialized rendering. Can be applied to operations (marks parent resource) or resources directly.',
    targetType: 'operation',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Mark user profile endpoint as profile resource',
        value: true
      },
      {
        description: 'Explicitly exclude from profile treatment',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-profile annotation value from the spec element.
   * Only accepts boolean values.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-profile'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * All boolean values are valid (true and false both have meaning).
   * Logs a warning for non-boolean values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    if (typeof value !== 'boolean') {
      console.warn(`x-uigen-profile must be a boolean, found ${typeof value}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply the profile annotation by setting __profileAnnotation flag on the resource.
   * The React SPA will use this to render profile resources differently.
   * 
   * Can be applied at operation level (marks the parent resource) or resource level.
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    // If applied at operation level, mark the parent resource
    if (context.operation && context.resource) {
      (context.resource as any).__profileAnnotation = value;
      return;
    }
    
    // If applied at resource level, mark the resource directly
    if (context.resource) {
      (context.resource as any).__profileAnnotation = value;
      return;
    }
    
    // No resource context - cannot apply
  }
}
