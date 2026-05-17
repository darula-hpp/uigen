/**
 * SubscriptionManager Component
 * 
 * Displays and manages user's subscription.
 */

import React, { useState, useEffect } from 'react';
import { usePaymentConfig } from '../../lib/use-payment-config.js';
import { PaymentStrategyFactory } from '../../lib/payment-strategy-factory.js';

export interface Subscription {
  id: string;
  productId: string;
  productName: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionManagerProps {
  /** Customer ID */
  customerId: string;
  
  /** Current subscription (if loaded externally) */
  subscription?: Subscription | null;
  
  /** Callback when subscription is loaded */
  onLoad?: (subscription: Subscription | null) => void;
  
  /** Callback when subscription is canceled */
  onCancel?: () => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
  
  /** Custom CSS class */
  className?: string;
}

/**
 * SubscriptionManager Component
 * 
 * Displays subscription details and provides management actions.
 * 
 * @example
 * ```tsx
 * <SubscriptionManager
 *   customerId="cus_123"
 *   onCancel={() => console.log('Subscription canceled')}
 * />
 * ```
 */
export function SubscriptionManager({
  customerId,
  subscription: subscriptionProp,
  onLoad,
  onCancel,
  onError,
  className = '',
}: SubscriptionManagerProps) {
  const { primaryProvider, getProduct } = usePaymentConfig();
  const [subscription, setSubscription] = useState<Subscription | null>(subscriptionProp || null);
  const [loading, setLoading] = useState(!subscriptionProp);
  const [canceling, setCanceling] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);
  
  useEffect(() => {
    if (subscriptionProp !== undefined) {
      setSubscription(subscriptionProp);
      setLoading(false);
    }
  }, [subscriptionProp]);
  
  const handleCancel = async () => {
    if (!primaryProvider || !subscription) {
      return;
    }
    
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.'
    );
    
    if (!confirmed) {
      return;
    }
    
    setCanceling(true);
    
    try {
      const strategy = PaymentStrategyFactory.create(primaryProvider.provider);
      await strategy.initialize(primaryProvider);
      await strategy.cancelSubscription(subscription.id);
      
      setSubscription(null);
      onCancel?.();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      onError?.(error as Error);
    } finally {
      setCanceling(false);
    }
  };
  
  const handleManagePortal = async () => {
    if (!primaryProvider) {
      return;
    }
    
    setManagingPortal(true);
    
    try {
      const strategy = PaymentStrategyFactory.create(primaryProvider.provider);
      await strategy.initialize(primaryProvider);
      
      if (strategy.getCustomerPortalUrl) {
        const portalUrl = await strategy.getCustomerPortalUrl(customerId);
        window.location.href = portalUrl;
      } else {
        throw new Error('Customer portal not supported by this provider');
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      onError?.(error as Error);
      setManagingPortal(false);
    }
  };
  
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };
  
  const getStatusBadge = (status: Subscription['status']) => {
    const statusConfig = {
      active: { label: 'Active', className: 'subscription-status--active' },
      trialing: { label: 'Trial', className: 'subscription-status--trialing' },
      past_due: { label: 'Past Due', className: 'subscription-status--past-due' },
      canceled: { label: 'Canceled', className: 'subscription-status--canceled' },
      unpaid: { label: 'Unpaid', className: 'subscription-status--unpaid' },
    };
    
    const config = statusConfig[status];
    
    return (
      <span className={`subscription-status ${config.className}`}>
        {config.label}
      </span>
    );
  };
  
  if (loading) {
    return (
      <div className={`subscription-manager subscription-manager--loading ${className}`}>
        <div className="subscription-manager__spinner" />
        <p>Loading subscription...</p>
      </div>
    );
  }
  
  if (!subscription) {
    return (
      <div className={`subscription-manager subscription-manager--empty ${className}`}>
        <p>No active subscription</p>
      </div>
    );
  }
  
  const product = getProduct(subscription.productId);
  
  return (
    <div className={`subscription-manager ${className}`}>
      <div className="subscription-manager__header">
        <h3 className="subscription-manager__title">Current Subscription</h3>
        {getStatusBadge(subscription.status)}
      </div>
      
      <div className="subscription-manager__details">
        <div className="subscription-manager__detail">
          <span className="subscription-manager__detail-label">Plan</span>
          <span className="subscription-manager__detail-value">
            {product?.name || subscription.productName}
          </span>
        </div>
        
        <div className="subscription-manager__detail">
          <span className="subscription-manager__detail-label">
            {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Next billing'}
          </span>
          <span className="subscription-manager__detail-value">
            {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>
      </div>
      
      <div className="subscription-manager__actions">
        {primaryProvider?.provider === 'stripe' && (
          <button
            className="subscription-manager__action subscription-manager__action--primary"
            onClick={handleManagePortal}
            disabled={managingPortal}
          >
            {managingPortal ? 'Opening...' : 'Manage Subscription'}
          </button>
        )}
        
        {!subscription.cancelAtPeriodEnd && (
          <button
            className="subscription-manager__action subscription-manager__action--danger"
            onClick={handleCancel}
            disabled={canceling}
          >
            {canceling ? 'Canceling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>
    </div>
  );
}
