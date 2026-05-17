import { type ReactNode } from 'react';
import type { MonetizationConfig } from '@uigen-dev/core';
import { UpgradePrompt } from '../payments/UpgradePrompt';
import { usePaymentStatus } from '../../lib/use-payment-status';

/**
 * Props for MonetizationHandler component
 */
export interface MonetizationHandlerProps {
  /** Monetization configuration from the resource/operation */
  config?: MonetizationConfig;
  
  /** Children to render when access is granted */
  children: ReactNode;
  
  /** Optional custom upgrade prompt component */
  upgradePrompt?: ReactNode;
}

/**
 * MonetizationHandler Component
 * 
 * Wraps content that requires payment/subscription access.
 * Shows upgrade prompt when user doesn't have required access.
 * 
 * Backend is the source of truth for payment enforcement (via 402 responses).
 * This component provides frontend UX for monetized features.
 * 
 * @example
 * ```tsx
 * // Wrap a monetized feature
 * <MonetizationHandler config={operation.monetization}>
 *   <CreateMeetingForm />
 * </MonetizationHandler>
 * 
 * // With custom message
 * <MonetizationHandler 
 *   config={{ 
 *     monetized: true, 
 *     message: 'Upgrade to Pro to create meetings',
 *     redirectTo: '/pricing'
 *   }}
 * >
 *   <CreateMeetingForm />
 * </MonetizationHandler>
 * ```
 */
export function MonetizationHandler({
  config,
  children,
  upgradePrompt,
}: MonetizationHandlerProps) {
  const { isSubscribed, isFree, loading } = usePaymentStatus();

  // If no monetization config, render children normally
  if (!config || !config.monetized) {
    return <>{children}</>;
  }

  // Show loading state while checking payment status
  if (loading) {
    return <div className="monetization-loading">Loading...</div>;
  }

  // Check if user has access
  // Free users don't have access to monetized features
  const hasAccess = isSubscribed && !isFree;

  // If user doesn't have access, show upgrade prompt
  if (!hasAccess) {
    if (upgradePrompt) {
      return <>{upgradePrompt}</>;
    }

    return (
      <UpgradePrompt
        message={config.message || 'Upgrade to access this feature'}
        redirectTo={config.redirectTo || '/pricing'}
      />
    );
  }

  // User has access, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of MonetizationHandler
 * 
 * @example
 * ```tsx
 * const ProtectedComponent = withMonetization(MyComponent, {
 *   monetized: true,
 *   message: 'Upgrade to Pro'
 * });
 * ```
 */
export function withMonetization<P extends object>(
  Component: React.ComponentType<P>,
  config: MonetizationConfig
) {
  return function MonetizedComponent(props: P) {
    return (
      <MonetizationHandler config={config}>
        <Component {...props} />
      </MonetizationHandler>
    );
  };
}
