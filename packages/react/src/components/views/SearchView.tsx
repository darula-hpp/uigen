import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiCall } from '@/hooks/useApiCall';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Resource, Operation } from '@uigen-dev/core';
import { reconcile, OverrideHooksHost } from '@/overrides';

interface SearchViewProps {
  resource: Resource;
  operation?: Operation;
}

export function SearchView({ resource, operation }: SearchViewProps) {
  const navigate = useNavigate();
  
  // Construct view-specific uigenId
  const uigenId = `${resource.uigenId}.search`;
  
  // Reconcile to determine override mode
  const { mode, renderFn } = reconcile(uigenId);
  
  const searchOp = operation || resource.operations.find(op => op.viewHint === 'search');

  if (!searchOp) {
    return <div className="p-4 text-muted-foreground">No search operation available for {resource.name}</div>;
  }

  // Extract query parameters (excluding pagination params)
  const paginationParams = new Set(['limit', 'offset', 'page', 'pageSize', 'perPage', 'per_page', 'cursor', 'nextCursor', 'next', 'pageToken', 'continuationToken']);
  const filterParams = searchOp.parameters?.filter(p => p.in === 'query' && !paginationParams.has(p.name)) || [];

  // State for filter values
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params[key] = value;
      }
    });
    return params;
  }, [filters]);

  const { data, isLoading, error } = useApiCall({
    operation: searchOp,
    queryParams,
  });

  // Extract items from response
  const items = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data?.items || data?.data || [];
  }, [data]);

  // Get schema columns (limit to first 6 for display)
  const schemaColumns = useMemo(() => {
    return (resource.schema.children || []).slice(0, 6);
  }, [resource.schema.children]);

  const hasDetailOp = resource.operations.some(op => op.viewHint === 'detail');

  const handleFilterChange = (paramName: string, value: string) => {
    setFilters(prev => ({ ...prev, [paramName]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleRemoveFilter = (paramName: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[paramName];
      return newFilters;
    });
  };

  // Get active filters (non-empty values)
  const activeFilters = useMemo(() => {
    return Object.entries(filters).filter(([_, value]) => value !== '');
  }, [filters]);

  // Render mode: call renderFn with search data
  if (mode === 'render' && renderFn) {
    try {
      return <>{renderFn({ 
        resource, 
        operation: searchOp,
        data: items, 
        isLoading, 
        error,
        filters,
        setFilters,
        clearFilters: handleClearFilters
      })}</>;
    } catch (err) {
      console.error(`[UIGen Override] Error in render function for "${uigenId}":`, err);
      // Fall through to built-in view
    }
  }

  // Built-in search content
  const content = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Search {resource.name}</h2>
      </div>

      {/* Filter Inputs */}
      {filterParams.length > 0 && (
        <div className="p-4 border rounded-md bg-muted/30">
          <h3 className="text-lg font-semibold mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterParams.map((param) => (
              <div key={param.name} className="space-y-1">
                <label htmlFor={param.name} className="text-sm font-medium">
                  {param.schema.label}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {param.schema.type === 'enum' ? (
                  <select
                    id={param.name}
                    value={filters[param.name] || ''}
                    onChange={(e) => handleFilterChange(param.name, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">All</option>
                    {param.schema.enumValues?.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={param.name}
                    type={param.schema.type === 'integer' || param.schema.type === 'number' ? 'number' : 'text'}
                    value={filters[param.name] || ''}
                    onChange={(e) => handleFilterChange(param.name, e.target.value)}
                    placeholder={`Enter ${param.schema.label.toLowerCase()}`}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleClearFilters}>Clear All Filters</Button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
          {activeFilters.map(([key, value]) => {
            const param = filterParams.find(p => p.name === key);
            return (
              <div
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                <span className="font-medium">{param?.schema.label || key}:</span>
                <span>{value}</span>
                <button
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${param?.schema.label || key} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Result Count */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          {items.length} result{items.length !== 1 ? 's' : ''} found
        </div>
      )}

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Results Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {schemaColumns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {hasDetailOp && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeleton rows
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {schemaColumns.map((_, colIdx) => (
                  <TableCell key={`skeleton-${idx}-${colIdx}`}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
                {hasDetailOp && (
                  <TableCell>
                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={schemaColumns.length + (hasDetailOp ? 1 : 0)} className="h-32 text-center">
                <p className="text-muted-foreground">No results found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item: any, idx: number) => (
              <TableRow
                key={item.id || idx}
                onClick={() => {
                  if (hasDetailOp && item.id) {
                    navigate(`/${resource.slug}/${item.id}`);
                  }
                }}
                className={hasDetailOp ? "cursor-pointer hover:bg-muted/50" : ""}
              >
                {schemaColumns.map((col) => (
                  <TableCell key={col.key}>
                    {formatValue(item[col.key])}
                  </TableCell>
                ))}
                {hasDetailOp && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/${resource.slug}/${item.id}`);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Hooks mode: wrap in OverrideHooksHost
  if (mode === 'hooks') {
    return (
      <OverrideHooksHost uigenId={uigenId} resource={resource} operation={searchOp}>
        {content}
      </OverrideHooksHost>
    );
  }

  // None mode: render built-in as normal
  return content;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
