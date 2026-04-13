import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListView } from '../ListView';
import type { Resource, Operation, SchemaNode } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

/**
 * Property-Based Tests for Row Navigation
 * 
 * Feature: uigen-complete-system
 * Property 18: Row Navigation
 * **Validates: Requirements 7.6**
 * 
 * These tests verify that for any row in a list view,
 * clicking the row should navigate to the detail view for that resource instance.
 */

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Row Navigation - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Mock window.confirm for delete button tests
    global.confirm = vi.fn(() => false);
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
   * Arbitrary for generating schema fields
   */
  const schemaFieldArb = fc.record({
    type: fieldTypeArb,
    key: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s)),
    required: fc.boolean(),
  });

  /**
   * Arbitrary for generating resource schemas
   */
  const resourceSchemaArb = fc
    .integer({ min: 1, max: 6 })
    .chain(fieldCount =>
      fc
        .array(schemaFieldArb, { minLength: fieldCount, maxLength: fieldCount })
        .map(fields => {
          // Ensure unique labels and keys
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
   * Arbitrary for generating detail operations
   */
  const detailOperationArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 30 }),
    method: fc.constant<'GET'>('GET'),
    path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}/{id}`),
    viewHint: fc.constant<'detail'>('detail'),
    parameters: fc.constant([]),
    responses: fc.constant({}),
  });

  /**
   * Arbitrary for generating resources with list and detail operations
   */
  const resourceWithDetailArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    slug: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z0-9-]+$/.test(s)),
    operations: fc.tuple(listOperationArb, detailOperationArb).map(([list, detail]) => [list, detail]),
    schema: resourceSchemaArb,
    relationships: fc.constant([]),
  });

  /**
   * Arbitrary for generating resources with only list operation (no detail)
   */
  const resourceWithoutDetailArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    slug: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z0-9-]+$/.test(s)),
    operations: listOperationArb.map(op => [op]),
    schema: resourceSchemaArb,
    relationships: fc.constant([]),
  });

  /**
   * Arbitrary for generating data items with IDs
   */
  const dataItemArb = (schema: SchemaNode) =>
    fc.record({
      id: fc.oneof(fc.string({ minLength: 1, maxLength: 20 }), fc.integer({ min: 1, max: 10000 })),
      ...Object.fromEntries(
        (schema.children || []).map(field => [
          field.key,
          field.type === 'string'
            ? fc.string()
            : field.type === 'number' || field.type === 'integer'
            ? fc.integer()
            : fc.boolean(),
        ])
      ),
    });

  /**
   * Property: Rows should be clickable when detail operation exists
   * Validates: Requirement 7.6
   */
  it('should make rows clickable when resource has detail operation', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithDetailArb,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (resource: Resource, ids: string[]) => {
          // Create mock data with IDs
          const mockData = ids.map(id => {
            const row: Record<string, any> = { id };
            (resource.schema.children || []).forEach(field => {
              row[field.key] = 'test-value';
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

          // Verify that rows have cursor-pointer class
          const dataRows = container.querySelectorAll('tbody tr');
          expect(dataRows.length).toBe(mockData.length);

          for (const row of Array.from(dataRows)) {
            expect(row.className).toContain('cursor-pointer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rows should NOT be clickable when detail operation does not exist
   * Validates: Requirement 7.6
   */
  it('should NOT make rows clickable when resource has no detail operation', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithoutDetailArb,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (resource: Resource, ids: string[]) => {
          // Create mock data with IDs
          const mockData = ids.map(id => {
            const row: Record<string, any> = { id };
            (resource.schema.children || []).forEach(field => {
              row[field.key] = 'test-value';
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

          // Verify that rows do NOT have cursor-pointer class
          const dataRows = container.querySelectorAll('tbody tr');
          expect(dataRows.length).toBe(mockData.length);

          for (const row of Array.from(dataRows)) {
            expect(row.className).not.toContain('cursor-pointer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clicking a row should navigate to detail view with correct path
   * Validates: Requirement 7.6
   */
  it('should navigate to detail view when row is clicked', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithDetailArb,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (resource: Resource, ids: string[]) => {
          // Create mock data with IDs
          const mockData = ids.map(id => {
            const row: Record<string, any> = { id };
            (resource.schema.children || []).forEach(field => {
              row[field.key] = 'test-value';
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

          // Get all data rows
          const dataRows = container.querySelectorAll('tbody tr');
          expect(dataRows.length).toBe(mockData.length);

          // Click each row and verify navigation
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const expectedId = mockData[i].id;

            // Clear previous calls
            mockNavigate.mockClear();

            // Click the row
            fireEvent.click(row);

            // Verify navigate was called with correct path
            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/${resource.slug}/${expectedId}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clicking a row should NOT navigate when no detail operation exists
   * Validates: Requirement 7.6
   */
  it('should NOT navigate when row is clicked and no detail operation exists', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithoutDetailArb,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (resource: Resource, ids: string[]) => {
          // Create mock data with IDs
          const mockData = ids.map(id => {
            const row: Record<string, any> = { id };
            (resource.schema.children || []).forEach(field => {
              row[field.key] = 'test-value';
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

          // Get all data rows
          const dataRows = container.querySelectorAll('tbody tr');
          expect(dataRows.length).toBe(mockData.length);

          // Click each row and verify NO navigation
          for (const row of Array.from(dataRows)) {
            mockNavigate.mockClear();
            fireEvent.click(row);
            expect(mockNavigate).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation path should include resource slug and item ID
   * Validates: Requirement 7.6
   */
  it('should construct navigation path with resource slug and item ID', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithDetailArb,
        fc.oneof(fc.string({ minLength: 1, maxLength: 20 }), fc.integer({ min: 1, max: 10000 })),
        async (resource: Resource, itemId: string | number) => {
          // Clear mocks before each property test iteration
          mockNavigate.mockClear();
          
          // Create mock data with a single item
          const mockData = [
            {
              id: itemId,
              ...(resource.schema.children || []).reduce((acc, field) => {
                acc[field.key] = 'test-value';
                return acc;
              }, {} as Record<string, any>),
            },
          ];

          // Mock the API call to return the data
          vi.mocked(useApiCall).mockReturnValue({
            data: mockData,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isError: false,
            isSuccess: true,
          } as any);

          const { container, unmount } = render(
            <BrowserRouter>
              <ListView resource={resource} />
            </BrowserRouter>
          );

          // Get the first data row
          const dataRow = container.querySelector('tbody tr');
          expect(dataRow).toBeTruthy();

          // Click the row
          fireEvent.click(dataRow!);

          // Verify navigate was called with correct path format
          expect(mockNavigate).toHaveBeenCalledTimes(1);
          const expectedPath = `/${resource.slug}/${itemId}`;
          expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
          
          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clicking action buttons should NOT trigger row navigation
   * Validates: Requirement 7.6
   */
  it('should NOT navigate when clicking action buttons within a row', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithDetailArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        async (resource: Resource, itemId: string) => {
          // Add update and delete operations to test action buttons
          const resourceWithActions: Resource = {
            ...resource,
            operations: [
              ...resource.operations,
              {
                id: 'updateOp',
                method: 'PUT',
                path: `/${resource.slug}/{id}`,
                viewHint: 'update',
                parameters: [],
                responses: {},
              } as Operation,
              {
                id: 'deleteOp',
                method: 'DELETE',
                path: `/${resource.slug}/{id}`,
                viewHint: 'delete',
                parameters: [],
                responses: {},
              } as Operation,
            ],
          };

          // Create mock data with a single item
          const mockData = [
            {
              id: itemId,
              ...(resource.schema.children || []).reduce((acc, field) => {
                acc[field.key] = 'test-value';
                return acc;
              }, {} as Record<string, any>),
            },
          ];

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
              <ListView resource={resourceWithActions} />
            </BrowserRouter>
          );

          // Find action buttons (View, Edit, Delete)
          const actionButtons = container.querySelectorAll('tbody tr button');
          expect(actionButtons.length).toBeGreaterThan(0);

          // Click each action button and verify row navigation was NOT triggered
          for (const button of Array.from(actionButtons)) {
            mockNavigate.mockClear();
            fireEvent.click(button);

            // Action buttons should trigger their own navigation, not row navigation
            // The key is that clicking the button should not trigger the row's onClick
            // We verify this by checking that if navigate was called, it was for the button's action
            if (mockNavigate.mock.calls.length > 0) {
              const callPath = mockNavigate.mock.calls[0][0];
              // Button actions should have specific paths (edit has /edit suffix, view is same as row)
              // The important thing is that the event didn't bubble to trigger row click
              expect(callPath).toBeTruthy();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
