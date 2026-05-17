import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PricingView } from '../PricingView';
import type { UIGenApp, PaymentProduct } from '@uigen-dev/core';
import * as pricingSourceModule from '../../../lib/pricing-source';
import * as usePaymentStatusModule from '../../../lib/use-payment-status';

// Mock the pricing source module
vi.mock('../../../lib/pricing-source', () => ({
  PricingSourceFactory: {
    create: vi.fn(),
  },
}));

// Mock the payment status hook
vi.mock('../../../lib/use-payment-status', () => ({
  usePaymentStatus: vi.fn(),
}));

// Mock PricingTable component
vi.mock('../../payments/PricingTable', () => ({
  PricingTable: ({ products, title, subtitle }: any) => (
    <div data-testid="pricing-table">
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div data-testid="products">
        {products.map((p: PaymentProduct) => (
          <div key={p.id} data-testid={`product-${p.id}`}>
            {p.name} - ${p.price}
            {p.highlighted && <span data-testid={`highlighted-${p.id}`}>★</span>}
          </div>
        ))}
      </div>
    </div>
  ),
}));

describe('PricingView', () => {
  const mockProducts: PaymentProduct[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Basic features',
      type: 'subscription',
      price: 0,
      interval: 'month',
      features: ['Feature 1', 'Feature 2'],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'All features',
      type: 'subscription',
      price: 2900,
      interval: 'month',
      highlighted: true,
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
  ];

  const baseConfig: UIGenApp = {
    meta: {
      title: 'Test App',
      version: '1.0.0',
      description: 'Test',
    },
    resources: [],
    auth: {
      schemes: [],
      loginEndpoints: [],
      signUpEndpoints: [],
      passwordResetEndpoints: [],
    },
    payments: {
      providers: [
        {
          provider: 'stripe',
          publishableKey: 'pk_test_123',
          mode: 'test',
        },
      ],
      pricingPage: {
        enabled: true,
        source: 'inline',
        products: mockProducts,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for usePaymentStatus
    vi.mocked(usePaymentStatusModule.usePaymentStatus).mockReturnValue({
      currentPlan: null,
      status: 'none',
      isFree: true,
      isSubscribed: false,
      loading: false,
      error: null,
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while loading products', () => {
      // Mock source that never resolves
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn(() => new Promise(() => {})),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      expect(screen.getByText('Loading pricing...')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should load and display products from inline source', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });

      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
      expect(screen.getByText('Select the plan that works best for you')).toBeInTheDocument();
      expect(screen.getByTestId('product-free')).toBeInTheDocument();
      expect(screen.getByTestId('product-pro')).toBeInTheDocument();
    });

    it('should highlight current plan', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      // User is on 'free' plan
      vi.mocked(usePaymentStatusModule.usePaymentStatus).mockReturnValue({
        currentPlan: 'free',
        status: 'active',
        isFree: true,
        isSubscribed: true,
        loading: false,
        error: null,
      });

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });

      // Free plan should be highlighted (current plan)
      expect(screen.getByTestId('highlighted-free')).toBeInTheDocument();
      // Pro plan should also be highlighted (marked in config)
      expect(screen.getByTestId('highlighted-pro')).toBeInTheDocument();
    });

    it('should create pricing source with correct config', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      const createSpy = vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(baseConfig.payments?.pricingPage);
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Pricing')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show error when pricing page not configured', async () => {
      const configWithoutPricing: UIGenApp = {
        ...baseConfig,
        payments: undefined,
      };

      render(<PricingView config={configWithoutPricing} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Pricing')).toBeInTheDocument();
      });

      expect(screen.getByText('Pricing page not configured')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no products available', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByText('No Plans Available')).toBeInTheDocument();
      });

      expect(screen.getByText('Pricing plans are not currently available. Please check back later.')).toBeInTheDocument();
    });
  });

  describe('Component Source', () => {
    it('should return null for component source (override handles rendering)', async () => {
      const configWithComponentSource: UIGenApp = {
        ...baseConfig,
        payments: {
          ...baseConfig.payments!,
          pricingPage: {
            enabled: true,
            source: 'component',
          },
        },
      };

      const mockSource = {
        type: 'component' as const,
        load: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      const { container } = render(<PricingView config={configWithComponentSource} />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      // PricingTable should not be rendered
      expect(screen.queryByTestId('pricing-table')).not.toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should not update state after unmount', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(mockProducts), 100))
        ),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      const { unmount } = render(<PricingView config={baseConfig} />);

      // Unmount before promise resolves
      unmount();

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150));

      // No errors should occur (state update on unmounted component)
      // This test passes if no errors are thrown
    });
  });

  describe('Endpoint Source', () => {
    it('should load products from endpoint source', async () => {
      const configWithEndpoint: UIGenApp = {
        ...baseConfig,
        payments: {
          ...baseConfig.payments!,
          pricingPage: {
            enabled: true,
            source: 'endpoint',
            endpoint: '/api/pricing',
          },
        },
      };

      const mockSource = {
        type: 'endpoint' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={configWithEndpoint} />);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });

      expect(mockSource.load).toHaveBeenCalled();
      expect(screen.getByTestId('product-free')).toBeInTheDocument();
      expect(screen.getByTestId('product-pro')).toBeInTheDocument();
    });
  });

  describe('Product Highlighting', () => {
    it('should preserve highlighted flag from config', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });

      // Pro plan has highlighted: true in config
      expect(screen.getByTestId('highlighted-pro')).toBeInTheDocument();
    });

    it('should highlight both config-highlighted and current plan', async () => {
      const mockSource = {
        type: 'inline' as const,
        load: vi.fn().mockResolvedValue(mockProducts),
      };
      vi.mocked(pricingSourceModule.PricingSourceFactory.create).mockReturnValue(mockSource);

      // User is on 'free' plan, but 'pro' is highlighted in config
      vi.mocked(usePaymentStatusModule.usePaymentStatus).mockReturnValue({
        currentPlan: 'free',
        status: 'active',
        isFree: true,
        isSubscribed: true,
        loading: false,
        error: null,
      });

      render(<PricingView config={baseConfig} />);

      await waitFor(() => {
        expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
      });

      // Both should be highlighted
      expect(screen.getByTestId('highlighted-free')).toBeInTheDocument();
      expect(screen.getByTestId('highlighted-pro')).toBeInTheDocument();
    });
  });
});
