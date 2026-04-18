/**
 * ErrorDialog Component
 * 
 * Displays error dialogs for config file write failures and other errors.
 * Provides actionable options: Retry and Copy to clipboard.
 * 
 * Requirements: 20.4
 */

import { XCircle, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export interface ErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onRetry?: () => void;
  onCopyToClipboard?: () => void;
  onClose: () => void;
}

export function ErrorDialog({
  isOpen,
  title,
  message,
  onRetry,
  onCopyToClipboard,
  onClose
}: ErrorDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    if (onCopyToClipboard) {
      onCopyToClipboard();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      data-testid="error-dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2
              id="error-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          {onCopyToClipboard && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              data-testid="copy-button"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded transition-colors"
              data-testid="retry-button"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            data-testid="close-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
