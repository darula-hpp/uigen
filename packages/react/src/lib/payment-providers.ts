/**
 * Payment Provider Metadata
 * 
 * Defines metadata for supported payment providers including
 * display names, logos, setup URLs, and capabilities.
 */

/**
 * Payment provider metadata interface
 */
export interface PaymentProviderMetadata {
  /** Internal provider name */
  name: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Logo URL or path */
  logo: string;
  
  /** Setup/configuration URL */
  setupUrl: string;
  
  /** Whether provider supports test mode */
  testMode: boolean;
  
  /** Supported currency codes (ISO 4217) */
  supportedCurrencies: string[];
  
  /** Supported payment types */
  supportedPaymentTypes: ('one-time' | 'subscription' | 'usage-based')[];
  
  /** Whether provider has a customer portal */
  hasCustomerPortal: boolean;
  
  /** Documentation URL */
  docsUrl: string;
}

/**
 * Payment provider metadata registry
 */
export const PAYMENT_PROVIDERS: Record<string, PaymentProviderMetadata> = {
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    logo: '/assets/stripe-logo.svg',
    setupUrl: 'https://dashboard.stripe.com/apikeys',
    testMode: true,
    supportedCurrencies: [
      'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nzd', 'sgd', 'hkd',
      'nok', 'sek', 'dkk', 'pln', 'czk', 'huf', 'ron', 'bgn', 'hrk', 'try',
      'ils', 'clp', 'php', 'idr', 'myr', 'mxn', 'brl', 'inr', 'krw', 'twd',
      'thb', 'zar'
    ],
    supportedPaymentTypes: ['one-time', 'subscription', 'usage-based'],
    hasCustomerPortal: true,
    docsUrl: 'https://stripe.com/docs/api',
  },
  
  paypal: {
    name: 'paypal',
    displayName: 'PayPal',
    logo: '/assets/paypal-logo.svg',
    setupUrl: 'https://developer.paypal.com/dashboard/applications',
    testMode: true,
    supportedCurrencies: [
      'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nzd', 'sgd', 'hkd',
      'nok', 'sek', 'dkk', 'pln', 'czk', 'huf', 'ils', 'mxn', 'brl', 'inr',
      'php', 'twd', 'thb', 'myr'
    ],
    supportedPaymentTypes: ['one-time', 'subscription'],
    hasCustomerPortal: false,
    docsUrl: 'https://developer.paypal.com/docs/api/overview/',
  },
  
  square: {
    name: 'square',
    displayName: 'Square',
    logo: '/assets/square-logo.svg',
    setupUrl: 'https://developer.squareup.com/apps',
    testMode: true,
    supportedCurrencies: [
      'usd', 'cad', 'aud', 'gbp', 'jpy', 'eur'
    ],
    supportedPaymentTypes: ['one-time', 'subscription'],
    hasCustomerPortal: false,
    docsUrl: 'https://developer.squareup.com/docs',
  },
};

/**
 * Get metadata for a payment provider
 * 
 * @param provider - Provider identifier
 * @returns Provider metadata or null if not found
 */
export function getProviderMetadata(provider: string): PaymentProviderMetadata | null {
  return PAYMENT_PROVIDERS[provider.toLowerCase()] || null;
}

/**
 * Get all supported payment providers
 * 
 * @returns Array of provider metadata
 */
export function getAllProviders(): PaymentProviderMetadata[] {
  return Object.values(PAYMENT_PROVIDERS);
}

/**
 * Check if a provider supports a specific currency
 * 
 * @param provider - Provider identifier
 * @param currency - Currency code (ISO 4217)
 * @returns true if currency is supported
 */
export function supportsCurrency(provider: string, currency: string): boolean {
  const metadata = getProviderMetadata(provider);
  if (!metadata) {
    return false;
  }
  return metadata.supportedCurrencies.includes(currency.toLowerCase());
}

/**
 * Check if a provider supports a specific payment type
 * 
 * @param provider - Provider identifier
 * @param paymentType - Payment type
 * @returns true if payment type is supported
 */
export function supportsPaymentType(
  provider: string,
  paymentType: 'one-time' | 'subscription' | 'usage-based'
): boolean {
  const metadata = getProviderMetadata(provider);
  if (!metadata) {
    return false;
  }
  return metadata.supportedPaymentTypes.includes(paymentType);
}

/**
 * Format currency amount for display
 * 
 * @param amount - Amount in cents
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/**
 * Get provider logo URL
 * 
 * @param provider - Provider identifier
 * @returns Logo URL or fallback
 */
export function getProviderLogo(provider: string): string {
  const metadata = getProviderMetadata(provider);
  return metadata?.logo || '/assets/payment-default-logo.svg';
}

/**
 * Get provider display name
 * 
 * @param provider - Provider identifier
 * @returns Display name or provider identifier
 */
export function getProviderDisplayName(provider: string): string {
  const metadata = getProviderMetadata(provider);
  return metadata?.displayName || provider;
}
