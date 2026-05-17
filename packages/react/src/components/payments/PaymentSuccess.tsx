/**
 * PaymentSuccess Component
 * 
 * Displays a success confirmation page after completing payment on Stripe.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { useSearchParams, Link } from 'react-router-dom';

/**
 * PaymentSuccess Component
 * 
 * Renders a success confirmation page with:
 * - Success message with checkmark icon
 * - Optional session ID display (extracted from URL params)
 * - Link to navigate to dashboard
 * 
 * @example
 * ```tsx
 * // In App.tsx route configuration
 * <Route path="/payment/success" element={<PaymentSuccess />} />
 * ```
 */
export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        {/* Success checkmark icon */}
        <div 
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)'
          }}
        >
          <svg
            className="w-10 h-10"
            style={{ color: 'var(--primary)' }}
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success message */}
        <h1 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--foreground)' }}
        >
          Payment Successful!
        </h1>
        
        <p 
          className="text-lg mb-8"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Thank you for your subscription. Your payment has been processed successfully.
        </p>

        {/* Optional session ID display */}
        {sessionId && (
          <div 
            className="mb-8 p-4 rounded-lg"
            style={{ 
              backgroundColor: 'var(--muted)',
              border: '1px solid var(--border)'
            }}
          >
            <p 
              className="text-sm mb-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Session ID
            </p>
            <p 
              className="text-sm font-mono break-all"
              style={{ color: 'var(--foreground)' }}
            >
              {sessionId}
            </p>
          </div>
        )}

        {/* Dashboard link button */}
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 font-semibold rounded-lg transition-colors duration-200"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)'
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
  );
}
