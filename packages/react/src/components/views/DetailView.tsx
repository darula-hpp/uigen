import { useApiCall, useApiMutation } from '@/hooks/useApiCall';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Resource, SchemaNode, Operation } from '@uigen-dev/core';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ActionButton } from '@/components/ActionButton';
import { useToast } from '@/components/Toast';
import { useState } from 'react';

/**
 * Maps the React Router :id param to the actual path parameter name in the operation.
 * e.g. /v1/Services/{Sid} → { Sid: 'MG...' }
 */
function resolvePathParams(operation: Operation, id: string | undefined): Record<string, string> {
  if (!id) return {};
  const matches = operation.path.match(/\{([^}]+)\}/g);
  if (!matches || matches.length === 0) return { id };
  // Use the last path param (typically the resource identifier)
  const paramName = matches[matches.length - 1].slice(1, -1);
  return { [paramName]: id };
}

interface DetailViewProps {
  resource: Resource;
}

/**
 * Format value based on field type
 * Implements Requirement 8.3
 */
function formatValue(value: unknown, field: SchemaNode): string {
  if (value === null || value === undefined) return '-';

  // Boolean formatting
  if (field.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Date formatting
  if (field.type === 'date' || field.format === 'date') {
    try {
      const date = new Date(value as string);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(value);
    }
  }

  // Date-time formatting
  if (field.format === 'date-time') {
    try {
      const date = new Date(value as string);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return String(value);
    }
  }

  // Number formatting
  if (field.type === 'number' || field.type === 'integer') {
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString('en-US');
    }
  }

  // Enum formatting
  if (field.type === 'enum' && field.enumValues) {
    return String(value);
  }

  // Array formatting
  if (field.type === 'array' && Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.map(v => formatValue(v, field.items || { type: 'string', key: '', label: '', required: false })).join(', ');
  }

  // Object formatting
  if (field.type === 'object' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * DetailView component - displays a single resource in read-only format
 * Implements Requirements 8.1, 8.2, 8.3, 8.5, 8.7, 11.1-11.7
 */
export function DetailView({ resource }: DetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const detailOp = resource.operations.find(op => op.viewHint === 'detail');

  const { data, isLoading, error } = useApiCall({
    operation: detailOp!,
    pathParams: resolvePathParams(detailOp!, id)
  });

  // Find available operations for action buttons - Requirement 8.5
  const updateOp = resource.operations.find(op => op.viewHint === 'update')
    // Fallback: treat a POST action on the same path as the detail op as an update
    || resource.operations.find(op =>
        op.viewHint === 'action' &&
        op.method === 'POST' &&
        detailOp && op.path === detailOp.path &&
        !!op.requestBody
      );
  const deleteOp = resource.operations.find(op => op.viewHint === 'delete');
  // Exclude action ops that are on the same path as the detail op (those are update-style)
  const actionOps = resource.operations.filter(op =>
    op.viewHint === 'action' &&
    !(detailOp && op.path === detailOp.path && op.method === 'POST')
  );

  // Delete mutation - Requirements 11.4, 11.5, 11.6
  const deleteMutation = useApiMutation(deleteOp!, {
    relatedQueryKeys: [detailOp?.id || '', `list${resource.name}`]
  });

  // Handle delete confirmation - Requirement 11.4
  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync({
        pathParams: resolvePathParams(deleteOp!, id)
      });
      
      // Requirement 11.5: Navigate to list view and display success message
      showToast('success', `${resource.name} deleted successfully`);
      navigate(`/${resource.slug}`);
    } catch (err) {
      // Requirement 11.6: Display error message on failure
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete';
      showToast('error', errorMessage);
      setShowDeleteDialog(false);
    }
  };

  // Handle delete cancellation - Requirement 11.7
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  if (!detailOp) {
    return <div className="p-4 text-muted-foreground">No detail operation available</div>;
  }

  // Get schema fields from response schema
  const schema = detailOp.responses['200']?.schema || detailOp.responses['2XX']?.schema || resource.schema;
  const fields = schema.children || [];

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog - Requirements 11.2, 11.3, 64.1-64.6 */}
      {deleteOp && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${resource.name}`}
          message={`Are you sure you want to delete this ${resource.name.toLowerCase()}? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isLoading={deleteMutation.isPending}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{resource.name} Details</h2>
          {/* Resource Description - Requirement 61.3 */}
          {resource.description && (
            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
          )}
        </div>
        
        {/* Action Buttons - Requirement 8.5 */}
        {!isLoading && !error && data && (
          <div className="flex gap-2">
            {/* Edit button — navigates to edit page (reuses wizard/form with pre-filled data) */}
            {updateOp && (
              <Button
                variant="outline"
                onClick={() => navigate(`/${resource.slug}/${id}/edit`)}
              >
                Edit
              </Button>
            )}
            
            {/* Delete button when delete operation exists - Requirement 11.1 */}
            {deleteOp && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </Button>
            )}
            
            {/* Custom action buttons for non-CRUD operations - Requirements 15.1-15.7 */}
            {actionOps.map((actionOp) => (
              <ActionButton
                key={actionOp.id}
                operation={actionOp}
                resourceId={id!}
                onSuccess={() => {
                  // Refresh detail view after action completes
                  window.location.reload();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error state - Requirement 8.6 */}
      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Loading skeleton - Requirement 8.7 */}
      {isLoading && (
        <div className="space-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-6 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Field display - Requirements 8.2, 8.3 */}
      {!isLoading && !error && data && (
        <div className="space-y-4 max-w-2xl">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {field.label}
              </dt>
              <dd className="text-base">
                {formatValue(data[field.key], field)}
              </dd>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Related Resources - Requirements 8.4, 40.1-40.5 */}
      {!isLoading && !error && data && resource.relationships.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Related Resources</h3>
          <div className="space-y-2">
            {resource.relationships.map((relationship) => (
              <div key={relationship.target} className="flex items-center gap-2">
                <Link
                  to={
                    relationship.type === 'hasMany'
                      ? `/${relationship.target}`
                      : `/${relationship.target}/${data[relationship.target + 'Id'] || ''}`
                  }
                  className="text-primary hover:underline"
                >
                  {relationship.type === 'hasMany' ? '→' : '←'} {relationship.target}
                </Link>
                <span className="text-xs text-muted-foreground">
                  ({relationship.type === 'hasMany' ? 'has many' : 'belongs to'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
