import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { FormView } from '../FormView';
import type { Resource, Operation, SchemaNode, ValidationRule } from '@uigen/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Property-Based Tests for Validation Rule Application
 * 
 * Feature: uigen-complete-system
 * Property 11: Validation Rule Application
 * **Validates: Requirements 9.3, 34.1-34.9**
 * 
 * These tests verify that for any field with validation rules,
 * the form correctly applies and validates those rules.
 */

// Mock the useApiMutation and useApiCall hooks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

describe('Validation Rule Application - Property Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  /**
   * Property: Required fields should prevent submission when empty
   * Validates: Requirement 34.1
   */
  it('should validate required fields and prevent submission when empty', { timeout: 10000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && s !== '__proto__' && s !== 'constructor' && s !== 'prototype'),
        fc.string({ minLength: 3, maxLength: 30 }),
        async (fieldKey: string, fieldLabel: string) => {
          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: fieldKey,
                      label: fieldLabel,
                      required: true, // Required field
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Find and click submit button without filling the required field
          const submitButton = container.querySelector('button[type="submit"]');
          expect(submitButton).toBeTruthy();

          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Check that mutation was NOT called (form should be invalid)
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: minLength validation should reject strings shorter than minimum
   * Validates: Requirement 34.2
   */
  it('should validate minLength constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }),
        fc.string({ minLength: 1, maxLength: 2 }), // String shorter than minLength
        async (minLength: number, shortString: string) => {
          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: 'testField',
                      label: 'Test Field',
                      required: true,
                      validations: [
                        {
                          type: 'minLength',
                          value: minLength,
                          message: `Minimum length is ${minLength}`,
                        },
                      ],
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with string shorter than minLength
          const input = container.querySelector('input#testField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: shortString } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Should not call mutation with invalid data
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: maxLength validation should reject strings longer than maximum
   * Validates: Requirement 34.3
   */
  it('should validate maxLength constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }),
        async (maxLength: number) => {
          // Create a string longer than maxLength
          const longString = 'a'.repeat(maxLength + 5);

          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: 'testField',
                      label: 'Test Field',
                      required: true,
                      validations: [
                        {
                          type: 'maxLength',
                          value: maxLength,
                          message: `Maximum length is ${maxLength}`,
                        },
                      ],
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with string longer than maxLength
          const input = container.querySelector('input#testField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: longString } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Should not call mutation with invalid data
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: minimum validation should reject numbers below minimum
   * Validates: Requirement 34.5
   */
  it('should validate minimum constraint for numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 1, max: 9 }), // Number below minimum
        async (minimum: number, belowMin: number) => {
          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'number',
                      key: 'testField',
                      label: 'Test Field',
                      required: true,
                      validations: [
                        {
                          type: 'minimum',
                          value: minimum,
                          message: `Minimum value is ${minimum}`,
                        },
                      ],
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with number below minimum
          const input = container.querySelector('input#testField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: belowMin.toString() } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Should not call mutation with invalid data
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: maximum validation should reject numbers above maximum
   * Validates: Requirement 34.6
   */
  it('should validate maximum constraint for numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        async (maximum: number) => {
          const aboveMax = maximum + 10;

          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'number',
                      key: 'testField',
                      label: 'Test Field',
                      required: true,
                      validations: [
                        {
                          type: 'maximum',
                          value: maximum,
                          message: `Maximum value is ${maximum}`,
                        },
                      ],
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with number above maximum
          const input = container.querySelector('input#testField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: aboveMax.toString() } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Should not call mutation with invalid data
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: email validation should reject invalid email formats
   * Validates: Requirement 34.9
   */
  it('should validate email format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@')), // Invalid email
        async (invalidEmail: string) => {
          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: 'emailField',
                      label: 'Email Field',
                      required: true,
                      format: 'email',
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with invalid email
          const input = container.querySelector('input#emailField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: invalidEmail } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for validation
          await waitFor(() => {
            // Should not call mutation with invalid data
            expect(mockMutateAsync).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Valid data should pass all validations and allow submission
   * Validates: Requirements 9.3, 34.1-34.9
   */
  it('should allow submission when all validation rules pass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }),
        async (minLength: number) => {
          // Create a valid string that meets minLength
          const validString = 'a'.repeat(minLength + 2);

          const resource: Resource = {
            name: 'TestResource',
            slug: 'test-resource',
            operations: [
              {
                id: 'createTest',
                method: 'POST',
                path: '/test',
                viewHint: 'create',
                parameters: [],
                responses: {},
                requestBody: {
                  type: 'object',
                  key: 'requestBody',
                  label: 'Request Body',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: 'testField',
                      label: 'Test Field',
                      required: true,
                      validations: [
                        {
                          type: 'minLength',
                          value: minLength,
                          message: `Minimum length is ${minLength}`,
                        },
                      ],
                    },
                  ],
                },
              } as Operation,
            ],
            schema: {
              type: 'object',
              key: 'resource',
              label: 'Resource',
              required: false,
              children: [],
            },
            relationships: [],
          };

          mockMutateAsync.mockResolvedValue({});

          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <FormView resource={resource} mode="create" />
              </BrowserRouter>
            </QueryClientProvider>
          );

          // Fill field with valid string
          const input = container.querySelector('input#testField') as HTMLInputElement;
          expect(input).toBeTruthy();

          fireEvent.change(input, { target: { value: validString } });
          fireEvent.blur(input);

          // Submit form
          const submitButton = container.querySelector('button[type="submit"]');
          fireEvent.click(submitButton!);

          // Wait for submission
          await waitFor(() => {
            // Should call mutation with valid data
            expect(mockMutateAsync).toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
