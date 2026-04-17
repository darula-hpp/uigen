import type { OpenAPIV3 } from 'openapi-types';
import type {
  UIGenApp,
  Resource,
  Operation,
  SchemaNode,
  HttpMethod,
  ParsingError
} from '../../ir/types.js';

/**
 * Base interface for all annotation handlers.
 * Defines the lifecycle: extract → validate → apply
 */
export interface AnnotationHandler<T = any> {
  /**
   * The annotation name (e.g., "x-uigen-ignore")
   */
  readonly name: string;
  
  /**
   * Extract the annotation value from the spec element.
   * Returns undefined if the annotation is not present or cannot be extracted.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The extracted annotation value or undefined
   */
  extract(context: AnnotationContext): T | undefined;
  
  /**
   * Validate the extracted annotation value.
   * Should log warnings for invalid values but never throw exceptions.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: T): boolean;
  
  /**
   * Apply the annotation's effect to the IR.
   * Should never throw exceptions - log errors and continue.
   * 
   * @param value - The validated annotation value
   * @param context - The annotation context
   */
  apply(value: T, context: AnnotationContext): void;
}

/**
 * Spec element types that can carry annotations
 */
export type SpecElement = 
  | OpenAPIV3.OperationObject
  | OpenAPIV3.PathItemObject
  | OpenAPIV3.SchemaObject
  | OpenAPIV3.ReferenceObject;

/**
 * Context object passed to annotation handlers.
 * Provides access to the spec element, parent context, and adapter utilities.
 */
export interface AnnotationContext {
  /**
   * The current spec element being processed
   * (operation, path item, schema property, or schema object)
   */
  readonly element: SpecElement;
  
  /**
   * The parent spec element (if applicable)
   * For operations: the path item
   * For schema properties: the parent schema
   */
  readonly parent?: SpecElement;
  
  /**
   * The current path string (e.g., "/users/{id}")
   */
  readonly path: string;
  
  /**
   * The current HTTP method (if processing an operation)
   */
  readonly method?: HttpMethod;
  
  /**
   * Adapter utility methods
   */
  readonly utils: AdapterUtils;
  
  /**
   * The IR being built (mutable for handlers to modify)
   */
  readonly ir: UIGenApp;
  
  /**
   * The current resource being processed (if applicable)
   */
  readonly resource?: Resource;
  
  /**
   * The current operation being processed (if applicable)
   */
  readonly operation?: Operation;
  
  /**
   * The current schema node being processed (if applicable)
   */
  readonly schemaNode?: SchemaNode;
}

/**
 * Adapter utility methods available to handlers
 */
export interface AdapterUtils {
  /**
   * Humanize a string (e.g., "user_name" → "User Name")
   */
  humanize(str: string): string;
  
  /**
   * Resolve a $ref reference
   */
  resolveRef(ref: string): OpenAPIV3.SchemaObject | null;
  
  /**
   * Log a parsing error
   */
  logError(error: ParsingError): void;
  
  /**
   * Log a warning
   */
  logWarning(message: string): void;
}
