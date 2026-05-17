/**
 * PricingTable Component
 * 
 * Displays a grid of pricing plans.
 */

import React, { useState } from 'react';
import type { PaymentProduct } from '@uigen-dev/core';
import { PricingCard } from './PricingCard.js';
import { usePaymentConfig } from '../../lib/use-payment-config.js';

export interface PricingTableProps {
  /** Products to display (overrides config) */
  products?: PaymentProduct[];
  
  /** Callback when a plan is selected */
  onSelectPlan?: (productId: string) => void;
  
  /** Custom CSS class */
  className?: string;
  
  /** Title for the pricing section */
  title?: string;
  
  /** Subtitle/description */
  subtitle?: string;
}

/**
 * PricingTable Component
 * 
 * Renders a responsive grid of pricing cards.
 * Automatically loads products from payment configuration if not provided.
 * 
 * @example
 * ```tsx
 * <PricingTable
 *   title="Choose Your Plan"
 *   subtitle="Select the plan that works best for you"
 *   columns={3}
 *   onSelectPlan={(productId) => handleSubscribe(productId)}
 * />
 * ```
 */
export function PricingTable({
  products: productsProp,
  onSelectPlan,
  className = '',
  title,
  subtitle,
}: PricingTableProps) {
  const { products: configProducts } = usePaymentConfig();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  
  const products = productsProp || configProducts;
  
  const handleSelectPlan = async (productId: string) => {
    if (!onSelectPlan) {
      return;
    }
    
    setLoadingProduct(productId);
    try {
      await onSelectPlan(productId);
    } finally {
      setLoadingProduct(null);
    }
  };
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No pricing plans available</p>
      </div>
    );
  }
  
  return (
    <div className={`w-full ${className}`}>
      {(title || subtitle) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600 dark:text-gray-400">{subtitle}</p>}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
        {products.map((product) => (
          <PricingCard
            key={product.id}
            product={product}
            highlighted={product.highlighted}
            onSelect={() => handleSelectPlan(product.id)}
            loading={loadingProduct === product.id}
          />
        ))}
      </div>
    </div>
  );
}
