/**
 * Annotation Handler Registry
 * 
 * This module provides a centralized registry for processing vendor extensions
 * (x-uigen-* annotations) in OpenAPI/Swagger specs.
 */

export type { AnnotationHandler, AnnotationContext, AdapterUtils, SpecElement } from './types.js';
export { AnnotationContextImpl, createOperationContext, createSchemaContext } from './context.js';
export { AnnotationHandlerRegistry } from './registry.js';

// Import handlers to trigger auto-registration
import './handlers/index.js';

// Re-export handlers for testing
export { IgnoreHandler, LabelHandler } from './handlers/index.js';
