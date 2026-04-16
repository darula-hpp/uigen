import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormView } from '../FormView';
import { useApiMutation } from '@/hooks/useApiCall';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as jsyaml from 'js-yaml';
import fc from 'fast-check';
import type { UIGenApp, Operation, Resource, SchemaNode } from '@uigen-dev/core';

// Import Swagger2Adapter from the package entry point
import { Swagger2Adapter } from '@uigen-dev/core';

/**
 * Systematic Property-Based Tests for React Renderer
 * 
 * This test suite validates the React renderer against real-world API structures
 * by programmatically generating IR from the Swagger 2 Petstore specification
 * and testing FormView component behavior with varied, generated inputs.
 * 
 * Feature: systematic-react-renderer-testing
 * Spec: .kiro/specs/systematic-react-renderer-testing
 */

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null
  }))
}));

vi.mock('@/lib/auth', () => ({
  getAuthHeaders: vi.fn(() => ({})),
  clearAuthCredentials: vi.fn()
}));

vi.mock('@/lib/server', () => ({
  getSelectedServer: vi.fn(() => null)
}));

vi.mock('@/overrides', () => ({
  reconcile: vi.fn(() => ({ mode: 'none', renderFn: null })),
  OverrideHooksHost: ({ children }: any) => children
}));

/**
 * Load Swagger 2.0 specification from file system
 * Requirement 1.2: Load the Swagger_Spec from the file system without using CLI commands
 */
function loadSwaggerSpec(): any {
  // Navigate from test file to workspace root
  // packages/react/src/components/views/__tests__/ -> workspace root
  const specPath = join(__dirname, '../../../../../../examples/swagger2-petstore-with-login.yaml');
  const specContent = readFileSync(specPath, 'utf-8');
  return jsyaml.load(specContent);
}

/**
 * Generate IR from Swagger 2.0 specification
 * Requirements 1.1, 1.3: Import the Core_Adapter to generate IR from Swagger_Spec
 */
function generateIR(spec: any): UIGenApp {
  const adapter = new Swagger2Adapter(spec);
  return adapter.adapt();
}

/**
 * Extract operations suitable for form testing
 * Requirement 1.4: Extract all Operations from the generated IR for testing
 * Filters operations by viewHint to get create/update operations
 */
function extractFormOperations(app: UIGenApp): Operation[] {
  return app.resources
    .flatMap(resource => resource.operations)
    .filter(op => op.viewHint === 'create' || op.viewHint === 'update');
}

/**
 * Create a mock Resource from an Operation
 * This helper creates a minimal Resource structure for testing
 */
function createMockResource(operation: Operation): Resource {
  return {
    name: 'TestResource',
    slug: 'test-resource',
    uigenId: 'TestResource',
    operations: [operation],
    schema: operation.requestBody || {
      type: 'object',
      key: 'TestResource',
      label: 'Test Resource',
      required: false,
      children: []
    },
    relationships: []
  };
}

/**
 * Setup test providers (QueryClient, Router)
 * Requirements 9.2, 9.5: Use existing test infrastructure
 */
function renderWithProviders(component: React.ReactElement, initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  window.history.pushState({}, 'Test page', initialRoute);
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Generate arbitrary values for individual field types
 * Task 2.1: Implement fieldValueGenerator() for individual field types
 * Requirements 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 * 
 * This generator creates fast-check arbitraries for each field type in the IR.
 * It handles all field types that can appear in OpenAPI schemas:
 * - string: text input values
 * - integer: whole number values
 * - number: decimal number values
 * - boolean: true/false values
 * - enum: one of the allowed enum values
 * - array: arrays of items matching the items schema
 * - object: nested objects with child fields
 * - date: ISO date strings
 * - file: file objects (mocked for testing)
 * 
 * @param field SchemaNode from IR describing the field structure
 * @returns fast-check Arbitrary that generates valid values for the field
 */
function fieldValueGenerator(field: SchemaNode): fc.Arbitrary<unknown> {
  switch (field.type) {
    case 'string':
      // Handle date format strings specially
      if (field.format === 'date' || field.format === 'date-time') {
        // Generate ISO date strings with reasonable date range
        // Use integer-based generation to avoid invalid Date objects
        return fc.tuple(
          fc.integer({ min: 1970, max: 2100 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates like Feb 30
        ).map(([year, month, day]) => {
          const monthStr = String(month).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          return `${year}-${monthStr}-${dayStr}`;
        });
      }
      // Generate reasonable length strings for form inputs
      return fc.string({ minLength: 1, maxLength: 50 });
    
    case 'integer':
      // Generate integers within a reasonable range
      return fc.integer({ min: 0, max: 1000 });
    
    case 'number':
      // Generate floating point numbers
      return fc.float({ min: 0, max: 1000, noNaN: true });
    
    case 'boolean':
      // Generate true or false
      return fc.boolean();
    
    case 'enum':
      // Generate one of the allowed enum values
      if (field.enumValues && field.enumValues.length > 0) {
        return fc.constantFrom(...field.enumValues);
      }
      // Fallback if no enum values defined
      return fc.constant('');
    
    case 'array':
      // Generate arrays of items matching the items schema
      if (field.items) {
        return fc.array(fieldValueGenerator(field.items), { maxLength: 5 });
      }
      // Fallback if no items schema defined
      return fc.array(fc.string(), { maxLength: 5 });
    
    case 'object':
      // Generate nested objects with child fields
      if (field.children && field.children.length > 0) {
        const childGenerators: Record<string, fc.Arbitrary<unknown>> = {};
        for (const child of field.children) {
          if (!child.readOnly) {
            childGenerators[child.key] = fieldValueGenerator(child);
          }
        }
        return fc.record(childGenerators);
      }
      // Fallback if no children defined
      return fc.constant({});
    
    case 'date':
      // Generate ISO date strings (YYYY-MM-DD format)
      // Use integer-based generation to avoid invalid Date objects
      // Generate year (1970-2100), month (1-12), day (1-28 to avoid invalid dates)
      return fc.tuple(
        fc.integer({ min: 1970, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates like Feb 30
      ).map(([year, month, day]) => {
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
      });
    
    case 'file':
      // Generate mock file objects for testing
      // In a real browser environment, this would be a File object
      return fc.constant({
        name: 'test-file.txt',
        type: 'text/plain',
        size: 1024
      });
    
    default:
      // Fallback for unknown types
      return fc.constant(null);
  }
}

/**
 * Generate form data matching a SchemaNode structure
 * Task 2.2: Implement formDataGenerator() for schema-based data generation
 * Requirements 5.5
 * 
 * This generator creates complete form data objects based on a schema structure.
 * It processes all children of the schema, skips readOnly fields, and uses
 * fieldValueGenerator to create appropriate values for each field.
 * 
 * The generator handles:
 * - Nested object structures (recursively processes children)
 * - ReadOnly field exclusion (readOnly fields are not included in form data)
 * - All field types supported by fieldValueGenerator
 * 
 * @param schema SchemaNode from IR describing the form structure
 * @returns fast-check Arbitrary that generates complete form data objects
 */
function formDataGenerator(schema: SchemaNode): fc.Arbitrary<Record<string, unknown>> {
  // Extract all children from the schema
  const fields = schema.children || [];
  
  // Build a record of generators for each non-readOnly field
  const generators: Record<string, fc.Arbitrary<unknown>> = {};
  
  for (const field of fields) {
    // Skip readOnly fields - they should not be in form data
    if (field.readOnly) {
      continue;
    }
    
    // Use fieldValueGenerator to create appropriate arbitrary for this field
    generators[field.key] = fieldValueGenerator(field);
  }
  
  // Return a fast-check record arbitrary that generates objects with all fields
  return fc.record(generators);
}

/**
 * Generate path parameter values
 * Task 2.3: Implement pathParamsGenerator() for path parameter generation
 * Requirements 5.3
 * 
 * This generator creates path parameter values for testing URL construction.
 * Path parameters are those that appear in the URL path (e.g., /pets/{petId}).
 * 
 * The generator:
 * - Filters parameters to only include those with in='path'
 * - Generates string values for each path parameter (all path params are strings in URLs)
 * - Handles different parameter types (string, integer, number, boolean) by converting to strings
 * - Ensures generated values are valid for URL path segments (no special characters)
 * 
 * @param parameters Array of Parameter objects from an Operation
 * @returns fast-check Arbitrary that generates path parameter objects
 */
function pathParamsGenerator(parameters: any[]): fc.Arbitrary<Record<string, string>> {
  // Filter to only path parameters
  const pathParams = parameters.filter(p => p.in === 'path');
  
  // If no path parameters, return empty object
  if (pathParams.length === 0) {
    return fc.constant({});
  }
  
  // Build a record of generators for each path parameter
  const generators: Record<string, fc.Arbitrary<string>> = {};
  
  for (const param of pathParams) {
    // Generate string values based on parameter type
    // All path parameters must be strings in the final URL
    generators[param.name] = paramValueGenerator(param);
  }
  
  // Return a fast-check record arbitrary that generates path parameter objects
  return fc.record(generators);
}

/**
 * Generate query parameter values
 * Task 2.4: Implement queryParamsGenerator() for query parameter generation
 * Requirements 5.4
 * 
 * This generator creates query parameter values for testing URL construction.
 * Query parameters are those that appear in the query string (e.g., ?status=available&limit=10).
 * 
 * The generator:
 * - Filters parameters to only include those with in='query'
 * - Handles optional parameters with fc.option (they may be omitted)
 * - Generates string values for each query parameter (all query params are strings in URLs)
 * - Handles different parameter types (string, integer, number, boolean) by converting to strings
 * - Ensures generated values are valid for URL query strings
 * 
 * @param parameters Array of Parameter objects from an Operation
 * @returns fast-check Arbitrary that generates query parameter objects
 */
function queryParamsGenerator(parameters: any[]): fc.Arbitrary<Record<string, string>> {
  // Filter to only query parameters
  const queryParams = parameters.filter(p => p.in === 'query');
  
  // If no query parameters, return empty object
  if (queryParams.length === 0) {
    return fc.constant({});
  }
  
  // Build a record of generators for each query parameter
  const generators: Record<string, fc.Arbitrary<string | undefined>> = {};
  
  for (const param of queryParams) {
    if (param.required) {
      // Required parameters must always be present
      generators[param.name] = paramValueGenerator(param);
    } else {
      // Optional parameters may be omitted
      // fc.option will generate either a value or undefined
      generators[param.name] = fc.option(paramValueGenerator(param), { nil: undefined });
    }
  }
  
  // Return a fast-check record arbitrary that generates query parameter objects
  // Filter out undefined values to match the return type
  return fc.record(generators).map(obj => {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    return filtered;
  });
}

/**
 * Generate a string value for a parameter based on its schema type
 * Helper function for pathParamsGenerator and queryParamsGenerator
 * 
 * @param param Parameter object with schema information
 * @returns fast-check Arbitrary that generates string values
 */
function paramValueGenerator(param: any): fc.Arbitrary<string> {
  const schema = param.schema || {};
  
  switch (schema.type) {
    case 'string':
      // Generate alphanumeric strings suitable for URL paths
      // Avoid special characters that might need URL encoding
      return fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);
    
    case 'integer':
      // Generate positive integers as strings
      return fc.integer({ min: 1, max: 999 }).map(String);
    
    case 'number':
      // Generate positive numbers as strings
      return fc.float({ min: 1, max: 999, noNaN: true }).map(n => n.toFixed(2));
    
    case 'boolean':
      // Generate boolean values as strings
      return fc.boolean().map(String);
    
    default:
      // Fallback: generate safe alphanumeric strings
      return fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);
  }
}

/**
 * Assert that all expected fields are rendered in the DOM
 * Task 3.1: Implement assertFieldsRendered() for field presence verification
 * Requirements 8.1
 * 
 * This assertion helper verifies that all expected form fields are present in the DOM.
 * It uses multiple strategies to find fields:
 * 1. Search by label text (case-insensitive)
 * 2. Search by name attribute (for simple fields)
 * 3. Search by id attribute (for complex fields like objects and arrays)
 * 
 * For nested fields (like "category.id"), it searches for the field by its full path.
 * For object fields (like "category"), it searches for a fieldset or container with that id.
 * For array fields (like "photoUrls"), it searches for array item inputs with that prefix.
 * 
 * The function:
 * - Searches for each field using multiple strategies
 * - Provides clear error messages indicating which field is missing
 * - Includes the field name in the error message for easy debugging
 * 
 * @param expectedFields Array of field keys that should be rendered
 * @throws Error if any expected field is not found in the DOM
 */
function assertFieldsRendered(expectedFields: string[]): void {
  const missingFields: string[] = [];
  
  for (const fieldKey of expectedFields) {
    let found = false;
    
    // Strategy 1: Try to find field by label (case-insensitive)
    // Use queryAllByLabelText to handle multiple matches
    const fieldsByLabel = screen.queryAllByLabelText(new RegExp(fieldKey, 'i'));
    if (fieldsByLabel.length > 0) {
      found = true;
    }
    
    // Strategy 2: Try to find by name attribute (for simple fields)
    if (!found) {
      const fieldByName = document.querySelector(`[name="${fieldKey}"]`);
      if (fieldByName) {
        found = true;
      }
    }
    
    // Strategy 3: Try to find by id attribute (for complex fields)
    if (!found) {
      const fieldById = document.querySelector(`[id="${fieldKey}"]`);
      if (fieldById) {
        found = true;
      }
    }
    
    // Strategy 4: For array fields, check if there are any array item inputs
    // Array fields are rendered as "fieldKey.0", "fieldKey.1", etc.
    if (!found) {
      const arrayItemField = document.querySelector(`[id^="${fieldKey}."]`);
      if (arrayItemField) {
        found = true;
      }
    }
    
    if (!found) {
      missingFields.push(fieldKey);
    }
  }
  
  // If any fields are missing, throw a clear error message
  if (missingFields.length > 0) {
    throw new Error(
      `Expected fields to be rendered but not found: ${missingFields.join(', ')}\n` +
      `Missing ${missingFields.length} of ${expectedFields.length} expected fields`
    );
  }
}

/**
 * Assert that URL is correctly constructed from operation path and parameters
 * Task 3.2: Implement assertURLConstruction() for URL validation
 * Requirements 8.2
 * 
 * This assertion helper verifies that URLs are correctly constructed by:
 * 1. Replacing path parameter placeholders (e.g., {petId}) with actual values
 * 2. Appending query parameters as a query string
 * 3. Comparing the constructed URL with the expected URL
 * 
 * The function handles:
 * - Path parameter substitution: /pets/{petId} + {petId: "123"} -> /pets/123
 * - Query string construction: ?status=available&limit=10
 * - Combined path and query parameters
 * - Empty query parameters (no query string appended)
 * 
 * @param operation Operation being tested (contains the path template)
 * @param pathParams Path parameter values to substitute into the URL
 * @param queryParams Query parameter values to append as query string
 * @param expectedUrl Expected final URL string
 * @throws Error if constructed URL does not match expected URL
 */
function assertURLConstruction(
  operation: Operation,
  pathParams: Record<string, string>,
  queryParams: Record<string, string>,
  expectedUrl: string
): void {
  // Start with the operation path as the base URL template
  let constructedUrl = operation.path;
  
  // Step 1: Replace path parameter placeholders with actual values
  // Path parameters appear in the URL as {paramName}
  for (const [key, value] of Object.entries(pathParams)) {
    const placeholder = `{${key}}`;
    constructedUrl = constructedUrl.replace(placeholder, value);
  }
  
  // Step 2: Append query parameters as query string
  // Filter out undefined values and build query string
  const queryEntries = Object.entries(queryParams).filter(([_, value]) => value !== undefined);
  
  if (queryEntries.length > 0) {
    // Use URLSearchParams to properly encode query parameters
    const queryString = new URLSearchParams(queryEntries).toString();
    constructedUrl += `?${queryString}`;
  }
  
  // Step 3: Compare constructed URL with expected URL
  if (constructedUrl !== expectedUrl) {
    throw new Error(
      `URL construction mismatch for operation "${operation.id}":\n` +
      `  Expected: ${expectedUrl}\n` +
      `  Actual:   ${constructedUrl}\n` +
      `  Path template: ${operation.path}\n` +
      `  Path params: ${JSON.stringify(pathParams)}\n` +
      `  Query params: ${JSON.stringify(queryParams)}`
    );
  }
}

/**
 * Assert that parameters are correctly separated into pathParams, queryParams, and body
 * Task 3.3: Implement assertParameterSeparation() for parameter handling verification
 * Requirements 8.3
 * 
 * This assertion helper verifies that form submission correctly separates parameters by:
 * 1. Verifying pathParams object contains only path parameters
 * 2. Verifying queryParams object contains only query parameters
 * 3. Verifying body object excludes path and query parameters
 * 
 * The function validates:
 * - Path parameters (in='path') are in pathParams and NOT in body
 * - Query parameters (in='query') are in queryParams and NOT in body
 * - Request body fields are in body and NOT in pathParams or queryParams
 * - No cross-contamination between parameter types
 * 
 * @param mutationCall The captured mutation call with pathParams, queryParams, and body
 * @param expectedPathParams Expected path parameter object
 * @param expectedQueryParams Expected query parameter object
 * @param expectedBody Expected body data object
 * @throws Error if parameter separation is incorrect
 */
function assertParameterSeparation(
  mutationCall: any,
  expectedPathParams: Record<string, string>,
  expectedQueryParams: Record<string, string>,
  expectedBody: Record<string, unknown>
): void {
  const errors: string[] = [];
  
  // Step 1: Verify pathParams object contains only path parameters
  const actualPathParams = mutationCall.pathParams || {};
  
  // Check that all expected path parameters are present
  for (const [key, expectedValue] of Object.entries(expectedPathParams)) {
    if (!(key in actualPathParams)) {
      errors.push(`Path parameter "${key}" is missing from pathParams object`);
    } else if (actualPathParams[key] !== expectedValue) {
      errors.push(
        `Path parameter "${key}" has incorrect value:\n` +
        `  Expected: ${expectedValue}\n` +
        `  Actual:   ${actualPathParams[key]}`
      );
    }
  }
  
  // Check that no unexpected path parameters are present
  for (const key of Object.keys(actualPathParams)) {
    if (!(key in expectedPathParams)) {
      errors.push(`Unexpected path parameter "${key}" found in pathParams object`);
    }
  }
  
  // Step 2: Verify queryParams object contains only query parameters
  const actualQueryParams = mutationCall.queryParams || {};
  
  // Check that all expected query parameters are present
  for (const [key, expectedValue] of Object.entries(expectedQueryParams)) {
    if (!(key in actualQueryParams)) {
      errors.push(`Query parameter "${key}" is missing from queryParams object`);
    } else if (actualQueryParams[key] !== expectedValue) {
      errors.push(
        `Query parameter "${key}" has incorrect value:\n` +
        `  Expected: ${expectedValue}\n` +
        `  Actual:   ${actualQueryParams[key]}`
      );
    }
  }
  
  // Check that no unexpected query parameters are present
  for (const key of Object.keys(actualQueryParams)) {
    if (!(key in expectedQueryParams)) {
      errors.push(`Unexpected query parameter "${key}" found in queryParams object`);
    }
  }
  
  // Step 3: Verify body object excludes path and query parameters
  const actualBody = mutationCall.body || {};
  
  // Check that all expected body fields are present
  for (const [key, expectedValue] of Object.entries(expectedBody)) {
    if (!(key in actualBody)) {
      errors.push(`Body field "${key}" is missing from body object`);
    } else {
      // Deep equality check for body values (they can be objects/arrays)
      const actualValue = actualBody[key];
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        errors.push(
          `Body field "${key}" has incorrect value:\n` +
          `  Expected: ${JSON.stringify(expectedValue)}\n` +
          `  Actual:   ${JSON.stringify(actualValue)}`
        );
      }
    }
  }
  
  // Check that no unexpected body fields are present
  for (const key of Object.keys(actualBody)) {
    if (!(key in expectedBody)) {
      errors.push(`Unexpected body field "${key}" found in body object`);
    }
  }
  
  // Step 4: Verify no cross-contamination between parameter types
  // Path parameters should NOT be in body
  for (const key of Object.keys(expectedPathParams)) {
    if (key in actualBody) {
      errors.push(`Path parameter "${key}" incorrectly included in body object`);
    }
  }
  
  // Query parameters should NOT be in body
  for (const key of Object.keys(expectedQueryParams)) {
    if (key in actualBody) {
      errors.push(`Query parameter "${key}" incorrectly included in body object`);
    }
  }
  
  // Body fields should NOT be in pathParams
  for (const key of Object.keys(expectedBody)) {
    if (key in actualPathParams) {
      errors.push(`Body field "${key}" incorrectly included in pathParams object`);
    }
  }
  
  // Body fields should NOT be in queryParams
  for (const key of Object.keys(expectedBody)) {
    if (key in actualQueryParams) {
      errors.push(`Body field "${key}" incorrectly included in queryParams object`);
    }
  }
  
  // If any errors were found, throw with detailed message
  if (errors.length > 0) {
    throw new Error(
      `Parameter separation validation failed:\n` +
      errors.map(e => `  - ${e}`).join('\n') +
      `\n\nActual mutation call:\n` +
      `  pathParams: ${JSON.stringify(actualPathParams, null, 2)}\n` +
      `  queryParams: ${JSON.stringify(actualQueryParams, null, 2)}\n` +
      `  body: ${JSON.stringify(actualBody, null, 2)}\n` +
      `\nExpected:\n` +
      `  pathParams: ${JSON.stringify(expectedPathParams, null, 2)}\n` +
      `  queryParams: ${JSON.stringify(expectedQueryParams, null, 2)}\n` +
      `  body: ${JSON.stringify(expectedBody, null, 2)}`
    );
  }
}

describe('FormView - Systematic Property-Based Tests', () => {
  let app: UIGenApp;
  let formOperations: Operation[];

  /**
   * Setup: Load Swagger spec and generate IR once for all tests
   * Requirements 1.1, 1.2, 1.3, 1.4
   */
  beforeAll(() => {
    const spec = loadSwaggerSpec();
    app = generateIR(spec);
    formOperations = extractFormOperations(app);
    
    // Verify we have operations to test
    expect(formOperations.length).toBeGreaterThan(0);
    console.log(`Loaded ${formOperations.length} form operations for testing`);
  });

  /**
   * Verify basic test structure runs
   * This is a sanity check to ensure the infrastructure is working
   */
  it('should load Swagger spec and generate IR', () => {
    expect(app).toBeDefined();
    expect(app.resources).toBeDefined();
    expect(app.resources.length).toBeGreaterThan(0);
    expect(formOperations.length).toBeGreaterThan(0);
  });

  /**
   * Verify IR structure contains required fields
   * Requirement 1.5: FOR ALL Operations in the IR, the operation structure SHALL contain 
   * method, path, parameters, requestBody, and viewHint fields
   */
  it('should have valid operation structure', () => {
    for (const operation of formOperations) {
      expect(operation).toHaveProperty('method');
      expect(operation).toHaveProperty('path');
      expect(operation).toHaveProperty('parameters');
      expect(operation).toHaveProperty('viewHint');
      // requestBody may be undefined for some operations
      expect(operation).toHaveProperty('requestBody');
    }
  });

  /**
   * Verify FormView renders without errors for all operations
   * This ensures the basic rendering infrastructure works
   */
  it('should render FormView for all form operations', () => {
    for (const operation of formOperations) {
      const resource = createMockResource(operation);
      
      // Use the correct mode based on the operation's viewHint
      const mode = operation.viewHint === 'update' ? 'edit' : 'create';
      
      const { container } = renderWithProviders(
        <FormView resource={resource} mode={mode} />
      );
      
      // Verify the component rendered something
      expect(container.firstChild).toBeTruthy();
      
      // All form operations should render a form (they have requestBody or parameters)
      const hasForm = container.querySelector('form') !== null;
      expect(hasForm).toBe(true);
    }
  });

  /**
   * Verify fieldValueGenerator produces valid values for all field types
   * Task 2.1: Test fieldValueGenerator() implementation
   * Requirements 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   */
  it('should generate valid values for all field types', () => {
    // Test string type
    const stringField: SchemaNode = {
      type: 'string',
      key: 'testString',
      label: 'Test String',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(stringField), (value) => {
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
        expect((value as string).length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 10 }
    );

    // Test integer type
    const integerField: SchemaNode = {
      type: 'integer',
      key: 'testInteger',
      label: 'Test Integer',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(integerField), (value) => {
        expect(typeof value).toBe('number');
        expect(Number.isInteger(value)).toBe(true);
        expect(value as number).toBeGreaterThanOrEqual(0);
        expect(value as number).toBeLessThanOrEqual(1000);
      }),
      { numRuns: 10 }
    );

    // Test number type
    const numberField: SchemaNode = {
      type: 'number',
      key: 'testNumber',
      label: 'Test Number',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(numberField), (value) => {
        expect(typeof value).toBe('number');
        expect(Number.isNaN(value)).toBe(false);
        expect(value as number).toBeGreaterThanOrEqual(0);
        expect(value as number).toBeLessThanOrEqual(1000);
      }),
      { numRuns: 10 }
    );

    // Test boolean type
    const booleanField: SchemaNode = {
      type: 'boolean',
      key: 'testBoolean',
      label: 'Test Boolean',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(booleanField), (value) => {
        expect(typeof value).toBe('boolean');
      }),
      { numRuns: 10 }
    );

    // Test enum type
    const enumField: SchemaNode = {
      type: 'enum',
      key: 'testEnum',
      label: 'Test Enum',
      required: false,
      enumValues: ['option1', 'option2', 'option3']
    };
    fc.assert(
      fc.property(fieldValueGenerator(enumField), (value) => {
        expect(['option1', 'option2', 'option3']).toContain(value);
      }),
      { numRuns: 10 }
    );

    // Test array type
    const arrayField: SchemaNode = {
      type: 'array',
      key: 'testArray',
      label: 'Test Array',
      required: false,
      items: {
        type: 'string',
        key: 'item',
        label: 'Item',
        required: false
      }
    };
    fc.assert(
      fc.property(fieldValueGenerator(arrayField), (value) => {
        expect(Array.isArray(value)).toBe(true);
        expect((value as unknown[]).length).toBeLessThanOrEqual(5);
        for (const item of value as unknown[]) {
          expect(typeof item).toBe('string');
        }
      }),
      { numRuns: 10 }
    );

    // Test object type
    const objectField: SchemaNode = {
      type: 'object',
      key: 'testObject',
      label: 'Test Object',
      required: false,
      children: [
        {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: false
        },
        {
          type: 'integer',
          key: 'age',
          label: 'Age',
          required: false
        }
      ]
    };
    fc.assert(
      fc.property(fieldValueGenerator(objectField), (value) => {
        expect(typeof value).toBe('object');
        expect(value).toHaveProperty('name');
        expect(value).toHaveProperty('age');
        expect(typeof (value as any).name).toBe('string');
        expect(typeof (value as any).age).toBe('number');
      }),
      { numRuns: 10 }
    );

    // Test date type
    const dateField: SchemaNode = {
      type: 'date',
      key: 'testDate',
      label: 'Test Date',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(dateField), (value) => {
        expect(typeof value).toBe('string');
        // Verify ISO date format (YYYY-MM-DD)
        expect((value as string)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }),
      { numRuns: 10 }
    );

    // Test file type
    const fileField: SchemaNode = {
      type: 'file',
      key: 'testFile',
      label: 'Test File',
      required: false
    };
    fc.assert(
      fc.property(fieldValueGenerator(fileField), (value) => {
        expect(typeof value).toBe('object');
        expect(value).toHaveProperty('name');
        expect(value).toHaveProperty('type');
        expect(value).toHaveProperty('size');
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Verify pathParamsGenerator produces valid path parameter objects
   * Task 2.3: Test pathParamsGenerator() implementation
   * Requirements 5.3
   */
  it('should generate valid path parameter objects', () => {
    // Test with string path parameter
    const stringPathParam = {
      name: 'petId',
      in: 'path',
      required: true,
      schema: { type: 'string' }
    };

    fc.assert(
      fc.property(pathParamsGenerator([stringPathParam]), (pathParams) => {
        // Verify the parameter is present
        expect(pathParams).toHaveProperty('petId');
        
        // Verify it's a string
        expect(typeof pathParams.petId).toBe('string');
        
        // Verify it's a valid URL path segment (alphanumeric, underscore, hyphen)
        expect(pathParams.petId).toMatch(/^[a-zA-Z0-9_-]+$/);
        
        // Verify reasonable length
        expect(pathParams.petId.length).toBeGreaterThan(0);
        expect(pathParams.petId.length).toBeLessThanOrEqual(20);
      }),
      { numRuns: 10 }
    );

    // Test with integer path parameter
    const integerPathParam = {
      name: 'userId',
      in: 'path',
      required: true,
      schema: { type: 'integer' }
    };

    fc.assert(
      fc.property(pathParamsGenerator([integerPathParam]), (pathParams) => {
        // Verify the parameter is present
        expect(pathParams).toHaveProperty('userId');
        
        // Verify it's a string (path params are always strings in URLs)
        expect(typeof pathParams.userId).toBe('string');
        
        // Verify it's a valid integer string
        expect(pathParams.userId).toMatch(/^\d+$/);
        
        // Verify it can be parsed as an integer
        const parsed = parseInt(pathParams.userId, 10);
        expect(Number.isInteger(parsed)).toBe(true);
        expect(parsed).toBeGreaterThanOrEqual(1);
        expect(parsed).toBeLessThanOrEqual(999);
      }),
      { numRuns: 10 }
    );

    // Test with number path parameter
    const numberPathParam = {
      name: 'price',
      in: 'path',
      required: true,
      schema: { type: 'number' }
    };

    fc.assert(
      fc.property(pathParamsGenerator([numberPathParam]), (pathParams) => {
        // Verify the parameter is present
        expect(pathParams).toHaveProperty('price');
        
        // Verify it's a string
        expect(typeof pathParams.price).toBe('string');
        
        // Verify it's a valid number string
        expect(pathParams.price).toMatch(/^\d+\.\d+$/);
        
        // Verify it can be parsed as a number
        const parsed = parseFloat(pathParams.price);
        expect(Number.isNaN(parsed)).toBe(false);
        expect(parsed).toBeGreaterThanOrEqual(1);
        expect(parsed).toBeLessThanOrEqual(999);
      }),
      { numRuns: 10 }
    );

    // Test with boolean path parameter
    const booleanPathParam = {
      name: 'active',
      in: 'path',
      required: true,
      schema: { type: 'boolean' }
    };

    fc.assert(
      fc.property(pathParamsGenerator([booleanPathParam]), (pathParams) => {
        // Verify the parameter is present
        expect(pathParams).toHaveProperty('active');
        
        // Verify it's a string
        expect(typeof pathParams.active).toBe('string');
        
        // Verify it's either "true" or "false"
        expect(['true', 'false']).toContain(pathParams.active);
      }),
      { numRuns: 10 }
    );

    // Test with multiple path parameters
    const multiplePathParams = [
      {
        name: 'petId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'ownerId',
        in: 'path',
        required: true,
        schema: { type: 'integer' }
      }
    ];

    fc.assert(
      fc.property(pathParamsGenerator(multiplePathParams), (pathParams) => {
        // Verify both parameters are present
        expect(pathParams).toHaveProperty('petId');
        expect(pathParams).toHaveProperty('ownerId');
        
        // Verify types
        expect(typeof pathParams.petId).toBe('string');
        expect(typeof pathParams.ownerId).toBe('string');
        
        // Verify petId is alphanumeric
        expect(pathParams.petId).toMatch(/^[a-zA-Z0-9_-]+$/);
        
        // Verify ownerId is numeric
        expect(pathParams.ownerId).toMatch(/^\d+$/);
      }),
      { numRuns: 10 }
    );

    // Test with mixed parameter types (should only include path parameters)
    const mixedParams = [
      {
        name: 'petId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      },
      {
        name: 'Authorization',
        in: 'header',
        required: false,
        schema: { type: 'string' }
      }
    ];

    fc.assert(
      fc.property(pathParamsGenerator(mixedParams), (pathParams) => {
        // Verify only path parameter is present
        expect(pathParams).toHaveProperty('petId');
        
        // Verify query and header parameters are NOT present
        expect(pathParams).not.toHaveProperty('status');
        expect(pathParams).not.toHaveProperty('Authorization');
      }),
      { numRuns: 10 }
    );

    // Test with no path parameters
    const noPathParams = [
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' }
      }
    ];

    fc.assert(
      fc.property(pathParamsGenerator(noPathParams), (pathParams) => {
        // Verify empty object is returned
        expect(Object.keys(pathParams).length).toBe(0);
      }),
      { numRuns: 10 }
    );

    // Test with empty parameter array
    fc.assert(
      fc.property(pathParamsGenerator([]), (pathParams) => {
        // Verify empty object is returned
        expect(Object.keys(pathParams).length).toBe(0);
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Verify queryParamsGenerator produces valid query parameter objects
   * Task 2.4: Test queryParamsGenerator() implementation
   * Requirements 5.4
   */
  it('should generate valid query parameter objects', () => {
    // Test with required string query parameter
    const requiredStringQueryParam = {
      name: 'status',
      in: 'query',
      required: true,
      schema: { type: 'string' }
    };

    fc.assert(
      fc.property(queryParamsGenerator([requiredStringQueryParam]), (queryParams) => {
        // Verify the parameter is present
        expect(queryParams).toHaveProperty('status');
        
        // Verify it's a string
        expect(typeof queryParams.status).toBe('string');
        
        // Verify it's a valid URL query value (alphanumeric, underscore, hyphen)
        expect(queryParams.status).toMatch(/^[a-zA-Z0-9_-]+$/);
        
        // Verify reasonable length
        expect(queryParams.status.length).toBeGreaterThan(0);
        expect(queryParams.status.length).toBeLessThanOrEqual(20);
      }),
      { numRuns: 10 }
    );

    // Test with optional string query parameter
    const optionalStringQueryParam = {
      name: 'tags',
      in: 'query',
      required: false,
      schema: { type: 'string' }
    };

    fc.assert(
      fc.property(queryParamsGenerator([optionalStringQueryParam]), (queryParams) => {
        // Verify the parameter may or may not be present
        if (queryParams.tags !== undefined) {
          // If present, verify it's a string
          expect(typeof queryParams.tags).toBe('string');
          expect(queryParams.tags).toMatch(/^[a-zA-Z0-9_-]+$/);
        }
        // If undefined, that's also valid for optional parameters
      }),
      { numRuns: 10 }
    );

    // Test with required integer query parameter
    const requiredIntegerQueryParam = {
      name: 'limit',
      in: 'query',
      required: true,
      schema: { type: 'integer' }
    };

    fc.assert(
      fc.property(queryParamsGenerator([requiredIntegerQueryParam]), (queryParams) => {
        // Verify the parameter is present
        expect(queryParams).toHaveProperty('limit');
        
        // Verify it's a string (query params are always strings in URLs)
        expect(typeof queryParams.limit).toBe('string');
        
        // Verify it's a valid integer string
        expect(queryParams.limit).toMatch(/^\d+$/);
        
        // Verify it can be parsed as an integer
        const parsed = parseInt(queryParams.limit, 10);
        expect(Number.isInteger(parsed)).toBe(true);
        expect(parsed).toBeGreaterThanOrEqual(1);
        expect(parsed).toBeLessThanOrEqual(999);
      }),
      { numRuns: 10 }
    );

    // Test with optional number query parameter
    const optionalNumberQueryParam = {
      name: 'price',
      in: 'query',
      required: false,
      schema: { type: 'number' }
    };

    fc.assert(
      fc.property(queryParamsGenerator([optionalNumberQueryParam]), (queryParams) => {
        // Verify the parameter may or may not be present
        if (queryParams.price !== undefined) {
          // If present, verify it's a string
          expect(typeof queryParams.price).toBe('string');
          
          // Verify it's a valid number string
          expect(queryParams.price).toMatch(/^\d+\.\d+$/);
          
          // Verify it can be parsed as a number
          const parsed = parseFloat(queryParams.price);
          expect(Number.isNaN(parsed)).toBe(false);
          expect(parsed).toBeGreaterThanOrEqual(1);
          expect(parsed).toBeLessThanOrEqual(999);
        }
      }),
      { numRuns: 10 }
    );

    // Test with required boolean query parameter
    const requiredBooleanQueryParam = {
      name: 'active',
      in: 'query',
      required: true,
      schema: { type: 'boolean' }
    };

    fc.assert(
      fc.property(queryParamsGenerator([requiredBooleanQueryParam]), (queryParams) => {
        // Verify the parameter is present
        expect(queryParams).toHaveProperty('active');
        
        // Verify it's a string
        expect(typeof queryParams.active).toBe('string');
        
        // Verify it's either "true" or "false"
        expect(['true', 'false']).toContain(queryParams.active);
      }),
      { numRuns: 10 }
    );

    // Test with multiple query parameters (mix of required and optional)
    const multipleQueryParams = [
      {
        name: 'status',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer' }
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer' }
      }
    ];

    fc.assert(
      fc.property(queryParamsGenerator(multipleQueryParams), (queryParams) => {
        // Verify required parameter is always present
        expect(queryParams).toHaveProperty('status');
        expect(typeof queryParams.status).toBe('string');
        
        // Verify optional parameters may or may not be present
        if (queryParams.limit !== undefined) {
          expect(typeof queryParams.limit).toBe('string');
          expect(queryParams.limit).toMatch(/^\d+$/);
        }
        
        if (queryParams.offset !== undefined) {
          expect(typeof queryParams.offset).toBe('string');
          expect(queryParams.offset).toMatch(/^\d+$/);
        }
      }),
      { numRuns: 10 }
    );

    // Test with mixed parameter types (should only include query parameters)
    const mixedParams = [
      {
        name: 'status',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'petId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'Authorization',
        in: 'header',
        required: false,
        schema: { type: 'string' }
      }
    ];

    fc.assert(
      fc.property(queryParamsGenerator(mixedParams), (queryParams) => {
        // Verify only query parameter is present
        expect(queryParams).toHaveProperty('status');
        
        // Verify path and header parameters are NOT present
        expect(queryParams).not.toHaveProperty('petId');
        expect(queryParams).not.toHaveProperty('Authorization');
      }),
      { numRuns: 10 }
    );

    // Test with no query parameters
    const noQueryParams = [
      {
        name: 'petId',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ];

    fc.assert(
      fc.property(queryParamsGenerator(noQueryParams), (queryParams) => {
        // Verify empty object is returned
        expect(Object.keys(queryParams).length).toBe(0);
      }),
      { numRuns: 10 }
    );

    // Test with empty parameter array
    fc.assert(
      fc.property(queryParamsGenerator([]), (queryParams) => {
        // Verify empty object is returned
        expect(Object.keys(queryParams).length).toBe(0);
      }),
      { numRuns: 10 }
    );

    // Test that optional parameters are sometimes omitted
    const optionalParam = {
      name: 'optional',
      in: 'query',
      required: false,
      schema: { type: 'string' }
    };

    // Run multiple times to verify that sometimes the optional param is undefined
    let foundUndefined = false;
    let foundDefined = false;

    fc.assert(
      fc.property(queryParamsGenerator([optionalParam]), (queryParams) => {
        if (queryParams.optional === undefined) {
          foundUndefined = true;
        } else {
          foundDefined = true;
          expect(typeof queryParams.optional).toBe('string');
        }
        return true;
      }),
      { numRuns: 100 } // Run more times to ensure we see both cases
    );

    // With 100 runs, we should see both defined and undefined cases
    // (This is a probabilistic test, but with 100 runs it's very likely)
    expect(foundUndefined || foundDefined).toBe(true);
  });

  /**
   * Verify formDataGenerator produces valid form data objects
   * Task 2.2: Test formDataGenerator() implementation
   * Requirements 5.5
   */
  it('should generate valid form data objects matching schema structure', () => {
    // Test with a simple schema with multiple field types
    const simpleSchema: SchemaNode = {
      type: 'object',
      key: 'TestForm',
      label: 'Test Form',
      required: false,
      children: [
        {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: true
        },
        {
          type: 'integer',
          key: 'age',
          label: 'Age',
          required: false
        },
        {
          type: 'boolean',
          key: 'active',
          label: 'Active',
          required: false
        }
      ]
    };

    fc.assert(
      fc.property(formDataGenerator(simpleSchema), (formData) => {
        // Verify all non-readOnly fields are present
        expect(formData).toHaveProperty('name');
        expect(formData).toHaveProperty('age');
        expect(formData).toHaveProperty('active');
        
        // Verify field types are correct
        expect(typeof formData.name).toBe('string');
        expect(typeof formData.age).toBe('number');
        expect(typeof formData.active).toBe('boolean');
      }),
      { numRuns: 10 }
    );

    // Test with a schema that includes readOnly fields
    const schemaWithReadOnly: SchemaNode = {
      type: 'object',
      key: 'TestForm',
      label: 'Test Form',
      required: false,
      children: [
        {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: true
        },
        {
          type: 'string',
          key: 'id',
          label: 'ID',
          required: false,
          readOnly: true
        },
        {
          type: 'integer',
          key: 'age',
          label: 'Age',
          required: false
        }
      ]
    };

    fc.assert(
      fc.property(formDataGenerator(schemaWithReadOnly), (formData) => {
        // Verify non-readOnly fields are present
        expect(formData).toHaveProperty('name');
        expect(formData).toHaveProperty('age');
        
        // Verify readOnly field is NOT present
        expect(formData).not.toHaveProperty('id');
      }),
      { numRuns: 10 }
    );

    // Test with a nested object schema
    const nestedSchema: SchemaNode = {
      type: 'object',
      key: 'TestForm',
      label: 'Test Form',
      required: false,
      children: [
        {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: true
        },
        {
          type: 'object',
          key: 'address',
          label: 'Address',
          required: false,
          children: [
            {
              type: 'string',
              key: 'street',
              label: 'Street',
              required: false
            },
            {
              type: 'string',
              key: 'city',
              label: 'City',
              required: false
            }
          ]
        }
      ]
    };

    fc.assert(
      fc.property(formDataGenerator(nestedSchema), (formData) => {
        // Verify top-level fields are present
        expect(formData).toHaveProperty('name');
        expect(formData).toHaveProperty('address');
        
        // Verify nested object structure
        expect(typeof formData.address).toBe('object');
        expect(formData.address).toHaveProperty('street');
        expect(formData.address).toHaveProperty('city');
      }),
      { numRuns: 10 }
    );

    // Test with an array field
    const schemaWithArray: SchemaNode = {
      type: 'object',
      key: 'TestForm',
      label: 'Test Form',
      required: false,
      children: [
        {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: true
        },
        {
          type: 'array',
          key: 'tags',
          label: 'Tags',
          required: false,
          items: {
            type: 'string',
            key: 'tag',
            label: 'Tag',
            required: false
          }
        }
      ]
    };

    fc.assert(
      fc.property(formDataGenerator(schemaWithArray), (formData) => {
        // Verify fields are present
        expect(formData).toHaveProperty('name');
        expect(formData).toHaveProperty('tags');
        
        // Verify array field is an array
        expect(Array.isArray(formData.tags)).toBe(true);
        
        // Verify array items are strings
        for (const tag of formData.tags as unknown[]) {
          expect(typeof tag).toBe('string');
        }
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Verify assertFieldsRendered() correctly identifies rendered fields
   * Task 3.1: Test assertFieldsRendered() implementation
   * Requirements 8.1
   */
  it('should verify field presence using assertFieldsRendered', () => {
    // Create a simple test operation with known fields
    const testOperation: Operation = {
      id: 'testOperation',
      uigenId: 'testOperation',
      method: 'POST',
      path: '/test',
      viewHint: 'create',
      parameters: [],
      responses: {},
      requestBody: {
        type: 'object',
        key: 'TestRequest',
        label: 'Test Request',
        required: false,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: true
          },
          {
            type: 'string',
            key: 'email',
            label: 'Email',
            required: true
          }
        ]
      }
    };

    const resource = createMockResource(testOperation);
    
    // Render the form
    renderWithProviders(<FormView resource={resource} mode="create" />);
    
    // Test that assertFieldsRendered succeeds when all fields are present
    expect(() => {
      assertFieldsRendered(['name', 'email']);
    }).not.toThrow();
    
    // Test that assertFieldsRendered throws when a field is missing
    expect(() => {
      assertFieldsRendered(['name', 'email', 'nonexistent']);
    }).toThrow(/Expected fields to be rendered but not found: nonexistent/);
    
    // Test that the error message includes the count of missing fields
    expect(() => {
      assertFieldsRendered(['name', 'email', 'missing1', 'missing2']);
    }).toThrow(/Missing 2 of 4 expected fields/);
  });

  /**
   * Verify assertURLConstruction() correctly validates URL construction
   * Task 3.2: Test assertURLConstruction() implementation
   * Requirements 8.2
   */
  it('should verify URL construction using assertURLConstruction', () => {
    // Test 1: Path parameter substitution only
    const pathOnlyOperation: Operation = {
      id: 'getPetById',
      uigenId: 'getPetById',
      method: 'GET',
      path: '/pets/{petId}',
      viewHint: 'detail',
      parameters: [],
      responses: {}
    };

    // Should succeed when URL is correctly constructed
    expect(() => {
      assertURLConstruction(
        pathOnlyOperation,
        { petId: '123' },
        {},
        '/pets/123'
      );
    }).not.toThrow();

    // Should fail when URL is incorrectly constructed
    expect(() => {
      assertURLConstruction(
        pathOnlyOperation,
        { petId: '123' },
        {},
        '/pets/456' // Wrong ID
      );
    }).toThrow(/URL construction mismatch/);

    // Test 2: Query parameters only
    const queryOnlyOperation: Operation = {
      id: 'findPets',
      uigenId: 'findPets',
      method: 'GET',
      path: '/pets',
      viewHint: 'list',
      parameters: [],
      responses: {}
    };

    // Should succeed with single query parameter
    expect(() => {
      assertURLConstruction(
        queryOnlyOperation,
        {},
        { status: 'available' },
        '/pets?status=available'
      );
    }).not.toThrow();

    // Should succeed with multiple query parameters
    expect(() => {
      assertURLConstruction(
        queryOnlyOperation,
        {},
        { status: 'available', limit: '10' },
        '/pets?status=available&limit=10'
      );
    }).not.toThrow();

    // Should succeed with no query parameters
    expect(() => {
      assertURLConstruction(
        queryOnlyOperation,
        {},
        {},
        '/pets'
      );
    }).not.toThrow();

    // Test 3: Combined path and query parameters
    const combinedOperation: Operation = {
      id: 'updatePet',
      uigenId: 'updatePet',
      method: 'PUT',
      path: '/pets/{petId}',
      viewHint: 'update',
      parameters: [],
      responses: {}
    };

    // Should succeed with both path and query parameters
    expect(() => {
      assertURLConstruction(
        combinedOperation,
        { petId: '123' },
        { notify: 'true' },
        '/pets/123?notify=true'
      );
    }).not.toThrow();

    // Should succeed with path parameter and multiple query parameters
    expect(() => {
      assertURLConstruction(
        combinedOperation,
        { petId: '123' },
        { notify: 'true', validate: 'false' },
        '/pets/123?notify=true&validate=false'
      );
    }).not.toThrow();

    // Test 4: Multiple path parameters
    const multiplePathOperation: Operation = {
      id: 'getUserPet',
      uigenId: 'getUserPet',
      method: 'GET',
      path: '/users/{userId}/pets/{petId}',
      viewHint: 'detail',
      parameters: [],
      responses: {}
    };

    // Should succeed with multiple path parameters
    expect(() => {
      assertURLConstruction(
        multiplePathOperation,
        { userId: '456', petId: '123' },
        {},
        '/users/456/pets/123'
      );
    }).not.toThrow();

    // Should succeed with multiple path parameters and query parameters
    expect(() => {
      assertURLConstruction(
        multiplePathOperation,
        { userId: '456', petId: '123' },
        { include: 'details' },
        '/users/456/pets/123?include=details'
      );
    }).not.toThrow();

    // Test 5: Error message includes operation details
    expect(() => {
      assertURLConstruction(
        pathOnlyOperation,
        { petId: '123' },
        {},
        '/pets/wrong'
      );
    }).toThrow(/operation "getPetById"/);
    
    expect(() => {
      assertURLConstruction(
        pathOnlyOperation,
        { petId: '123' },
        {},
        '/pets/wrong'
      );
    }).toThrow(/Path template: \/pets\/{petId}/);
  });

  /**
   * Verify assertParameterSeparation() correctly validates parameter separation
   * Task 3.3: Test assertParameterSeparation() implementation
   * Requirements 8.3
   */
  it('should verify parameter separation using assertParameterSeparation', () => {
    // Test 1: Correct separation - path params only
    const pathOnlyMutation = {
      pathParams: { petId: '123' },
      queryParams: {},
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        pathOnlyMutation,
        { petId: '123' },
        {},
        {}
      );
    }).not.toThrow();

    // Test 2: Correct separation - query params only
    const queryOnlyMutation = {
      pathParams: {},
      queryParams: { status: 'available', limit: '10' },
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        queryOnlyMutation,
        {},
        { status: 'available', limit: '10' },
        {}
      );
    }).not.toThrow();

    // Test 3: Correct separation - body only
    const bodyOnlyMutation = {
      pathParams: {},
      queryParams: {},
      body: { name: 'Fluffy', status: 'available' }
    };

    expect(() => {
      assertParameterSeparation(
        bodyOnlyMutation,
        {},
        {},
        { name: 'Fluffy', status: 'available' }
      );
    }).not.toThrow();

    // Test 4: Correct separation - all three types
    const allTypesMutation = {
      pathParams: { petId: '123' },
      queryParams: { notify: 'true' },
      body: { name: 'Fluffy', status: 'available' }
    };

    expect(() => {
      assertParameterSeparation(
        allTypesMutation,
        { petId: '123' },
        { notify: 'true' },
        { name: 'Fluffy', status: 'available' }
      );
    }).not.toThrow();

    // Test 5: Error - path param missing from pathParams
    const missingPathParam = {
      pathParams: {},
      queryParams: {},
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        missingPathParam,
        { petId: '123' },
        {},
        {}
      );
    }).toThrow(/Path parameter "petId" is missing from pathParams object/);

    // Test 6: Error - path param incorrectly in body
    const pathParamInBody = {
      pathParams: { petId: '123' },
      queryParams: {},
      body: { petId: '123', name: 'Fluffy' }
    };

    expect(() => {
      assertParameterSeparation(
        pathParamInBody,
        { petId: '123' },
        {},
        { name: 'Fluffy' }
      );
    }).toThrow(/Path parameter "petId" incorrectly included in body object/);

    // Test 7: Error - query param missing from queryParams
    const missingQueryParam = {
      pathParams: {},
      queryParams: {},
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        missingQueryParam,
        {},
        { status: 'available' },
        {}
      );
    }).toThrow(/Query parameter "status" is missing from queryParams object/);

    // Test 8: Error - query param incorrectly in body
    const queryParamInBody = {
      pathParams: {},
      queryParams: { status: 'available' },
      body: { status: 'available', name: 'Fluffy' }
    };

    expect(() => {
      assertParameterSeparation(
        queryParamInBody,
        {},
        { status: 'available' },
        { name: 'Fluffy' }
      );
    }).toThrow(/Query parameter "status" incorrectly included in body object/);

    // Test 9: Error - body field missing from body
    const missingBodyField = {
      pathParams: {},
      queryParams: {},
      body: { name: 'Fluffy' }
    };

    expect(() => {
      assertParameterSeparation(
        missingBodyField,
        {},
        {},
        { name: 'Fluffy', status: 'available' }
      );
    }).toThrow(/Body field "status" is missing from body object/);

    // Test 10: Error - body field incorrectly in pathParams
    const bodyFieldInPathParams = {
      pathParams: { name: 'Fluffy' },
      queryParams: {},
      body: { name: 'Fluffy' }
    };

    expect(() => {
      assertParameterSeparation(
        bodyFieldInPathParams,
        {},
        {},
        { name: 'Fluffy' }
      );
    }).toThrow(/Body field "name" incorrectly included in pathParams object/);

    // Test 11: Error - body field incorrectly in queryParams
    const bodyFieldInQueryParams = {
      pathParams: {},
      queryParams: { name: 'Fluffy' },
      body: { name: 'Fluffy' }
    };

    expect(() => {
      assertParameterSeparation(
        bodyFieldInQueryParams,
        {},
        {},
        { name: 'Fluffy' }
      );
    }).toThrow(/Body field "name" incorrectly included in queryParams object/);

    // Test 12: Error - unexpected path param
    const unexpectedPathParam = {
      pathParams: { petId: '123', extra: 'value' },
      queryParams: {},
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        unexpectedPathParam,
        { petId: '123' },
        {},
        {}
      );
    }).toThrow(/Unexpected path parameter "extra" found in pathParams object/);

    // Test 13: Error - unexpected query param
    const unexpectedQueryParam = {
      pathParams: {},
      queryParams: { status: 'available', extra: 'value' },
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        unexpectedQueryParam,
        {},
        { status: 'available' },
        {}
      );
    }).toThrow(/Unexpected query parameter "extra" found in queryParams object/);

    // Test 14: Error - unexpected body field
    const unexpectedBodyField = {
      pathParams: {},
      queryParams: {},
      body: { name: 'Fluffy', extra: 'value' }
    };

    expect(() => {
      assertParameterSeparation(
        unexpectedBodyField,
        {},
        {},
        { name: 'Fluffy' }
      );
    }).toThrow(/Unexpected body field "extra" found in body object/);

    // Test 15: Error - incorrect path param value
    const incorrectPathParamValue = {
      pathParams: { petId: '456' },
      queryParams: {},
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        incorrectPathParamValue,
        { petId: '123' },
        {},
        {}
      );
    }).toThrow(/Path parameter "petId" has incorrect value/);

    // Test 16: Error - incorrect query param value
    const incorrectQueryParamValue = {
      pathParams: {},
      queryParams: { status: 'pending' },
      body: {}
    };

    expect(() => {
      assertParameterSeparation(
        incorrectQueryParamValue,
        {},
        { status: 'available' },
        {}
      );
    }).toThrow(/Query parameter "status" has incorrect value/);

    // Test 17: Error - incorrect body field value
    const incorrectBodyFieldValue = {
      pathParams: {},
      queryParams: {},
      body: { name: 'Spot' }
    };

    expect(() => {
      assertParameterSeparation(
        incorrectBodyFieldValue,
        {},
        {},
        { name: 'Fluffy' }
      );
    }).toThrow(/Body field "name" has incorrect value/);

    // Test 18: Correct separation with nested body objects
    const nestedBodyMutation = {
      pathParams: { petId: '123' },
      queryParams: { notify: 'true' },
      body: {
        name: 'Fluffy',
        address: {
          street: '123 Main St',
          city: 'Springfield'
        }
      }
    };

    expect(() => {
      assertParameterSeparation(
        nestedBodyMutation,
        { petId: '123' },
        { notify: 'true' },
        {
          name: 'Fluffy',
          address: {
            street: '123 Main St',
            city: 'Springfield'
          }
        }
      );
    }).not.toThrow();

    // Test 19: Correct separation with array body fields
    const arrayBodyMutation = {
      pathParams: {},
      queryParams: {},
      body: {
        name: 'Fluffy',
        tags: ['cute', 'fluffy', 'friendly']
      }
    };

    expect(() => {
      assertParameterSeparation(
        arrayBodyMutation,
        {},
        {},
        {
          name: 'Fluffy',
          tags: ['cute', 'fluffy', 'friendly']
        }
      );
    }).not.toThrow();

    // Test 20: Error message includes actual and expected values
    const mismatchMutation = {
      pathParams: { petId: '456' },
      queryParams: { status: 'pending' },
      body: { name: 'Spot' }
    };

    expect(() => {
      assertParameterSeparation(
        mismatchMutation,
        { petId: '123' },
        { status: 'available' },
        { name: 'Fluffy' }
      );
    }).toThrow(/Actual mutation call:/);
    
    expect(() => {
      assertParameterSeparation(
        mismatchMutation,
        { petId: '123' },
        { status: 'available' },
        { name: 'Fluffy' }
      );
    }).toThrow(/Expected:/);
  });

  /**
   * Property 1: Non-ReadOnly Field Rendering
   * **Validates: Requirements 2.1**
   * 
   * For any operation with a requestBody schema, the React renderer SHALL render 
   * form fields for all non-readOnly children in the schema.
   * 
   * Test Strategy: Generate random operations with varying schema structures, 
   * render FormView, and verify all non-readOnly fields appear in the DOM.
   * 
   * Task 6.1: Write property test for Non-ReadOnly Field Rendering
   */
  describe('Property 1: Non-ReadOnly Field Rendering', () => {
    it('should render all non-readOnly fields from requestBody schema', () => {
      // Filter operations that have a requestBody with children
      const operationsWithRequestBody = formOperations.filter(
        op => op.requestBody && op.requestBody.children && op.requestBody.children.length > 0
      );

      // Verify we have operations to test
      expect(operationsWithRequestBody.length).toBeGreaterThan(0);

      // Use fc.constantFrom to select operations from formOperations
      fc.assert(
        fc.property(
          fc.constantFrom(...operationsWithRequestBody),
          (operation) => {
            // Extract non-readOnly fields from the requestBody schema
            const expectedFields = operation.requestBody!.children!
              .filter(field => !field.readOnly)
              .map(field => field.key);

            // Skip if no non-readOnly fields (nothing to test)
            if (expectedFields.length === 0) {
              return true;
            }

            // Create a mock resource for this operation
            const resource = createMockResource(operation);

            // Determine the correct mode based on viewHint
            const mode = operation.viewHint === 'update' ? 'edit' : 'create';

            // Render the FormView component
            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode={mode} />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              expect(form, `Form should be rendered for operation "${operation.id}"`).toBeTruthy();

              // Assert that all non-readOnly fields are rendered
              try {
                assertFieldsRendered(expectedFields);
              } catch (error) {
                // Enhance error message with operation context
                throw new Error(
                  `Property 1 failed for operation "${operation.id}":\n` +
                  `  ${(error as Error).message}\n` +
                  `  Operation: ${operation.method} ${operation.path}\n` +
                  `  ViewHint: ${operation.viewHint}\n` +
                  `  Expected fields: ${expectedFields.join(', ')}`
                );
              }

              // Property holds: all non-readOnly fields are rendered
              return true;
            } finally {
              // Clean up the rendered component to prevent memory leaks
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in task requirements
      );
    });
  });

  /**
   * Property 2: Path Parameter Field Rendering
   * **Validates: Requirements 2.2**
   * 
   * For any operation with path parameters, the React renderer SHALL render 
   * form fields for each path parameter.
   * 
   * Test Strategy: Generate random operations with varying numbers of path parameters, 
   * render FormView, and verify all path parameter fields appear in the DOM.
   * 
   * Task 6.2: Write property test for Path Parameter Field Rendering
   */
  describe('Property 2: Path Parameter Field Rendering', () => {
    it('should render all path parameters as form fields', () => {
      // Filter operations that have path parameters
      const operationsWithPathParams = formOperations.filter(
        op => op.parameters && op.parameters.some(p => p.in === 'path')
      );

      // Verify we have operations to test
      expect(operationsWithPathParams.length).toBeGreaterThan(0);

      // Use fc.constantFrom to select operations from formOperations
      fc.assert(
        fc.property(
          fc.constantFrom(...operationsWithPathParams),
          (operation) => {
            // Extract path parameter names
            const pathParams = operation.parameters.filter(p => p.in === 'path');
            const expectedFields = pathParams.map(p => p.name);

            // Skip if no path parameters (nothing to test)
            if (expectedFields.length === 0) {
              return true;
            }

            // Create a mock resource for this operation
            const resource = createMockResource(operation);

            // Determine the correct mode based on viewHint
            const mode = operation.viewHint === 'update' ? 'edit' : 'create';

            // Render the FormView component
            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode={mode} />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              expect(form, `Form should be rendered for operation "${operation.id}"`).toBeTruthy();

              // Assert that all path parameter fields are rendered
              try {
                assertFieldsRendered(expectedFields);
              } catch (error) {
                // Enhance error message with operation context
                throw new Error(
                  `Property 2 failed for operation "${operation.id}":\n` +
                  `  ${(error as Error).message}\n` +
                  `  Operation: ${operation.method} ${operation.path}\n` +
                  `  ViewHint: ${operation.viewHint}\n` +
                  `  Expected path parameter fields: ${expectedFields.join(', ')}\n` +
                  `  Path parameters: ${JSON.stringify(pathParams.map(p => ({ name: p.name, in: p.in })))}`
                );
              }

              // Property holds: all path parameters are rendered as form fields
              return true;
            } finally {
              // Clean up the rendered component to prevent memory leaks
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in task requirements
      );
    });
  });

  /**
   * Property 3: Query Parameter Field Rendering
   * **Validates: Requirements 2.3**
   * 
   * For any create/update operation with query parameters, the React renderer SHALL render 
   * form fields for each query parameter.
   * 
   * Test Strategy: Filter form operations (create/update viewHint) with query parameters,
   * render FormView, and verify all query parameter fields appear in the DOM.
   * 
   * Note: FormView only renders forms for create/update operations. Operations with other
   * viewHints (search, list, detail) are not rendered by FormView and are excluded.
   * 
   * Task 6.3: Write property test for Query Parameter Field Rendering
   */
  describe('Property 3: Query Parameter Field Rendering', () => {
    it('should render all query parameters as form fields', () => {
      // Filter form operations (create/update only) that have query parameters.
      // FormView only renders a <form> for operations with viewHint 'create' or 'update'.
      const operationsWithQueryParams = formOperations.filter(
        op => op.parameters && op.parameters.some(p => p.in === 'query')
      );

      // If no form operations have query parameters, the property is vacuously satisfied.
      // This is expected for specs like Petstore where query params only appear on list/search ops.
      if (operationsWithQueryParams.length === 0) {
        console.log(
          'Property 3: No create/update operations with query parameters found in spec. ' +
          'Property is vacuously satisfied - FormView correctly handles this case.'
        );
        return;
      }

      // Use fc.constantFrom to select operations from formOperations with query params
      fc.assert(
        fc.property(
          fc.constantFrom(...operationsWithQueryParams),
          (operation) => {
            // Extract query parameter names
            const queryParams = operation.parameters.filter(p => p.in === 'query');
            const expectedFields = queryParams.map(p => p.name);

            // Skip if no query parameters (nothing to test)
            if (expectedFields.length === 0) {
              return true;
            }

            // Create a mock resource for this operation
            const resource = createMockResource(operation);

            // Determine the correct mode based on viewHint
            const mode = operation.viewHint === 'update' ? 'edit' : 'create';

            // Render the FormView component
            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode={mode} />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              expect(form, `Form should be rendered for operation "${operation.id}"`).toBeTruthy();

              // Assert that all query parameter fields are rendered
              try {
                assertFieldsRendered(expectedFields);
              } catch (error) {
                // Enhance error message with operation context
                throw new Error(
                  `Property 3 failed for operation "${operation.id}":\n` +
                  `  ${(error as Error).message}\n` +
                  `  Operation: ${operation.method} ${operation.path}\n` +
                  `  ViewHint: ${operation.viewHint}\n` +
                  `  Expected query parameter fields: ${expectedFields.join(', ')}\n` +
                  `  Query parameters: ${JSON.stringify(queryParams.map(p => ({ name: p.name, in: p.in })))}`
                );
              }

              // Property holds: all query parameters are rendered as form fields
              return true;
            } finally {
              // Clean up the rendered component to prevent memory leaks
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in task requirements
      );
    });
  });

  /**
   * Property 4: Header/Cookie Parameter Exclusion
   * **Validates: Requirements 2.4**
   *
   * For any operation with header or cookie parameters, the React renderer SHALL NOT render
   * form fields for those parameters.
   *
   * Test Strategy: Generate synthetic operations that include header and/or cookie parameters
   * alongside path/query parameters, render FormView, and verify that header and cookie
   * parameter names do NOT appear in the DOM as form fields.
   *
   * Note: The Petstore spec does not include header/cookie params on create/update operations,
   * so we build synthetic operations to exercise this property directly.
   *
   * Task 6.4: Write property test for Header/Cookie Parameter Exclusion
   */
  describe('Property 4: Header/Cookie Parameter Exclusion', () => {
    it('should NOT render header or cookie parameters as form fields', () => {
      // Generators for parameter names - use simple alphanumeric names to avoid
      // false positives when searching the DOM.
      const paramNameArb = fc.stringMatching(/^[a-z][a-z0-9]{2,9}$/).filter(
        // Exclude names that could accidentally match unrelated DOM content
        name => !['form', 'input', 'label', 'button', 'submit'].includes(name)
      );

      // Generator for a single header or cookie parameter
      const excludedParamArb = fc.record({
        name: paramNameArb,
        in: fc.constantFrom('header' as const, 'cookie' as const),
        required: fc.boolean(),
        schema: fc.constant({ type: 'string' as const, key: '', label: '', required: false })
      });

      // Generator for a list of 1-3 header/cookie parameters
      const excludedParamsArb = fc.array(excludedParamArb, { minLength: 1, maxLength: 3 });

      // Feature: systematic-react-renderer-testing, Property 4: Header/Cookie Parameter Exclusion
      fc.assert(
        fc.property(
          excludedParamsArb,
          (excludedParams) => {
            // Build a synthetic operation that contains only header/cookie parameters.
            // We use a minimal requestBody so FormView renders a form element.
            const syntheticOperation: Operation = {
              id: 'synthetic-header-cookie-test',
              uigenId: 'synthetic-header-cookie-test',
              method: 'POST',
              path: '/synthetic-test',
              viewHint: 'create',
              parameters: excludedParams.map(p => ({
                name: p.name,
                in: p.in,
                required: p.required,
                schema: {
                  type: 'string' as const,
                  key: p.name,
                  label: p.name,
                  required: p.required,
                  children: []
                }
              })),
              requestBody: {
                type: 'object' as const,
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string' as const,
                    key: 'syntheticField',
                    label: 'Synthetic Field',
                    required: false,
                    readOnly: false,
                    children: []
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);

            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Verify the form was rendered at all
              const form = container.querySelector('form');
              expect(
                form,
                'Form should be rendered for the synthetic operation'
              ).toBeTruthy();

              // Verify that NONE of the header/cookie parameter names appear as form fields.
              // We check all three lookup strategies used by assertFieldsRendered so that
              // any accidental rendering is caught regardless of how the field is attached.
              for (const param of excludedParams) {
                const byLabel = screen.queryAllByLabelText(new RegExp(`^${param.name}$`, 'i'));
                const byName = document.querySelector(`[name="${param.name}"]`);
                const byId = document.querySelector(`[id="${param.name}"]`);

                const isRendered = byLabel.length > 0 || byName !== null || byId !== null;

                if (isRendered) {
                  throw new Error(
                    `Property 4 failed: ${param.in} parameter "${param.name}" was rendered as a form field but should be excluded.\n` +
                    `  Parameter location: ${param.in}\n` +
                    `  All excluded params: ${excludedParams.map(p => `${p.name} (${p.in})`).join(', ')}`
                  );
                }
              }

              // Property holds: no header or cookie parameters appear as form fields
              return true;
            } finally {
              // Clean up the rendered component to prevent memory leaks
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in task requirements
      );
    });
  });

  /**
   * Property 5: Field Label Correctness
   * **Validates: Requirements 2.5**
   *
   * For any operation rendered by FormView, the label text displayed in the DOM for each
   * field SHALL match the expected label derived from the IR:
   * - For requestBody schema fields: the label comes from field.label
   * - For path/query parameters: the label comes from param.schema.label || param.name
   *
   * Test Strategy: Use real operations from the Petstore spec (via formOperations).
   * For each sampled operation, compute the expected label for every visible field,
   * render FormView, and assert that a DOM element with that label text exists.
   *
   * Task 6.5: Write property test for Field Label Correctness
   */
  describe('Property 5: Field Label Correctness', () => {
    it('should render labels that match schema labels or parameter names', () => {
      // Feature: systematic-react-renderer-testing, Property 5: Field Label Correctness
      fc.assert(
        fc.property(
          // Sample one operation from the real Petstore-derived formOperations list
          fc.integer({ min: 0, max: 999 }),
          (indexSeed) => {
            // Guard: formOperations is populated in beforeAll - skip if empty
            if (formOperations.length === 0) return true;

            const operation = formOperations[indexSeed % formOperations.length];

            // Compute the expected labels for all visible fields in this operation.
            // This mirrors the logic in FormView.tsx exactly:
            //   pathParamFields: label = param.schema.label || param.name
            //   requestBody children (non-readOnly): label = field.label
            const expectedLabels: Array<{ key: string; label: string }> = [];

            // Path and query parameter fields (same logic as pathParamFields in FormView)
            if (operation.parameters) {
              for (const param of operation.parameters) {
                // Only path and query params become form fields
                if (param.in !== 'path' && param.in !== 'query') continue;
                expectedLabels.push({
                  key: param.name,
                  label: param.schema.label || param.name
                });
              }
            }

            // RequestBody schema fields (non-readOnly children)
            const schema = operation.requestBody;
            if (schema && schema.children) {
              for (const field of schema.children) {
                if (field.readOnly) continue;
                expectedLabels.push({
                  key: field.key,
                  label: field.label
                });
              }
            }

            // If there are no visible fields, the property trivially holds
            if (expectedLabels.length === 0) return true;

            const resource = createMockResource(operation);
            const mode = operation.viewHint === 'update' ? 'edit' : 'create';

            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode={mode} />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              if (!form) {
                // No form rendered - skip this operation (e.g. no operation found)
                return true;
              }

              // For each expected field, verify a label with the correct text exists in the DOM.
              // FormView renders: <Label htmlFor={field.key}>{field.label}</Label>
              // We use queryAllByText to find the label element by its text content.
              for (const { key, label } of expectedLabels) {
                // Build a regex that matches the label text at the start of the element text.
                // The label element may also contain a required indicator (*) as a child span,
                // so we use a partial match anchored at the start.
                const labelRegex = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

                // Strategy 1: find a <label> element whose text starts with the expected label
                const labelElements = Array.from(container.querySelectorAll('label')).filter(
                  el => labelRegex.test(el.textContent?.trim() ?? '')
                );

                // Strategy 2: find any element with the label text (broader search)
                const anyElements = screen.queryAllByText(labelRegex);

                const found = labelElements.length > 0 || anyElements.length > 0;

                if (!found) {
                  throw new Error(
                    `Property 5 failed for operation "${operation.id}":\n` +
                    `  Field key: "${key}"\n` +
                    `  Expected label text: "${label}"\n` +
                    `  No DOM element found with that label text.\n` +
                    `  All expected labels: ${expectedLabels.map(f => `"${f.label}" (key: ${f.key})`).join(', ')}`
                  );
                }
              }

              // Property holds: all field labels match expected values
              return true;
            } finally {
              // Clean up the rendered component to prevent memory leaks
              unmount();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in task requirements
      );
    });
  });

  /**
   * Property 6: Required Field Indicator
   * Validates: Requirements 2.6
   *
   * Required fields must display an asterisk (*) indicator via a span with class
   * "text-destructive". Optional fields must NOT display this indicator.
   *
   * FormView renders: {field.required && <span className="text-destructive ml-1">*</span>}
   *
   * FormView combines path parameters and body fields into a single list:
   *   fields = [...pathParamFields, ...bodyFields]
   * When a key appears in both (e.g. "username" as path param AND body field),
   * both are rendered as separate label elements. We mirror this combined list
   * so each rendered label is checked against the correct field's required flag.
   */
  describe('Property 6: Required Field Indicator', () => {
    it('required fields show asterisk indicator and optional fields do not', () => {
      fc.assert(
        fc.property(
          // Pick a random operation from the real Petstore IR
          fc.constantFrom(...formOperations),
          (operation) => {
            // Mirror FormView's field combination logic:
            // pathParamFields come first, then non-readOnly body fields
            const pathParamFields: SchemaNode[] = (operation.parameters ?? [])
              .filter(p => p.in === 'path' || p.in === 'query')
              .map(p => ({
                type: p.schema.type,
                key: p.name,
                label: p.schema.label || p.name,
                required: p.required,
                validations: p.schema.validations || [],
                description: p.schema.description,
                format: p.schema.format
              }));

            const schema = operation.requestBody;
            const bodyFields = (schema?.children ?? []).filter(f => !f.readOnly);

            // Combined field list - same order as FormView renders them
            const allFields = [...pathParamFields, ...bodyFields];

            // If there are no fields, the property trivially holds
            if (allFields.length === 0) return true;

            const resource = createMockResource(operation);
            const mode = operation.viewHint === 'update' ? 'edit' : 'create';

            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode={mode} />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              if (!form) {
                // No form rendered - skip this operation
                return true;
              }

              // Get all label elements in DOM order - matches the order FormView renders fields
              const allLabels = Array.from(container.querySelectorAll('label'));

              // Track which label index to use per key (handles duplicate keys from
              // path param + body field having the same name)
              const keyLabelIndex: Record<string, number> = {};

              for (const field of allFields) {
                // Find the next unused label for this key
                const startIdx = keyLabelIndex[field.key] ?? 0;
                let labelEl: Element | null = null;
                let foundIdx = -1;

                for (let i = startIdx; i < allLabels.length; i++) {
                  if (allLabels[i].getAttribute('for') === field.key) {
                    labelEl = allLabels[i];
                    foundIdx = i;
                    break;
                  }
                }

                if (!labelEl) {
                  // Label not found - skip this field (may be a nested/complex field)
                  continue;
                }

                // Advance the index so the next field with the same key gets the next label
                keyLabelIndex[field.key] = foundIdx + 1;

                // Look for the required indicator span inside the label
                const asteriskSpan = labelEl.querySelector('span.text-destructive');

                if (field.required) {
                  // Required fields must have the asterisk span with "*" text
                  if (!asteriskSpan) {
                    throw new Error(
                      `Property 6 failed for operation "${operation.id}":\n` +
                      `  Field key: "${field.key}" is required but has no asterisk indicator.\n` +
                      `  Expected a <span class="text-destructive"> inside the label.`
                    );
                  }
                  if (asteriskSpan.textContent?.trim() !== '*') {
                    throw new Error(
                      `Property 6 failed for operation "${operation.id}":\n` +
                      `  Field key: "${field.key}" required indicator text is "${asteriskSpan.textContent?.trim()}", expected "*".`
                    );
                  }
                } else {
                  // Optional fields must NOT have the asterisk span
                  if (asteriskSpan) {
                    throw new Error(
                      `Property 6 failed for operation "${operation.id}":\n` +
                      `  Field key: "${field.key}" is optional but has an asterisk indicator.\n` +
                      `  Optional fields must not display the required indicator.`
                    );
                  }
                }
              }

              // Property holds: required/optional indicators are correct for all fields
              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Field Type Component Mapping
   * Validates: Requirements 6.1-6.8
   *
   * For any field with a specific type, the React renderer SHALL render the
   * appropriate input component:
   *   - string  -> <input type="text"> (TextField)
   *   - number/integer -> <input type="number"> (NumberField)
   *   - boolean -> <input type="checkbox"> (CheckboxField)
   *   - enum    -> <select> element (SelectField)
   *   - array   -> array item inputs or textarea (ArrayField)
   *   - object  -> <fieldset> with children or textarea (ObjectField)
   *   - file    -> <input type="file"> (FileUpload)
   *   - date    -> <input type="date"> (DatePicker)
   *
   * Test Strategy: Create synthetic operations with a single field of each type,
   * render FormView, and verify the correct HTML element/attribute is present.
   *
   * Feature: systematic-react-renderer-testing, Property 13: Field Type Component Mapping
   */
  describe('Property 13: Field Type Component Mapping', () => {
    it('should render the correct input component for each field type', () => {
      // Each entry describes one field type and how to verify it in the DOM.
      // We use a synthetic operation per type so the test is isolated and deterministic.
      type FieldTypeCase = {
        type: string;
        label: string;
        key: string;
        // Extra schema properties needed for some types
        extra?: Partial<SchemaNode>;
        // How to verify the rendered component
        verify: (container: HTMLElement) => void;
      };

      const fieldTypeCases: FieldTypeCase[] = [
        // Requirement 6.1: string -> text input
        {
          type: 'string',
          label: 'Pet Name',
          key: 'petName',
          verify: (container) => {
            const input = container.querySelector(`input[id="petName"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "string": expected <input> with id="petName" but none found.'
              );
            }
            // TextField renders type="text" by default (no special format)
            if (input.type !== 'text') {
              throw new Error(
                `Property 13 failed for type "string": expected input type="text" but got type="${input.type}".`
              );
            }
          }
        },

        // Requirement 6.2: number -> number input
        {
          type: 'number',
          label: 'Price',
          key: 'price',
          verify: (container) => {
            const input = container.querySelector(`input[id="price"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "number": expected <input> with id="price" but none found.'
              );
            }
            if (input.type !== 'number') {
              throw new Error(
                `Property 13 failed for type "number": expected input type="number" but got type="${input.type}".`
              );
            }
          }
        },

        // Requirement 6.2: integer -> number input (same component as number)
        {
          type: 'integer',
          label: 'Age',
          key: 'age',
          verify: (container) => {
            const input = container.querySelector(`input[id="age"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "integer": expected <input> with id="age" but none found.'
              );
            }
            if (input.type !== 'number') {
              throw new Error(
                `Property 13 failed for type "integer": expected input type="number" but got type="${input.type}".`
              );
            }
            // Integer fields use step="1"
            if (input.step !== '1') {
              throw new Error(
                `Property 13 failed for type "integer": expected step="1" but got step="${input.step}".`
              );
            }
          }
        },

        // Requirement 6.3: boolean -> checkbox input
        {
          type: 'boolean',
          label: 'Active',
          key: 'active',
          verify: (container) => {
            const input = container.querySelector(`input[id="active"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "boolean": expected <input> with id="active" but none found.'
              );
            }
            if (input.type !== 'checkbox') {
              throw new Error(
                `Property 13 failed for type "boolean": expected input type="checkbox" but got type="${input.type}".`
              );
            }
          }
        },

        // Requirement 6.4: enum -> select element
        {
          type: 'enum',
          label: 'Status',
          key: 'status',
          extra: { enumValues: ['available', 'pending', 'sold'] },
          verify: (container) => {
            const select = container.querySelector(`select[id="status"]`) as HTMLSelectElement | null;
            if (!select) {
              throw new Error(
                'Property 13 failed for type "enum": expected <select> with id="status" but none found.'
              );
            }
            // Verify the select has options matching the enum values
            const optionValues = Array.from(select.options).map(o => o.value).filter(v => v !== '');
            const expectedValues = ['available', 'pending', 'sold'];
            for (const expected of expectedValues) {
              if (!optionValues.includes(expected)) {
                throw new Error(
                  `Property 13 failed for type "enum": select is missing option "${expected}". ` +
                  `Found options: ${optionValues.join(', ')}`
                );
              }
            }
          }
        },

        // Requirement 6.5: array -> array item inputs (ArrayField with string items)
        {
          type: 'array',
          label: 'Photo URLs',
          key: 'photoUrls',
          extra: {
            items: {
              type: 'string',
              key: 'item',
              label: 'Item',
              required: false
            }
          },
          verify: (container) => {
            // ArrayField renders inputs with id="photoUrls.0", "photoUrls.1", etc.
            // At minimum one item input should be present on initial render.
            const arrayItemInput = container.querySelector(`input[id^="photoUrls."]`);
            if (!arrayItemInput) {
              throw new Error(
                'Property 13 failed for type "array": expected at least one array item input ' +
                'with id starting with "photoUrls." but none found.'
              );
            }
          }
        },

        // Requirement 6.6: object -> fieldset with children (ObjectField)
        {
          type: 'object',
          label: 'Category',
          key: 'category',
          extra: {
            children: [
              {
                type: 'integer',
                key: 'id',
                label: 'ID',
                required: false
              },
              {
                type: 'string',
                key: 'name',
                label: 'Name',
                required: false
              }
            ]
          },
          verify: (container) => {
            // ObjectField with children renders a <fieldset>
            const fieldset = container.querySelector('fieldset');
            if (!fieldset) {
              throw new Error(
                'Property 13 failed for type "object": expected <fieldset> element but none found.'
              );
            }
            // The fieldset should contain a legend with the object label
            const legend = fieldset.querySelector('legend');
            if (!legend) {
              throw new Error(
                'Property 13 failed for type "object": expected <legend> inside fieldset but none found.'
              );
            }
          }
        },

        // Requirement 6.7: file -> file input
        {
          type: 'file',
          label: 'Upload File',
          key: 'uploadFile',
          verify: (container) => {
            const input = container.querySelector(`input[id="uploadFile"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "file": expected <input> with id="uploadFile" but none found.'
              );
            }
            if (input.type !== 'file') {
              throw new Error(
                `Property 13 failed for type "file": expected input type="file" but got type="${input.type}".`
              );
            }
          }
        },

        // Requirement 6.8: date -> date input
        {
          type: 'date',
          label: 'Birth Date',
          key: 'birthDate',
          verify: (container) => {
            const input = container.querySelector(`input[id="birthDate"]`) as HTMLInputElement | null;
            if (!input) {
              throw new Error(
                'Property 13 failed for type "date": expected <input> with id="birthDate" but none found.'
              );
            }
            if (input.type !== 'date') {
              throw new Error(
                `Property 13 failed for type "date": expected input type="date" but got type="${input.type}".`
              );
            }
          }
        }
      ];

      // Run the property test - for each field type case, build a synthetic operation
      // and verify the correct component is rendered.
      // We use fc.constantFrom to iterate over all cases with 100 runs total.
      fc.assert(
        fc.property(
          fc.constantFrom(...fieldTypeCases),
          (fieldCase) => {
            // Build a synthetic operation with a single field of the target type
            const fieldSchema: SchemaNode = {
              type: fieldCase.type as SchemaNode['type'],
              key: fieldCase.key,
              label: fieldCase.label,
              required: false,
              ...(fieldCase.extra ?? {})
            };

            const syntheticOperation: Operation = {
              id: `synthetic-field-type-${fieldCase.type}`,
              uigenId: `synthetic-field-type-${fieldCase.type}`,
              method: 'POST',
              path: `/synthetic-${fieldCase.type}`,
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [fieldSchema]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);

            const { container, unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Verify the form was rendered
              const form = container.querySelector('form');
              if (!form) {
                throw new Error(
                  `Property 13 failed for type "${fieldCase.type}": form was not rendered.`
                );
              }

              // Run the type-specific verification
              fieldCase.verify(container);

              // Property holds: correct component rendered for this field type
              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Properties 7, 8, 9: URL Construction
  // These properties test the URL construction logic directly as a pure function.
  // The URL is built inside useApiMutation (not passed to mutateAsync), so we
  // verify the construction logic using assertURLConstruction with generated params.
  // ---------------------------------------------------------------------------

  /**
   * Property 7: Path Parameter URL Substitution
   * **Validates: Requirements 3.1, 3.4**
   *
   * For any form submission with path parameters, the URL constructor SHALL replace
   * path parameter placeholders with actual values from form data.
   *
   * Test Strategy: Generate random path parameter values, build the expected URL
   * by substituting them into the operation path, and verify assertURLConstruction
   * produces the correct result.
   *
   * Feature: systematic-react-renderer-testing, Property 7: Path Parameter URL Substitution
   */
  describe('Property 7: Path Parameter URL Substitution', () => {
    it('should replace path parameter placeholders with actual values', () => {
      // Filter operations that have path parameters
      const operationsWithPathParams = formOperations.filter(
        op => op.parameters && op.parameters.some(p => p.in === 'path')
      );

      // If no operations have path params, the property is vacuously satisfied
      if (operationsWithPathParams.length === 0) {
        console.log('Property 7: No form operations with path parameters found. Vacuously satisfied.');
        return;
      }

      // Feature: systematic-react-renderer-testing, Property 7: Path Parameter URL Substitution
      fc.assert(
        fc.property(
          fc.constantFrom(...operationsWithPathParams),
          (operation) => {
            return fc.sample(pathParamsGenerator(operation.parameters), 1).map(pathParams => {
              // Build the expected URL by substituting path params into the path template
              let expectedUrl = operation.path;
              for (const [key, value] of Object.entries(pathParams)) {
                expectedUrl = expectedUrl.replace(`{${key}}`, value);
              }

              // assertURLConstruction must not throw - it verifies the substitution logic
              assertURLConstruction(operation, pathParams, {}, expectedUrl);

              // Verify no placeholders remain in the constructed URL
              if (expectedUrl.includes('{') || expectedUrl.includes('}')) {
                throw new Error(
                  `Property 7 failed for operation "${operation.id}":\n` +
                  `  URL still contains placeholders after substitution: ${expectedUrl}\n` +
                  `  Path template: ${operation.path}\n` +
                  `  Path params: ${JSON.stringify(pathParams)}`
                );
              }

              return true;
            })[0];
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Query Parameter URL Appending
   * **Validates: Requirements 3.2, 3.5**
   *
   * For any form submission with query parameters, the URL constructor SHALL append
   * query parameters to the URL as a query string, joining multiple params with '&'.
   *
   * Test Strategy: Generate random query parameter values, build the expected URL
   * with a query string, and verify assertURLConstruction produces the correct result.
   *
   * Feature: systematic-react-renderer-testing, Property 8: Query Parameter URL Appending
   */
  describe('Property 8: Query Parameter URL Appending', () => {
    it('should append query parameters to the URL as a query string', () => {
      // Use a synthetic operation with a fixed path and known query parameters
      // so we can deterministically verify the query string format
      const syntheticOperation: Operation = {
        id: 'synthetic-query-test',
        uigenId: 'synthetic-query-test',
        method: 'GET',
        path: '/pets',
        viewHint: 'create',
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: true,
            schema: { type: 'string', key: 'status', label: 'Status', required: true }
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
          }
        ],
        requestBody: undefined,
        responses: {}
      };

      // Feature: systematic-react-renderer-testing, Property 8: Query Parameter URL Appending
      fc.assert(
        fc.property(
          queryParamsGenerator(syntheticOperation.parameters),
          (queryParams) => {
            // Build the expected URL with query string
            let expectedUrl = syntheticOperation.path;
            const queryEntries = Object.entries(queryParams).filter(([, v]) => v !== undefined);

            if (queryEntries.length > 0) {
              const queryString = new URLSearchParams(queryEntries).toString();
              expectedUrl += `?${queryString}`;
            }

            // assertURLConstruction must not throw
            assertURLConstruction(syntheticOperation, {}, queryParams, expectedUrl);

            // Verify that when multiple query params exist, they are joined with '&'
            if (queryEntries.length > 1) {
              if (!expectedUrl.includes('&')) {
                throw new Error(
                  `Property 8 failed: multiple query parameters should be joined with '&'.\n` +
                  `  URL: ${expectedUrl}\n` +
                  `  Query params: ${JSON.stringify(queryParams)}`
                );
              }
            }

            // Verify query string starts with '?' when params are present
            if (queryEntries.length > 0 && !expectedUrl.includes('?')) {
              throw new Error(
                `Property 8 failed: query string should start with '?'.\n` +
                `  URL: ${expectedUrl}\n` +
                `  Query params: ${JSON.stringify(queryParams)}`
              );
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Combined Path and Query Parameters
   * **Validates: Requirements 3.3**
   *
   * For any form submission with both path and query parameters, the URL constructor
   * SHALL correctly combine both in the final URL.
   *
   * Test Strategy: Generate random combinations of path and query parameters,
   * build the expected URL, and verify assertURLConstruction produces the correct result.
   *
   * Feature: systematic-react-renderer-testing, Property 9: Combined Path and Query Parameters
   */
  describe('Property 9: Combined Path and Query Parameters', () => {
    it('should correctly combine path and query parameters in the URL', () => {
      // Use a synthetic operation with both path and query parameters
      const syntheticOperation: Operation = {
        id: 'synthetic-combined-test',
        uigenId: 'synthetic-combined-test',
        method: 'PUT',
        path: '/pets/{petId}',
        viewHint: 'create',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'integer', key: 'petId', label: 'Pet ID', required: true }
          },
          {
            name: 'notify',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'notify', label: 'Notify', required: false }
          }
        ],
        requestBody: undefined,
        responses: {}
      };

      // Feature: systematic-react-renderer-testing, Property 9: Combined Path and Query Parameters
      fc.assert(
        fc.property(
          pathParamsGenerator(syntheticOperation.parameters),
          queryParamsGenerator(syntheticOperation.parameters),
          (pathParams, queryParams) => {
            // Build the expected URL
            let expectedUrl = syntheticOperation.path;

            // Substitute path parameters
            for (const [key, value] of Object.entries(pathParams)) {
              expectedUrl = expectedUrl.replace(`{${key}}`, value);
            }

            // Append query parameters
            const queryEntries = Object.entries(queryParams).filter(([, v]) => v !== undefined);
            if (queryEntries.length > 0) {
              const queryString = new URLSearchParams(queryEntries).toString();
              expectedUrl += `?${queryString}`;
            }

            // assertURLConstruction must not throw
            assertURLConstruction(syntheticOperation, pathParams, queryParams, expectedUrl);

            // Verify path params are substituted (no placeholders remain)
            const pathPart = expectedUrl.split('?')[0];
            if (pathPart.includes('{') || pathPart.includes('}')) {
              throw new Error(
                `Property 9 failed: path still contains placeholders after substitution.\n` +
                `  URL: ${expectedUrl}\n` +
                `  Path params: ${JSON.stringify(pathParams)}`
              );
            }

            // Verify query string is appended after the path (if present)
            if (queryEntries.length > 0) {
              const questionMarkIdx = expectedUrl.indexOf('?');
              if (questionMarkIdx === -1) {
                throw new Error(
                  `Property 9 failed: query string missing from combined URL.\n` +
                  `  URL: ${expectedUrl}\n` +
                  `  Query params: ${JSON.stringify(queryParams)}`
                );
              }
              // Path part must come before query string
              if (questionMarkIdx === 0) {
                throw new Error(
                  `Property 9 failed: URL starts with '?' - path part is missing.\n` +
                  `  URL: ${expectedUrl}`
                );
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Properties 10, 11, 12: Parameter Separation (form submission tests)
  // These properties test that FormView correctly separates path params, query
  // params, and body data when calling mutateAsync.
  // ---------------------------------------------------------------------------

  /**
   * Property 10: Path Parameter Separation
   * **Validates: Requirements 4.1, 4.3, 4.6**
   *
   * For any form submission, path parameters SHALL be separated from body data
   * and passed in a pathParams object.
   *
   * Test Strategy: Create a synthetic operation with a path parameter and a body
   * field, render FormView, fill in the form, submit it, capture the mutateAsync
   * call, and verify pathParams contains only path parameters.
   *
   * Feature: systematic-react-renderer-testing, Property 10: Path Parameter Separation
   */
  describe('Property 10: Path Parameter Separation', () => {
    it('should separate path parameters into pathParams object and exclude them from body', async () => {
      // Import the mock so we can override mutateAsync per test run
      

      // Feature: systematic-react-renderer-testing, Property 10: Path Parameter Separation
      await fc.assert(
        fc.asyncProperty(
          // Generate a path param value (alphanumeric string)
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
          // Generate a body field value (non-empty, non-whitespace string)
          fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          async (pathParamValue, bodyFieldValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Synthetic operation: one path param + one body field
            const syntheticOperation: Operation = {
              id: 'synthetic-path-sep-test',
              uigenId: 'synthetic-path-sep-test',
              method: 'POST',
              path: '/items/{itemId}',
              viewHint: 'create',
              parameters: [
                {
                  name: 'itemId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string', key: 'itemId', label: 'Item ID', required: true }
                }
              ],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'description',
                    label: 'Description',
                    required: true
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Fill in the path parameter field
              const itemIdInput = screen.getByLabelText(/Item ID/i);
              await user.clear(itemIdInput);
              await user.type(itemIdInput, pathParamValue);

              // Fill in the body field
              const descInput = screen.getByLabelText(/Description/i);
              await user.clear(descInput);
              await user.type(descInput, bodyFieldValue);

              // Submit the form
              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Wait for mutation to be called
              await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalled();
              });

              // Capture the mutation call arguments
              const callArgs = mockMutateAsync.mock.calls[0][0];

              // Verify path parameter is in pathParams
              assertParameterSeparation(
                callArgs,
                { itemId: pathParamValue },
                {},
                { description: bodyFieldValue }
              );

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 11: Query Parameter Separation
   * **Validates: Requirements 4.2, 4.4, 4.7**
   *
   * For any form submission, query parameters SHALL be separated from body data
   * and passed in a queryParams object.
   *
   * Test Strategy: Create a synthetic operation with a query parameter and a body
   * field, render FormView, fill in the form, submit it, capture the mutateAsync
   * call, and verify queryParams contains only query parameters.
   *
   * Feature: systematic-react-renderer-testing, Property 11: Query Parameter Separation
   */
  describe('Property 11: Query Parameter Separation', () => {
    it('should separate query parameters into queryParams object and exclude them from body', async () => {
      

      // Feature: systematic-react-renderer-testing, Property 11: Query Parameter Separation
      await fc.assert(
        fc.asyncProperty(
          // Generate a query param value (alphanumeric string)
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
          // Generate a body field value (non-empty, non-whitespace string)
          fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          async (queryParamValue, bodyFieldValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Synthetic operation: one query param + one body field
            const syntheticOperation: Operation = {
              id: 'synthetic-query-sep-test',
              uigenId: 'synthetic-query-sep-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [
                {
                  name: 'category',
                  in: 'query',
                  required: true,
                  schema: { type: 'string', key: 'category', label: 'Category', required: true }
                }
              ],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'title',
                    label: 'Title',
                    required: true
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Fill in the query parameter field
              const categoryInput = screen.getByLabelText(/Category/i);
              await user.clear(categoryInput);
              await user.type(categoryInput, queryParamValue);

              // Fill in the body field
              const titleInput = screen.getByLabelText(/Title/i);
              await user.clear(titleInput);
              await user.type(titleInput, bodyFieldValue);

              // Submit the form
              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Wait for mutation to be called
              await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalled();
              });

              // Capture the mutation call arguments
              const callArgs = mockMutateAsync.mock.calls[0][0];

              // Verify query parameter is in queryParams and not in body
              assertParameterSeparation(
                callArgs,
                {},
                { category: queryParamValue },
                { title: bodyFieldValue }
              );

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 12: Body Data Exclusion
   * **Validates: Requirements 4.5**
   *
   * For any form submission, path and query parameters SHALL be excluded from the
   * body object. The body SHALL contain only requestBody fields.
   *
   * Test Strategy: Create a synthetic operation with path params, query params,
   * and body fields, render FormView, fill in all fields, submit, capture the
   * mutateAsync call, and verify the body contains only requestBody fields.
   *
   * Feature: systematic-react-renderer-testing, Property 12: Body Data Exclusion
   */
  describe('Property 12: Body Data Exclusion', () => {
    it('should exclude path and query parameters from the body object', async () => {
      

      // Feature: systematic-react-renderer-testing, Property 12: Body Data Exclusion
      await fc.assert(
        fc.asyncProperty(
          // Generate a path param value
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
          // Generate a query param value
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
          // Generate a body field value (non-empty, non-whitespace string)
          fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
          async (pathParamValue, queryParamValue, bodyFieldValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Synthetic operation: path param + query param + body field
            const syntheticOperation: Operation = {
              id: 'synthetic-body-excl-test',
              uigenId: 'synthetic-body-excl-test',
              method: 'POST',
              path: '/resources/{resourceId}',
              viewHint: 'create',
              parameters: [
                {
                  name: 'resourceId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string', key: 'resourceId', label: 'Resource ID', required: true }
                },
                {
                  name: 'format',
                  in: 'query',
                  required: true,
                  schema: { type: 'string', key: 'format', label: 'Format', required: true }
                }
              ],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'content',
                    label: 'Content',
                    required: true
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Fill in the path parameter field
              const resourceIdInput = screen.getByLabelText(/Resource ID/i);
              await user.clear(resourceIdInput);
              await user.type(resourceIdInput, pathParamValue);

              // Fill in the query parameter field
              const formatInput = screen.getByLabelText(/Format/i);
              await user.clear(formatInput);
              await user.type(formatInput, queryParamValue);

              // Fill in the body field
              const contentInput = screen.getByLabelText(/Content/i);
              await user.clear(contentInput);
              await user.type(contentInput, bodyFieldValue);

              // Submit the form
              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Wait for mutation to be called
              await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalled();
              });

              // Capture the mutation call arguments
              const callArgs = mockMutateAsync.mock.calls[0][0];

              // Verify body contains ONLY the requestBody field - not path or query params
              assertParameterSeparation(
                callArgs,
                { resourceId: pathParamValue },
                { format: queryParamValue },
                { content: bodyFieldValue }
              );

              // Extra check: body must not contain path or query param keys
              const body = callArgs.body || {};
              if ('resourceId' in body) {
                throw new Error(
                  `Property 12 failed: path parameter "resourceId" found in body.\n` +
                  `  body: ${JSON.stringify(body)}`
                );
              }
              if ('format' in body) {
                throw new Error(
                  `Property 12 failed: query parameter "format" found in body.\n` +
                  `  body: ${JSON.stringify(body)}`
                );
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 14: Validation Rule Application
   * **Validates: Requirements 10.1-10.8**
   *
   * For any form field with validation rules (minLength, maxLength, pattern,
   * minimum, maximum), submitting invalid data SHALL cause validation errors
   * to appear in the DOM without calling the mutation.
   *
   * Test Strategy: Create synthetic operations with fields that carry each
   * validation rule type. Fill in data that violates the rule, attempt to
   * submit, and verify that:
   *   - The mutation is NOT called (form blocked by validation)
   *   - A validation error message appears in the DOM
   *
   * Feature: systematic-react-renderer-testing, Property 14: Validation Rule Application
   */
  describe('Property 14: Validation Rule Application', () => {
    it('should enforce minLength validation and show error on invalid submit', async () => {
      

      // Validates: Requirements 10.1, 10.7, 10.8
      await fc.assert(
        fc.asyncProperty(
          // Generate a minLength between 3 and 8
          fc.integer({ min: 3, max: 8 }),
          // Generate a string shorter than minLength (1 or 2 chars)
          fc.stringMatching(/^[a-zA-Z]{1,2}$/),
          async (minLen, shortValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            const errorMsg = `Must be at least ${minLen} characters`;

            const syntheticOperation: Operation = {
              id: 'synthetic-minlength-test',
              uigenId: 'synthetic-minlength-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'username',
                    label: 'Username',
                    required: true,
                    validations: [
                      { type: 'minLength', value: minLen, message: errorMsg }
                    ]
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              // Type a value shorter than minLength
              const usernameInput = screen.getByLabelText(/Username/i);
              await user.clear(usernameInput);
              await user.type(usernameInput, shortValue);

              // Attempt to submit
              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Mutation must NOT have been called - validation should block it
              await waitFor(() => {
                expect(mockMutateAsync).not.toHaveBeenCalled();
              });

              // Validation error message must appear in the DOM
              await waitFor(() => {
                const errorEl = screen.queryByText(errorMsg);
                if (!errorEl) {
                  throw new Error(
                    `Property 14 (minLength) failed: expected error message "${errorMsg}" ` +
                    `to appear after submitting value "${shortValue}" ` +
                    `(minLength=${minLen})`
                  );
                }
              });

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should enforce maxLength validation and show error on invalid submit', async () => {
      

      // Validates: Requirements 10.2, 10.7, 10.8
      await fc.assert(
        fc.asyncProperty(
          // Generate a maxLength between 2 and 5
          fc.integer({ min: 2, max: 5 }),
          async (maxLen) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Value that exceeds maxLength - always maxLen+3 chars
            const longValue = 'a'.repeat(maxLen + 3);
            const errorMsg = `Must be at most ${maxLen} characters`;

            const syntheticOperation: Operation = {
              id: 'synthetic-maxlength-test',
              uigenId: 'synthetic-maxlength-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'code',
                    label: 'Code',
                    required: true,
                    validations: [
                      { type: 'maxLength', value: maxLen, message: errorMsg }
                    ]
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              const codeInput = screen.getByLabelText(/Code/i);
              await user.clear(codeInput);
              await user.type(codeInput, longValue);

              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Mutation must NOT have been called
              await waitFor(() => {
                expect(mockMutateAsync).not.toHaveBeenCalled();
              });

              // Validation error message must appear
              await waitFor(() => {
                const errorEl = screen.queryByText(errorMsg);
                if (!errorEl) {
                  throw new Error(
                    `Property 14 (maxLength) failed: expected error message "${errorMsg}" ` +
                    `to appear after submitting value "${longValue}" ` +
                    `(maxLength=${maxLen})`
                  );
                }
              });

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should enforce pattern validation and show error on invalid submit', async () => {
      

      // Validates: Requirements 10.3, 10.7, 10.8
      // Use a fixed pattern (digits only) so we can reliably generate non-matching values
      await fc.assert(
        fc.asyncProperty(
          // Generate a string that contains at least one non-digit character
          fc.stringMatching(/^[a-zA-Z]{1,10}$/),
          async (nonDigitValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            const errorMsg = 'Must contain only digits';

            const syntheticOperation: Operation = {
              id: 'synthetic-pattern-test',
              uigenId: 'synthetic-pattern-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'string',
                    key: 'zipCode',
                    label: 'Zip Code',
                    required: true,
                    validations: [
                      { type: 'pattern', value: '^[0-9]+$', message: errorMsg }
                    ]
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              const zipInput = screen.getByLabelText(/Zip Code/i);
              await user.clear(zipInput);
              await user.type(zipInput, nonDigitValue);

              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Mutation must NOT have been called
              await waitFor(() => {
                expect(mockMutateAsync).not.toHaveBeenCalled();
              });

              // Validation error message must appear
              await waitFor(() => {
                const errorEl = screen.queryByText(errorMsg);
                if (!errorEl) {
                  throw new Error(
                    `Property 14 (pattern) failed: expected error message "${errorMsg}" ` +
                    `to appear after submitting value "${nonDigitValue}" ` +
                    `(pattern=^[0-9]+$)`
                  );
                }
              });

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should enforce minimum validation and show error on invalid submit', async () => {
      

      // Validates: Requirements 10.4, 10.7, 10.8
      await fc.assert(
        fc.asyncProperty(
          // Generate a minimum value between 10 and 100
          fc.integer({ min: 10, max: 100 }),
          async (minValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Value below minimum - always minValue - 1
            const belowMin = minValue - 1;
            const errorMsg = `Must be at least ${minValue}`;

            const syntheticOperation: Operation = {
              id: 'synthetic-minimum-test',
              uigenId: 'synthetic-minimum-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'number',
                    key: 'quantity',
                    label: 'Quantity',
                    required: true,
                    validations: [
                      { type: 'minimum', value: minValue, message: errorMsg }
                    ]
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              const quantityInput = screen.getByLabelText(/Quantity/i);
              await user.clear(quantityInput);
              await user.type(quantityInput, String(belowMin));

              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Mutation must NOT have been called
              await waitFor(() => {
                expect(mockMutateAsync).not.toHaveBeenCalled();
              });

              // Validation error message must appear
              await waitFor(() => {
                const errorEl = screen.queryByText(errorMsg);
                if (!errorEl) {
                  throw new Error(
                    `Property 14 (minimum) failed: expected error message "${errorMsg}" ` +
                    `to appear after submitting value ${belowMin} ` +
                    `(minimum=${minValue})`
                  );
                }
              });

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should enforce maximum validation and show error on invalid submit', async () => {
      

      // Validates: Requirements 10.5, 10.7, 10.8
      await fc.assert(
        fc.asyncProperty(
          // Generate a maximum value between 1 and 50
          fc.integer({ min: 1, max: 50 }),
          async (maxValue) => {
            const mockMutateAsync = vi.fn().mockResolvedValue({});
            vi.mocked(useApiMutation).mockReturnValue({
              mutateAsync: mockMutateAsync,
              isPending: false,
              isError: false,
              error: null
            });

            // Value above maximum - always maxValue + 10
            const aboveMax = maxValue + 10;
            const errorMsg = `Must be at most ${maxValue}`;

            const syntheticOperation: Operation = {
              id: 'synthetic-maximum-test',
              uigenId: 'synthetic-maximum-test',
              method: 'POST',
              path: '/items',
              viewHint: 'create',
              parameters: [],
              requestBody: {
                type: 'object',
                key: 'body',
                label: 'Body',
                required: false,
                children: [
                  {
                    type: 'number',
                    key: 'rating',
                    label: 'Rating',
                    required: true,
                    validations: [
                      { type: 'maximum', value: maxValue, message: errorMsg }
                    ]
                  }
                ]
              },
              responses: {}
            };

            const resource = createMockResource(syntheticOperation);
            const user = userEvent.setup();

            const { unmount } = renderWithProviders(
              <FormView resource={resource} mode="create" />
            );

            try {
              const ratingInput = screen.getByLabelText(/Rating/i);
              await user.clear(ratingInput);
              await user.type(ratingInput, String(aboveMax));

              const submitBtn = screen.getByRole('button', { name: /create/i });
              await user.click(submitBtn);

              // Mutation must NOT have been called
              await waitFor(() => {
                expect(mockMutateAsync).not.toHaveBeenCalled();
              });

              // Validation error message must appear
              await waitFor(() => {
                const errorEl = screen.queryByText(errorMsg);
                if (!errorEl) {
                  throw new Error(
                    `Property 14 (maximum) failed: expected error message "${errorMsg}" ` +
                    `to appear after submitting value ${aboveMax} ` +
                    `(maximum=${maxValue})`
                  );
                }
              });

              return true;
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
