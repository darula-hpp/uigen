import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { MonetizationConfig } from '../../../ir/types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: string | string[];
  parameterSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-monetized annotation.
 * Marks resources or operations as requiring payment/subscription.
 * 
 * Can be applied at:
 * - Path level: Entire resource requires payment
 * - Operation level: Specific operation requires payment
 */
export class MonetizationHandler implements AnnotationHandler<MonetizationConfig> {
  public readonly name = 'x-uigen-monetized';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-monetized',
    description: 'Marks resources or operations as requiring payment/subscription. Backend enforces limits and returns 402 when exceeded.',
    targetType: ['path', 'operation'],
    parameterSchema: {
      type: 'boolean | object',
      properties: {
        monetized: {
          type: 'boolean',
          description: 'Whether this resource/operation is monetized (defaults to true if object present)'
        },
        message: {
          type: 'string',
          description: 'Custom message to show in upgrade prompt when 402 received'
        },
        redirectTo: {
          type: 'string',
          description: 'Custom redirect URL instead of default /pricing page'
        }
      }
    },
    examples: [
      {
        description: 'Resource-level monetization (boolean shorthand)',
        value: true
      },
      {
        description: 'Resource-level monetization with custom message',
        value: {
          monetized: true,
          message: 'Upgrade to Professional to access meetings'
        }
      },
      {
        description: 'Operation-level monetization with custom redirect',
        value: {
          monetized: true,
          message: 'This feature requires an Enterprise plan',
          redirectTo: '/contact-sales'
        }
      },
      {
        description: 'Full OpenAPI spec example',
        value: {
          paths: {
            '/api/v1/meetings': {
              'x-uigen-monetized': true,
              post: {
                summary: 'Create meeting',
                description: 'Backend enforces limits, returns 402 if exceeded'
              }
            },
            '/api/v1/templates': {
              post: {
                summary: 'Create template',
                'x-uigen-monetized': {
                  monetized: true,
                  message: 'Upgrade to Professional to create custom templates'
                }
              }
            }
          }
        }
      }
    ]
  };
  
  /**
   * Extract the x-uigen-monetized annotation value.
   * Supports both boolean shorthand and object form.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The MonetizationConfig object or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): MonetizationConfig | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-monetized'];
    
    if (annotation === undefined || annotation === null) {
      return undefined;
    }
    
    // Handle boolean shorthand
    if (typeof annotation === 'boolean') {
      return {
        monetized: annotation
      };
    }
    
    // Handle object form with additional config
    if (typeof annotation === 'object' && !Array.isArray(annotation)) {
      return {
        monetized: annotation.monetized !== false, // Default to true if object present
        message: annotation.message,
        redirectTo: annotation.redirectTo
      };
    }
    
    return undefined;
  }
  
  /**
   * Validate the extracted annotation value.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: MonetizationConfig): boolean {
    // Validate monetized field
    if (typeof value.monetized !== 'boolean') {
      console.warn('x-uigen-monetized: monetized field must be a boolean');
      return false;
    }
    
    // Validate message if present
    if (value.message !== undefined) {
      if (typeof value.message !== 'string' || value.message.trim() === '') {
        console.warn('x-uigen-monetized: message must be a non-empty string');
        return false;
      }
    }
    
    // Validate redirectTo if present
    if (value.redirectTo !== undefined) {
      if (typeof value.redirectTo !== 'string' || value.redirectTo.trim() === '') {
        console.warn('x-uigen-monetized: redirectTo must be a non-empty string');
        return false;
      }
      
      // Must start with / for relative URLs or be a full URL
      if (!value.redirectTo.startsWith('/') && !value.redirectTo.startsWith('http')) {
        console.warn('x-uigen-monetized: redirectTo must be a relative path (starting with /) or full URL');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Apply the monetization annotation.
   * This is handled by resource-extractor and payment-handler, so this is a no-op.
   * 
   * @param value - The validated annotation value
   * @param context - The annotation context
   */
  apply(value: MonetizationConfig, context: AnnotationContext): void {
    // No-op: Monetization is applied by resource-extractor and payment-handler
    // during resource/operation extraction
  }
}
