import { useState, useEffect } from 'react';
import type { Resource, Relationship, Operation } from '@uigen-dev/core';
import { useApiCall, useApiMutation } from '@/hooks/useApiCall';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LibrarySelector } from '@/components/LibrarySelector';
import { useToast } from '@/components/Toast';

export interface LibraryAssociationManagerProps {
  consumerResource: Resource;
  consumerId: string;
  relationship: Relationship;
  libraryResource: Resource;
}

/**
 * LibraryAssociationManager component for managing many-to-many associations
 * Implements Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 8.5
 */
export function LibraryAssociationManager({
  consumerResource,
  consumerId,
  relationship,
  libraryResource
}: LibraryAssociationManagerProps) {
  const [showSelector, setShowSelector] = useState(false);
  const { showToast } = useToast();

  // Find the association operations.
  // The adapter may place association path operations on either the consumer
  // or the library resource depending on path inference. Search both.
  const allOps = [
    ...consumerResource.operations,
    ...libraryResource.operations,
  ];

  const listAssociationOp = allOps.find(
    op => op.path === relationship.path && op.method === 'GET'
  );
  
  const createAssociationOp = allOps.find(
    op => op.path === relationship.path && op.method === 'POST'
  );
  
  // Find delete operation - pattern: /consumer/{id}/library/{libraryId}
  const deleteAssociationOp = allOps.find(
    op => op.path.startsWith(relationship.path) && 
         op.method === 'DELETE' &&
         op.path.match(/\{[^}]+\}.*\{[^}]+\}/) // Has two path parameters
  );

  // Build path params for the association endpoint
  const pathParams: Record<string, string> = {};
  const pathParamMatches = relationship.path.match(/\{([^}]+)\}/g);
  if (pathParamMatches) {
    pathParamMatches.forEach((match) => {
      const paramName = match.slice(1, -1);
      pathParams[paramName] = consumerId;
    });
  }

  // Requirement 4.1: Fetch currently associated library resources on mount
  const { data: associations, isLoading, error, refetch } = useApiCall({
    operation: listAssociationOp,
    pathParams,
    enabled: !!listAssociationOp
  });

  // Create association mutation
  const createMutation = useApiMutation(createAssociationOp, {
    relatedQueryKeys: [listAssociationOp?.id || '']
  });

  // Delete association mutation
  const deleteMutation = useApiMutation(deleteAssociationOp, {
    relatedQueryKeys: [listAssociationOp?.id || '']
  });

  // Extract associated resource IDs
  const associatedIds = Array.isArray(associations)
    ? associations.map((item: any) => String(item.id || item._id || item.uuid || ''))
    : [];

  // Requirement 4.5: Handle POST request to create associations
  const handleSelect = async (resourceId: string) => {
    try {
      // Determine the request body format
      // Common patterns: { id: "..." }, { templateId: "..." }, or just the ID
      const libraryIdField = `${libraryResource.slug}Id`;
      const body = { [libraryIdField]: resourceId };

      await createMutation.mutateAsync({
        pathParams,
        body
      });

      // Requirement 4.7: Display success message
      showToast('success', `${libraryResource.name} associated successfully`);
      setShowSelector(false);
      
      // Refetch associations to update the list
      refetch();
    } catch (err) {
      // Requirement 4.7: Display error messages for failed operations
      const errorMessage = err instanceof Error ? err.message : 'Failed to create association';
      showToast('error', errorMessage);
    }
  };

  // Requirement 4.4: Implement remove action for each associated resource
  const handleRemove = async (resourceId: string) => {
    if (!deleteAssociationOp) return;

    try {
      // Build path params for delete operation
      const deletePathParams: Record<string, string> = { ...pathParams };
      
      // Add the library resource ID parameter
      const deletePathMatches = deleteAssociationOp.path.match(/\{([^}]+)\}/g);
      if (deletePathMatches && deletePathMatches.length > 1) {
        const libraryParamName = deletePathMatches[deletePathMatches.length - 1].slice(1, -1);
        deletePathParams[libraryParamName] = resourceId;
      }

      await deleteMutation.mutateAsync({
        pathParams: deletePathParams
      });

      // Requirement 4.7: Display success message
      showToast('success', `${libraryResource.name} removed successfully`);
      
      // Refetch associations to update the list
      refetch();
    } catch (err) {
      // Requirement 4.7: Display error messages for failed operations
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove association';
      showToast('error', errorMessage);
    }
  };

  // Get display label for an associated item
  const getItemLabel = (item: any): string => {
    return item.name || item.title || item.label || item.id || 'Unnamed';
  };

  // Get description for an associated item
  const getItemDescription = (item: any): string | null => {
    return item.description || null;
  };

  // Get ID for an associated item
  const getItemId = (item: any): string => {
    return String(item.id || item._id || item.uuid || '');
  };

  // Requirement 4.8: Handle read-only associations (hide add/remove actions)
  const isReadOnly = relationship.isReadOnly || !createAssociationOp;

  return (
    // Requirement 11.2: Use semantic <section> element
    <section
      className="mt-8 space-y-4"
      aria-label={`Associated ${libraryResource.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Associated {libraryResource.name}
        </h3>
        
        {/* Requirement 4.6: Render LibrarySelector when "Add" button is clicked */}
        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelector(true)}
            aria-label={`Add ${libraryResource.name}`}
          >
            + Add {libraryResource.name}
          </Button>
        )}
      </div>

      {/* Requirement 4.7: Display loading states during fetch */}
      {isLoading && (
        <div
          className="flex items-center justify-center py-8"
          role="status"
          aria-live="polite"
          aria-label={`Loading associated ${libraryResource.name.toLowerCase()}`}
        >
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Requirement 4.7: Display error messages for failed operations */}
      {error && (
        <div
          className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md"
          role="alert"
        >
          <p className="font-semibold">Error loading associations</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Requirement 4.2: Display associated resources in a list */}
      {!isLoading && !error && (
        // Requirement 11.2: Use semantic <ul> list element
        <ul className="space-y-2" aria-label={`${libraryResource.name} associations`}>
          {associations && Array.isArray(associations) && associations.length > 0 ? (
            associations.map((item: any) => {
              const itemId = getItemId(item);
              const label = getItemLabel(item);
              const description = getItemDescription(item);

              return (
                <li
                  key={itemId}
                  className="flex items-start justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{label}</p>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                  
                  {/* Requirement 4.4: Remove action with clear accessible label */}
                  {!isReadOnly && deleteAssociationOp && (
                    <button
                      onClick={() => handleRemove(itemId)}
                      disabled={deleteMutation.isPending}
                      className="ml-3 text-destructive hover:text-destructive/80 disabled:opacity-50"
                      aria-label={`Remove ${label} from ${libraryResource.name}`}
                    >
                      {deleteMutation.isPending ? '...' : '×'}
                    </button>
                  )}
                </li>
              );
            })
          ) : (
            <li className="text-sm text-muted-foreground py-4 list-none">
              No {libraryResource.name.toLowerCase()} associated yet.
            </li>
          )}
        </ul>
      )}

      {/* Read-only message */}
      {isReadOnly && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          This association is read-only.
        </p>
      )}

      {/* Requirement 4.6: Render LibrarySelector when "Add" button is clicked */}
      {showSelector && (
        <LibrarySelector
          libraryResource={libraryResource}
          onSelect={handleSelect}
          onCancel={() => setShowSelector(false)}
          excludeIds={associatedIds}
        />
      )}
    </section>
  );
}
