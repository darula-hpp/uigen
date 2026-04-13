import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextField } from '../fields/TextField';
import { ListView } from '../views/ListView';
import { DetailView } from '../views/DetailView';
import type { Resource, SchemaNode } from '@uigen-dev/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({
    data: [{ id: '1', name: 'Test' }],
    isLoading: false,
    error: null,
  })),
  useApiMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Field Metadata Display', () => {
  it('should display help text below form fields - Requirement 63.1', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'email',
      label: 'Email',
      required: true,
      description: 'Enter your email address',
    };

    const mockRegister = vi.fn(() => ({}));
    
    render(
      <TextField
        schema={schema}
        value=""
        onChange={() => {}}
        register={mockRegister as any}
        errors={{}}
      />
    );

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('should include validation constraint information in help text - Requirement 63.2', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'username',
      label: 'Username',
      required: true,
      description: 'Choose a username',
      validations: [
        { type: 'minLength', value: 3 },
        { type: 'maxLength', value: 20 },
      ],
    };

    const mockRegister = vi.fn(() => ({}));
    
    render(
      <TextField
        schema={schema}
        value=""
        onChange={() => {}}
        register={mockRegister as any}
        errors={{}}
      />
    );

    const helpText = screen.getByText(/Choose a username/);
    expect(helpText).toBeInTheDocument();
    expect(helpText.textContent).toContain('Min length: 3');
    expect(helpText.textContent).toContain('Max length: 20');
  });

  it('should style help text in muted color - Requirement 63.3', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'email',
      label: 'Email',
      required: true,
      description: 'Enter your email address',
    };

    const mockRegister = vi.fn(() => ({}));
    
    render(
      <TextField
        schema={schema}
        value=""
        onChange={() => {}}
        register={mockRegister as any}
        errors={{}}
      />
    );

    const helpText = screen.getByText('Enter your email address');
    expect(helpText).toHaveClass('text-muted-foreground');
  });

  it('should display resource description in list view - Requirement 61.1', () => {
    const mockResource: Resource = {
      name: 'User',
      slug: 'users',
      description: 'Manage user accounts',
      operations: [
        {
          id: 'listUsers',
          method: 'GET',
          path: '/users',
          summary: 'List users',
          parameters: [],
          responses: {
            '200': {
              description: 'Success',
            },
          },
          viewHint: 'list',
        },
      ],
      schema: {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    };

    render(<ListView resource={mockResource} />, { wrapper: createWrapper() });

    expect(screen.getByText('Manage user accounts')).toBeInTheDocument();
  });

  it('should display resource description in detail view - Requirement 61.3', () => {
    const mockResource: Resource = {
      name: 'User',
      slug: 'users',
      description: 'User account details',
      operations: [
        {
          id: 'getUser',
          method: 'GET',
          path: '/users/{id}',
          summary: 'Get user',
          parameters: [],
          responses: {
            '200': {
              description: 'Success',
              schema: {
                type: 'object',
                key: 'user',
                label: 'User',
                required: false,
                children: [
                  { type: 'string', key: 'id', label: 'ID', required: true },
                  { type: 'string', key: 'name', label: 'Name', required: true },
                ],
              },
            },
          },
          viewHint: 'detail',
        },
      ],
      schema: {
        type: 'object',
        key: 'user',
        label: 'User',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    };

    render(<DetailView resource={mockResource} />, { wrapper: createWrapper() });

    expect(screen.getByText('User account details')).toBeInTheDocument();
  });
});
