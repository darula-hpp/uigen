import type { FieldNode } from './spec-parser.js';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Filters annotations to only those applicable to a given field.
 * 
 * An annotation is applicable to a field if:
 * - It has no `applicableWhen` rules (applies to all fields), OR
 * - Its `applicableWhen.type` matches the field's type (if specified), AND
 * - Its `applicableWhen.format` matches the field's format (if specified)
 * 
 * Both type and format must match if both are specified (AND logic).
 * 
 * @param field - The field to check applicability for
 * @param annotations - The list of all available annotations
 * @returns Filtered list of annotations applicable to the field
 * 
 * @example
 * ```typescript
 * const fileField = { type: 'file', format: undefined, ... };
 * const annotations = [
 *   { name: 'x-uigen-file-types', applicableWhen: { type: 'file' } },
 *   { name: 'x-uigen-label', applicableWhen: undefined }
 * ];
 * 
 * getApplicableAnnotations(fileField, annotations);
 * // Returns both annotations (file-types matches type, label has no rules)
 * 
 * const stringField = { type: 'string', format: undefined, ... };
 * getApplicableAnnotations(stringField, annotations);
 * // Returns only x-uigen-label (file-types doesn't match type)
 * ```
 */
export function getApplicableAnnotations(
  field: FieldNode,
  annotations: AnnotationMetadata[]
): AnnotationMetadata[] {
  return annotations.filter(annotation => {
    // If annotation has no applicability rules, it applies to all fields
    if (!annotation.applicableWhen) {
      return true;
    }
    
    const { type, format } = annotation.applicableWhen;
    
    // Check type match (if specified)
    if (type !== undefined && field.type !== type) {
      return false;
    }
    
    // Check format match (if specified)
    if (format !== undefined && field.format !== format) {
      return false;
    }
    
    // All specified rules matched
    return true;
  });
}
