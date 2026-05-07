import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { DateTimeField } from '../DateTimeField';
import type { SchemaNode } from '@uigen-dev/core';

/**
 * Test wrapper component that provides react-hook-form context
 */
function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) {
  const methods = useForm({ defaultValues });
  const { register, formState: { errors } } = methods;

  return (
    <FormProvider {...methods}>
      <form>
        {typeof children === 'function' ? children({ register, errors, methods }) : children}
      </form>
    </FormProvider>
  );
}

describe('DateTimeField Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Type Rendering', () => {
    it('should render date input for date-only formats', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'birth_date',
        label: 'Birth Date',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should render time input for time-only formats', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'meeting_time',
        label: 'Meeting Time',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'HH:mm',
        inputType: 'time',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('HH:mm');
      expect(input).toHaveAttribute('type', 'time');
    });

    it('should render datetime-local input for datetime formats', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD HH:mm',
        inputType: 'datetime-local',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('YYYY-MM-DD HH:mm');
      expect(input).toHaveAttribute('type', 'datetime-local');
    });
  });

  describe('Display Formatting', () => {
    it('should display formatted values correctly with ISO 8601 API format', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MMM DD, YYYY',
        inputType: 'date',
      };

      render(
        <TestWrapper defaultValues={{ created_at: '2021-01-15T00:00:00Z' }}>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('MMM DD, YYYY') as HTMLInputElement;
      expect(input.value).toBe('Jan 15, 2021');
    });

    it('should display formatted values with Unix timestamp API format (seconds)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MM/DD/YYYY',
        inputType: 'date',
        apiFormat: 'unix',
      };

      // Unix timestamp for 2021-01-15 00:00:00 UTC
      render(
        <TestWrapper defaultValues={{ created_at: 1610668800 }}>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('MM/DD/YYYY') as HTMLInputElement;
      expect(input.value).toBe('01/15/2021');
    });

    it('should display formatted values with Unix timestamp API format (milliseconds)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'DD/MM/YYYY',
        inputType: 'date',
        apiFormat: 'unix-ms',
      };

      // Unix timestamp in milliseconds for 2021-01-15 00:00:00 UTC
      render(
        <TestWrapper defaultValues={{ created_at: 1610668800000 }}>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('DD/MM/YYYY') as HTMLInputElement;
      expect(input.value).toBe('15/01/2021');
    });

    it('should display formatted values with custom API format pattern', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MMM DD, YYYY',
        inputType: 'date',
        apiFormat: 'YYYY-MM-DD',
      };

      render(
        <TestWrapper defaultValues={{ created_at: '2021-01-15' }}>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('MMM DD, YYYY') as HTMLInputElement;
      expect(input.value).toBe('Jan 15, 2021');
    });

    it('should handle null/undefined values gracefully', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MMM DD, YYYY',
        inputType: 'date',
      };

      render(
        <TestWrapper defaultValues={{ created_at: null }}>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('MMM DD, YYYY') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Input Handling and API Conversion', () => {
    it('should convert display input to ISO 8601 API format when apiFormat not specified', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MM/DD/YYYY',
        inputType: 'date',
      };

      const onSubmit = vi.fn();

      function TestForm() {
        const methods = useForm({ defaultValues: { created_at: '' } });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DateTimeField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<TestForm />);

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('MM/DD/YYYY');

      // User enters date in display format
      await user.clear(input);
      await user.type(input, '01/15/2021');

      // Submit the form
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const submittedData = onSubmit.mock.calls[0][0];
        // Should be ISO 8601 format
        expect(submittedData.created_at).toMatch(/2021-01-15/);
      });
    });

    it('should convert display input to Unix timestamp (seconds) when apiFormat is unix', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MM/DD/YYYY',
        inputType: 'date',
        apiFormat: 'unix',
      };

      const onSubmit = vi.fn();

      function TestForm() {
        const methods = useForm({ defaultValues: { created_at: '' } });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DateTimeField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<TestForm />);

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('MM/DD/YYYY');

      // User enters date in display format
      await user.clear(input);
      await user.type(input, '01/15/2021');

      // Submit the form
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const submittedData = onSubmit.mock.calls[0][0];
        // Should be Unix timestamp in seconds
        expect(typeof submittedData.created_at).toBe('number');
        expect(submittedData.created_at).toBe(1610668800);
      });
    });

    it('should convert display input to Unix timestamp (milliseconds) when apiFormat is unix-ms', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'DD/MM/YYYY',
        inputType: 'date',
        apiFormat: 'unix-ms',
      };

      const onSubmit = vi.fn();

      function TestForm() {
        const methods = useForm({ defaultValues: { created_at: '' } });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DateTimeField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<TestForm />);

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('DD/MM/YYYY');

      // User enters date in display format
      await user.clear(input);
      await user.type(input, '15/01/2021');

      // Submit the form
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const submittedData = onSubmit.mock.calls[0][0];
        // Should be Unix timestamp in milliseconds
        expect(typeof submittedData.created_at).toBe('number');
        expect(submittedData.created_at).toBe(1610668800000);
      });
    });

    it('should convert display input to custom API format pattern', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MMM DD, YYYY',
        inputType: 'date',
        apiFormat: 'YYYY-MM-DD',
      };

      const onSubmit = vi.fn();

      function TestForm() {
        const methods = useForm({ defaultValues: { created_at: '' } });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DateTimeField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<TestForm />);

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('MMM DD, YYYY');

      // User enters date in display format
      await user.clear(input);
      await user.type(input, 'Jan 15, 2021');

      // Submit the form
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const submittedData = onSubmit.mock.calls[0][0];
        // Should be in custom API format
        expect(submittedData.created_at).toBe('2021-01-15');
      });
    });

    it('should set null when input is cleared', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'MM/DD/YYYY',
        inputType: 'date',
      };

      const onSubmit = vi.fn();

      function TestForm() {
        const methods = useForm({ defaultValues: { created_at: '2021-01-15T00:00:00Z' } });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <DateTimeField
                schema={schema}
                value=""
                onChange={vi.fn()}
                register={methods.register}
                errors={methods.formState.errors}
              />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<TestForm />);

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('MM/DD/YYYY');

      // Clear the input
      await user.clear(input);

      // Submit the form
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.created_at).toBeNull();
      });
    });
  });

  describe('Timezone Display', () => {
    it('should show timezone information when configured', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD HH:mm',
        inputType: 'datetime-local',
        timezone: 'America/New_York',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('Timezone: America/New_York')).toBeInTheDocument();
    });

    it('should show "Local" for local timezone', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date',
        timezone: 'local',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('Timezone: Local')).toBeInTheDocument();
    });

    it('should not show timezone info when not configured', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      expect(screen.queryByText(/Timezone:/)).not.toBeInTheDocument();
    });
  });

  describe('Validation Error Display', () => {
    it('should display validation errors with proper ARIA attributes', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: true,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date',
      };

      const mockErrors = {
        created_at: {
          type: 'required',
          message: 'This field is required',
        },
      };

      render(
        <TestWrapper>
          {({ register }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={mockErrors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'created_at-error');

      const errorMessage = screen.getByText('This field is required');
      expect(errorMessage).toHaveAttribute('id', 'created_at-error');
      expect(errorMessage).toHaveClass('text-destructive');
    });

    it('should not show error attributes when no error present', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };
      (schema as any).dateTimeConfig = {
        format: 'YYYY-MM-DD',
        inputType: 'date',
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('Default Configuration', () => {
    it('should use default format when dateTimeConfig not present', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
      };

      render(
        <TestWrapper>
          {({ register, errors }) => (
            <DateTimeField
              schema={schema}
              value=""
              onChange={vi.fn()}
              register={register}
              errors={errors}
            />
          )}
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toHaveAttribute('type', 'date');
    });
  });
});
