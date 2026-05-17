import type { PaymentProduct, PricingPageConfig, PricingSourceType } from '@uigen-dev/core';

/**
 * Base interface for pricing sources
 * Extensible strategy pattern for loading pricing data
 */
export interface PricingSource {
  type: PricingSourceType;
  load(): Promise<PaymentProduct[]>;
}

/**
 * Phase 1: Inline source (YAML)
 * Products defined directly in OpenAPI spec
 */
export class InlinePricingSource implements PricingSource {
  readonly type = 'inline' as const;
  
  constructor(private products: PaymentProduct[]) {}
  
  async load(): Promise<PaymentProduct[]> {
    return this.products;
  }
}

/**
 * Phase 2: Endpoint source
 * Products fetched from backend API
 */
export class EndpointPricingSource implements PricingSource {
  readonly type = 'endpoint' as const;
  
  constructor(
    private endpoint: string,
    private serverUrl?: string
  ) {}
  
  async load(): Promise<PaymentProduct[]> {
    const response = await fetch(`/api${this.endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing data: ${response.statusText}`);
    }
    return response.json();
  }
}

/**
 * Phase 3: Component source (Future)
 * Fully custom pricing component via override
 */
export class ComponentPricingSource implements PricingSource {
  readonly type = 'component' as const;
  
  async load(): Promise<PaymentProduct[]> {
    // Component handles its own data loading
    return [];
  }
}

/**
 * Factory for creating pricing sources
 */
export class PricingSourceFactory {
  static create(config: PricingPageConfig): PricingSource {
    switch (config.source) {
      case 'inline':
        return new InlinePricingSource(config.products || []);
      case 'endpoint':
        if (!config.endpoint) {
          throw new Error('Endpoint URL required for endpoint source');
        }
        return new EndpointPricingSource(config.endpoint);
      case 'component':
        return new ComponentPricingSource();
      default:
        throw new Error(`Unknown pricing source: ${config.source}`);
    }
  }
}
