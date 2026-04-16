import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormView } from '../FormView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { Resource, Operation } from '@uigen-dev/core';

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

describe('FormView - Parameter Handling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement, initialRoute = '/') => {
    window.history.pushState({}, 'Test page', initialRoute);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should include path parameters as form fields', () => {
    const operation: Operation = {
      id: 'uploadFile',
      uigenId: 'Pet.uploadFile',
      method: 'POST',
      path: '/pet/{petId}/uploadImage',
      viewHint: 'action',
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            key: 'petId',
            label: 'Pet ID',
            required: true
          }
        }
      ],
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Upload Image',
        required: true,
        children: [
          {
            type: 'file',
            key: 'file',
            label: 'Image File',
            required: true
          }
        ]
      },
      responses: {}
    };

    const resource: Resource = {
      name: 'Pet',
      slug: 'pet',
      uigenId: 'Pet',
      operations: [operation],
      schema: {
        type: 'object',
        key: 'Pet',
        label: 'Pet',
        required: false,
        children: []
      },
      relationships: []
    };

    renderWithProviders(
      <FormView resource={resource} mode="create" />,
      '/?operation=uploadFile'
    );

    // Path parameter should appear as a form field
    expect(screen.getByLabelText(/Pet ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Image File/i)).toBeInTheDocument();
  });

  it('should include query parameters as form fields', () => {
    const operation: Operation = {
      id: 'searchPets',
      uigenId: 'Pet.search',
      method: 'GET',
      path: '/pet/search',
      viewHint: 'search',
      parameters: [
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            key: 'status',
            label: 'Status',
            required: false,
            enumValues: ['available', 'pending', 'sold']
          }
        },
        {
          name: 'tags',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            key: 'tags',
            label: 'Tags',
            required: false
          }
        }
      ],
      requestBody: undefined,
      responses: {}
    };

    const resource: Resource = {
      name: 'Pet',
      slug: 'pet',
      uigenId: 'Pet',
      operations: [operation],
      schema: {
        type: 'object',
        key: 'Pet',
        label: 'Pet',
        required: false,
        children: []
      },
      relationships: []
    };

    renderWithProviders(
      <FormView resource={resource} mode="create" />,
      '/?operation=searchPets'
    );

    // Query parameters should appear as form fields
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();
  });

  it('should NOT include header or cookie parameters as form fields', () => {
    const operation: Operation = {
      id: 'createPet',
      uigenId: 'Pet.create',
      method: 'POST',
      path: '/pet',
      viewHint: 'create',
      parameters: [
        {
          name: 'X-Request-ID',
          in: 'header',
          required: false,
          schema: {
            type: 'string',
            key: 'X-Request-ID',
            label: 'Request ID',
            required: false
          }
        },
        {
          name: 'session',
          in: 'cookie',
          required: false,
          schema: {
            type: 'string',
            key: 'session',
            label: 'Session',
            required: false
          }
        }
      ],
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Pet',
        required: true,
        children: [
          {
            type: 'string',
            key: 'name',
            label: 'Name',
            required: true
          }
        ]
      },
      responses: {}
    };

    const resource: Resource = {
      name: 'Pet',
      slug: 'pet',
      uigenId: 'Pet',
      operations: [operation],
      schema: {
        type: 'object',
        key: 'Pet',
        label: 'Pet',
        required: false,
        children: []
      },
      relationships: []
    };

    renderWithProviders(
      <FormView resource={resource} mode="create" />
    );

    // Header and cookie parameters should NOT appear as form fields
    expect(screen.queryByLabelText(/Request ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Session/i)).not.toBeInTheDocument();
    
    // But body fields should appear
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
  });

  it('should separate path, query, and body parameters on submission', async () => {
    const { useApiMutation } = await import('@/hooks/useApiCall');
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    (useApiMutation as any).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null
    });

    const operation: Operation = {
      id: 'uploadFile',
      uigenId: 'Pet.uploadFile',
      method: 'POST',
      path: '/pet/{petId}/uploadImage',
      viewHint: 'action',
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            key: 'petId',
            label: 'Pet ID',
            required: true
          }
        },
        {
          name: 'additionalMetadata',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            key: 'additionalMetadata',
            label: 'Additional Metadata',
            required: false
          }
        }
      ],
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Upload Image',
        required: true,
        children: [
          {
            type: 'string',
            key: 'description',
            label: 'Description',
            required: false
          }
        ]
      },
      responses: {}
    };

    const resource: Resource = {
      name: 'Pet',
      slug: 'pet',
      uigenId: 'Pet',
      operations: [operation],
      schema: {
        type: 'object',
        key: 'Pet',
        label: 'Pet',
        required: false,
        children: []
      },
      relationships: []
    };

    const user = userEvent.setup();
    renderWithProviders(
      <FormView resource={resource} mode="create" />,
      '/?operation=uploadFile'
    );

    // Fill in the form
    await user.type(screen.getByLabelText(/Pet ID/i), '123');
    await user.type(screen.getByLabelText(/Additional Metadata/i), 'test metadata');
    await user.type(screen.getByLabelText(/Description/i), 'test description');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /create/i }));

    // Wait for mutation to be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    // Verify parameters are separated correctly
    const callArgs = mockMutateAsync.mock.calls[0][0];
    expect(callArgs).toEqual({
      pathParams: { petId: '123' },
      queryParams: { additionalMetadata: 'test metadata' },
      body: { description: 'test description' }
    });
  });
});
