/**
 * PaymentButton Component
 * 
 * Generic button for initiating payment checkout.
 */

import React, { useState } from 'react';
import { usePaymentConfig } from '../../lib/use-payment-config.js';
import { PaymentStrategyFactory } from '../../lib/payment-strategy-factory.js';
import type { CheckoutResult } from '../../lib/payment-strategy.js';

export interface PaymentButtonProps {
  /** Product ID to purchase */
  productId: string;
  
  /** Customer ID (optional) */
  customerId?: string;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
  
  /** Success callback */
  onSuccess?: (result: CheckoutResult) => void;
  
  /** Error callback */
  onError?: (error: Error) => void;
  
  /** Button text */
  children?: React.ReactNode;
  
  /** Custom CSS class */
  className?: string;
  
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  
  /** Disabled state */
  disabled?: boolean;
}

/**
 * PaymentButton Component
 * 
 * Initiates payment checkout when clicked.
 * Automatically uses the primary payment provider from configuration.
 * 
 * @example
 * ```tsx
 * <PaymentButton
 *   productId="pro-monthly"
 *   customerId="cus_123"
 *   onSuccess={(result) => console.log('Payment initiated', result)}
 *   onError={(error) => console.error('Payment failed', error)}
 * >
 *   Subscribe Now
 * </PaymentButton>
 * ```
 */
export function PaymentButton({
  productId,
  customerId,
  metadata,
  onSuccess,
  onError,
  children = 'Subscribe',
  className = '',
  variant = 'primary',
  size = 'medium',
  disabled = false,
}: PaymentButtonProps) {
  const { primaryProvider, config } = usePaymentConfig();
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    if (!primaryProvider) {
      const error = new Error('No payment provider configured');
      onError?.(error);
      return;
    }
    
    setLoading(true);
    
    try {
      // Get payment strategy
      const strategy = PaymentStrategyFactory.create(primaryProvider.provider);
      
      // Initialize strategy
      await strategy.initialize(primaryProvider);
      
      // Create checkout session
      const result = await strategy.createCheckout({
        productId,
        customerId,
        successUrl: config?.successUrl || `${window.location.origin}/payment/success`,
        cancelUrl: config?.cancelUrl || `${window.location.origin}/payment/cancel`,
        metadata,
      });
      
      // Call success callback
      onSuccess?.(result);
      
      // Redirect to checkout
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Payment button error:', error);
      onError?.(error as Error);
      setLoading(false);
    }
  };
  
  return (
    <button
      className={`
        payment-button
        payment-button--${variant}
        payment-button--${size}
        ${loading ? 'payment-button--loading' : ''}
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || loading || !primaryProvider}
      aria-label={typeof children === 'string' ? children : 'Payment button'}
    >
      {loading ? (
        <>
          <span className="payment-button__spinner" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
