/**
 * PricingCard Component
 * 
 * Displays a single pricing plan with features and CTA button.
 */

import type { PaymentProduct } from '@uigen-dev/core';
import { formatCurrency } from '../../lib/payment-providers.js';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
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
    
    // Handle enterprise plan (custom pricing)
    if (product.price === 'custom') {
      return 'Contact Sales';
    }
    
    // Handle free plan (price is 0)
    if (product.price === 0) {
      return 'Get Started';
    }
    
    // Handle paid plans based on type
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
  
  /**
   * Handle button click with plan-specific behavior
   * Requirements: 8.1, 8.3, 9.1, 9.3
   */
  const handleClick = () => {
    // Free plan: navigate to /signup or /dashboard (no checkout)
    if (product.price === 0) {
      navigate('/signup');
      return;
    }
    
    // Enterprise plan: navigate to /contact (no checkout)
    if (product.price === 'custom') {
      navigate('/contact');
      return;
    }
    
    // Pro plan (or other paid plans): call onSelect callback to initiate checkout
    if (onSelect) {
      onSelect();
    }
  };
  
  return (
    <div
      className={`pricing-card ${highlighted ? 'highlighted' : ''} ${className}`}
      data-product-id={product.id}
    >
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
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      
      <button
        className={`pricing-card__button ${highlighted ? 'highlighted' : ''}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={`Select ${product.name} plan`}
      >
        {loading ? 'Processing...' : getCtaText()}
      </button>
    </div>
  );
}
