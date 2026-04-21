import { useEffect, useState } from 'react';

export interface MigrationBannerProps {
  /** Number of relationships without explicit types */
  relationshipCount: number;
  /** Callback when user clicks "Migrate Now" */
  onMigrate: () => void;
  /** Callback when user clicks "Dismiss" */
  onDismiss: () => void;
}

const DISMISS_KEY = 'uigen-relationship-migration-dismissed';

/**
 * MigrationBanner prompts users to migrate implicit relationship types to explicit types.
 * 
 * Features:
 * - Warning styling with amber colors
 * - Displays count of relationships needing migration
 * - "Migrate Now" and "Dismiss" buttons
 * - Dismissal persisted to localStorage
 * - Fully keyboard accessible
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function MigrationBanner({
  relationshipCount,
  onMigrate,
  onDismiss
}: MigrationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
    onDismiss();
  }

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4"
      role="alert"
      data-testid="migration-banner"
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Relationship Config Migration Available
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Your config has{' '}
            <strong data-testid="migration-count">{relationshipCount}</strong>{' '}
            relationship{relationshipCount !== 1 ? 's' : ''} using implicit types.
            Migrate to explicit types for better clarity and control.
          </p>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={onMigrate}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              data-testid="migration-migrate-button"
            >
              Migrate Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              data-testid="migration-dismiss-button"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
