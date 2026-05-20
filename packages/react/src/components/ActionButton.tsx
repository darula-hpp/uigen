import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { useApiMutation } from '@/hooks/useApiCall';
import { useToast } from '@/components/Toast';
import type { Operation } from '@uigen-dev/core';
import { DynamicForm } from '@/components/DynamicForm';
import { resolvePathParams } from '@/lib/resolve-path-params';

interface ActionButtonProps {
  operation: Operation;
  resourceId: string;
  onSuccess?: (result: unknown) => void;
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
      const result = await mutation.mutateAsync({
        pathParams: resolvePathParams(operation, resourceId),
        body: operation.requestBody ? formData : undefined,
      });

      showToast('success', `${operation.summary || 'Action'} completed successfully`);
      setShowDialog(false);
      setFormData({});

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
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
      <Button
        variant="secondary"
        onClick={handleClick}
      >
        {operation.summary || operation.id}
      </Button>

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
