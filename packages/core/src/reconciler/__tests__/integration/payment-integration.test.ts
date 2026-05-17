import { describe, it, expect } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { PaymentConfigFile } from '../../types.js';

describe('Payment Integration', () => {
  it('should handle complete payment flow from spec to config', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'SaaS API',
        version: '1.0.0',
        'x-uigen-payments': {
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
              features: ['10 meetings per month', '3 templates'],
            },
            {
              id: 'pro-monthly',
              name: 'Professional',
              type: 'subscription',
              price: 2900,
              interval: 'month',
              highlighted: true,
              features: ['Unlimited meetings', 'Unlimited templates', 'Priority support'],
            },
            {
              id: 'enterprise',
              name: 'Enterprise',
              type: 'subscription',
              price: 'custom',
              interval: 'year',
              features: ['Everything in Pro', 'Custom integrations', 'Dedicated support'],
            },
          ],
          defaultCurrency: 'usd',
          successUrl: 'https://example.com/payment/success',
          cancelUrl: 'https://example.com/payment/cancel',
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    // Verify config was populated
    expect(result.config.payments).toBeDefined();
    expect(result.config.payments?.providers).toHaveLength(1);
    expect(result.config.payments?.products).toHaveLength(3);
    expect(result.config.payments?.defaultCurrency).toBe('usd');

    // Verify provider details
    const provider = result.config.payments?.providers[0];
    expect(provider?.provider).toBe('stripe');
    expect(provider?.mode).toBe('test');
    expect(provider?.enabled).toBe(true);

    // Verify products
    const products = result.config.payments?.products || [];
    expect(products[0].id).toBe('free');
    expect(products[0].price).toBe(0);
    expect(products[1].id).toBe('pro-monthly');
    expect(products[1].highlighted).toBe(true);
    expect(products[2].id).toBe('enterprise');
    expect(products[2].price).toBe('custom');
  });

  it('should handle config overriding spec', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'API',
        version: '1.0.0',
        'x-uigen-payments': {
          providers: [
            {
              provider: 'stripe',
              apiKey: '${STRIPE_SECRET_KEY}',
              webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
              mode: 'test',
              enabled: true,
            },
          ],
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
      payments: {
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
            id: 'premium',
            name: 'Premium',
            type: 'subscription',
            price: 4900,
            interval: 'month',
          },
        ],
      },
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    // Config should win
    expect(result.config.payments?.providers[0].provider).toBe('paypal');
    expect(result.config.payments?.providers[0].mode).toBe('live');
    expect(result.config.payments?.products?.[0].id).toBe('premium');

    // Spec should be updated
    expect(result.spec.info['x-uigen-payments']?.providers[0].provider).toBe('paypal');
    expect(result.spec.info['x-uigen-payments']?.products?.[0].id).toBe('premium');
  });

  it('should handle multiple providers', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Multi-Provider API',
        version: '1.0.0',
        'x-uigen-payments': {
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
              enabled: false, // Disabled
            },
          ],
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    expect(result.config.payments?.providers).toHaveLength(2);
    expect(result.config.payments?.providers[0].enabled).toBe(true);
    expect(result.config.payments?.providers[1].enabled).toBe(false);
  });

  it('should validate and warn about invalid configurations', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Invalid Config API',
        version: '1.0.0',
        'x-uigen-payments': {
          providers: [
            {
              provider: 'invalid-provider' as any,
              apiKey: '${API_KEY}',
              webhookSecret: '${WEBHOOK_SECRET}',
              mode: 'test',
              enabled: true,
            },
          ],
          products: [
            {
              id: 'bad-product',
              name: 'Bad Product',
              type: 'subscription',
              price: -100, // Invalid
              interval: 'month',
            },
          ],
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    // Should have warnings
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle payment config with auth config', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Full Featured API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}',
              clientSecret: '${GOOGLE_CLIENT_SECRET}',
              enabled: true,
            },
          ],
        },
        'x-uigen-payments': {
          providers: [
            {
              provider: 'stripe',
              apiKey: '${STRIPE_SECRET_KEY}',
              webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
              mode: 'test',
              enabled: true,
            },
          ],
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    // Both auth and payments should be configured
    expect(result.config.auth).toBeDefined();
    expect(result.config.payments).toBeDefined();
    expect(result.config.auth?.providers).toHaveLength(1);
    expect(result.config.payments?.providers).toHaveLength(1);
  });

  it('should preserve environment variable references', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Env Var API',
        version: '1.0.0',
        'x-uigen-payments': {
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
        },
      },
      paths: {},
    };

    const config: PaymentConfigFile = {
      version: '1.0',
    };

    const reconciler = new Reconciler();
    const result = reconciler.reconcile(spec, config);

    const provider = result.config.payments?.providers[0];
    expect(provider?.apiKey).toBe('${STRIPE_SECRET_KEY}');
    expect(provider?.publishableKey).toBe('${STRIPE_PUBLISHABLE_KEY}');
    expect(provider?.webhookSecret).toBe('${STRIPE_WEBHOOK_SECRET}');
  });
});
