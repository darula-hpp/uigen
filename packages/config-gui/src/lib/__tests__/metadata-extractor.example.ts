/**
 * Example usage of MetadataExtractor
 * This file demonstrates how the Config GUI will use the MetadataExtractor
 */

import { MetadataExtractor } from '../metadata-extractor.js';
import type { AnnotationHandler } from '@uigen-dev/core';

// Example: Extract metadata from all registered handlers
export function exampleExtractAll() {
  const extractor = new MetadataExtractor();
  
  // In the actual GUI, this would come from:
  // const registry = AnnotationHandlerRegistry.getInstance();
  // const handlers = registry.getAll();
  const handlers: AnnotationHandler[] = []; // Mock for example
  
  const allMetadata = extractor.extractAll(handlers);
  
  // The GUI can now use this metadata to:
  // 1. Display annotation list with enable/disable toggles
  // 2. Generate forms for default values
  // 3. Create visual controls in the editor
  // 4. Show help text and examples
  
  return allMetadata;
}

// Example: Extract metadata from a single handler
export function exampleExtractSingle(handler: AnnotationHandler) {
  const extractor = new MetadataExtractor();
  
  const metadata = extractor.extract(handler);
  
  // The GUI can use this to:
  // - Display annotation details
  // - Generate appropriate form controls
  // - Show parameter descriptions and examples
  
  console.log(`Annotation: ${metadata.name}`);
  console.log(`Description: ${metadata.description}`);
  console.log(`Target Type: ${metadata.targetType}`);
  console.log(`Parameter Schema:`, metadata.parameterSchema);
  console.log(`Examples:`, metadata.examples);
  
  return metadata;
}

// Example: Handle handlers with and without metadata
export function exampleMixedHandlers() {
  const extractor = new MetadataExtractor();
  
  // Handler with static metadata (preferred)
  class HandlerWithMetadata implements AnnotationHandler<string> {
    public readonly name = 'x-uigen-custom';
    public static readonly metadata = {
      name: 'x-uigen-custom',
      description: 'Custom annotation with full metadata',
      targetType: 'field' as const,
      parameterSchema: {
        type: 'string' as const
      },
      examples: [
        { description: 'Example', value: 'test' }
      ]
    };
    
    extract() { return undefined; }
    validate() { return true; }
    apply() { }
  }
  
  // Handler without metadata (fallback to runtime inspection)
  class HandlerWithoutMetadata implements AnnotationHandler<boolean> {
    public readonly name = 'x-uigen-legacy';
    
    extract() { return undefined; }
    validate() { return true; }
    apply() { }
  }
  
  const handler1 = new HandlerWithMetadata();
  const handler2 = new HandlerWithoutMetadata();
  
  const metadata1 = extractor.extract(handler1);
  const metadata2 = extractor.extract(handler2);
  
  console.log('Handler with metadata:', metadata1);
  console.log('Handler without metadata (inferred):', metadata2);
  
  return [metadata1, metadata2];
}
