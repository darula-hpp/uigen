import React from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

/**
 * ConfirmationDialog component for destructive actions
 * Implements Requirements 11.2, 11.3, 64.1-64.6
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  children,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Requirement 64.1 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog - Requirements 64.2, 64.3 */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-in fade-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="bg-background border rounded-lg shadow-lg p-6 space-y-4">
          {/* Title - Requirement 64.2 */}
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h2>

          {/* Message - Requirement 11.2 */}
          <p
            id="dialog-description"
            className="text-sm text-muted-foreground"
          >
            {message}
          </p>

          {/* Additional content (e.g., form fields) */}
          {children}

          {/* Action Buttons - Requirements 64.3, 64.4, 64.5, 64.6 */}
          <div className="flex justify-end gap-3 pt-2">
            {/* Cancel Button - Requirement 64.5 */}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>

            {/* Confirm Button - Requirements 64.4, 64.6 */}
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
