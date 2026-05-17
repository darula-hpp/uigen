/**
 * usePaymentConfig Hook
 * 
 * React hook for accessing payment configuration from UIGen context.
 */

import { useApp } from '../contexts/AppContext.js';
import type { PaymentConfig, PaymentProvider, PaymentProduct } from '@uigen-dev/core';

/**
 * Payment configuration hook result
 */
export interface UsePaymentConfigResult {
  /** Payment configuration */
  config: PaymentConfig | undefined;
  
  /** Enabled payment providers */
  providers: PaymentProvider[];
  
  /** Available products */
  products: PaymentProduct[];
  
  /** Primary (first enabled) provider */
  primaryProvider: PaymentProvider | undefined;
  
  /** Whether payments are configured */
  isConfigured: boolean;
  
  /** Get provider by name */
  getProvider: (name: string) => PaymentProvider | undefined;
  
  /** Get product by ID */
  getProduct: (id: string) => PaymentProduct | undefined;
}

/**
 * Hook to access payment configuration
 * 
 * @returns Payment configuration and helper functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { providers, products, primaryProvider } = usePaymentConfig();
 *   
 *   if (!primaryProvider) {
 *     return <div>No payment provider configured</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <h2>Available Plans</h2>
 *       {products.map(product => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaymentConfig(): UsePaymentConfigResult {
  const { config } = useApp();
  
  const paymentConfig = config.payments;
  const providers = paymentConfig?.providers || [];
  const products = paymentConfig?.products || [];
  const primaryProvider = providers.find(p => p.enabled);
  const isConfigured = providers.length > 0;
  
  const getProvider = (name: string): PaymentProvider | undefined => {
    return providers.find(p => p.provider === name && p.enabled);
  };
  
  const getProduct = (id: string): PaymentProduct | undefined => {
    return products.find(p => p.id === id);
  };
  
  return {
    config: paymentConfig,
    providers,
    products,
    primaryProvider,
    isConfigured,
    getProvider,
    getProduct,
  };
}
