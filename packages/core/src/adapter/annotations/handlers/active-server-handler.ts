import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { ServerConfig } from '../../../ir/types.js';

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
 * Handler for x-uigen-active-server annotation.
 * Marks a server in the OpenAPI servers array as the active default.
 * 
 * Values:
 * - true: mark this server as the active default
 * - false: explicitly not the active server (no effect)
 * - undefined: allow default behavior
 * 
 * Requirements: 2.1, 4.1
 */
export class ActiveServerHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-active-server';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-active-server',
    description: 'Marks a server as the active default, eliminating the need for a server selection dropdown',
    targetType: 'server',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Mark as active server',
        value: true
      },
      {
        description: 'Explicitly not active',
        value: false
      }
    ]
  };
  
  /**
   * Extract the x-uigen-active-server annotation value from the server object.
   * Only accepts boolean values.
   * Only processes annotations on server objects (not operations or schemas).
   * 
   * Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4
   * 
   * @param context - The annotation context containing the server element
   * @returns The boolean value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): boolean | undefined {
    // Only process annotations on server objects (Requirement 4.1)
    // Server contexts have no method, operation, or schemaNode
    if (context.method !== undefined || context.schemaNode !== undefined) {
      return undefined;
    }
    
    const element = context.element as any;
    const annotation = element['x-uigen-active-server'];
    
    // Only accept boolean values
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning for non-boolean values (Requirement 2.3)
    if (annotation !== undefined) {
      context.utils.logWarning(
        `x-uigen-active-server annotation must be a boolean, got ${typeof annotation}`
      );
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * All boolean values are valid (true and false both have meaning).
   * 
   * Requirements: 2.1, 2.2
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    // All boolean values are valid
    return typeof value === 'boolean';
  }
  
  /**
   * Apply the active server annotation by setting UIGenApp.activeServer.
   * 
   * Requirements: 2.4, 2.5, 3.1, 3.2, 3.4
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   */
  apply(value: boolean, context: AnnotationContext): void {
    // Only process true values (Requirement 2.4)
    if (!value) {
      return;
    }
    
    const element = context.element as any;
    
    // Check if activeServer is already set (Requirement 2.5)
    if (context.ir.activeServer) {
      context.utils.logWarning(
        `Multiple servers marked with x-uigen-active-server: true. Using first occurrence, ignoring server at ${element.url || 'unknown'}`
      );
      return;
    }
    
    // Set activeServer (Requirements 3.1, 3.4)
    const serverConfig: ServerConfig = {
      url: element.url || '',
      description: element.description
    };
    
    context.ir.activeServer = serverConfig;
    
    // Note: The server is already in the servers array by the time annotations are processed
    // (Requirement 3.2 - active server appears in servers array)
  }
}
