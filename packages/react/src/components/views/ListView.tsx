import { useApiCall } from '@/hooks/useApiCall';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Resource, Operation } from '@uigen-dev/core';
import { reconcile, OverrideHooksHost } from '@/overrides';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface ListViewProps {
  resource: Resource;
  operation?: Operation;
}

export function ListView({ resource, operation }: ListViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get('parentId');

  // Construct view-specific uigenId
  const uigenId = `${resource.uigenId}.list`;

  // Reconcile to determine override mode
  const { mode, renderFn } = reconcile(uigenId);

  // Try to find list operation, fallback to search operation (which can also list items)
  const listOp = operation ||
    resource.operations.find(op => op.viewHint === 'list') ||
    resource.operations.find(op => op.viewHint === 'search');

  // ── All hooks unconditionally before any early return ──────────────────────

  // Build path params — inject parentId for sub-resources
  const pathParams = useMemo(() => {
    if (!listOp || !parentId || !listOp.path.includes('{')) return {};
    const matches = listOp.path.match(/\{([^}]+)\}/g);
    if (!matches) return {};
    // Map the first path param to the parentId
    const firstParam = matches[0].slice(1, -1);
    return { [firstParam]: parentId };
  }, [parentId, listOp]);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Cursor pagination state
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Build query params based on pagination strategy
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};

    if (resource.pagination) {
      const { style, params: paginationParams } = resource.pagination;

      if (style === 'offset') {
        // Offset pagination: limit + offset
        const limitParam = paginationParams.limit || 'limit';
        const offsetParam = paginationParams.offset || 'offset';
        params[limitParam] = String(pagination.pageSize);
        params[offsetParam] = String(pagination.pageIndex * pagination.pageSize);
      } else if (style === 'cursor') {
        // Cursor pagination: cursor
        const cursorParam = paginationParams.cursor || 'cursor';
        if (pagination.pageIndex > 0 && cursorHistory[pagination.pageIndex - 1]) {
          params[cursorParam] = cursorHistory[pagination.pageIndex - 1];
        }
      } else if (style === 'page') {
        // Page-based pagination: page + pageSize
        const pageParam = paginationParams.page || 'page';
        const pageSizeParam = paginationParams.pageSize || paginationParams.perPage || 'pageSize';
        params[pageParam] = String(pagination.pageIndex + 1); // Page numbers are 1-indexed
        params[pageSizeParam] = String(pagination.pageSize);
      }
    }

    return params;
  }, [resource.pagination, pagination, cursorHistory]);

  const { data, isLoading, error } = useApiCall({
    operation: listOp!,
    queryParams,
    pathParams,
    // Disabled when no list operation exists, or when path params are needed but not yet available
    enabled: !!listOp && (!listOp.path.includes('{') || !!parentId),
  });

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filtering state - Requirements 36.1-36.6
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Extract items from response
  const items = useMemo(() => {
    if (!data) return [];

    // Direct array response
    if (Array.isArray(data)) {
      let arr = data;
      if (Object.keys(columnFilters).some(k => columnFilters[k])) {
        arr = arr.filter((item: any) => Object.entries(columnFilters).every(([key, val]) => !val || String(item[key] || '').toLowerCase().includes(val.toLowerCase())));
      }
      return arr;
    }

    // Extract next cursor for cursor pagination
    if (resource.pagination?.style === 'cursor' && data) {
      const cursor = data.nextCursor || data.next || data.cursor || null;
      setNextCursor(cursor);
    }

    // Try common wrapper keys first, then scan all values for the first array
    let itemsArray: any[] =
      data.items ||
      data.data ||
      data.results ||
      data.records ||
      // Scan all top-level values for the first array (handles Twilio-style { services: [...] })
      Object.values(data as Record<string, unknown>).find(v => Array.isArray(v)) as any[] ||
      [];

    if (Object.keys(columnFilters).some(k => columnFilters[k])) {
      itemsArray = itemsArray.filter((item: any) => Object.entries(columnFilters).every(([key, val]) => !val || String(item[key] || '').toLowerCase().includes(val.toLowerCase())));
    }

    return itemsArray;
  }, [data, resource.pagination, columnFilters]);

  // Get schema columns (limit to first 6 for display)
  const schemaColumns = useMemo(() => {
    return (resource.schema.children || []).slice(0, 6);
  }, [resource.schema.children]);

  // Check for available operations
  const hasDetailOp = resource.operations.some(op => op.viewHint === 'detail');
  const hasUpdateOp = resource.operations.some(op => op.viewHint === 'update');
  const hasDeleteOp = resource.operations.some(op => op.viewHint === 'delete');
  const hasCreateOp = resource.operations.some(op => op.viewHint === 'create' || op.viewHint === 'wizard');

  // Resolve the identifier field for an item — tries id, sid, then first string field
  const getItemId = (item: any): string | undefined => {
    if (item?.id !== undefined) return String(item.id);
    if (item?.sid !== undefined) return String(item.sid);
    // Fall back to first string value in the item
    const firstStr = Object.values(item || {}).find(v => typeof v === 'string' && v.length > 0);
    return firstStr ? String(firstStr) : undefined;
  };

  // Define table columns using TanStack Table
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = schemaColumns.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting()}
            className="h-8 px-2 lg:px-3"
          >
            {col.label}
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: (info) => formatValue(info.getValue()),
    }));

    // Add actions column if any actions are available
    if (hasDetailOp || hasUpdateOp || hasDeleteOp) {
      cols.push({
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {hasDetailOp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/${resource.slug}/${getItemId(row.original)}`)}
              >
                View
              </Button>
            )}
            {hasUpdateOp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/${resource.slug}/${getItemId(row.original)}/edit`)}
              >
                Edit
              </Button>
            )}
            {hasDeleteOp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete this ${resource.name}?`)) {
                    // TODO: Implement delete mutation
                    console.log('Delete:', row.original.id);
                  }
                }}
              >
                Delete
              </Button>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [schemaColumns, resource.slug, resource.name, navigate, hasDetailOp, hasUpdateOp, hasDeleteOp]);

  // Initialize TanStack Table
  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!resource.pagination, // Use manual pagination if strategy detected
    pageCount: resource.pagination ? -1 : undefined, // Unknown page count for API pagination
  });

  // ── End hooks ──────────────────────────────────────────────────────────────

  // Early return AFTER all hooks
  if (!listOp) {
    return <div className="p-4 text-muted-foreground">No list operation available for {resource.name}</div>;
  }

  // Render mode: call renderFn with fetched data
  if (mode === 'render' && renderFn) {
    try {
      return <>{renderFn({
        resource,
        operation: listOp,
        data: items,
        isLoading,
        error,
        pagination: {
          currentPage: pagination.pageIndex,
          pageSize: pagination.pageSize,
          totalPages: table.getPageCount(),
          goToPage: (page: number) => setPagination(prev => ({ ...prev, pageIndex: page })),
          nextPage: () => table.nextPage(),
          previousPage: () => table.previousPage(),
        }
      })}</>;
    } catch (err) {
      console.error(`[UIGen Override] Error in render function for "${uigenId}":`, err);
      // Fall through to built-in view
    }
  }

  // Built-in table content
  const content = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{resource.name}</h2>
          {/* Resource Description - Requirement 61.1 */}
          {resource.description && (
            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
          )}
          {/* Filtered Result Count - Requirement 36.3 */}
          {Object.keys(columnFilters).some(key => columnFilters[key]) && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing {items.length} filtered result{items.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {hasCreateOp && (
          <Button onClick={() => navigate(`/${resource.slug}/new`)}>Create {resource.name}</Button>
        )}
      </div>

      {/* Sub-resource requires parent context */}
      {listOp.path.includes('{') && !parentId && (
        <div className="p-6 border rounded-md bg-muted/30 text-center space-y-2">
          <p className="font-semibold text-muted-foreground">
            {resource.name} is a sub-resource
          </p>
          <p className="text-sm text-muted-foreground">
            Navigate to a parent resource first, then access {resource.name} from there.
          </p>
          <p className="text-xs text-muted-foreground font-mono">{listOp.path}</p>
        </div>
      )}

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
          {/* Filter Row - Requirements 36.1, 36.2 */}
          <TableRow>
            {schemaColumns.map((col) => (
              <TableHead key={`filter-${col.key}`}>
                <input
                  type="text"
                  placeholder={`Filter ${col.label}...`}
                  value={columnFilters[col.key] || ''}
                  onChange={(e) => {
                    setColumnFilters(prev => ({
                      ...prev,
                      [col.key]: e.target.value
                    }));
                  }}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </TableHead>
            ))}
            {/* Clear Filters Button - Requirement 36.4 */}
            <TableHead>
              {Object.keys(columnFilters).some(key => columnFilters[key]) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setColumnFilters({})}
                >
                  Clear
                </Button>
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeleton rows
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {columns.map((_, colIdx) => (
                  <TableCell key={`skeleton-${idx}-${colIdx}`}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-64">
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No records found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasCreateOp
                      ? `Get started by creating your first ${resource.name.toLowerCase()}`
                      : `There are no ${resource.name.toLowerCase()} to display`
                    }
                  </p>
                  {hasCreateOp && (
                    <Button onClick={() => navigate(`/${resource.slug}/new`)}>
                      Create First {resource.name}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => {
                  if (hasDetailOp) {
                    navigate(`/${resource.slug}/${getItemId(row.original)}`);
                  }
                }}
                className={hasDetailOp ? "cursor-pointer hover:bg-muted/50" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {resource.pagination ? (
        // Server-side / API pagination
        (() => {
          // Extract pagination metadata — check common locations
          const meta = data && !Array.isArray(data) ? (data.meta || data) : null;
          const totalPages = meta?.totalPages || meta?.total_pages || meta?.pageCount || meta?.page_count;
          const total = meta?.total || meta?.totalCount || meta?.total_count;
          const hasNextPage = meta?.next_page_url || meta?.nextPage || meta?.next_cursor || meta?.nextCursor;
          const computedTotalPages = totalPages
            || (total && pagination.pageSize ? Math.ceil(total / pagination.pageSize) : null);

          return (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-2 py-2">
              <span className="text-sm text-muted-foreground">
                {resource.pagination.style === 'offset' && (
                  <>Page {pagination.pageIndex + 1}{computedTotalPages ? ` of ${computedTotalPages}` : ''}</>
                )}
                {resource.pagination.style === 'page' && (
                  <>Page {pagination.pageIndex + 1}{computedTotalPages ? ` of ${computedTotalPages}` : ''}</>
                )}
                {resource.pagination.style === 'cursor' && (
                  <>Page {pagination.pageIndex + 1}</>
                )}
              </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (resource.pagination?.style === 'cursor') {
                  setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
                } else {
                  table.previousPage();
                }
              }}
              disabled={
                resource.pagination?.style === 'cursor'
                  ? pagination.pageIndex === 0
                  : !table.getCanPreviousPage()
              }
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {(resource.pagination.style === 'offset' || resource.pagination.style === 'page') && (
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, computedTotalPages || 5) }, (_, i) => (
                  <Button
                    key={i}
                    variant={pagination.pageIndex === i ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[2.5rem]"
                    onClick={() => setPagination(prev => ({ ...prev, pageIndex: i }))}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (resource.pagination?.style === 'cursor') {
                  if (nextCursor) {
                    setCursorHistory(prev => [...prev, nextCursor]);
                    setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
                  }
                } else {
                  table.nextPage();
                }
              }}
              disabled={
                resource.pagination?.style === 'cursor'
                  ? !nextCursor
                  : hasNextPage === null || hasNextPage === undefined
                    ? !table.getCanNextPage()
                    : !hasNextPage
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
          );
        })()
      ) : (
        // Client-side pagination — use Paginate controls tied to TanStack page state
        table.getPageCount() > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-2 py-2">
            <span className="text-sm text-muted-foreground">
              Showing {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, items.length)} of {items.length} entries
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                First
              </Button>
              <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <span className="text-sm px-2">
                Page {pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
              <Button size="sm" variant="outline" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                Last
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );

  // Hooks mode: wrap in OverrideHooksHost
  if (mode === 'hooks') {
    return (
      <OverrideHooksHost uigenId={uigenId} resource={resource} operation={listOp}>
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
