/**
 * PaymentCancel Component
 * 
 * Displays a cancellation page after user cancels payment on Stripe.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { Link } from 'react-router-dom';

/**
 * PaymentCancel Component
 * 
 * Renders a cancellation page with:
 * - Cancellation message with info icon
 * - Link to return to pricing page
 * - Link to navigate to dashboard
 * 
 * @example
 * ```tsx
 * // In App.tsx route configuration
 * <Route path="/payment/cancel" element={<PaymentCancel />} />
 * ```
 */
export function PaymentCancel() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        {/* Info icon */}
        <div 
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'var(--muted)',
          }}
        >
          <svg
            className="w-10 h-10"
            style={{ color: 'var(--muted-foreground)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Cancellation message */}
        <h1 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--foreground)' }}
        >
          Payment Cancelled
        </h1>
        
        <p 
          className="text-lg mb-8"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Your payment was cancelled. No charges have been made. Feel free to try again when you're ready.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Primary action - Back to Pricing */}
          <Link
            to="/pricing"
            className="inline-block px-6 py-3 font-semibold rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Back to Pricing
          </Link>

          {/* Secondary action - Go to Dashboard */}
          <Link
            to="/dashboard"
            className="inline-block px-6 py-3 font-semibold rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
