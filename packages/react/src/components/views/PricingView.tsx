import { useState, useEffect } from 'react';
import type { UIGenApp, PaymentProduct } from '@uigen-dev/core';
import { PricingSourceFactory } from '../../lib/pricing-source';
import { usePaymentStatus } from '../../lib/use-payment-status';
import { PricingTable } from '../payments/PricingTable';

/**
 * Props for PricingView component
 */
export interface PricingViewProps {
  /** Application configuration */
  config: UIGenApp;
}

/**
 * PricingView Component
 * 
 * Auto-generated pricing view that displays subscription plans.
 * Uses extensible pricing source strategy to load products from:
 * - Inline YAML (Phase 1)
 * - Backend endpoint (Phase 2)
 * - Custom component (Phase 3)
 * 
 * @example
 * ```tsx
 * // In App.tsx route generation
 * <Route path="/pricing" element={
 *   <PricingView config={config} />
 * } />
 * ```
 */
export function PricingView({ config }: PricingViewProps) {
  const [products, setProducts] = useState<PaymentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentPlan } = usePaymentStatus();

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        // Check if payments are configured
        if (!config.payments?.pricingPage) {
          if (mounted) {
            setLoading(false);
            setError(new Error('Pricing page not configured'));
          }
          return;
        }

        // Create pricing source based on config
        const source = PricingSourceFactory.create(config.payments.pricingPage);

        // Load products from source
        const loadedProducts = await source.load();

        if (mounted) {
          setProducts(loadedProducts);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load pricing'));
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [config]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading pricing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <svg
            className="w-12 h-12 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Pricing
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  // Component source uses override, skip default rendering
  if (config.payments?.pricingPage?.source === 'component') {
    // Override system will render the custom component
    return null;
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Plans Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pricing plans are not currently available. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Render pricing table with products
  return (
    <div className="pricing-view-container py-8 px-4">
      <PricingTable
        products={products.map(product => ({
          ...product,
          // Highlight current plan
          highlighted: product.highlighted || product.id === currentPlan,
        }))}
        title="Choose Your Plan"
        subtitle="Select the plan that works best for you"
        columns={3}
      />
    </div>
  );
}
