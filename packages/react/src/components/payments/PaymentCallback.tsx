/**
 * PaymentCallback Component
 * 
 * Handles payment provider redirects after checkout.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface PaymentCallbackProps {
  /** Success redirect path */
  successPath?: string;
  
  /** Cancel redirect path */
  cancelPath?: string;
  
  /** Error redirect path */
  errorPath?: string;
  
  /** Callback when payment is verified */
  onVerify?: (sessionId: string) => Promise<void>;
  
  /** Custom CSS class */
  className?: string;
}

type CallbackStatus = 'processing' | 'success' | 'canceled' | 'error';

/**
 * PaymentCallback Component
 * 
 * Processes payment provider callbacks and redirects appropriately.
 * Displays loading, success, or error states.
 * 
 * @example
 * ```tsx
 * <PaymentCallback
 *   successPath="/dashboard"
 *   cancelPath="/pricing"
 *   onVerify={async (sessionId) => {
 *     await verifyPaymentWithBackend(sessionId);
 *   }}
 * />
 * ```
 */
export function PaymentCallback({
  successPath = '/dashboard',
  cancelPath = '/pricing',
  errorPath = '/pricing',
  onVerify,
  className = '',
}: PaymentCallbackProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    handleCallback();
  }, []);
  
  const handleCallback = async () => {
    try {
      // Check for session ID (Stripe)
      const sessionId = searchParams.get('session_id');
      
      // Check for success/cancel flags
      const success = searchParams.get('success');
      const canceled = searchParams.get('canceled');
      
      // Handle cancellation
      if (canceled === 'true' || success === 'false') {
        setStatus('canceled');
        setTimeout(() => navigate(cancelPath, { replace: true }), 2000);
        return;
      }
      
      // Handle success
      if (success === 'true' || sessionId) {
        // Verify payment with backend if callback provided
        if (onVerify && sessionId) {
          await onVerify(sessionId);
        }
        
        setStatus('success');
        setTimeout(() => navigate(successPath, { replace: true }), 2000);
        return;
      }
      
      // No valid parameters
      setStatus('error');
      setError('Invalid payment callback parameters');
      setTimeout(() => navigate(errorPath, { replace: true }), 3000);
    } catch (err) {
      console.error('Payment callback error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setTimeout(() => navigate(errorPath, { replace: true }), 3000);
    }
  };
  
  return (
    <div className={`payment-callback payment-callback--${status} ${className}`}>
      <div className="payment-callback__content">
        {status === 'processing' && (
          <>
            <div className="payment-callback__spinner" />
            <h1 className="payment-callback__title">Processing Payment</h1>
            <p className="payment-callback__message">
              Please wait while we confirm your payment...
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="payment-callback__icon payment-callback__icon--success">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="32" cy="32" r="32" fill="#10B981" />
                <path
                  d="M44 24L28 40L20 32"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="payment-callback__title">Payment Successful!</h1>
            <p className="payment-callback__message">
              Thank you for your purchase. Redirecting you now...
            </p>
          </>
        )}
        
        {status === 'canceled' && (
          <>
            <div className="payment-callback__icon payment-callback__icon--warning">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="32" cy="32" r="32" fill="#F59E0B" />
                <path
                  d="M32 20V36M32 44H32.02"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="payment-callback__title">Payment Canceled</h1>
            <p className="payment-callback__message">
              Your payment was canceled. Redirecting you back...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="payment-callback__icon payment-callback__icon--error">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="32" cy="32" r="32" fill="#EF4444" />
                <path
                  d="M24 24L40 40M40 24L24 40"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="payment-callback__title">Payment Error</h1>
            <p className="payment-callback__message">
              {error || 'An error occurred while processing your payment.'}
            </p>
            <p className="payment-callback__redirect">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}
