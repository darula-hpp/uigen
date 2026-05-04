import type { OpenAPIV3 } from 'openapi-types';
import type { LayoutConfig, LayoutType, LayoutMetadata } from '../ir/types.js';

/**
 * Parses x-uigen-layout annotations from OpenAPI specs
 */
export class LayoutParser {
  /**
   * Parse document-level layout configuration
   */
  parseDocumentLayout(spec: OpenAPIV3.Document): LayoutConfig | undefined {
    const layoutAnnotation = (spec as any)['x-uigen-layout'];
    
    // Check if annotation exists (but allow explicit null to be validated)
    if (layoutAnnotation === undefined) {
      return undefined;
    }
    
    return this.parseLayoutConfig(layoutAnnotation, 'document');
  }
  
  /**
   * Parse operation-level layout configuration
   */
  parseOperationLayout(
    operation: OpenAPIV3.OperationObject,
    path: string,
    method: string
  ): LayoutConfig | undefined {
    const layoutAnnotation = (operation as any)['x-uigen-layout'];
    
    // Check if annotation exists (but allow explicit null to be validated)
    if (layoutAnnotation === undefined) {
      return undefined;
    }
    
    return this.parseLayoutConfig(layoutAnnotation, `${method}:${path}`);
  }
  
  /**
   * Parse and validate layout configuration
   */
  private parseLayoutConfig(
    annotation: unknown,
    context: string
  ): LayoutConfig | undefined {
    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      console.warn(
        `[LayoutParser] Invalid x-uigen-layout at ${context}: must be an object`
      );
      return undefined;
    }
    
    const config = annotation as Record<string, unknown>;
    
    // Validate required 'type' field
    if (!config.type || typeof config.type !== 'string') {
      console.warn(
        `[LayoutParser] Invalid x-uigen-layout at ${context}: missing or invalid 'type' field`
      );
      return undefined;
    }
    
    const layoutType = config.type as LayoutType;
    const metadata = config.metadata as LayoutMetadata | undefined;
    
    // Validate metadata if present
    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
      console.warn(
        `[LayoutParser] Invalid x-uigen-layout at ${context}: 'metadata' must be an object`
      );
      return { type: layoutType };
    }
    
    return {
      type: layoutType,
      metadata
    };
  }
}
