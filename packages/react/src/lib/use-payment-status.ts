import { useState, useEffect } from 'react';

/**
 * Payment status interface
 * Represents the user's current subscription/payment state
 */
export interface PaymentStatus {
  /** User's current subscription plan ID */
  currentPlan: string | null;
  
  /** Subscription status */
  status: 'active' | 'cancelled' | 'past_due' | 'none';
  
  /** Whether user is on free plan */
  isFree: boolean;
  
  /** Whether user has active subscription */
  isSubscribed: boolean;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: Error | null;
}

/**
 * Subscription data from backend
 */
interface SubscriptionData {
  planId: string;
  status: 'active' | 'cancelled' | 'past_due';
}

/**
 * Hook for checking user's payment status
 * 
 * This hook fetches the user's subscription status from the backend.
 * Backend is the source of truth for payment enforcement.
 * 
 * @returns PaymentStatus object with subscription details
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentPlan, isSubscribed, loading } = usePaymentStatus();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return (
 *     <div>
 *       {isSubscribed ? (
 *         <p>Current plan: {currentPlan}</p>
 *       ) : (
 *         <UpgradePrompt />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaymentStatus(): PaymentStatus {
  const [status, setStatus] = useState<PaymentStatus>({
    currentPlan: null,
    status: 'none',
    isFree: true,
    isSubscribed: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchPaymentStatus() {
      try {
        // Check if user is authenticated
        const authData = sessionStorage.getItem('uigen_auth');
        if (!authData) {
          if (mounted) {
            setStatus({
              currentPlan: null,
              status: 'none',
              isFree: true,
              isSubscribed: false,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Try to get subscription data from auth storage
        // Backend should include subscription info in auth response
        const auth = JSON.parse(authData);
        const subscription: SubscriptionData | undefined = auth.subscription;

        if (mounted) {
          if (subscription) {
            setStatus({
              currentPlan: subscription.planId,
              status: subscription.status,
              isFree: subscription.planId === 'free',
              isSubscribed: subscription.status === 'active',
              loading: false,
              error: null,
            });
          } else {
            // No subscription data - assume free/none
            setStatus({
              currentPlan: null,
              status: 'none',
              isFree: true,
              isSubscribed: false,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setStatus({
            currentPlan: null,
            status: 'none',
            isFree: true,
            isSubscribed: false,
            loading: false,
            error: error instanceof Error ? error : new Error('Failed to fetch payment status'),
          });
        }
      }
    }

    fetchPaymentStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return status;
}

/**
 * Helper function to check if user has access to a specific plan
 * 
 * @param currentPlan - User's current plan ID
 * @param requiredPlan - Required plan ID for access
 * @returns true if user has access
 * 
 * @example
 * ```tsx
 * const { currentPlan } = usePaymentStatus();
 * const hasAccess = hasAccessToPlan(currentPlan, 'pro');
 * ```
 */
export function hasAccessToPlan(currentPlan: string | null, requiredPlan: string): boolean {
  if (!currentPlan) return false;
  
  // Define plan hierarchy (higher index = higher tier)
  const planHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const requiredIndex = planHierarchy.indexOf(requiredPlan);
  
  // If plan not in hierarchy, do exact match
  if (currentIndex === -1 || requiredIndex === -1) {
    return currentPlan === requiredPlan;
  }
  
  // User has access if their plan is equal or higher tier
  return currentIndex >= requiredIndex;
}

/**
 * Helper function to check if user has access to any of the specified plans
 * 
 * @param currentPlan - User's current plan ID
 * @param requiredPlans - Array of plan IDs that grant access
 * @returns true if user has access to any of the plans
 * 
 * @example
 * ```tsx
 * const { currentPlan } = usePaymentStatus();
 * const hasAccess = hasAccessToAnyPlan(currentPlan, ['pro', 'enterprise']);
 * ```
 */
export function hasAccessToAnyPlan(currentPlan: string | null, requiredPlans: string[]): boolean {
  if (!currentPlan) return false;
  return requiredPlans.some(plan => hasAccessToPlan(currentPlan, plan));
}
