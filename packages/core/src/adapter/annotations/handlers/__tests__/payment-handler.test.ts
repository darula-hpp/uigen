import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentHandler } from '../payment-handler.js';
import type { AnnotationContext } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('PaymentHandler', () => {
  let handler: PaymentHandler;
  let context: AnnotationContext;

  beforeEach(() => {
    handler = new PaymentHandler();
    context = {
      element: {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      } as OpenAPIV3.Document,
      spec: {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      } as OpenAPIV3.Document,
      ir: {
        name: 'Test API',
        version: '1.0.0',
        resources: [],
        operations: [],
      },
      errors: [],
    };
  });

  describe('extract', () => {
    it('should extract payment configuration from spec root', () => {
      const info = (context.element as any).info;
      info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            currency: 'usd',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro-monthly',
            name: 'Professional',
            type: 'subscription',
            price: 2900,
            interval: 'month',
          },
        ],
        checkoutEndpoint: '/api/v1/pricing/create-checkout',
      };

      const result = handler.extract(context);

      expect(result).toBeDefined();
      expect(result?.providers).toHaveLength(1);
      expect(result?.providers[0].provider).toBe('stripe');
      expect(result?.products).toHaveLength(1);
      expect(result?.products[0].id).toBe('pro-monthly');
      expect(result?.checkoutEndpoint).toBe('/api/v1/pricing/create-checkout');
    });

    it('should return undefined when no payment config exists', () => {
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });

    it('should handle multiple providers', () => {
      const info = (context.element as any).info;
      info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
          {
            provider: 'paypal',
            clientId: '${PAYPAL_CLIENT_ID}',
            clientSecret: '${PAYPAL_CLIENT_SECRET}',
            webhookSecret: '${PAYPAL_WEBHOOK_SECRET}',
            mode: 'sandbox',
            enabled: true,
          },
        ],
      };

      const result = handler.extract(context);

      expect(result?.providers).toHaveLength(2);
      expect(result?.providers[0].provider).toBe('stripe');
      expect(result?.providers[1].provider).toBe('paypal');
    });

    it('should extract pricing page config', () => {
      const info = (context.element as any).info;
      info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
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
              interval: 'month',
            },
          ],
        },
      };

      const result = handler.extract(context);

      expect(result).toBeDefined();
      expect(result?.pricingPage).toBeDefined();
      expect(result?.pricingPage?.enabled).toBe(true);
      expect(result?.pricingPage?.source).toBe('inline');
      expect(result?.pricingPage?.products).toHaveLength(1);
    });
  });

  describe('validate', () => {
    it('should validate correct payment configuration', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            currency: 'usd',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro-monthly',
            name: 'Professional',
            type: 'subscription' as const,
            price: 2900,
            interval: 'month' as const,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should reject unsupported provider', () => {
      const config = {
        providers: [
          {
            provider: 'unsupported' as any,
            apiKey: '${API_KEY}',
            webhookSecret: '${WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should reject invalid product type', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro',
            name: 'Professional',
            type: 'invalid' as any,
            price: 2900,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should reject negative price', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro',
            name: 'Professional',
            type: 'subscription' as const,
            price: -100,
            interval: 'month' as const,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should require interval for subscription products', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro',
            name: 'Professional',
            type: 'subscription' as const,
            price: 2900,
            // Missing interval
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should validate HTTPS URLs', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        successUrl: 'http://example.com/success', // HTTP not allowed
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should allow localhost HTTP URLs', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        successUrl: 'http://localhost:3000/success',
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should reject more than 5 providers', () => {
      const config = {
        providers: Array(6).fill({
          provider: 'stripe' as const,
          apiKey: '${STRIPE_SECRET_KEY}',
          webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
          mode: 'test' as const,
          enabled: true,
        }),
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should require at least one enabled provider', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: false,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should validate custom price for products', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        products: [
          {
            id: 'enterprise',
            name: 'Enterprise',
            type: 'subscription' as const,
            price: 'custom' as const,
            interval: 'month' as const,
          },
        ],
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should validate inline pricing page config', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'inline' as const,
          products: [
            {
              id: 'free',
              name: 'Free',
              type: 'subscription' as const,
              price: 0,
              interval: 'month' as const,
            },
          ],
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should reject inline pricing page without products', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'inline' as const,
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should validate endpoint pricing page config', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'endpoint' as const,
          endpoint: '/api/v1/pricing/products',
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should reject endpoint pricing page without endpoint URL', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'endpoint' as const,
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should validate component pricing page config', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'component' as const,
          override: {
            id: 'custom-pricing',
            enabled: true,
          },
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(true);
    });

    it('should reject component pricing page without override config', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'component' as const,
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });

    it('should reject unsupported pricing source', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'unsupported' as any,
        },
      };

      const result = handler.validate(config);
      expect(result).toBe(false);
    });
  });

  describe('apply', () => {
    it('should apply payment config to IR', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            currency: 'usd',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro-monthly',
            name: 'Professional',
            type: 'subscription' as const,
            price: 2900,
            interval: 'month' as const,
          },
        ],
      };

      handler.apply(config, context);

      expect(context.ir.payments).toBeDefined();
      expect(context.ir.payments?.providers).toHaveLength(1);
      expect(context.ir.payments?.products).toHaveLength(1);
    });

    it('should preserve all provider fields', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            currency: 'eur',
            enabled: true,
          },
        ],
      };

      handler.apply(config, context);

      const provider = context.ir.payments?.providers[0];
      expect(provider?.provider).toBe('stripe');
      expect(provider?.publishableKey).toBe('${STRIPE_PUBLISHABLE_KEY}');
      expect(provider?.mode).toBe('test');
      expect(provider?.currency).toBe('eur');
      expect(provider?.enabled).toBe(true);
      // Backend secrets (apiKey, webhookSecret) are not stored in IR for security
      expect(provider).not.toHaveProperty('apiKey');
      expect(provider).not.toHaveProperty('webhookSecret');
    });

    it('should preserve all product fields', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro-monthly',
            name: 'Professional',
            description: 'Full access',
            type: 'subscription' as const,
            price: 2900,
            currency: 'usd',
            interval: 'month' as const,
            intervalCount: 1,
            features: ['Feature 1', 'Feature 2'],
            highlighted: true,
            metadata: { key: 'value' },
          },
        ],
      };

      handler.apply(config, context);

      const product = context.ir.payments?.products?.[0];
      expect(product?.id).toBe('pro-monthly');
      expect(product?.name).toBe('Professional');
      expect(product?.description).toBe('Full access');
      expect(product?.type).toBe('subscription');
      expect(product?.price).toBe(2900);
      expect(product?.currency).toBe('usd');
      expect(product?.interval).toBe('month');
      expect(product?.intervalCount).toBe(1);
      expect(product?.features).toEqual(['Feature 1', 'Feature 2']);
      expect(product?.highlighted).toBe(true);
      expect(product?.metadata).toEqual({ key: 'value' });
    });

    it('should apply global payment settings', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        defaultCurrency: 'eur',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        checkoutEndpoint: '/api/v1/custom/checkout',
      };

      handler.apply(config, context);

      expect(context.ir.payments?.defaultCurrency).toBe('eur');
      expect(context.ir.payments?.successUrl).toBe('https://example.com/success');
      expect(context.ir.payments?.cancelUrl).toBe('https://example.com/cancel');
      expect(context.ir.payments?.checkoutEndpoint).toBe('/api/v1/custom/checkout');
    });

    it('should apply pricing page config to IR', () => {
      const config = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'inline' as const,
          products: [
            {
              id: 'free',
              name: 'Free',
              type: 'subscription' as const,
              price: 0,
              interval: 'month' as const,
            },
          ],
        },
      };

      handler.apply(config, context);

      expect(context.ir.payments?.pricingPage).toBeDefined();
      expect(context.ir.payments?.pricingPage?.enabled).toBe(true);
      expect(context.ir.payments?.pricingPage?.source).toBe('inline');
      expect(context.ir.payments?.pricingPage?.products).toHaveLength(1);
    });
  });

  describe('extractPricingPageConfig', () => {
    it('should extract pricing page config from annotation', () => {
      const annotation = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
        pricingPage: {
          enabled: true,
          source: 'inline' as const,
          products: [
            {
              id: 'free',
              name: 'Free',
              type: 'subscription' as const,
              price: 0,
              interval: 'month' as const,
            },
          ],
        },
      };

      const result = handler.extractPricingPageConfig(annotation);

      expect(result).toBeDefined();
      expect(result?.enabled).toBe(true);
      expect(result?.source).toBe('inline');
      expect(result?.products).toHaveLength(1);
    });

    it('should return undefined when no pricing page config', () => {
      const annotation = {
        providers: [
          {
            provider: 'stripe' as const,
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test' as const,
            enabled: true,
          },
        ],
      };

      const result = handler.extractPricingPageConfig(annotation);

      expect(result).toBeUndefined();
    });
  });

  describe('handlePathLevel', () => {
    it('should extract boolean monetization flag', () => {
      const pathItem = {
        'x-uigen-monetized': true,
        get: {
          summary: 'Get resource',
        },
      } as any;

      const result = handler.handlePathLevel('/api/v1/resource', pathItem);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(true);
    });

    it('should extract object monetization config', () => {
      const pathItem = {
        'x-uigen-monetized': {
          monetized: true,
          message: 'Upgrade to access this resource',
          redirectTo: '/pricing',
        },
        get: {
          summary: 'Get resource',
        },
      } as any;

      const result = handler.handlePathLevel('/api/v1/resource', pathItem);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(true);
      expect(result?.message).toBe('Upgrade to access this resource');
      expect(result?.redirectTo).toBe('/pricing');
    });

    it('should return undefined when no monetization flag', () => {
      const pathItem = {
        get: {
          summary: 'Get resource',
        },
      } as any;

      const result = handler.handlePathLevel('/api/v1/resource', pathItem);

      expect(result).toBeUndefined();
    });

    it('should handle false monetization flag', () => {
      const pathItem = {
        'x-uigen-monetized': false,
        get: {
          summary: 'Get resource',
        },
      } as any;

      const result = handler.handlePathLevel('/api/v1/resource', pathItem);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(false);
    });
  });

  describe('handleOperationLevel', () => {
    it('should extract boolean monetization flag', () => {
      const operation = {
        'x-uigen-monetized': true,
        summary: 'Create resource',
      } as any;

      const result = handler.handleOperationLevel(operation);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(true);
    });

    it('should extract object monetization config', () => {
      const operation = {
        'x-uigen-monetized': {
          monetized: true,
          message: 'Upgrade to create resources',
          redirectTo: '/pricing',
        },
        summary: 'Create resource',
      } as any;

      const result = handler.handleOperationLevel(operation);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(true);
      expect(result?.message).toBe('Upgrade to create resources');
      expect(result?.redirectTo).toBe('/pricing');
    });

    it('should return undefined when no monetization flag', () => {
      const operation = {
        summary: 'Create resource',
      } as any;

      const result = handler.handleOperationLevel(operation);

      expect(result).toBeUndefined();
    });

    it('should handle false monetization flag', () => {
      const operation = {
        'x-uigen-monetized': false,
        summary: 'Create resource',
      } as any;

      const result = handler.handleOperationLevel(operation);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(false);
    });

    it('should default to true when object present without monetized field', () => {
      const operation = {
        'x-uigen-monetized': {
          message: 'Upgrade required',
        },
        summary: 'Create resource',
      } as any;

      const result = handler.handleOperationLevel(operation);

      expect(result).toBeDefined();
      expect(result?.monetized).toBe(true);
      expect(result?.message).toBe('Upgrade required');
    });
  });

  describe('integration', () => {
    it('should handle complete payment configuration flow', () => {
      // Setup spec with payment config in info object
      const info = (context.element as any).info;
      info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            currency: 'usd',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'free',
            name: 'Free',
            type: 'subscription',
            price: 0,
            interval: 'month',
          },
          {
            id: 'pro-monthly',
            name: 'Professional',
            type: 'subscription',
            price: 2900,
            interval: 'month',
            highlighted: true,
            features: ['Unlimited access', 'Priority support'],
          },
        ],
        defaultCurrency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      // Extract
      const extracted = handler.extract(context);
      expect(extracted).toBeDefined();

      // Validate
      const isValid = handler.validate(extracted!);
      expect(isValid).toBe(true);

      // Apply
      handler.apply(extracted!, context);

      // Verify IR
      expect(context.ir.payments).toBeDefined();
      expect(context.ir.payments?.providers).toHaveLength(1);
      expect(context.ir.payments?.products).toHaveLength(2);
      expect(context.ir.payments?.defaultCurrency).toBe('usd');
      expect(context.ir.payments?.successUrl).toBe('https://example.com/success');
      expect(context.ir.payments?.cancelUrl).toBe('https://example.com/cancel');
    });

    it('should handle complete payment configuration with pricing page', () => {
      // Setup spec with payment config including pricing page
      const info = (context.element as any).info;
      info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
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
              interval: 'month',
              features: ['Basic features'],
            },
            {
              id: 'pro',
              name: 'Professional',
              type: 'subscription',
              price: 2900,
              interval: 'month',
              highlighted: true,
              features: ['All features', 'Priority support'],
            },
          ],
        },
      };

      // Extract
      const extracted = handler.extract(context);
      expect(extracted).toBeDefined();
      expect(extracted?.pricingPage).toBeDefined();

      // Validate
      const isValid = handler.validate(extracted!);
      expect(isValid).toBe(true);

      // Apply
      handler.apply(extracted!, context);

      // Verify IR
      expect(context.ir.payments).toBeDefined();
      expect(context.ir.payments?.pricingPage).toBeDefined();
      expect(context.ir.payments?.pricingPage?.enabled).toBe(true);
      expect(context.ir.payments?.pricingPage?.source).toBe('inline');
      expect(context.ir.payments?.pricingPage?.products).toHaveLength(2);
    });
  });
});
