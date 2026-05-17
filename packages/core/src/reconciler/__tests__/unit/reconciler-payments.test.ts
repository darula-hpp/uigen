import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentReconciler } from '../../payment-reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { PaymentConfigFile } from '../../types.js';

describe('PaymentReconciler', () => {
  let reconciler: PaymentReconciler;
  let spec: OpenAPIV3.Document;
  let config: PaymentConfigFile;

  beforeEach(() => {
    reconciler = new PaymentReconciler();
    
    spec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {},
    };

    config = {
      version: '1.0',
    };
  });

  describe('reconcile', () => {
    it('should sync payment config from spec to config file', () => {
      spec.info['x-uigen-payments'] = {
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
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.config.payments).toBeDefined();
      expect(result.config.payments?.providers).toHaveLength(1);
      expect(result.config.payments?.providers[0].provider).toBe('stripe');
    });

    it('should prefer config file over spec', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
      };

      config.payments = {
        providers: [
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

      const result = reconciler.reconcile(spec, config);

      // Config should win
      expect(result.config.payments?.providers[0].provider).toBe('paypal');
      
      // Spec should be updated to match config
      expect(result.spec.info['x-uigen-payments']?.providers[0].provider).toBe('paypal');
    });

    it('should merge products from both sources', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
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
      };

      config.payments = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'enterprise',
            name: 'Enterprise',
            type: 'subscription',
            price: 'custom',
            interval: 'year',
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      // Config products should be used
      expect(result.config.payments?.products).toHaveLength(1);
      expect(result.config.payments?.products?.[0].id).toBe('enterprise');
    });

    it('should handle provider enable/disable', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
      };

      config.payments = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: false, // Disabled in config
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      // Config should win
      expect(result.config.payments?.providers[0].enabled).toBe(false);
      expect(result.spec.info['x-uigen-payments']?.providers[0].enabled).toBe(false);
    });

    it('should sync global payment settings', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        defaultCurrency: 'usd',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.config.payments?.defaultCurrency).toBe('usd');
      expect(result.config.payments?.successUrl).toBe('https://example.com/success');
      expect(result.config.payments?.cancelUrl).toBe('https://example.com/cancel');
    });

    it('should handle missing payment config gracefully', () => {
      const result = reconciler.reconcile(spec, config);

      expect(result.spec).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate providers during reconciliation', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'invalid-provider' as any,
            apiKey: '${API_KEY}',
            webhookSecret: '${WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Unsupported payment provider');
    });

    it('should validate products during reconciliation', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro',
            name: 'Professional',
            type: 'subscription',
            price: -100, // Invalid negative price
            interval: 'month',
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Invalid product price');
    });

    it('should handle multiple providers', () => {
      spec.info['x-uigen-payments'] = {
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

      const result = reconciler.reconcile(spec, config);

      expect(result.config.payments?.providers).toHaveLength(2);
      expect(result.config.payments?.providers[0].provider).toBe('stripe');
      expect(result.config.payments?.providers[1].provider).toBe('paypal');
    });

    it('should preserve provider-specific fields', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            currency: 'eur',
            enabled: true,
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      const provider = result.config.payments?.providers[0];
      expect(provider?.publishableKey).toBe('${STRIPE_PUBLISHABLE_KEY}');
      expect(provider?.currency).toBe('eur');
    });

    it('should preserve product metadata', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'pro',
            name: 'Professional',
            type: 'subscription',
            price: 2900,
            interval: 'month',
            features: ['Feature 1', 'Feature 2'],
            highlighted: true,
            metadata: { key: 'value' },
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      const product = result.config.payments?.products?.[0];
      expect(product?.features).toEqual(['Feature 1', 'Feature 2']);
      expect(product?.highlighted).toBe(true);
      expect(product?.metadata).toEqual({ key: 'value' });
    });

    it('should handle config overriding spec completely', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'old-product',
            name: 'Old Product',
            type: 'subscription',
            price: 1000,
            interval: 'month',
          },
        ],
      };

      config.payments = {
        providers: [
          {
            provider: 'paypal',
            clientId: '${PAYPAL_CLIENT_ID}',
            clientSecret: '${PAYPAL_CLIENT_SECRET}',
            webhookSecret: '${PAYPAL_WEBHOOK_SECRET}',
            mode: 'live',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'new-product',
            name: 'New Product',
            type: 'one-time',
            price: 5000,
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      // Config should completely override spec
      expect(result.config.payments?.providers[0].provider).toBe('paypal');
      expect(result.config.payments?.providers[0].mode).toBe('live');
      expect(result.config.payments?.products?.[0].id).toBe('new-product');
      
      // Spec should be updated to match config
      expect(result.spec.info['x-uigen-payments']?.providers[0].provider).toBe('paypal');
      expect(result.spec.info['x-uigen-payments']?.products?.[0].id).toBe('new-product');
    });
  });

  describe('edge cases', () => {
    it('should handle empty providers array', () => {
      spec.info['x-uigen-payments'] = {
        providers: [],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('No payment providers configured');
    });

    it('should handle missing required fields', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            // Missing apiKey
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          } as any,
        ],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle custom price products', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'enterprise',
            name: 'Enterprise',
            type: 'subscription',
            price: 'custom',
            interval: 'year',
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.config.payments?.products?.[0].price).toBe('custom');
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle products without interval for one-time payments', () => {
      spec.info['x-uigen-payments'] = {
        providers: [
          {
            provider: 'stripe',
            apiKey: '${STRIPE_SECRET_KEY}',
            webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
            mode: 'test',
            enabled: true,
          },
        ],
        products: [
          {
            id: 'one-time',
            name: 'One Time Purchase',
            type: 'one-time',
            price: 9900,
          },
        ],
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings).toHaveLength(0);
      expect(result.config.payments?.products?.[0].type).toBe('one-time');
    });
  });
});
