import type { FieldNode } from './spec-parser.js';

/**
 * Determines if a field represents a file upload field.
 * 
 * A field is considered a file field if:
 * - Its type is 'file', OR
 * - Its format is 'binary'
 * 
 * This utility is used to determine which fields should show file metadata
 * annotations (x-uigen-file-types, x-uigen-max-file-size) in the config GUI.
 * 
 * @param field - The field node to check
 * @returns true if the field is a file field, false otherwise
 * 
 * @example
 * ```typescript
 * const avatarField = { type: 'file', format: undefined, ... };
 * isFileField(avatarField); // true
 * 
 * const documentField = { type: 'string', format: 'binary', ... };
 * isFileField(documentField); // true
 * 
 * const nameField = { type: 'string', format: undefined, ... };
 * isFileField(nameField); // false
 * ```
 */
export function isFileField(field: FieldNode): boolean {
  return field.type === 'file' || field.format === 'binary';
}
