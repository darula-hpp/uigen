import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  InlinePricingSource,
  EndpointPricingSource,
  ComponentPricingSource,
  PricingSourceFactory,
} from '../pricing-source';
import type { PaymentProduct, PricingPageConfig } from '@uigen-dev/core';

describe('PricingSource', () => {
  describe('InlinePricingSource', () => {
    it('should have inline type', () => {
      const products: PaymentProduct[] = [];
      const source = new InlinePricingSource(products);
      expect(source.type).toBe('inline');
    });

    it('should return products from constructor', async () => {
      const products: PaymentProduct[] = [
        {
          id: 'free',
          name: 'Free Plan',
          type: 'subscription',
          price: 0,
          interval: 'month',
        },
        {
          id: 'pro',
          name: 'Pro Plan',
          type: 'subscription',
          price: 2900,
          interval: 'month',
        },
      ];
      const source = new InlinePricingSource(products);
      const loaded = await source.load();
      expect(loaded).toEqual(products);
      expect(loaded).toHaveLength(2);
    });

    it('should return empty array when no products', async () => {
      const source = new InlinePricingSource([]);
      const loaded = await source.load();
      expect(loaded).toEqual([]);
    });
  });

  describe('EndpointPricingSource', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should have endpoint type', () => {
      const source = new EndpointPricingSource('/api/pricing');
      expect(source.type).toBe('endpoint');
    });

    it('should fetch products from endpoint', async () => {
      const products: PaymentProduct[] = [
        {
          id: 'enterprise',
          name: 'Enterprise',
          type: 'subscription',
          price: 9900,
          interval: 'month',
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => products,
      });

      const source = new EndpointPricingSource('/api/pricing');
      const loaded = await source.load();

      expect(global.fetch).toHaveBeenCalledWith('/api/pricing');
      expect(loaded).toEqual(products);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const source = new EndpointPricingSource('/api/pricing');

      await expect(source.load()).rejects.toThrow('Failed to fetch pricing data: Not Found');
    });
  });

  describe('ComponentPricingSource', () => {
    it('should have component type', () => {
      const source = new ComponentPricingSource();
      expect(source.type).toBe('component');
    });

    it('should return empty array', async () => {
      const source = new ComponentPricingSource();
      const loaded = await source.load();
      expect(loaded).toEqual([]);
    });
  });

  describe('PricingSourceFactory', () => {
    it('should create InlinePricingSource for inline config', () => {
      const config: PricingPageConfig = {
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
      };

      const source = PricingSourceFactory.create(config);
      expect(source).toBeInstanceOf(InlinePricingSource);
      expect(source.type).toBe('inline');
    });

    it('should create InlinePricingSource with empty products when products missing', () => {
      const config: PricingPageConfig = {
        enabled: true,
        source: 'inline',
      };

      const source = PricingSourceFactory.create(config);
      expect(source).toBeInstanceOf(InlinePricingSource);
    });

    it('should create EndpointPricingSource for endpoint config', () => {
      const config: PricingPageConfig = {
        enabled: true,
        source: 'endpoint',
        endpoint: '/api/pricing',
      };

      const source = PricingSourceFactory.create(config);
      expect(source).toBeInstanceOf(EndpointPricingSource);
      expect(source.type).toBe('endpoint');
    });

    it('should throw error when endpoint URL missing', () => {
      const config: PricingPageConfig = {
        enabled: true,
        source: 'endpoint',
      };

      expect(() => PricingSourceFactory.create(config)).toThrow(
        'Endpoint URL required for endpoint source'
      );
    });

    it('should create ComponentPricingSource for component config', () => {
      const config: PricingPageConfig = {
        enabled: true,
        source: 'component',
        override: {
          id: 'custom-pricing',
          enabled: true,
        },
      };

      const source = PricingSourceFactory.create(config);
      expect(source).toBeInstanceOf(ComponentPricingSource);
      expect(source.type).toBe('component');
    });

    it('should throw error for unknown source type', () => {
      const config = {
        enabled: true,
        source: 'unknown',
      } as any;

      expect(() => PricingSourceFactory.create(config)).toThrow('Unknown pricing source: unknown');
    });
  });
});
