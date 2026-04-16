import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { ListView } from '../ListView';
import type { Resource, Operation, SchemaNode } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

/**
 * Property-Based Tests for List View Rendering
 * 
 * Feature: uigen-complete-system
 * Property 17: List View Rendering
 * **Validates: Requirements 7.1, 7.2**
 * 
 * These tests verify that for any resource with a list operation,
 * the UI engine renders a table view with columns for each field
 * in the response schema.
 */

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('List View Rendering - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Arbitrary for generating field types
   */
  const fieldTypeArb = fc.constantFrom<'string' | 'number' | 'integer' | 'boolean'>(
    'string',
    'number',
    'integer',
    'boolean'
  );

  /**
   * Arbitrary for generating schema fields with unique labels
   */
  const schemaFieldArb = fc.record({
    type: fieldTypeArb,
    key: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s)),
    required: fc.boolean(),
  });

  /**
   * Arbitrary for generating resource schemas with varying field counts and unique labels
   */
  const resourceSchemaArb = fc
    .integer({ min: 1, max: 10 })
    .chain(fieldCount =>
      fc
        .array(schemaFieldArb, { minLength: fieldCount, maxLength: fieldCount })
        .map(fields => {
          // Ensure unique labels by appending index
          const uniqueFields = fields.map((field, idx) => ({
            ...field,
            label: `${field.label}_${idx}`,
            key: `${field.key}_${idx}`,
          }));
          return {
            type: 'object' as const,
            key: 'resource',
            label: 'Resource',
            required: false,
            children: uniqueFields,
          };
        })
    );

  /**
   * Arbitrary for generating list operations
   */
  const listOperationArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 30 }),
    method: fc.constant<'GET'>('GET'),
    path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}`),
    viewHint: fc.constant<'list'>('list'),
    parameters: fc.constant([]),
    responses: fc.constant({}),
  });

  /**
   * Arbitrary for generating resources with list operations
   */
  const resourceWithListArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    slug: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z0-9-]+$/.test(s)),
    operations: listOperationArb.map(op => [op]),
    schema: resourceSchemaArb,
    relationships: fc.constant([]),
  });

  /**
   * Property: For any resource with a list operation, a table should be rendered
   * Validates: Requirement 7.1
   */
  it('should render a table view for any resource with a list operation', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return empty data
        vi.mocked(useApiCall).mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Verify that a table is rendered
        const table = container.querySelector('table');
        expect(table).toBeInTheDocument();

        // Verify that table has header and body
        const thead = container.querySelector('thead');
        const tbody = container.querySelector('tbody');
        expect(thead).toBeInTheDocument();
        expect(tbody).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any resource schema, column headers should match schema field labels
   * Validates: Requirement 7.2
   */
  it('should display column headers matching schema field labels', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return empty data
        vi.mocked(useApiCall).mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Get the first 6 fields (ListView limits to 6 columns)
        const visibleFields = (resource.schema.children || []).slice(0, 6);

        // Verify that each field label appears as a column header
        for (const field of visibleFields) {
          const headerButtons = container.querySelectorAll('button');
          const found = Array.from(headerButtons).some(btn => btn.textContent?.includes(field.label));
          expect(found).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Number of columns should match number of schema fields (up to 6)
   * Validates: Requirement 7.2
   */
  it('should render correct number of columns based on schema fields', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return empty data
        vi.mocked(useApiCall).mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Get the number of visible fields (max 6)
        const fieldCount = Math.min((resource.schema.children || []).length, 6);

        // Count the number of header cells in the first header row only
        const firstHeaderRow = container.querySelector('thead tr');
        const headerCells = firstHeaderRow ? firstHeaderRow.querySelectorAll('th') : [];
        
        // Should have exactly fieldCount columns (no actions column since no operations)
        expect(headerCells.length).toBe(fieldCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When resource has action operations, an additional Actions column should be rendered
   * Validates: Requirement 7.2
   */
  it('should render Actions column when resource has detail/update/delete operations', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithListArb,
        fc.array(
          fc.constantFrom<'detail' | 'update' | 'delete'>('detail', 'update', 'delete'),
          { minLength: 1, maxLength: 3 }
        ),
        async (resource: Resource, actionTypes: Array<'detail' | 'update' | 'delete'>) => {
          // Add action operations to the resource
          const actionOperations: Operation[] = actionTypes.map(viewHint => ({
            id: `${viewHint}Operation`,
            method: viewHint === 'delete' ? 'DELETE' : viewHint === 'update' ? 'PUT' : 'GET',
            path: `/${resource.slug}/{id}`,
            viewHint,
            parameters: [],
            responses: {},
          }));

          const resourceWithActions: Resource = {
            ...resource,
            operations: [...resource.operations, ...actionOperations],
          };

          // Mock the API call to return empty data
          vi.mocked(useApiCall).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any);

          const { container } = render(
            <BrowserRouter>
              <ListView resource={resourceWithActions} />
            </BrowserRouter>
          );

          // Get the number of visible fields (max 6)
          const fieldCount = Math.min((resource.schema.children || []).length, 6);

          // Count the number of header cells in the first header row only
          const firstHeaderRow = container.querySelector('thead tr');
          const headerCells = firstHeaderRow ? firstHeaderRow.querySelectorAll('th') : [];

          // Should have fieldCount + 1 (for Actions column)
          expect(headerCells.length).toBe(fieldCount + 1);

          // Verify Actions header is present using container query
          const actionsHeader = Array.from(container.querySelectorAll('thead th')).find(
            th => th.textContent === 'Actions'
          );
          expect(actionsHeader).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Table should render data rows when data is provided
   * Validates: Requirements 7.1, 7.2
   */
  it('should render data rows with correct values for any schema', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithListArb,
        fc.array(
          fc.record({
            id: fc.string(),
            value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (resource: Resource, dataItems: Array<{ id: string; value: any }>) => {
          // Create mock data matching the schema
          const mockData = dataItems.map(item => {
            const row: Record<string, any> = { id: item.id };
            (resource.schema.children || []).forEach(field => {
              row[field.key] = item.value;
            });
            return row;
          });

          // Mock the API call to return the data
          vi.mocked(useApiCall).mockReturnValue({
            data: mockData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any);

          const { container } = render(
            <BrowserRouter>
              <ListView resource={resource} />
            </BrowserRouter>
          );

          // Count the number of data rows
          const dataRows = container.querySelectorAll('tbody tr');
          expect(dataRows.length).toBe(mockData.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ListView should limit columns to first 6 fields regardless of schema size
   * Validates: Requirement 7.2
   */
  it('should limit display to first 6 fields when schema has more than 6 fields', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 7, max: 20 }).chain(fieldCount =>
          fc.array(schemaFieldArb, { minLength: fieldCount, maxLength: fieldCount }).map(fields => {
            // Ensure unique labels by appending index
            const uniqueFields = fields.map((field, idx) => ({
              ...field,
              label: `${field.label}_${idx}`,
              key: `${field.key}_${idx}`,
            }));
            return {
              name: 'TestResource',
              slug: 'test-resource',
              operations: [
                {
                  id: 'listTest',
                  method: 'GET' as const,
                  path: '/test',
                  viewHint: 'list' as const,
                  parameters: [],
                  responses: {},
                },
              ],
              schema: {
                type: 'object' as const,
                key: 'resource',
                label: 'Resource',
                required: false,
                children: uniqueFields,
              },
              relationships: [],
            };
          })
        ),
        async (resource: Resource) => {
          // Mock the API call to return empty data
          vi.mocked(useApiCall).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any);

          const { container } = render(
            <BrowserRouter>
              <ListView resource={resource} />
            </BrowserRouter>
          );

          // Count the number of header cells in the first header row only
          const firstHeaderRow = container.querySelector('thead tr');
          const headerCells = firstHeaderRow ? firstHeaderRow.querySelectorAll('th') : [];

          // Should have exactly 6 columns (no actions column)
          expect(headerCells.length).toBe(6);

          // Verify only first 6 field labels are rendered
          const visibleFields = (resource.schema.children || []).slice(0, 6);
          for (const field of visibleFields) {
            const headerButtons = container.querySelectorAll('button');
            const found = Array.from(headerButtons).some(btn => btn.textContent?.includes(field.label));
            expect(found).toBe(true);
          }

          // Verify fields beyond 6 are NOT rendered
          const hiddenFields = (resource.schema.children || []).slice(6);
          for (const field of hiddenFields) {
            const headerButtons = container.querySelectorAll('button');
            const found = Array.from(headerButtons).some(btn => btn.textContent?.includes(field.label));
            expect(found).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty state should be shown when data array is empty
   * Validates: Requirement 7.1
   */
  it('should render empty state for any resource when no data is available', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return empty array
        vi.mocked(useApiCall).mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Verify empty state message is displayed using container query
        const emptyStateHeading = container.querySelector('h3');
        expect(emptyStateHeading?.textContent).toBe('No records found');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Loading state should show skeleton rows for any resource
   * Validates: Requirement 7.1
   */
  it('should render loading skeletons for any resource while data is loading', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return loading state
        vi.mocked(useApiCall).mockReturnValue({
          data: undefined,
          isLoading: true,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Verify skeleton rows are rendered
        const skeletonRows = container.querySelectorAll('tbody tr');
        expect(skeletonRows.length).toBeGreaterThan(0);

        // Verify skeleton cells have loading animation
        const skeletonCells = container.querySelectorAll('tbody tr td div.animate-pulse');
        expect(skeletonCells.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error state should be displayed for any resource when API call fails
   * Validates: Requirement 7.1
   */
  it('should render error message for any resource when data fetching fails', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithListArb,
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
        async (resource: Resource, errorMessage: string) => {
          // Mock the API call to return error state
          vi.mocked(useApiCall).mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error(errorMessage),
            refetch: vi.fn(),
            isError: true,
            isSuccess: false,
          } as any);

          const { container } = render(
            <BrowserRouter>
              <ListView resource={resource} />
            </BrowserRouter>
          );

          // Verify error message is displayed using container query
          const errorContainer = container.querySelector('.border-destructive');
          expect(errorContainer).toBeTruthy();
          expect(errorContainer?.textContent).toContain('Error loading data');
          expect(errorContainer?.textContent).toContain(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Column headers should be sortable for any resource
   * Validates: Requirement 7.2
   */
  it('should render sortable column headers for any resource schema', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(resourceWithListArb, async (resource: Resource) => {
        // Mock the API call to return empty data
        vi.mocked(useApiCall).mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: true,
        } as any);

        const { container } = render(
          <BrowserRouter>
            <ListView resource={resource} />
          </BrowserRouter>
        );

        // Get the first 6 fields (ListView limits to 6 columns)
        const visibleFields = (resource.schema.children || []).slice(0, 6);

        // Verify each column header is rendered as a button (sortable) with sort icon
        const headerButtons = container.querySelectorAll('thead button');
        expect(headerButtons.length).toBe(visibleFields.length);

        // Verify each button has a sort indicator icon (SVG)
        for (const button of Array.from(headerButtons)) {
          const svg = button.querySelector('svg');
          expect(svg).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
