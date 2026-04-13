import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { FormView } from '../FormView';
import type { Resource, Operation, SchemaNode } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Property-Based Tests for Form Field Generation Completeness
 * 
 * Feature: uigen-complete-system
 * Property 10: Form Field Generation Completeness
 * **Validates: Requirements 9.2, 72.1**
 * 
 * These tests verify that for any resource with a create or update operation,
 * the form renders input fields for all non-readOnly fields in the requestBody schema.
 */

// Mock the useApiMutation and useApiCall hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
}));

describe('Form Field Generation - Property Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  /**
   * Arbitrary for generating field types
   */
  const fieldTypeArb = fc.constantFrom<'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'date'>(
    'string',
    'number',
    'integer',
    'boolean',
    'enum',
    'date'
  );

  /**
   * Arbitrary for generating schema fields
   */
  const schemaFieldArb = fc.record({
    type: fieldTypeArb,
    key: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
    label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z]/.test(s)),
    required: fc.boolean(),
    readOnly: fc.boolean(),
    enumValues: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 })),
  });

  /**
   * Arbitrary for generating request body schemas
   */
  const requestBodySchemaArb = fc
    .integer({ min: 1, max: 10 })
    .chain(fieldCount =>
      fc
        .array(schemaFieldArb, { minLength: fieldCount, maxLength: fieldCount })
        .map(fields => {
          // Ensure unique keys and labels
          const uniqueFields = fields.map((field, idx) => ({
            ...field,
            label: `${field.label}_${idx}`,
            key: `${field.key}_${idx}`,
            enumValues: field.type === 'enum' ? field.enumValues || ['option1', 'option2'] : undefined,
          }));
          return {
            type: 'object' as const,
            key: 'requestBody',
            label: 'Request Body',
            required: false,
            children: uniqueFields,
          };
        })
    );

  /**
   * Arbitrary for generating create operations
   */
  const createOperationArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 30 }),
    method: fc.constant<'POST'>('POST'),
    path: fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s}`),
    viewHint: fc.constant<'create'>('create'),
    parameters: fc.constant([]),
    responses: fc.constant({}),
    requestBody: requestBodySchemaArb,
  });

  /**
   * Arbitrary for generating resources with create operations
   */
  const resourceWithCreateArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }),
    slug: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z0-9-]+$/.test(s)),
    operations: createOperationArb.map(op => [op]),
    schema: requestBodySchemaArb,
    relationships: fc.constant([]),
  });

  /**
   * Property: Form should render fields for all non-readOnly fields
   * Validates: Requirements 9.2, 72.1
   */
  it('should render input fields for all non-readOnly fields in requestBody schema', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Filter out readOnly fields
        const editableFields = allFields.filter(field => !(field as any).readOnly);

        // Verify that each editable field has a corresponding input
        for (const field of editableFields) {
          const label = container.querySelector(`label[for="${field.key}"]`);
          expect(label).toBeTruthy();
          expect(label?.textContent).toContain(field.label);

          // Check for input element (could be input, select, or textarea)
          const input = container.querySelector(`#${field.key}`);
          expect(input).toBeTruthy();
        }

        // Verify that readOnly fields are NOT rendered
        const readOnlyFields = allFields.filter(field => (field as any).readOnly);
        for (const field of readOnlyFields) {
          const input = container.querySelector(`#${field.key}`);
          expect(input).toBeFalsy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Number of rendered fields should match number of non-readOnly fields
   * Validates: Requirements 9.2, 72.1
   */
  it('should render exactly the number of non-readOnly fields', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Count non-readOnly fields
        const editableFieldCount = allFields.filter(field => !(field as any).readOnly).length;

        // Count rendered labels (one per field)
        const labels = container.querySelectorAll('form label');
        expect(labels.length).toBe(editableFieldCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Required fields should display asterisk indicator
   * Validates: Requirement 9.2
   */
  it('should display asterisk for required fields', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Check required fields
        const requiredFields = allFields.filter(field => field.required && !(field as any).readOnly);
        for (const field of requiredFields) {
          const label = container.querySelector(`label[for="${field.key}"]`);
          expect(label?.textContent).toContain('*');
        }

        // Check optional fields don't have asterisk indicator
        const optionalFields = allFields.filter(field => !field.required && !(field as any).readOnly);
        for (const field of optionalFields) {
          const label = container.querySelector(`label[for="${field.key}"]`);
          // Label should exist but the required indicator span should not
          if (label) {
            const requiredSpan = label.querySelector('span.text-destructive');
            expect(requiredSpan).toBeFalsy();
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Enum fields should render as select dropdowns
   * Validates: Requirement 9.2
   */
  it('should render enum fields as select dropdowns with all options', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Check enum fields
        const enumFields = allFields.filter(field => field.type === 'enum' && !(field as any).readOnly);
        for (const field of enumFields) {
          const select = container.querySelector(`select#${field.key}`);
          expect(select).toBeTruthy();

          // Verify all enum values are present as options
          const options = select?.querySelectorAll('option');
          const enumValues = field.enumValues || [];
          
          // Should have placeholder option + enum values
          expect(options?.length).toBeGreaterThanOrEqual(enumValues.length);

          // Check each enum value is present
          for (const value of enumValues) {
            const optionExists = Array.from(options || []).some(
              opt => opt.getAttribute('value') === value
            );
            expect(optionExists).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Boolean fields should render as checkboxes
   * Validates: Requirement 9.2
   */
  it('should render boolean fields as checkboxes', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Check boolean fields
        const booleanFields = allFields.filter(field => field.type === 'boolean' && !(field as any).readOnly);
        for (const field of booleanFields) {
          const checkbox = container.querySelector(`input[type="checkbox"]#${field.key}`);
          expect(checkbox).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Number fields should render as number inputs
   * Validates: Requirement 9.2
   */
  it('should render number and integer fields as number inputs', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Check number fields
        const numberFields = allFields.filter(
          field => (field.type === 'number' || field.type === 'integer') && !(field as any).readOnly
        );
        for (const field of numberFields) {
          const input = container.querySelector(`input[type="number"]#${field.key}`);
          expect(input).toBeTruthy();

          // Integer fields should have step="1"
          if (field.type === 'integer') {
            expect(input?.getAttribute('step')).toBe('1');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Date fields should render as date inputs
   * Validates: Requirement 9.2
   */
  it('should render date fields as date inputs', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        const operation = resource.operations[0];
        const requestBody = operation.requestBody!;
        const allFields = requestBody.children || [];
        
        // Check date fields
        const dateFields = allFields.filter(field => field.type === 'date' && !(field as any).readOnly);
        for (const field of dateFields) {
          const input = container.querySelector(`input[type="date"]#${field.key}`);
          expect(input).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Form should have submit and cancel buttons
   * Validates: Requirement 9.2
   */
  it('should render submit and cancel buttons for any form', async () => {
    await fc.assert(
      fc.asyncProperty(resourceWithCreateArb, async (resource: Resource) => {
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <FormView resource={resource} mode="create" />
            </BrowserRouter>
          </QueryClientProvider>
        );

        // Check for submit button
        const submitButton = Array.from(container.querySelectorAll('button')).find(
          btn => btn.getAttribute('type') === 'submit'
        );
        expect(submitButton).toBeTruthy();
        expect(submitButton?.textContent).toContain('Create');

        // Check for cancel button
        const cancelButton = Array.from(container.querySelectorAll('button')).find(
          btn => btn.textContent?.includes('Cancel')
        );
        expect(cancelButton).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });
});
