import { describe, it, expect } from 'vitest';
import { PricingResourceGenerator } from '../pricing-resource-generator.js';
import type { PaymentConfig, PricingPageConfig } from '../../ir/types.js';

describe('PricingResourceGenerator', () => {
  const generator = new PricingResourceGenerator();

  describe('generate', () => {
    it('should return undefined when pricing page is not enabled', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: false,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      expect(result).toBeUndefined();
    });

    it('should return undefined when pricing page config is missing', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ]
      };

      const result = generator.generate(config);

      expect(result).toBeUndefined();
    });

    it('should generate valid pricing resource when pricing page is enabled', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline',
          products: [
            {
              id: 'free',
              name: 'Free',
              type: 'subscription',
              price: 0,
              interval: 'month'
            }
          ]
        }
      };

      const result = generator.generate(config);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Pricing');
      expect(result?.slug).toBe('pricing');
      expect(result?.label).toBe('Pricing');
      expect(result?.description).toBe('View and compare pricing plans');
    });

    it('should generate resource with single GET operation', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      expect(result?.operations).toHaveLength(1);
      
      const operation = result?.operations[0];
      expect(operation?.id).toBe('get_pricing');
      expect(operation?.method).toBe('GET');
      expect(operation?.path).toBe('/pricing');
      expect(operation?.viewHint).toBe('pricing');
      expect(operation?.operationId).toBe('getPricing');
    });

    it('should configure operation without authentication requirement', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      const operation = result?.operations[0];
      expect(operation?.security).toEqual([]);
    });

    it('should configure centered layout with proper metadata', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      expect(result?.layoutOverride).toBeDefined();
      expect(result?.layoutOverride?.type).toBe('centered');
      expect(result?.layoutOverride?.metadata).toEqual({
        maxWidth: 1200,
        showHeader: true,
        verticalCenter: false
      });
    });

    it('should include override config when present', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'component',
          override: {
            id: 'custom-pricing',
            enabled: true
          }
        }
      };

      const result = generator.generate(config);

      expect(result?.override).toBeDefined();
      expect(result?.override?.id).toBe('custom-pricing');
      expect(result?.override?.enabled).toBe(true);
    });

    it('should generate empty schema for pricing resource', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      expect(result?.schema).toBeDefined();
      expect(result?.schema.type).toBe('object');
      expect(result?.schema.key).toBe('pricing');
      expect(result?.schema.label).toBe('Pricing');
      expect(result?.schema.children).toEqual([]);
    });

    it('should generate resource with no relationships', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'inline'
        }
      };

      const result = generator.generate(config);

      expect(result?.relationships).toEqual([]);
      expect(result?.pagination).toBeUndefined();
    });

    it('should work with endpoint source type', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'endpoint',
          endpoint: '/api/v1/pricing/products'
        }
      };

      const result = generator.generate(config);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Pricing');
    });

    it('should work with component source type', () => {
      const config: PaymentConfig = {
        providers: [
          {
            provider: 'stripe',
            publishableKey: 'pk_test_123',
            mode: 'test'
          }
        ],
        pricingPage: {
          enabled: true,
          source: 'component',
          override: {
            id: 'custom-pricing',
            enabled: true
          }
        }
      };

      const result = generator.generate(config);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Pricing');
      expect(result?.override?.id).toBe('custom-pricing');
    });
  });
});
