import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { useApiMutation } from '@/hooks/useApiCall';
import { useToast } from '@/components/Toast';
import type { Operation } from '@uigen/core';
import { DynamicForm } from '@/components/DynamicForm';

interface ActionButtonProps {
  operation: Operation;
  resourceId: string;
  onSuccess?: () => void;
}

/**
 * ActionButton component - renders a button for custom non-CRUD operations
 * Implements Requirements 15.1-15.7
 */
export function ActionButton({ operation, resourceId, onSuccess }: ActionButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const { showToast } = useToast();

  const mutation = useApiMutation(operation);

  const handleClick = () => {
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    try {
      // Requirement 15.5: POST to operation path on confirmation
      await mutation.mutateAsync({
        pathParams: { id: resourceId },
        body: operation.requestBody ? formData : undefined
      });

      // Requirement 15.6: Display success message and refresh detail view
      showToast('success', `${operation.summary || 'Action'} completed successfully`);
      setShowDialog(false);
      setFormData({});
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Requirement 15.7: Display error message on failure
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      showToast('error', errorMessage);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setFormData({});
  };

  return (
    <>
      {/* Requirement 15.1: Display operation summary as button label */}
      <Button
        variant="secondary"
        onClick={handleClick}
      >
        {operation.summary || operation.id}
      </Button>

      {/* Requirement 15.3: Show confirmation dialog on click */}
      <ConfirmationDialog
        isOpen={showDialog}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={operation.summary || operation.id}
        message={operation.description || `Execute ${operation.summary || 'this action'}?`}
        confirmLabel="Execute"
        cancelLabel="Cancel"
        isLoading={mutation.isPending}
      >
        {/* Requirement 15.4: Render input fields when requestBody exists */}
        {operation.requestBody && (
          <div className="mt-4">
            <DynamicForm
              schema={operation.requestBody}
              value={formData}
              onChange={setFormData}
            />
          </div>
        )}
      </ConfirmationDialog>
    </>
  );
}
