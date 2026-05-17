import type { Resource, PaymentConfig, Operation, SchemaNode } from '../ir/types.js';

/**
 * Generator for auto-generated pricing resources.
 * 
 * Creates a pricing resource when payments are configured with a pricing page.
 * The pricing resource:
 * - Has a single GET operation with viewHint: 'pricing'
 * - Uses centered layout for optimal pricing page display
 * - Is accessible without authentication
 * - Can be overridden via x-uigen-override annotation
 * 
 * @example
 * ```typescript
 * const generator = new PricingResourceGenerator();
 * const pricingResource = generator.generate(paymentConfig);
 * ```
 */
export class PricingResourceGenerator {
  /**
   * Generate a pricing resource from payment configuration.
   * 
   * The generated resource includes:
   * - Resource metadata (name, slug, description)
   * - Single GET operation at /pricing path
   * - Centered layout configuration
   * - Empty schema (pricing data comes from config, not API)
   * - No authentication requirement
   * 
   * @param config - Payment configuration from x-uigen-payments annotation
   * @returns Generated pricing resource, or undefined if pricing page not enabled
   */
  generate(config: PaymentConfig): Resource | undefined {
    // Only generate if pricing page is enabled
    if (!config.pricingPage?.enabled) {
      return undefined;
    }

    // Create the pricing operation
    const operation: Operation = {
      id: 'get_pricing',
      method: 'GET',
      path: '/pricing',
      summary: 'View pricing plans',
      description: 'Display available pricing plans and subscription options',
      operationId: 'getPricing',
      parameters: [],
      responses: {
        '200': {
          description: 'Pricing page displayed successfully'
        }
      },
      viewHint: 'pricing',
      security: [] // No authentication required for pricing page
    };

    // Create placeholder schema (pricing data comes from config, not API)
    const schema: SchemaNode = {
      type: 'object',
      key: 'pricing',
      label: 'Pricing',
      required: false,
      children: []
    };

    // Create the pricing resource
    const resource: Resource = {
      name: 'Pricing',
      slug: 'pricing',
      label: 'Pricing',
      description: 'View and compare pricing plans',
      operations: [operation],
      schema,
      relationships: [],
      pagination: undefined,
      // Use centered layout for pricing page
      layoutOverride: {
        type: 'centered',
        metadata: {
          maxWidth: 1200,
          showHeader: true,
          verticalCenter: false
        }
      },
      // Support override via x-uigen-override annotation
      override: config.pricingPage.override
    };

    return resource;
  }
}
