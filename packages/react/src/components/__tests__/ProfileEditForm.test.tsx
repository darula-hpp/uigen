import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ProfileEditForm } from '../ProfileEditForm';
import type { SchemaNode } from '@uigen-dev/core';

describe('ProfileEditForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockFields: SchemaNode[] = [
    {
      type: 'string',
      key: 'username',
      label: 'Username',
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9_]+$',
    },
    {
      type: 'string',
      key: 'email',
      label: 'Email',
      format: 'email',
      required: false,
    },
  ];

  const mockData = {
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form with all fields - Requirement 3.5', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should pre-fill form fields with current data - Requirement 3.5', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      expect(usernameInput.value).toBe('testuser');
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should use email input type for email fields - Requirement 3.6', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.type).toBe('email');
    });

    it('should use text input type for text fields - Requirement 3.6', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      expect(usernameInput.type).toBe('text');
    });

    it('should display required indicator for required fields', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameLabel = screen.getByText(/username/i);
      expect(usernameLabel.textContent).toContain('*');
    });

    it('should display field descriptions when available', () => {
      const fieldsWithDescription: SchemaNode[] = [
        {
          ...mockFields[0],
          description: 'Your unique username',
        },
      ];

      render(
        <ProfileEditForm
          fields={fieldsWithDescription}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Your unique username')).toBeInTheDocument();
    });

    it('should skip read-only fields', () => {
      const fieldsWithReadOnly: SchemaNode[] = [
        ...mockFields,
        {
          type: 'string',
          key: 'id',
          label: 'ID',
          readOnly: true,
        },
      ];

      render(
        <ProfileEditForm
          fields={fieldsWithReadOnly}
          data={{ ...mockData, id: '123' }}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByLabelText(/^ID$/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format and display error - Requirement 5.1, 5.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields and display error - Requirement 5.2, 5.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      fireEvent.change(usernameInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
      });
    });

    it('should clear error when user corrects invalid input - Requirement 5.5', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Correct the email
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });

    it('should prevent form submission when validation errors exist - Requirement 5.4', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should display server-side validation errors - Requirement 5.3', () => {
      const serverErrors = {
        username: 'Username already exists',
      };

      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          errors={serverErrors}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Username already exists')).toBeInTheDocument();
    });

    it('should validate username pattern - Requirement 5.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      fireEvent.change(usernameInput, { target: { value: 'invalid-username!' } });

      await waitFor(() => {
        expect(screen.getByText(/invalid format/i)).toBeInTheDocument();
      });
    });

    it('should validate minimum length - Requirement 5.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      fireEvent.change(usernameInput, { target: { value: 'ab' } });

      await waitFor(() => {
        expect(screen.getByText(/must be at least 3 character/i)).toBeInTheDocument();
      });
    });
  });

  describe('Button Behavior', () => {
    it('should render Save and Cancel buttons - Requirement 3.3', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onSave with form data when Save is clicked - Requirement 3.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          username: 'newusername',
          email: 'test@example.com',
        });
      });
    });

    it('should call onCancel when Cancel is clicked - Requirement 3.4', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable Save button when validation errors exist - Requirement 5.4', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('should show loading state on Save button - Requirement 4.6', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('should disable all inputs during loading - Requirement 4.6', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      expect(usernameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
    });

    it('should disable buttons during loading', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it('should mark invalid fields with aria-invalid', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should associate error messages with inputs using aria-describedby', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });

    it('should mark error messages with role="alert"', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Escape key to cancel edit mode - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Press Escape key
      await user.keyboard('{Escape}');

      // Should call onCancel
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should support Enter key for form submission - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      await user.click(usernameInput);
      
      // Press Enter key
      await user.keyboard('{Enter}');

      // Should submit the form
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockData);
      });
    });

    it('should not cancel on Escape when form is loading', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      // Press Escape key
      await user.keyboard('{Escape}');

      // Should not call onCancel when loading
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should maintain proper tab order through form fields - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      // Start at username field
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);

      // Tab to email field
      await user.tab();
      expect(document.activeElement).toBe(emailInput);

      // Tab to save button
      await user.tab();
      expect(document.activeElement).toBe(saveButton);

      // Tab to cancel button
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should allow keyboard navigation to all interactive elements - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // All inputs should be focusable
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);
      
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      // All buttons should be focusable
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      
      saveButton.focus();
      expect(document.activeElement).toBe(saveButton);
      
      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should activate Save button with Enter key when focused - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      saveButton.focus();
      
      // Press Enter on the button
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockData);
      });
    });

    it('should activate Cancel button with Enter key when focused - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      cancelButton.focus();
      
      // Press Enter on the button
      await user.keyboard('{Enter}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Different Field Types', () => {
    it('should render number input for number fields', () => {
      const numberFields: SchemaNode[] = [
        {
          type: 'number',
          key: 'age',
          label: 'Age',
        },
      ];

      render(
        <ProfileEditForm
          fields={numberFields}
          data={{ age: 25 }}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
      expect(ageInput.type).toBe('number');
    });

    it('should render date input for date fields', () => {
      const dateFields: SchemaNode[] = [
        {
          type: 'string',
          key: 'birthdate',
          label: 'Birth Date',
          format: 'date',
        },
      ];

      render(
        <ProfileEditForm
          fields={dateFields}
          data={{ birthdate: '1990-01-01' }}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText(/birth date/i) as HTMLInputElement;
      expect(dateInput.type).toBe('date');
    });

    it('should render url input for url fields', () => {
      const urlFields: SchemaNode[] = [
        {
          type: 'string',
          key: 'website',
          label: 'Website',
          format: 'url',
        },
      ];

      render(
        <ProfileEditForm
          fields={urlFields}
          data={{ website: 'https://example.com' }}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const urlInput = screen.getByLabelText(/website/i) as HTMLInputElement;
      expect(urlInput.type).toBe('url');
    });
  });

  describe('Accessibility Tests - Task 11.6', () => {
    it('should have no accessibility violations - Requirement 7.1, 7.2, 7.3, 7.4, 7.5, 7.6', async () => {
      const { container } = render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with errors displayed', async () => {
      const serverErrors = {
        username: 'Username already exists',
        email: 'Invalid email format',
      };

      const { container } = render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          errors={serverErrors}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in loading state', async () => {
      const { container } = render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should move focus to first field when component mounts - Requirement 7.4', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const usernameInput = screen.getByLabelText(/username/i);
        expect(document.activeElement).toBe(usernameInput);
      });
    });

    it('should maintain focus on error fields after validation - Requirement 7.4', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      // Focus and enter invalid email
      emailInput.focus();
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Focus should remain on the email input
      expect(document.activeElement).toBe(emailInput);
    });

    it('should support full keyboard navigation through all form elements - Requirement 7.1', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      // Start at first field
      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);

      // Tab through all elements
      await user.tab();
      expect(document.activeElement).toBe(emailInput);

      await user.tab();
      expect(document.activeElement).toBe(saveButton);

      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      // Shift+Tab backwards
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(saveButton);
    });

    it('should have proper ARIA labels for all interactive elements - Requirement 7.2', () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check buttons have aria-label
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton).toHaveAttribute('aria-label', 'Save profile changes');
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel editing');
    });

    it('should announce validation errors to screen readers - Requirement 7.3', async () => {
      render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/please enter a valid email address/i);
      });
    });

    it('should use semantic HTML elements - Requirement 7.5', () => {
      const { container } = render(
        <ProfileEditForm
          fields={mockFields}
          data={mockData}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check for semantic form element
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      // Check for label elements
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);

      // Check for input elements
      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);

      // Check for button elements
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2); // Save and Cancel
    });
  });
});
