import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import {
  TextField,
  NumberField,
  CheckboxField,
  SelectField,
  DatePicker,
  DateTimePicker,
  FileUpload,
  ArrayField,
  ObjectField,
  registerDefaultComponents,
} from '../index';
import type { FieldProps } from '../ComponentRegistry';
import type { SchemaNode } from '@uigen-dev/core';

/**
 * Test wrapper component that provides react-hook-form context
 */
function TestWrapper({ children, defaultValues = {} }: { children: React.ReactNode; defaultValues?: any }) {
  const { register, formState: { errors } } = useForm({ defaultValues });
  
  return (
    <form>
      {typeof children === 'function' ? children({ register, errors }) : children}
    </form>
  );
}

describe('Field Components', () => {
  beforeEach(() => {
    // Register default components before each test
    registerDefaultComponents();
  });

describe('TextField Component', () => {
  it('should render text input for string type', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'name',
      label: 'Name',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <TextField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should render email input for email format', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'email',
      label: 'Email',
      required: false,
      format: 'email',
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <TextField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should render textarea for textarea widget hint', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'description',
      label: 'Description',
      required: false,
      uiHint: { widget: 'textarea' },
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <TextField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });
});

describe('NumberField Component', () => {
  it('should render number input', () => {
    const schema: SchemaNode = {
      type: 'number',
      key: 'age',
      label: 'Age',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <NumberField
            schema={schema}
            value={0}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should use step="1" for integer type', () => {
    const schema: SchemaNode = {
      type: 'integer',
      key: 'count',
      label: 'Count',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <NumberField
            schema={schema}
            value={0}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '1');
  });

  it('should use step="any" for number type', () => {
    const schema: SchemaNode = {
      type: 'number',
      key: 'price',
      label: 'Price',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <NumberField
            schema={schema}
            value={0}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', 'any');
  });
});

describe('CheckboxField Component', () => {
  it('should render checkbox for boolean type', () => {
    const schema: SchemaNode = {
      type: 'boolean',
      key: 'active',
      label: 'Active',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <CheckboxField
            schema={schema}
            value={false}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });
});

describe('SelectField Component', () => {
  it('should render select dropdown for enum type', () => {
    const schema: SchemaNode = {
      type: 'enum',
      key: 'status',
      label: 'Status',
      required: false,
      enumValues: ['active', 'inactive', 'pending'],
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <SelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Check that all enum values are present
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should support x-enumNames for display labels', () => {
    const schema: SchemaNode & { 'x-enumNames'?: string[] } = {
      type: 'enum',
      key: 'status',
      label: 'Status',
      required: false,
      enumValues: ['A', 'I', 'P'],
      'x-enumNames': ['Active', 'Inactive', 'Pending'],
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <SelectField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    // Check that display names are used
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('DatePicker Component', () => {
  it('should render date input', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'birthdate',
      label: 'Birth Date',
      required: false,
      format: 'date',
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <DatePicker
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = document.getElementById('birthdate');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
  });
});

describe('DateTimePicker Component', () => {
  it('should render datetime-local input', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'appointment',
      label: 'Appointment',
      required: false,
      format: 'date-time',
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <DateTimePicker
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const input = document.getElementById('appointment');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'datetime-local');
  });
});

describe('FileUpload Component', () => {
  it('should render file input with drag-and-drop area', () => {
    const schema: SchemaNode = {
      type: 'file',
      key: 'document',
      label: 'Document',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <FileUpload
            schema={schema}
            value={null}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    expect(screen.getByText(/drag and drop a file here/i)).toBeInTheDocument();
  });
});

describe('ArrayField Component', () => {
  it('should render array input with add/remove buttons', () => {
    const schema: SchemaNode = {
      type: 'array',
      key: 'tags',
      label: 'Tags',
      required: false,
      items: {
        type: 'string',
        key: 'tag',
        label: 'Tag',
        required: false,
      },
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <ArrayField
            schema={schema}
            value={[]}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
});

describe('ObjectField Component', () => {
  it('should render nested fieldset for object type', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'address',
      label: 'Address',
      required: false,
      children: [
        {
          type: 'string',
          key: 'street',
          label: 'Street',
          required: false,
        },
        {
          type: 'string',
          key: 'city',
          label: 'City',
          required: false,
        },
      ],
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <ObjectField
            schema={schema}
            value={{}}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Street')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
  });

  it('should render textarea for object without children', () => {
    const schema: SchemaNode = {
      type: 'object',
      key: 'metadata',
      label: 'Metadata',
      required: false,
    };

    render(
      <TestWrapper>
        {({ register, errors }) => (
          <ObjectField
            schema={schema}
            value={{}}
            onChange={vi.fn()}
            register={register}
            errors={errors}
          />
        )}
      </TestWrapper>
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });
});

describe('Error Display', () => {
  it('should apply error styling when error is present', () => {
    const schema: SchemaNode = {
      type: 'string',
      key: 'name',
      label: 'Name',
      required: true,
    };

    const errors = {
      name: { message: 'Name is required', type: 'required' },
    };

    render(
      <TestWrapper>
        {({ register }) => (
          <TextField
            schema={schema}
            value=""
            onChange={vi.fn()}
            register={register}
            errors={errors}
            error="Name is required"
          />
        )}
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-destructive');
  });
});
});
