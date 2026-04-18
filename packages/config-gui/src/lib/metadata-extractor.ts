import type { AnnotationHandler } from '@uigen-dev/core';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Extracts metadata from annotation handlers for use in the Config GUI.
 * 
 * This class enables the Config GUI to automatically discover and display
 * all registered annotations without requiring manual GUI updates when new
 * annotations are added.
 * 
 * Supports two extraction strategies:
 * 1. Static metadata property (preferred): Reads handler.constructor.metadata
 * 2. Runtime inspection (fallback): Infers metadata from handler properties
 * 
 * Usage:
 * ```typescript
 * const extractor = new MetadataExtractor();
 * const registry = AnnotationHandlerRegistry.getInstance();
 * const handlers = registry.getAll();
 * const metadata = extractor.extractAll(handlers);
 * ```
 * 
 * Requirements: 3.1, 3.2, 3.4
 */
export class MetadataExtractor {
  /**
   * Extract metadata from all registered handlers in the registry.
   * 
   * @param handlers - Array of annotation handlers from the registry
   * @returns Array of annotation metadata objects
   */
  extractAll(handlers: AnnotationHandler[]): AnnotationMetadata[] {
    return handlers.map(handler => this.extract(handler));
  }
  
  /**
   * Extract metadata from a single annotation handler.
   * Prefers static metadata property, falls back to runtime inspection.
   * 
   * @param handler - The annotation handler to extract metadata from
   * @returns Annotation metadata object
   */
  extract(handler: AnnotationHandler): AnnotationMetadata {
    // Check if handler has static metadata property
    const handlerClass = handler.constructor as any;
    if (handlerClass.metadata) {
      return handlerClass.metadata as AnnotationMetadata;
    }
    
    // Fallback to runtime inspection
    return this.extractFromRuntime(handler);
  }
  
  /**
   * Extract metadata from a handler using runtime inspection.
   * This is a fallback for handlers that don't have static metadata.
   * 
   * @param handler - The annotation handler to inspect
   * @returns Annotation metadata object with inferred values
   */
  private extractFromRuntime(handler: AnnotationHandler): AnnotationMetadata {
    // Extract name from handler
    const name = handler.name;
    
    // Infer description from handler class name or use default
    const description = `Handler for ${name} annotation`;
    
    // Infer target type by checking handler's apply method behavior
    // This is a best-effort approach - defaults to 'field'
    const targetType = this.inferTargetType(handler);
    
    // Create minimal parameter schema
    const parameterSchema = {
      type: 'string' as const
    };
    
    // No examples available from runtime inspection
    const examples: Array<{ description: string; value: unknown }> = [];
    
    return {
      name,
      description,
      targetType,
      parameterSchema,
      examples
    };
  }
  
  /**
   * Infer the target type of an annotation handler by analyzing its name.
   * This is a heuristic approach for handlers without metadata.
   * 
   * @param handler - The annotation handler
   * @returns Inferred target type
   */
  private inferTargetType(handler: AnnotationHandler): 'field' | 'operation' | 'resource' {
    const name = handler.name.toLowerCase();
    
    // Operation-level annotations typically contain these keywords
    if (name.includes('login') || name.includes('auth') || name.includes('operation')) {
      return 'operation';
    }
    
    // Resource-level annotations typically contain these keywords
    if (name.includes('resource') || name.includes('ignore')) {
      return 'resource';
    }
    
    // Default to field-level
    return 'field';
  }
}
