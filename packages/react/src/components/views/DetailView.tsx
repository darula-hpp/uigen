import { useApiCall, useApiMutation } from '@/hooks/useApiCall';
import { useWebSocketSubscription } from '@/hooks/useWebSocketSubscription';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Resource, Operation } from '@uigen-dev/core';
import { reconcile, OverrideHooksHost } from '@/overrides';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ActionButton } from '@/components/ActionButton';
import { ActionResultPanel } from '@/components/ActionResultPanel';
import { LibraryAssociationManager } from '@/components/LibraryAssociationManager';
import { useToast } from '@/components/Toast';
import { useOptionalApp } from '@/contexts/AppContext';
import { ReadOnlyDataSection } from '@/components/ReadOnlyDataSection';
import { resolvePathParams } from '@/lib/resolve-path-params';
import { useState } from 'react';

interface DetailViewProps {
  resource: Resource;
}

/**
 * DetailView component - displays a single resource in read-only format
 * Implements Requirements 8.1, 8.2, 8.3, 8.5, 8.7, 11.1-11.7
 */
export function DetailView({ resource }: DetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const appContext = useOptionalApp();
  const config = appContext?.config;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{
    operation: Operation;
    data: unknown;
  } | null>(null);
  
  // Find the detail operation
  const detailOp = resource.operations.find(op => op.viewHint === 'detail');
  
  // Reconcile to determine override mode using operation's override config
  const { mode, renderFn } = reconcile(detailOp?.override);
  
  const detailPathParams = detailOp ? resolvePathParams(detailOp, id) : {};

  const { data, isLoading, error, refetch } = useApiCall({
    operation: detailOp!,
    pathParams: detailPathParams,
    enabled: !!detailOp,
  });

  const detailWsEnabled =
    !!detailOp?.websocketConfig && !!id && Object.keys(detailPathParams).length > 0;

  useWebSocketSubscription({
    operation: detailOp,
    queryKey: detailOp ? [detailOp.id, detailPathParams, {}] : ['disabled'],
    pathParams: detailPathParams,
    queryParams: {},
    enabled: detailWsEnabled,
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
  const deleteMutation = useApiMutation(deleteOp, {
    relatedQueryKeys: [detailOp?.id || '', `list${resource.name}`],
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

  // Render mode: call renderFn with fetched data
  if (mode === 'render' && renderFn) {
    try {
      return <>{renderFn({ 
        resource, 
        operation: detailOp,
        data, 
        isLoading, 
        error
      })}</>;
    } catch (err) {
      console.error(`[UIGen Override] Error in render function for "${detailOp?.override?.id || `${resource.slug}.detail`}":`, err);
      // Fall through to built-in view
    }
  }

  const detailSectionTitle =
    detailOp.summary
    || resource.label
    || resource.name;

  // Built-in content
  const content = (
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
                onSuccess={(result) => {
                  setLastActionResult({ operation: actionOp, data: result });
                  void refetch();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {lastActionResult && (
        <ActionResultPanel
          operation={lastActionResult.operation}
          data={lastActionResult.data}
        />
      )}

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
        <ReadOnlyDataSection
          title={detailSectionTitle}
          fields={fields}
          data={data as Record<string, unknown>}
        />
      )}

      {/* Related Resources - Requirements 8.4, 40.1-40.5, 10.1-10.6 */}
      {!isLoading && !error && data && resource.relationships.filter(rel => rel.type !== 'manyToMany').length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Related Resources</h3>
          <div className="space-y-2">
            {resource.relationships
              .filter(rel => rel.type !== 'manyToMany')
              .map((relationship) => {
                const linkTo =
                  relationship.type === 'hasMany'
                    ? `/${relationship.target}`
                    : `/${relationship.target}/${data[relationship.target + 'Id'] || ''}`;

                const label =
                  relationship.type === 'hasMany'
                    ? `${relationship.target} (has many)`
                    : `${relationship.target} (belongs to)`;

                return (
                  <div key={`${relationship.target}-${relationship.type}`} className="flex items-center gap-2">
                    <Link
                      to={linkTo}
                      className="text-primary hover:underline"
                    >
                      {relationship.type === 'hasMany' ? '\u2192' : '\u2190'} {label}
                    </Link>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Manage Associations Section - Requirements 4.1, 8.1, 8.2, 8.3, 8.4, 8.5, 10.4, 10.6 */}
      {!isLoading && !error && data && id && resource.relationships.some(rel => rel.type === 'manyToMany') && (
        <div className="mt-8 space-y-6">
          <h3 className="text-xl font-semibold">Manage Associations</h3>
          {resource.relationships
            .filter(rel => rel.type === 'manyToMany')
            .map((relationship) => {
              // Find the library resource by slug
              const libraryResource = config?.resources.find(
                r => r.slug === relationship.target
              );
              
              if (!libraryResource) {
                return null;
              }

              return (
                <LibraryAssociationManager
                  key={relationship.target}
                  consumerResource={resource}
                  consumerId={id}
                  relationship={relationship}
                  libraryResource={libraryResource}
                />
              );
            })}
        </div>
      )}

    </div>
  );

  // Hooks mode: wrap in OverrideHooksHost
  if (mode === 'hooks') {
    return (
      <OverrideHooksHost uigenId={detailOp?.override?.id || `${resource.slug}.detail`} resource={resource} operation={detailOp}>
        {content}
      </OverrideHooksHost>
    );
  }

  // None mode: render built-in as normal
  return content;
}
