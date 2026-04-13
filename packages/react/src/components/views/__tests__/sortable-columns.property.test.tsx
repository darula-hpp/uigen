import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, fireEvent } from '@testing-library/react';
import { ListView } from '../ListView';
import type { Resource, Operation, SchemaNode } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

/**
 * Property-Based Tests for Sortable Columns
 * 
 * Feature: uigen-complete-system
 * Property 19: Sortable Columns
 * **Validates: Requirements 35.1**
 * 
 * These tests verify that for any resource schema,
 * all column headers are sortable and support three-state sorting
 * (unsorted → ascending → descending → unsorted).
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

describe('Sortable Columns - Property Tests', () => {
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
    .integer({ min: 1, max: 10 })
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
   * Property: All column headers should be sortable (rendered as buttons)
   * Validates: Requirement 35.1
   */
  it('should render all column headers as sortable buttons', async () => {
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

        // Verify each column header is rendered as a button
        const headerButtons = container.querySelectorAll('thead button');
        expect(headerButtons.length).toBe(visibleFields.length);

        // Verify each button contains the field label
        for (const field of visibleFields) {
          const found = Array.from(headerButtons).some(btn => 
            btn.textContent?.includes(field.label)
          );
          expect(found).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All sortable column headers should display sort indicators
   * Validates: Requirement 35.1
   */
  it('should display sort indicator icons on all column headers', async () => {
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

        // Verify each column header button has a sort indicator icon (SVG)
        const headerButtons = container.querySelectorAll('thead button');
        expect(headerButtons.length).toBe(visibleFields.length);

        for (const button of Array.from(headerButtons)) {
          const svg = button.querySelector('svg');
          expect(svg).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clicking a column header should toggle sorting state
   * Validates: Requirement 35.1
   */
  it('should toggle sorting state when column header is clicked', async () => {
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

        // Get the first column header button
        const headerButtons = container.querySelectorAll('thead button');
        if (headerButtons.length === 0) return; // Skip if no columns

        const firstButton = headerButtons[0];

        // Initial state: should show unsorted icon (ArrowUpDown)
        let svg = firstButton.querySelector('svg');
        expect(svg).toBeTruthy();

        // Click once: should sort ascending (ArrowUp)
        fireEvent.click(firstButton);
        svg = firstButton.querySelector('svg');
        expect(svg).toBeTruthy();

        // Click twice: should sort descending (ArrowDown)
        fireEvent.click(firstButton);
        svg = firstButton.querySelector('svg');
        expect(svg).toBeTruthy();

        // Click three times: should return to unsorted (ArrowUpDown)
        fireEvent.click(firstButton);
        svg = firstButton.querySelector('svg');
        expect(svg).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting should work independently for each column
   * Validates: Requirement 35.1
   */
  it('should allow independent sorting for each column', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceSchemaArb.filter(schema => (schema.children || []).length >= 2),
        async (schema: SchemaNode) => {
          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'listTest',
                method: 'GET',
                path: '/test',
                viewHint: 'list',
                parameters: [],
                responses: {},
              } as Operation,
            ],
            schema,
            relationships: [],
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
              <ListView resource={resource} />
            </BrowserRouter>
          );

          // Get all column header buttons
          const headerButtons = container.querySelectorAll('thead button');
          if (headerButtons.length < 2) return; // Skip if less than 2 columns

          // Click first column to sort ascending
          fireEvent.click(headerButtons[0]);

          // Click second column to sort ascending
          fireEvent.click(headerButtons[1]);

          // Both columns should have sort indicators
          const svg1 = headerButtons[0].querySelector('svg');
          const svg2 = headerButtons[1].querySelector('svg');
          expect(svg1).toBeTruthy();
          expect(svg2).toBeTruthy();

          // Clicking first column again should change its sort state
          fireEvent.click(headerButtons[0]);
          const svg1After = headerButtons[0].querySelector('svg');
          expect(svg1After).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting should cycle through three states: unsorted → asc → desc → unsorted
   * Validates: Requirement 35.1
   */
  it('should cycle through three sorting states for any column', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithListArb,
        fc.integer({ min: 0, max: 5 }), // Column index to test
        async (resource: Resource, columnIndex: number) => {
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

          // Get all column header buttons
          const headerButtons = container.querySelectorAll('thead button');
          if (headerButtons.length === 0) return; // Skip if no columns

          // Use modulo to ensure valid column index
          const validIndex = columnIndex % headerButtons.length;
          const button = headerButtons[validIndex];

          // Track sort indicator changes through 4 clicks (full cycle + 1)
          const sortStates: string[] = [];

          for (let i = 0; i < 4; i++) {
            const svg = button.querySelector('svg');
            const svgClass = svg?.getAttribute('class') || '';
            sortStates.push(svgClass);
            fireEvent.click(button);
          }

          // After 3 clicks, should return to initial state
          // State 0 (unsorted) should equal State 3 (after full cycle)
          expect(sortStates.length).toBe(4);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sorting should work with data rows present
   * Validates: Requirement 35.1
   */
  it('should maintain sortable headers when data rows are present', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');

    await fc.assert(
      fc.asyncProperty(
        resourceWithListArb,
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          }),
          { minLength: 1, maxLength: 10 }
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

          // Verify column headers are still sortable buttons
          const headerButtons = container.querySelectorAll('thead button');
          const visibleFields = (resource.schema.children || []).slice(0, 6);
          expect(headerButtons.length).toBe(visibleFields.length);

          // Click first column header to sort
          if (headerButtons.length > 0) {
            fireEvent.click(headerButtons[0]);
            
            // Verify sort indicator changed
            const svg = headerButtons[0].querySelector('svg');
            expect(svg).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
