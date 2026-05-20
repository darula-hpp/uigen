import type { SchemaNode } from '../ir/types.js';

export type IgnorableSchemaNode = SchemaNode & { __shouldIgnore?: boolean };

/**
 * Filters schema nodes marked with x-uigen-ignore during IR adaptation.
 */
export class SchemaFieldFilter {
  static isVisible(node: SchemaNode): boolean {
    return !(node as IgnorableSchemaNode).__shouldIgnore;
  }
}
