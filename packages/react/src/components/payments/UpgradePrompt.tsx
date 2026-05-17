import { useNavigate } from 'react-router-dom';

/**
 * Props for UpgradePrompt component
 */
export interface UpgradePromptProps {
  /** Message to display to the user */
  message: string;
  
  /** URL to redirect to when user clicks upgrade button */
  redirectTo?: string;
  
  /** Optional custom button text */
  buttonText?: string;
  
  /** Optional mode: 'inline' for small prompt, 'fullpage' for centered card */
  mode?: 'inline' | 'fullpage';
}

/**
 * UpgradePrompt Component
 * 
 * Displays a prompt encouraging users to upgrade their subscription.
 * Shown when users try to access monetized features without proper access.
 * 
 * @example
 * ```tsx
 * // Inline mode (small banner)
 * <UpgradePrompt 
 *   message="Upgrade to Pro to create meetings"
 *   redirectTo="/pricing"
 *   mode="inline"
 * />
 * 
 * // Full page mode (centered card)
 * <UpgradePrompt 
 *   message="This feature requires a paid subscription"
 *   redirectTo="/pricing"
 *   mode="fullpage"
 * />
 * ```
 */
export function UpgradePrompt({
  message,
  redirectTo = '/pricing',
  buttonText = 'View Plans',
  mode = 'inline',
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate(redirectTo);
  };

  if (mode === 'fullpage') {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-yellow-500"
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Upgrade Required
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          <button
            onClick={handleUpgrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`${buttonText} - Navigate to pricing page`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  // Inline mode
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-yellow-600 dark:text-yellow-500"
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Upgrade Required
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">{message}</p>
          <div className="mt-3">
            <button
              onClick={handleUpgrade}
              className="text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 underline focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded"
              aria-label={`${buttonText} - Navigate to pricing page`}
            >
              {buttonText} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
