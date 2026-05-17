import { useState, useEffect } from 'react';
import type { UIGenApp, PaymentProduct } from '@uigen-dev/core';
import { PricingSourceFactory } from '../../lib/pricing-source';
import { usePaymentStatus } from '../../lib/use-payment-status';
import { PricingTable } from '../payments/PricingTable';
import { useApiMutation } from '../../hooks/useApiCall';

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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { currentPlan } = usePaymentStatus();

  // Create checkout operation definition
  const checkoutEndpoint = config.payments?.checkoutEndpoint || '/api/v1/pricing/create-checkout';
  
  const checkoutOperation = {
    id: 'create-checkout',
    method: 'POST' as const,
    path: checkoutEndpoint,
    summary: 'Create checkout session',
    requestContentType: 'application/json',
    parameters: [],
    responses: {},
    viewHint: 'action' as const,
  };

  const { mutate: createCheckout } = useApiMutation(checkoutOperation);

  /**
   * Handle plan selection and checkout session creation
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4
   */
  const handleSelectPlan = (productId: string) => {
    // Clear any previous errors
    setCheckoutError(null);

    // Get success and cancel URLs from config
    const successUrl = config.payments?.successUrl || `${window.location.origin}/payment/success`;
    const cancelUrl = config.payments?.cancelUrl || `${window.location.origin}/payment/cancel`;

    // Call checkout endpoint
    createCheckout(
      {
        body: {
          product_id: productId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      },
      {
        onSuccess: (response: { checkout_url: string; session_id: string }) => {
          // Redirect to Stripe checkout page
          window.location.href = response.checkout_url;
        },
        onError: (err: any) => {
          // Handle different error types
          if (err.status === 401) {
            // Redirect to login page
            window.location.href = '/login';
          } else if (err.status === 400) {
            // Display validation error from backend
            setCheckoutError(err.message || 'Invalid plan selection. Please try again.');
          } else if (err.status === 500) {
            // Display generic server error
            setCheckoutError('Something went wrong. Please try again in a few moments.');
          } else {
            // Network or other errors
            setCheckoutError('Unable to connect. Please check your internet connection and try again.');
          }
        },
      }
    );
  };

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
  // Note: Header is provided by layout, no need to duplicate
  return (
    <div className="w-full">
      {checkoutError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
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
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Checkout Error
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">{checkoutError}</p>
            </div>
            <button
              onClick={() => setCheckoutError(null)}
              className="ml-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      <PricingTable
        products={products.map(product => ({
          ...product,
          // Highlight current plan
          highlighted: product.highlighted || product.id === currentPlan,
        }))}
        title="Choose Your Plan"
        subtitle="Select the plan that works best for you"
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}
