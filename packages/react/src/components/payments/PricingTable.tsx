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
  
  /** Number of columns in the grid */
  columns?: number;
  
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
  columns = 3,
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
      <div className="pricing-table pricing-table--empty">
        <p>No pricing plans available</p>
      </div>
    );
  }
  
  return (
    <div className={`pricing-table ${className}`}>
      {(title || subtitle) && (
        <div className="pricing-table__header">
          {title && <h2 className="pricing-table__title">{title}</h2>}
          {subtitle && <p className="pricing-table__subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div
        className="pricing-table__grid"
        style={{
          gridTemplateColumns: `repeat(${Math.min(columns, products.length)}, 1fr)`,
        }}
      >
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
