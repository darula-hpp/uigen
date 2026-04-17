import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * Handler for x-uigen-label annotation.
 * Applies custom labels to schema properties and objects.
 * 
 * Precedence: property label > $ref target label > humanized key
 * 
 * Requirements: 5.1-5.6
 */
export class LabelHandler implements AnnotationHandler<string> {
  public readonly name = 'x-uigen-label';
  
  /**
   * Extract the x-uigen-label annotation value from the spec element.
   * Only accepts non-empty strings.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The string value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): string | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-label'];
    
    // Only accept non-empty strings
    if (typeof annotation === 'string' && annotation.trim() !== '') {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a non-empty string.
   * Logs a warning for invalid values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (non-empty string), false otherwise
   */
  validate(value: string): boolean {
    if (typeof value !== 'string') {
      console.warn(`x-uigen-label must be a string, found ${typeof value}`);
      return false;
    }
    
    if (value.trim() === '') {
      console.warn('x-uigen-label must be a non-empty string');
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply the label annotation by setting the label on the schema node.
   * 
   * @param value - The validated string value
   * @param context - The annotation context
   */
  apply(value: string, context: AnnotationContext): void {
    // Apply label to schema node
    if (context.schemaNode) {
      context.schemaNode.label = value;
    }
  }
}
