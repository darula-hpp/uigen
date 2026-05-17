/**
 * PricingCard Component
 * 
 * Displays a single pricing plan with features and CTA button.
 */

import type { PaymentProduct } from '@uigen-dev/core';
import { formatCurrency } from '../../lib/payment-providers.js';

export interface PricingCardProps {
  /** Product/plan to display */
  product: PaymentProduct;
  
  /** Whether this card is highlighted */
  highlighted?: boolean;
  
  /** Callback when user selects this plan */
  onSelect?: () => void;
  
  /** Custom CTA button text */
  ctaText?: string;
  
  /** Whether the button is loading */
  loading?: boolean;
  
  /** Custom CSS class */
  className?: string;
}

/**
 * PricingCard Component
 * 
 * Renders a pricing card with product details, features, and CTA button.
 * 
 * @example
 * ```tsx
 * <PricingCard
 *   product={proMonthly}
 *   highlighted={true}
 *   onSelect={() => handleSubscribe('pro-monthly')}
 * />
 * ```
 */
export function PricingCard({
  product,
  highlighted = false,
  onSelect,
  ctaText,
  loading = false,
  className = '',
}: PricingCardProps) {
  const formatPrice = (): string => {
    if (product.price === 'custom') {
      return 'Custom';
    }
    
    const currency = product.currency || 'usd';
    return formatCurrency(product.price, currency);
  };
  
  const formatInterval = (): string | null => {
    if (!product.interval) {
      return null;
    }
    
    const count = product.intervalCount || 1;
    if (count === 1) {
      return `per ${product.interval}`;
    }
    
    return `every ${count} ${product.interval}s`;
  };
  
  const getCtaText = (): string => {
    if (ctaText) {
      return ctaText;
    }
    
    if (product.price === 'custom') {
      return 'Contact Sales';
    }
    
    switch (product.type) {
      case 'subscription':
        return 'Subscribe';
      case 'one-time':
        return 'Buy Now';
      case 'usage-based':
        return 'Get Started';
      default:
        return 'Select Plan';
    }
  };
  
  return (
    <div
      className={`
        pricing-card
        ${highlighted ? 'pricing-card--highlighted' : ''}
        ${className}
      `}
      data-product-id={product.id}
    >
      {highlighted && (
        <div className="pricing-card__badge">
          Recommended
        </div>
      )}
      
      <div className="pricing-card__header">
        <h3 className="pricing-card__name">{product.name}</h3>
        {product.description && (
          <p className="pricing-card__description">{product.description}</p>
        )}
      </div>
      
      <div className="pricing-card__price">
        <span className="pricing-card__price-amount">{formatPrice()}</span>
        {formatInterval() && (
          <span className="pricing-card__price-interval">{formatInterval()}</span>
        )}
      </div>
      
      {product.features && product.features.length > 0 && (
        <ul className="pricing-card__features">
          {product.features.map((feature, index) => (
            <li key={index} className="pricing-card__feature">
              <svg
                className="pricing-card__feature-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  fill="currentColor"
                />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      
      <button
        className={`
          pricing-card__cta
          ${highlighted ? 'pricing-card__cta--highlighted' : ''}
        `}
        onClick={onSelect}
        disabled={loading}
        aria-label={`Select ${product.name} plan`}
      >
        {loading ? 'Processing...' : getCtaText()}
      </button>
    </div>
  );
}
