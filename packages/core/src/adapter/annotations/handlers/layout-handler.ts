import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { LayoutConfig } from '../../../ir/types.js';

/**
 * Valid layout types supported by the annotation
 * Note: Custom layout types are also allowed for extensibility
 */
const BUILT_IN_LAYOUT_TYPES = ['sidebar', 'centered', 'dashboard-grid'] as const;
type BuiltInLayoutType = typeof BUILT_IN_LAYOUT_TYPES[number];
type LayoutType = BuiltInLayoutType | string;

/**
 * Internal shape of the raw x-uigen-layout annotation before validation.
 */
interface LayoutAnnotation {
  type: string;
  metadata?: {
    // Sidebar-specific
    sidebarWidth?: number;
    sidebarCollapsible?: boolean;
    sidebarDefaultCollapsed?: boolean;
    
    // Centered-specific
    maxWidth?: number;
    showHeader?: boolean;
    verticalCenter?: boolean;
    
    // Dashboard-grid-specific
    columns?: {
      mobile?: number;
      tablet?: number;
      desktop?: number;
    };
    gap?: number;
  };
}

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | 'document' | string[];
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum' | string[];
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
 * Handler for x-uigen-layout annotation.
 * Configures the layout strategy for the application or specific resources.
 * 
 * Can be applied at:
 * - Document level (global layout for entire app)
 * - Operation level (layout for specific resource/endpoint)
 */
export class LayoutHandler implements AnnotationHandler<LayoutAnnotation> {
  public readonly name = 'x-uigen-layout';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-layout',
    description: 'Configures the layout strategy for the application. Can be applied at document level (global) or operation level (per-resource).',
    targetType: ['document', 'operation'],
    parameterSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'enum',
          enum: ['sidebar', 'centered', 'dashboard-grid'],
          description: 'Layout strategy type'
        },
        metadata: {
          type: 'object',
          description: 'Layout-specific configuration options',
          properties: {
            sidebarWidth: {
              type: 'number',
              description: 'Width of sidebar in pixels (sidebar layout only)'
            },
            sidebarCollapsible: {
              type: 'boolean',
              description: 'Whether sidebar can be collapsed (sidebar layout only)'
            },
            sidebarDefaultCollapsed: {
              type: 'boolean',
              description: 'Initial collapsed state of sidebar (sidebar layout only)'
            },
            maxWidth: {
              type: 'number',
              description: 'Maximum width of centered container in pixels (centered layout only)'
            },
            showHeader: {
              type: 'boolean',
              description: 'Whether to show header with app title (centered layout only)'
            },
            verticalCenter: {
              type: 'boolean',
              description: 'Whether to vertically center content (centered layout only)'
            },
            columns: {
              type: 'object',
              description: 'Responsive column configuration (dashboard-grid layout only)',
              properties: {
                mobile: { type: 'number', description: 'Columns on mobile devices' },
                tablet: { type: 'number', description: 'Columns on tablet devices' },
                desktop: { type: 'number', description: 'Columns on desktop devices' }
              }
            },
            gap: {
              type: 'number',
              description: 'Gap between grid items in pixels (dashboard-grid layout only)'
            }
          }
        }
      },
      required: ['type']
    },
    examples: [
      {
        description: 'Sidebar layout with custom width',
        value: {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 280,
            sidebarCollapsible: true,
            sidebarDefaultCollapsed: false
          }
        }
      },
      {
        description: 'Centered layout for auth pages',
        value: {
          type: 'centered',
          metadata: {
            maxWidth: 400,
            showHeader: false,
            verticalCenter: true
          }
        }
      },
      {
        description: 'Dashboard grid with responsive columns',
        value: {
          type: 'dashboard-grid',
          metadata: {
            columns: {
              mobile: 1,
              tablet: 2,
              desktop: 4
            },
            gap: 32
          }
        }
      }
    ]
  };

  /**
   * Extract the x-uigen-layout annotation value from the spec element.
   * Only accepts plain objects (not null, not arrays).
   * 
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): LayoutAnnotation | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-layout'];

      if (annotation === undefined) {
        return undefined;
      }

      if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
        context.utils.logWarning(
          `x-uigen-layout at ${context.path} must be a plain object, found ${
            annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
          }`
        );
        return undefined;
      }

      return annotation as LayoutAnnotation;
    } catch (error) {
      context.utils.logWarning(`x-uigen-layout at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the annotation has all required fields and valid values.
   * 
   * @param value - The extracted annotation object
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: LayoutAnnotation): boolean {
    try {
      // Validate type
      if (!value.type || typeof value.type !== 'string') {
        console.warn('x-uigen-layout: type is required and must be a string');
        return false;
      }


      // Warn if using custom layout type but still allow it
      if (!BUILT_IN_LAYOUT_TYPES.includes(value.type as BuiltInLayoutType)) {
        console.warn(
          `x-uigen-layout: using custom layout type "${value.type}". Built-in types are: ${BUILT_IN_LAYOUT_TYPES.join(", ")}`
        );
      }

      // Validate metadata if provided
      if (value.metadata !== undefined) {
        if (typeof value.metadata !== 'object' || value.metadata === null || Array.isArray(value.metadata)) {
          console.warn('x-uigen-layout: metadata must be a plain object');
          return false;
        }

        // Validate sidebar-specific metadata
        if (value.type === 'sidebar') {
          if (value.metadata.sidebarWidth !== undefined) {
            if (typeof value.metadata.sidebarWidth !== 'number' || value.metadata.sidebarWidth <= 0) {
              console.warn('x-uigen-layout: sidebarWidth must be a positive number');
              return false;
            }
          }
          if (value.metadata.sidebarCollapsible !== undefined && typeof value.metadata.sidebarCollapsible !== 'boolean') {
            console.warn('x-uigen-layout: sidebarCollapsible must be a boolean');
            return false;
          }
          if (value.metadata.sidebarDefaultCollapsed !== undefined && typeof value.metadata.sidebarDefaultCollapsed !== 'boolean') {
            console.warn('x-uigen-layout: sidebarDefaultCollapsed must be a boolean');
            return false;
          }
        }

        // Validate centered-specific metadata
        if (value.type === 'centered') {
          if (value.metadata.maxWidth !== undefined) {
            if (typeof value.metadata.maxWidth !== 'number' || value.metadata.maxWidth <= 0) {
              console.warn('x-uigen-layout: maxWidth must be a positive number');
              return false;
            }
          }
          if (value.metadata.showHeader !== undefined && typeof value.metadata.showHeader !== 'boolean') {
            console.warn('x-uigen-layout: showHeader must be a boolean');
            return false;
          }
          if (value.metadata.verticalCenter !== undefined && typeof value.metadata.verticalCenter !== 'boolean') {
            console.warn('x-uigen-layout: verticalCenter must be a boolean');
            return false;
          }
        }

        // Validate dashboard-grid-specific metadata
        if (value.type === 'dashboard-grid') {
          if (value.metadata.columns !== undefined) {
            if (typeof value.metadata.columns !== 'object' || value.metadata.columns === null) {
              console.warn('x-uigen-layout: columns must be an object');
              return false;
            }
            const { mobile, tablet, desktop } = value.metadata.columns;
            if (mobile !== undefined && (typeof mobile !== 'number' || mobile < 1)) {
              console.warn('x-uigen-layout: columns.mobile must be a positive integer');
              return false;
            }
            if (tablet !== undefined && (typeof tablet !== 'number' || tablet < 1)) {
              console.warn('x-uigen-layout: columns.tablet must be a positive integer');
              return false;
            }
            if (desktop !== undefined && (typeof desktop !== 'number' || desktop < 1)) {
              console.warn('x-uigen-layout: columns.desktop must be a positive integer');
              return false;
            }
          }
          if (value.metadata.gap !== undefined) {
            if (typeof value.metadata.gap !== 'number' || value.metadata.gap < 0) {
              console.warn('x-uigen-layout: gap must be a non-negative number');
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.warn(`x-uigen-layout: validation error - ${error}`);
      return false;
    }
  }

  /**
   * Apply the layout annotation by setting layoutConfig on the appropriate context.
   * 
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: LayoutAnnotation, context: AnnotationContext): void {
    try {
      const layoutConfig: LayoutConfig = {
        type: value.type as LayoutType,
        metadata: value.metadata
      };

      // Apply at operation level (per-resource layout override)
      if (context.operation && context.resource) {
        // Only set layoutOverride if not already set (first operation wins)
        if (!context.resource.layoutOverride) {
          context.resource.layoutOverride = layoutConfig;
        }
        return;
      }

      // Apply at document level (global layout)
      // Document-level is when path is 'document' and there's no operation/resource context
      if (context.path === 'document' && !context.operation && !context.resource) {
        // Set layoutConfig on the UIGenApp
        context.ir.layoutConfig = layoutConfig;
        return;
      }

      // No valid context - cannot apply
      context.utils.logWarning(
        `x-uigen-layout at ${context.path}: cannot apply - no operation or document context`
      );
    } catch (error) {
      context.utils.logWarning(`x-uigen-layout at ${context.path}: apply error - ${error}`);
    }
  }
}
