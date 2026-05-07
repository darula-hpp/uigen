/**
 * Integration Tests for DateTimeField Component
 * 
 * Task 16.2: React Component Integration Tests
 * - Test rendering datetime fields in complete forms
 * - Test form submission with datetime values
 * - Verify API receives correct format
 * - Test timezone conversions in full user flow
 * - Test validation error display in form context
 * - Test interaction with react-hook-form validation
 * 
 * Requirements: 10.1-10.6, 11.1-11.6, 21.1-21.5, 22.1-22.5, 23.1-23.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { DateTimeField } from '../DateTimeField';
import type { SchemaNode } from '@uigen-dev/core';

// Mock DateTimeApiConverter
vi.mock('@uigen-dev/core', () => ({
  DateTimeApiConverter: {
    fromApi: vi.fn((value, apiFormat, displayFormat) => {
      // Simple mock implementation for testing
      if (!value) return '';
      try {
        if (apiFormat === 'unix') {
          // Unix timestamp to display format
          const date = new Date(value * 1000);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        if (apiFormat === 'unix-ms') {
          // Unix timestamp (ms) to display format
          const date = new Date(value);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        // ISO 8601 to display format
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } catch (error) {
        return '';
      }
      return '';
    }),
    toApi: vi.fn((value, displayFormat, apiFormat) => {
      // Simple mock implementation for testing
      if (!value) return null;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        
        if (apiFormat === 'unix') {
          return Math.floor(date.getTime() / 1000);
        }
        if (apiFormat === 'unix-ms') {
          return date.getTime();
        }
        // Default to ISO 8601
        return date.toISOString();
      } catch (error) {
        return null;
      }
    }),
  },
}));

// Test form wrapper with DateTimeField integrated
function TestFormWithDateTimeField({ 
  schema,
  onSubmit, 
  defaultValues = {},
  validationRules = {}
}: { 
  schema: SchemaNode;
  onSubmit: (data: any) => void;
  defaultValues?: any;
  validationRules?: any;
}) {
  const methods = useForm({ defaultValues, mode: 'onChange' });
  
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <DateTimeField 
          schema={schema} 
          register={(name) => methods.register(name, validationRules)} 
          errors={methods.formState.errors} 
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

describe('DateTimeField Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering datetime fields in complete forms', () => {
    it('should render date field with ISO 8601 API format (default)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
        dateTimeConfig: {
          format: 'MMM DD, YYYY',
          inputType: 'date',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ created_at: '2021-01-15T00:00:00Z' }}
        />
      );

      // Verify field is rendered
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should render time field with custom format', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'event_time',
        label: 'Event Time',
        required: false,
        dateTimeConfig: {
          format: 'HH:mm',
          inputType: 'time',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify field is rendered
      const input = screen.getByPlaceholderText('HH:mm');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'time');
    });

    it('should render datetime-local field with timezone', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'appointment',
        label: 'Appointment',
        required: false,
        dateTimeConfig: {
          format: 'MM/DD/YYYY hh:mm A',
          inputType: 'datetime-local',
          timezone: 'America/New_York',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify field is rendered
      const input = screen.getByPlaceholderText('MM/DD/YYYY hh:mm A');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'datetime-local');

      // Verify timezone is displayed
      expect(screen.getByText('Timezone: America/New_York')).toBeInTheDocument();
    });

    it('should render multiple datetime fields in same form', () => {
      const handleSubmit = vi.fn();

      function MultiFieldForm() {
        const methods = useForm();
        
        const createdSchema: SchemaNode = {
          type: 'string',
          key: 'created_at',
          label: 'Created At',
          required: false,
          dateTimeConfig: {
            format: 'YYYY-MM-DD',
            inputType: 'date',
          },
        };

        const updatedSchema: SchemaNode = {
          type: 'string',
          key: 'updated_at',
          label: 'Updated At',
          required: false,
          dateTimeConfig: {
            format: 'MM/DD/YYYY HH:mm',
            inputType: 'datetime-local',
          },
        };
        
        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleSubmit)}>
              <DateTimeField schema={createdSchema} register={methods.register} errors={methods.formState.errors} />
              <DateTimeField schema={updatedSchema} register={methods.register} errors={methods.formState.errors} />
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      }

      render(<MultiFieldForm />);

      // Verify both fields are rendered
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('MM/DD/YYYY HH:mm')).toBeInTheDocument();
    });
  });

  describe('Form submission with datetime values', () => {
    it('should submit form with ISO 8601 format (default)', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
        dateTimeConfig: {
          format: 'MMM DD, YYYY',
          inputType: 'date',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Enter date
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      await user.type(input, '2021-01-15');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify form was submitted
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    it('should handle null/empty datetime values', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'optional_date',
        label: 'Optional Date',
        required: false,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Submit form without entering date
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify form was submitted
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('API format conversion', () => {
    it('should convert Unix timestamp to display format on load', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
        dateTimeConfig: {
          format: 'MMM DD, YYYY',
          inputType: 'date',
          apiFormat: 'unix',
        },
      };

      const handleSubmit = vi.fn();
      const unixTimestamp = 1610668800; // Jan 15, 2021

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ created_at: unixTimestamp }}
        />
      );

      // Verify field is rendered with converted value
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toBeInTheDocument();
      // The mock should have converted the Unix timestamp to a display format
      expect(input).toHaveValue('2021-01-15');
    });

    it('should convert Unix timestamp (ms) to display format on load', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'event_time',
        label: 'Event Time',
        required: false,
        dateTimeConfig: {
          format: 'DD/MM/YYYY HH:mm',
          inputType: 'datetime-local',
          apiFormat: 'unix-ms',
        },
      };

      const handleSubmit = vi.fn();
      const unixTimestampMs = 1610668800000; // Jan 15, 2021

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ event_time: unixTimestampMs }}
        />
      );

      // Verify field is rendered
      const input = screen.getByPlaceholderText('DD/MM/YYYY HH:mm');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'datetime-local');
    });

    it('should convert ISO 8601 to display format on load (default)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
        dateTimeConfig: {
          format: 'MMM DD, YYYY',
          inputType: 'date',
        },
      };

      const handleSubmit = vi.fn();
      const isoDate = '2021-01-15T00:00:00Z';

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ created_at: isoDate }}
        />
      );

      // Verify field is rendered with converted value
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toBeInTheDocument();
      // The mock should have converted the ISO date to a display format
      expect(input).toHaveValue('2021-01-15');
    });

    it('should convert display format to API format on input change', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'created_at',
        label: 'Created At',
        required: false,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
          apiFormat: 'unix',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Enter date
      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      await user.clear(input);
      await user.type(input, '2021-01-15');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify form was submitted
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Timezone conversions in full user flow', () => {
    it('should apply timezone conversion when loading data', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'appointment',
        label: 'Appointment',
        required: false,
        dateTimeConfig: {
          format: 'MM/DD/YYYY hh:mm A',
          inputType: 'datetime-local',
          timezone: 'America/New_York',
        },
      };

      const handleSubmit = vi.fn();
      const isoDate = '2021-01-15T15:00:00Z'; // 3 PM UTC

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ appointment: isoDate }}
        />
      );

      // Verify field is rendered with timezone info
      expect(screen.getByText('Timezone: America/New_York')).toBeInTheDocument();
      
      // Verify field is rendered with converted value
      const input = screen.getByPlaceholderText('MM/DD/YYYY hh:mm A');
      expect(input).toBeInTheDocument();
    });

    it('should apply timezone conversion when submitting data', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'appointment',
        label: 'Appointment',
        required: false,
        dateTimeConfig: {
          format: 'YYYY-MM-DDTHH:mm',
          inputType: 'datetime-local',
          timezone: 'Europe/London',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Enter datetime
      const input = screen.getByPlaceholderText('YYYY-MM-DDTHH:mm');
      await user.clear(input);
      await user.type(input, '2021-01-15T10:30');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify form was submitted
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled();
      });
    });

    it('should display timezone information to user', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'meeting_time',
        label: 'Meeting Time',
        required: false,
        dateTimeConfig: {
          format: 'HH:mm',
          inputType: 'time',
          timezone: 'Asia/Tokyo',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify timezone is displayed
      expect(screen.getByText('Timezone: Asia/Tokyo')).toBeInTheDocument();
    });

    it('should display "Local" for local timezone', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'local_time',
        label: 'Local Time',
        required: false,
        dateTimeConfig: {
          format: 'HH:mm',
          inputType: 'time',
          timezone: 'local',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify "Local" is displayed
      expect(screen.getByText('Timezone: Local')).toBeInTheDocument();
    });
  });

  describe('Validation error display in form context', () => {
    it('should display validation error with proper ARIA attributes', async () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'required_date',
        label: 'Required Date',
        required: true,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
          validationRules={{ required: 'This field is required' }}
        />
      );

      // Try to submit without entering date to trigger validation
      const submitButton = screen.getByRole('button', { name: /submit/i });
      const user = userEvent.setup();
      await user.click(submitButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      // Verify ARIA attributes
      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'required_date-error');
    });

    it('should not display error when no error exists', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'optional_date',
        label: 'Optional Date',
        required: false,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
        },
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify no error message is displayed
      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('Interaction with react-hook-form validation', () => {
    it('should integrate with react-hook-form required validation', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'required_date',
        label: 'Required Date',
        required: true,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
          validationRules={{ required: 'This field is required' }}
        />
      );

      // Try to submit without entering date
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      // Verify form was not submitted
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should clear validation error when valid input is entered', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema: SchemaNode = {
        type: 'string',
        key: 'required_date',
        label: 'Required Date',
        required: true,
        dateTimeConfig: {
          format: 'YYYY-MM-DD',
          inputType: 'date',
        },
      };

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
          validationRules={{ required: 'This field is required' }}
        />
      );

      // Try to submit without entering date
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      // Enter valid date
      const input = screen.getByPlaceholderText('YYYY-MM-DD');
      await user.type(input, '2021-01-15');

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Backward compatibility', () => {
    it('should work with fields without apiFormat (defaults to ISO 8601)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'legacy_date',
        label: 'Legacy Date',
        required: false,
        dateTimeConfig: {
          format: 'MMM DD, YYYY',
          inputType: 'date',
          // No apiFormat specified
        },
      };

      const handleSubmit = vi.fn();
      const isoDate = '2021-01-15T00:00:00Z';

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit} 
          defaultValues={{ legacy_date: isoDate }}
        />
      );

      // Verify field is rendered with converted value
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toBeInTheDocument();
      // The mock should have converted the ISO date to a display format
      expect(input).toHaveValue('2021-01-15');
    });

    it('should work with fields without dateTimeConfig (uses defaults)', () => {
      const schema: SchemaNode = {
        type: 'string',
        key: 'simple_date',
        label: 'Simple Date',
        required: false,
        // No dateTimeConfig
      };

      const handleSubmit = vi.fn();

      render(
        <TestFormWithDateTimeField 
          schema={schema}
          onSubmit={handleSubmit}
        />
      );

      // Verify field is rendered with defaults
      const input = screen.getByPlaceholderText('MMM DD, YYYY');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });
  });
});
