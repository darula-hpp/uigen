import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Resource } from '@uigen-dev/core';
import { useApiCall } from '@/hooks/useApiCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export interface LibrarySelectorProps {
  libraryResource: Resource;
  onSelect: (resourceId: string) => Promise<void>;
  onCancel: () => void;
  excludeIds?: string[];
}

/**
 * LibrarySelector component for selecting items from a library resource
 * Implements Requirements 4.2, 4.3, 4.4, 4.6, 4.7, 9.1, 9.2, 9.3, 9.4, 9.5
 * Accessibility: Requirements 4.3, 4.4 (keyboard nav, ARIA, focus trap)
 */
export function LibrarySelector({
  libraryResource,
  onSelect,
  onCancel,
  excludeIds = []
}: LibrarySelectorProps) {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Requirement 11.1: Track focused list item index for keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Requirement 11.1: Focus the search input when the dialog opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Requirement 11.1: Focus trap - keep focus within the dialog
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Requirement 11.1: Escape key closes the selector
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [onCancel]);

  // Requirement 4.3: Implement search input with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Find the list operation for the library resource
  // Accept both 'list' and 'search' viewHints since search is a variant of list
  const listOp = libraryResource.operations.find(op => 
    op.viewHint === 'list' || op.viewHint === 'search'
  );
  const createOp = libraryResource.operations.find(op => op.viewHint === 'create');

  // Build query parameters from search and filters
  const queryParams = useMemo(() => {
    const params: Record<string, string> = { ...filters };
    
    // Add search query if supported by the API
    if (debouncedSearch && listOp) {
      // Common search parameter names
      const searchParam = listOp.parameters.find(
        p => p.in === 'query' && (p.name === 'search' || p.name === 'q' || p.name === 'query')
      );
      if (searchParam) {
        params[searchParam.name] = debouncedSearch;
      }
    }
    
    return params;
  }, [debouncedSearch, filters, listOp]);

  // Requirement 4.2: Fetch available library resource instances
  const { data, isLoading, error } = useApiCall({
    operation: listOp,
    queryParams,
    enabled: !!listOp
  });

  // Extract filter parameters from the list operation
  const filterParams = useMemo(() => {
    if (!listOp) return [];
    return listOp.parameters.filter(
      p => p.in === 'query' && 
      p.name !== 'search' && 
      p.name !== 'q' && 
      p.name !== 'query' &&
      p.name !== 'page' &&
      p.name !== 'limit' &&
      p.name !== 'offset'
    );
  }, [listOp]);

  // Filter out excluded items and apply client-side search if needed
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    let items = Array.isArray(data) ? data : [];
    
    // Exclude already associated items
    if (excludeIds.length > 0) {
      items = items.filter((item: any) => {
        const itemId = item.id || item._id || item.uuid;
        return !excludeIds.includes(String(itemId));
      });
    }
    
    // Client-side search fallback if API doesn't support search
    if (debouncedSearch && !queryParams.search && !queryParams.q && !queryParams.query) {
      const searchLower = debouncedSearch.toLowerCase();
      items = items.filter((item: any) => {
        // Search in common display fields
        const searchableFields = [
          item.name,
          item.title,
          item.label,
          item.description
        ].filter(Boolean);
        
        return searchableFields.some(field => 
          String(field).toLowerCase().includes(searchLower)
        );
      });
    }
    
    return items;
  }, [data, excludeIds, debouncedSearch, queryParams]);

  // Reset focused index when filtered data changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredData]);

  // Get display label for an item
  const getItemLabel = (item: any): string => {
    return item.name || item.title || item.label || item.id || 'Unnamed';
  };

  // Get description for an item
  const getItemDescription = (item: any): string | null => {
    return item.description || null;
  };

  // Get ID for an item
  const getItemId = (item: any): string => {
    return String(item.id || item._id || item.uuid || '');
  };

  // Handle selection
  const handleSelect = async () => {
    if (!selectedId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSelect(selectedId);
    } catch (err) {
      console.error('Failed to select item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (paramName: string, value: string) => {
    setFilters(prev => {
      if (!value) {
        const { [paramName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [paramName]: value };
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilters({});
  };

  // Requirement 11.1: Keyboard navigation for list items
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (filteredData.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(focusedIndex + 1, filteredData.length - 1);
      setFocusedIndex(next);
      const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next];
      btn?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedIndex <= 0) {
        // Move focus back to search input
        setFocusedIndex(-1);
        searchInputRef.current?.focus();
      } else {
        const prev = focusedIndex - 1;
        setFocusedIndex(prev);
        const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[prev];
        btn?.focus();
      }
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      // Requirement 11.1: Enter key selects the focused item
      e.preventDefault();
      const item = filteredData[focusedIndex];
      if (item) {
        setSelectedId(getItemId(item));
      }
    }
  };

  // Move focus from search input into list on ArrowDown
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && filteredData.length > 0) {
      e.preventDefault();
      setFocusedIndex(0);
      const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[0];
      btn?.focus();
    }
  };

  const hasActiveFilters = searchQuery || Object.keys(filters).length > 0;
  const resultCount = filteredData.length;
  const totalCount = Array.isArray(data) ? data.length : 0;

  return (
    // Requirement 11.1: Focus trap container; Requirement 11.2: dialog role
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      aria-label={`Select ${libraryResource.name}`}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        ref={dialogRef}
        className="bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
      >
        {/* Header - Requirement 9.1 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="library-selector-title" className="text-lg font-semibold">
            Select {libraryResource.name}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Close ${libraryResource.name} selector`}
          >
            ×
          </button>
        </div>

        {/* Search and Filters - Requirements 4.3, 4.4, 9.2 */}
        <div className="p-4 border-b space-y-3">
          {/* Requirement 11.2: ARIA label for search input */}
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={`Search ${libraryResource.name.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full"
            aria-label={`Search ${libraryResource.name}`}
            aria-controls="library-selector-list"
            role="searchbox"
          />
          
          {/* Requirement 4.4: Filter inputs for query parameters */}
          {filterParams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filterParams.map((param) => (
                <div key={param.name} className="flex-1 min-w-[200px]">
                  {param.schema.type === 'enum' && param.schema.enumValues ? (
                    <select
                      value={filters[param.name] || ''}
                      onChange={(e) => handleFilterChange(param.name, e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      aria-label={`Filter by ${param.name}`}
                    >
                      <option value="">All {param.name}</option>
                      {param.schema.enumValues.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      placeholder={`Filter by ${param.name}`}
                      value={filters[param.name] || ''}
                      onChange={(e) => handleFilterChange(param.name, e.target.value)}
                      aria-label={`Filter by ${param.name}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Requirement 9.3: Loading state with screen reader announcement */}
          {isLoading && (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-live="polite"
              aria-label={`Loading ${libraryResource.name.toLowerCase()}`}
            >
              <LoadingSpinner size="md" />
            </div>
          )}

          {/* Requirement 9.3: Error state */}
          {error && (
            <div
              className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md"
              role="alert"
            >
              <p className="font-semibold">Error loading {libraryResource.name.toLowerCase()}</p>
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          {/* Requirement 9.4: Empty state with "Clear Filters" action */}
          {!isLoading && !error && filteredData.length === 0 && (
            <div className="text-center py-8 space-y-4" role="status" aria-live="polite">
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? `No ${libraryResource.name.toLowerCase()} match your filters`
                  : `No ${libraryResource.name.toLowerCase()} available`
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Requirement 4.5: List with visual selection feedback */}
          {!isLoading && !error && filteredData.length > 0 && (
            <div>
              {/* Requirement 11.2: Screen reader announcement for result count */}
              <p
                className="text-sm text-muted-foreground mb-3"
                aria-live="polite"
                aria-atomic="true"
              >
                Showing {resultCount} {libraryResource.name.toLowerCase()}
                {resultCount !== totalCount && ` of ${totalCount}`}
              </p>
              
              {/* Requirement 11.1: listbox role for keyboard navigation */}
              <div
                id="library-selector-list"
                ref={listRef}
                role="listbox"
                aria-label={`${libraryResource.name} options`}
                aria-multiselectable="false"
                onKeyDown={handleListKeyDown}
              >
                {filteredData.map((item: any, index: number) => {
                  const itemId = getItemId(item);
                  const isSelected = selectedId === itemId;
                  const label = getItemLabel(item);
                  const description = getItemDescription(item);
                  
                  return (
                    <button
                      key={itemId}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={focusedIndex === index ? 0 : -1}
                      onClick={() => setSelectedId(itemId)}
                      className={cn(
                        'w-full text-left p-3 rounded-md border transition-colors mb-2',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {/* Visual radio indicator */}
                        <div
                          className={cn(
                            'mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <div className="h-full w-full rounded-full bg-background scale-50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{label}</p>
                          {description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Requirements 4.6, 4.7, 9.5 */}
        <div className="p-4 border-t space-y-3">
          {/* Requirement 4.6: "Create New" and "View All" links */}
          <div className="flex gap-2">
            {createOp && (
              <Link
                to={`/${libraryResource.slug}/new`}
                className="text-sm text-primary hover:underline"
                aria-label={`Create new ${libraryResource.name}`}
              >
                Create New {libraryResource.name}
              </Link>
            )}
            <Link
              to={`/${libraryResource.slug}`}
              className="text-sm text-primary hover:underline"
              aria-label={`View all ${libraryResource.name}`}
            >
              View All {libraryResource.name}
            </Link>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              aria-label="Cancel selection"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSelect} 
              disabled={!selectedId || isSubmitting}
              aria-label={selectedId ? `Confirm selection` : `No item selected`}
            >
              {isSubmitting ? 'Selecting...' : 'Select'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
