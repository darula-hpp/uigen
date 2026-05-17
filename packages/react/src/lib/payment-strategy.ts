/**
 * Payment Strategy Interface
 * 
 * Defines the contract for payment provider implementations.
 * Uses the Strategy pattern to allow different payment providers
 * to be used interchangeably.
 */

import type { PaymentProvider } from '@uigen-dev/core';

/**
 * Parameters for creating a checkout session
 */
export interface CheckoutParams {
  /** Product or price ID from the payment provider */
  productId: string;
  
  /** Customer ID (optional, for existing customers) */
  customerId?: string;
  
  /** URL to redirect to after successful payment */
  successUrl: string;
  
  /** URL to redirect to if payment is canceled */
  cancelUrl: string;
  
  /** Custom metadata to attach to the payment */
  metadata?: Record<string, any>;
  
  /** Quantity of items (defaults to 1) */
  quantity?: number;
}

/**
 * Result of creating a checkout session
 */
export interface CheckoutResult {
  /** URL to redirect the user to for checkout */
  checkoutUrl: string;
  
  /** Session ID for tracking */
  sessionId: string;
}

/**
 * Parameters for creating a subscription
 */
export interface SubscriptionParams {
  /** Customer ID */
  customerId: string;
  
  /** Price ID for the subscription */
  priceId: string;
  
  /** Trial period in days (optional) */
  trialPeriodDays?: number;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of creating a subscription
 */
export interface SubscriptionResult {
  /** Subscription ID */
  subscriptionId: string;
  
  /** Current status */
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  
  /** Current period end date */
  currentPeriodEnd: Date;
}

/**
 * Parameters for updating a subscription
 */
export interface UpdateSubscriptionParams {
  /** New price ID (for plan changes) */
  priceId?: string;
  
  /** Whether to prorate the change */
  prorate?: boolean;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Payment Strategy Interface
 * 
 * All payment providers must implement this interface.
 * Uses async methods to support API calls.
 */
export interface PaymentStrategy {
  /** Provider identifier */
  readonly provider: string;
  
  /**
   * Initialize the payment provider SDK
   * 
   * @param config - Payment provider configuration
   */
  initialize(config: PaymentProvider): Promise<void>;
  
  /**
   * Create a checkout session
   * 
   * @param params - Checkout parameters
   * @returns Checkout result with URL and session ID
   */
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  
  /**
   * Create a subscription
   * 
   * @param params - Subscription parameters
   * @returns Subscription result
   */
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  
  /**
   * Cancel a subscription
   * 
   * @param subscriptionId - Subscription ID to cancel
   */
  cancelSubscription(subscriptionId: string): Promise<void>;
  
  /**
   * Update a subscription
   * 
   * @param subscriptionId - Subscription ID to update
   * @param params - Update parameters
   */
  updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<void>;
  
  /**
   * Get customer portal URL (optional, provider-specific)
   * 
   * @param customerId - Customer ID
   * @returns URL to customer portal
   */
  getCustomerPortalUrl?(customerId: string): Promise<string>;
  
  /**
   * Verify webhook signature
   * 
   * @param payload - Raw webhook payload
   * @param signature - Signature from webhook header
   * @param secret - Webhook secret
   * @returns true if signature is valid
   */
  verifyWebhook(payload: string, signature: string, secret: string): boolean;
}

/**
 * Base Payment Strategy
 * 
 * Provides common functionality for all payment strategies.
 * Uses the Template Method pattern.
 */
export abstract class BasePaymentStrategy implements PaymentStrategy {
  abstract readonly provider: string;
  protected config: PaymentProvider | null = null;
  
  async initialize(config: PaymentProvider): Promise<void> {
    this.config = config;
    await this.initializeSDK(config);
  }
  
  /**
   * Initialize provider-specific SDK
   * Subclasses must implement this method
   */
  protected abstract initializeSDK(config: PaymentProvider): Promise<void>;
  
  abstract createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  abstract createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  abstract cancelSubscription(subscriptionId: string): Promise<void>;
  abstract updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<void>;
  abstract verifyWebhook(payload: string, signature: string, secret: string): boolean;
  
  /**
   * Validate that the strategy has been initialized
   */
  protected ensureInitialized(): void {
    if (!this.config) {
      throw new Error(`${this.provider} payment strategy not initialized. Call initialize() first.`);
    }
  }
  
  /**
   * Log an error with provider context
   */
  protected logError(message: string, error: any): void {
    console.error(`[${this.provider}] ${message}`, error);
  }
  
  /**
   * Log info with provider context
   */
  protected logInfo(message: string, context?: any): void {
    console.info(`[${this.provider}] ${message}`, context || '');
  }
}
