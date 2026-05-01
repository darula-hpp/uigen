import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JSONEditor } from '../JSONEditor.js';

describe('JSONEditor', () => {
  describe('Rendering', () => {
    it('renders with label and description', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
          label="Chart Options"
          description="Configure advanced chart options"
        />
      );
      
      expect(screen.getByText('Chart Options')).toBeInTheDocument();
      expect(screen.getByText('Configure advanced chart options')).toBeInTheDocument();
    });
    
    it('renders with default label when not provided', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      expect(screen.getByText('Advanced Options (JSON)')).toBeInTheDocument();
    });
    
    it('renders textarea with monospace font', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveClass('font-mono');
    });
    
    it('renders textarea with placeholder', () => {
      const placeholder = '{\n  "title": "Test"\n}';
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
          placeholder={placeholder}
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe(placeholder);
    });
    
    it('renders with default placeholder when not provided', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.placeholder).toContain('"title": "My Chart"');
    });
    
    it('shows "Show Examples" button by default', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      expect(screen.getByText('Show Examples')).toBeInTheDocument();
    });
    
    it('shows help text when no error', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      expect(screen.getByText(/Enter valid JSON object for advanced chart options/)).toBeInTheDocument();
    });
  });

  describe('Value Changes', () => {
    it('calls onChange when textarea value changes', () => {
      const onChange = vi.fn();
      render(
        <JSONEditor
          value=""
          onChange={onChange}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      fireEvent.change(textarea, { target: { value: '{"title": "Test"}' } });
      
      expect(onChange).toHaveBeenCalledWith('{"title": "Test"}');
    });
    
    it('displays current value in textarea', () => {
      const value = '{"title": "My Chart"}';
      render(
        <JSONEditor
          value={value}
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe(value);
    });
    
    it('updates textarea when value prop changes', () => {
      const { rerender } = render(
        <JSONEditor
          value='{"title": "First"}'
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe('{"title": "First"}');
      
      rerender(
        <JSONEditor
          value='{"title": "Second"}'
          onChange={vi.fn()}
          error=""
        />
      );
      
      expect(textarea.value).toBe('{"title": "Second"}');
    });
  });

  describe('Error Display', () => {
    it('displays error message when error prop is provided', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
        />
      );
      
      expect(screen.getByText(/Invalid JSON:/)).toBeInTheDocument();
      expect(screen.getByText(/Unexpected end of JSON input/)).toBeInTheDocument();
    });
    
    it('applies error styling to textarea when error is present', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
          id="test-editor"
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveClass('border-red-500');
    });
    
    it('does not show help text when error is present', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
        />
      );
      
      expect(screen.queryByText(/Enter valid JSON object for advanced chart options/)).not.toBeInTheDocument();
    });
    
    it('does not show error message when error prop is empty', () => {
      render(
        <JSONEditor
          value='{"title": "Valid"}'
          onChange={vi.fn()}
          error=""
        />
      );
      
      expect(screen.queryByText(/Invalid JSON:/)).not.toBeInTheDocument();
    });
    
    it('error message has role="alert"', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
        />
      );
      
      const errorElement = screen.getByText(/Invalid JSON:/).closest('div');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });
  });

  describe('Example Snippets', () => {
    it('toggles example snippets when clicking button', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const toggleButton = screen.getByText('Show Examples');
      
      // Examples should not be visible initially
      expect(screen.queryByText('Example Snippets:')).not.toBeInTheDocument();
      
      // Click to show examples
      fireEvent.click(toggleButton);
      expect(screen.getByText('Example Snippets:')).toBeInTheDocument();
      
      // Button text should change
      expect(screen.getByText('Hide Examples')).toBeInTheDocument();
      
      // Click to hide examples
      fireEvent.click(screen.getByText('Hide Examples'));
      expect(screen.queryByText('Example Snippets:')).not.toBeInTheDocument();
    });
    
    it('displays all example snippets when shown', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const toggleButton = screen.getByText('Show Examples');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Basic Title and Legend')).toBeInTheDocument();
      expect(screen.getByText('Tooltip Configuration')).toBeInTheDocument();
      expect(screen.getByText('Axis Labels')).toBeInTheDocument();
    });
    
    it('inserts example snippet when clicked', () => {
      const onChange = vi.fn();
      render(
        <JSONEditor
          value=""
          onChange={onChange}
          error=""
        />
      );
      
      // Show examples
      const toggleButton = screen.getByText('Show Examples');
      fireEvent.click(toggleButton);
      
      // Click on "Basic Title and Legend" example
      const exampleButton = screen.getByText('Basic Title and Legend').closest('button');
      if (exampleButton) {
        fireEvent.click(exampleButton);
      }
      
      // Should call onChange with formatted JSON
      expect(onChange).toHaveBeenCalledWith(
        expect.stringContaining('"title": "Sales Over Time"')
      );
      expect(onChange).toHaveBeenCalledWith(
        expect.stringContaining('"legend"')
      );
    });
    
    it('hides examples after inserting snippet', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      // Show examples
      const toggleButton = screen.getByText('Show Examples');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Example Snippets:')).toBeInTheDocument();
      
      // Click on an example
      const exampleButton = screen.getByText('Basic Title and Legend').closest('button');
      if (exampleButton) {
        fireEvent.click(exampleButton);
      }
      
      // Examples should be hidden
      expect(screen.queryByText('Example Snippets:')).not.toBeInTheDocument();
    });
    
    it('formats inserted JSON with proper indentation', () => {
      const onChange = vi.fn();
      render(
        <JSONEditor
          value=""
          onChange={onChange}
          error=""
        />
      );
      
      // Show examples
      const toggleButton = screen.getByText('Show Examples');
      fireEvent.click(toggleButton);
      
      // Click on an example
      const exampleButton = screen.getByText('Tooltip Configuration').closest('button');
      if (exampleButton) {
        fireEvent.click(exampleButton);
      }
      
      // Should be formatted with 2-space indentation
      const calledValue = onChange.mock.calls[0][0];
      expect(calledValue).toContain('{\n  ');
      expect(calledValue).toContain('\n}');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
          label="Chart Options"
          id="test-editor"
        />
      );
      
      const textarea = screen.getByLabelText('Chart Options');
      expect(textarea).toHaveAttribute('aria-label', 'Chart Options');
    });
    
    it('sets aria-invalid when there is an error', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
    
    it('does not set aria-invalid when there is no error', () => {
      render(
        <JSONEditor
          value='{"title": "Valid"}'
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });
    
    it('associates error message with textarea via aria-describedby', () => {
      render(
        <JSONEditor
          value='{"invalid'
          onChange={vi.fn()}
          error="Unexpected end of JSON input"
          id="test-editor"
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveAttribute('aria-describedby', 'test-editor-error');
      
      const errorElement = screen.getByText(/Invalid JSON:/).closest('div');
      expect(errorElement).toHaveAttribute('id', 'test-editor-error');
    });
    
    it('toggle button has proper aria-label', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const toggleButton = screen.getByLabelText('Toggle example snippets');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Textarea Properties', () => {
    it('has spellCheck disabled', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea).toHaveAttribute('spellcheck', 'false');
    });
    
    it('has 10 rows by default', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(10);
    });
    
    it('is resizable vertically', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveClass('resize-y');
    });
  });

  describe('Custom ID', () => {
    it('uses custom id when provided', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
          id="custom-editor-id"
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveAttribute('id', 'custom-editor-id');
    });
    
    it('uses default id when not provided', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)');
      expect(textarea).toHaveAttribute('id', 'json-editor');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string value', () => {
      render(
        <JSONEditor
          value=""
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
    
    it('handles multiline JSON value', () => {
      const multilineJson = '{\n  "title": "Test",\n  "legend": {\n    "show": true\n  }\n}';
      render(
        <JSONEditor
          value={multilineJson}
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe(multilineJson);
    });
    
    it('handles special characters in JSON', () => {
      const jsonWithSpecialChars = '{"title": "Test \\"quoted\\" value"}';
      render(
        <JSONEditor
          value={jsonWithSpecialChars}
          onChange={vi.fn()}
          error=""
        />
      );
      
      const textarea = screen.getByLabelText('Advanced Options (JSON)') as HTMLTextAreaElement;
      expect(textarea.value).toBe(jsonWithSpecialChars);
    });
  });
});
