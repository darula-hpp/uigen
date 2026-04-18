import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefSelectField } from '../RefSelectField';
import type { FieldProps } from '../ComponentRegistry';
import type { SchemaNode } from '@uigen-dev/core';

/**
 * Test wrapper component that provides react-hook-form and react-query context
 */
function TestWrapper({
  children,
  defaultValues = {},
  queryClient,
}: {
  children: React.ReactNode;
  defaultValues?: any;
  queryClient: QueryClient;
}) {
  const methods = useForm({ defaultValues });
  const { register, formState: { errors } } = methods;

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <form>
          {typeof children === 'function' ? children({ register, errors }) : children}
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe('RefSelectField Component', () => {
  let queryClient: QueryClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    queryClient.clear();
  });

  it('should render a select widget when fetch succeeds with options', async () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: '{first_name} {last_name}',
      filter: {},
    };

    const mockUsers = [
      { id: '1', first_name: 'John', last_name: 'Doe' },
      { id: '2', first_name: 'Jane', last_name: 'Smith' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    render(
      <TestWrapper queryClient={queryClient}>
        {({ register, errors }) => (
          <RefSelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for options to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should fall back to TextField on fetch error (500 response)', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: 'name',
      filter: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    render(
      <TestWrapper queryClient={queryClient}>
        {({ register, errors }) => (
          <RefSelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RefSelectField] Failed to fetch options from /users')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should fall back to TextField on network error', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: 'name',
      filter: {},
    };

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper queryClient={queryClient}>
        {({ register, errors }) => (
          <RefSelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RefSelectField] Failed to fetch options from /users')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should render empty state on empty response', async () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: 'name',
      filter: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <TestWrapper queryClient={queryClient}>
        {({ register, errors }) => (
          <RefSelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('No options available')).toBeInTheDocument();
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should submit valueField value on form submit, not the display label', async () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: 'name',
      filter: {},
    };

    const mockUsers = [
      { id: 'user-123', name: 'John Doe' },
      { id: 'user-456', name: 'Jane Smith' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });

    const onSubmit = vi.fn();

    function TestForm() {
      const methods = useForm({ defaultValues: { assigned_to: '' } });

      return (
        <QueryClientProvider client={queryClient}>
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <RefSelectField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        </QueryClientProvider>
      );
    }

    render(<TestForm />);

    // Wait for options to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');

    // Select the first user
    await user.selectOptions(select, 'user-123');

    // Submit the form
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_to: 'user-123' }),
        expect.anything()
      );
    });
  });

  it('should append filter params to the fetch URL', async () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'assigned_to',
      label: 'Assigned To',
      required: false,
    };
    (schema as any).refConfig = {
      resource: '/users',
      valueField: 'id',
      labelField: 'name',
      filter: { active: true, role: 'admin' },
    };

    const mockUsers = [{ id: '1', name: 'Admin User' }];

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });
    global.fetch = fetchSpy;

    render(
      <TestWrapper queryClient={queryClient}>
        {({ register, errors }) => (
          <RefSelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Verify fetch was called with filter params
    expect(fetchSpy).toHaveBeenCalledWith('/users?active=true&role=admin');
  });
});
