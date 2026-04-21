import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypeSelector } from '../TypeSelector.js';

describe('TypeSelector', () => {
  // Subtask 4.1: Create TypeSelector component with dropdown interface
  describe('Component rendering', () => {
    it('renders the type selector with dropdown', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('type-selector-dropdown')).toBeInTheDocument();
      expect(screen.getByText(/Relationship Type/i)).toBeInTheDocument();
    });

    it('renders with required indicator', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const label = screen.getByText(/Relationship Type/i);
      expect(label.parentElement?.textContent).toContain('*');
    });

    it('renders as a select element', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      expect(dropdown.tagName).toBe('SELECT');
    });
  });

  // Subtask 4.2: Add three type options with icons and descriptions
  describe('Type options', () => {
    it('renders three type options correctly', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      const options = Array.from(dropdown.options);

      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('hasMany');
      expect(options[1].value).toBe('belongsTo');
      expect(options[2].value).toBe('manyToMany');
    });

    it('displays icons and labels for each option', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      const options = Array.from(dropdown.options);

      expect(options[0].textContent).toContain('→*');
      expect(options[0].textContent).toContain('Has Many');
      
      expect(options[1].textContent).toContain('*→');
      expect(options[1].textContent).toContain('Belongs To');
      
      expect(options[2].textContent).toContain('↔');
      expect(options[2].textContent).toContain('Many to Many');
    });

    it('displays description for selected type', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source resource has multiple target resources (one-to-many)'
      );
    });

    it('updates description when type changes', () => {
      const { rerender } = render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source resource has multiple target resources (one-to-many)'
      );

      rerender(
        <TypeSelector
          value="belongsTo"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source resource belongs to a single target resource (many-to-one)'
      );
    });
  });

  // Subtask 4.3: Implement recommended type highlighting
  describe('Recommended type highlighting', () => {
    it('shows "(Recommended)" label for recommended type', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
          recommendedType="hasMany"
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      const hasManyOption = Array.from(dropdown.options).find(opt => opt.value === 'hasMany');

      expect(hasManyOption?.textContent).toContain('(Recommended)');
    });

    it('does not show "(Recommended)" for non-recommended types', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
          recommendedType="hasMany"
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      const belongsToOption = Array.from(dropdown.options).find(opt => opt.value === 'belongsTo');

      expect(belongsToOption?.textContent).not.toContain('(Recommended)');
    });

    it('works without recommended type', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      const options = Array.from(dropdown.options);

      options.forEach(opt => {
        expect(opt.textContent).not.toContain('(Recommended)');
      });
    });
  });

  // Subtask 4.4: Add warning display when selected type doesn't match recommendation
  describe('Warning display', () => {
    it('shows warning when selected type does not match recommendation', () => {
      render(
        <TypeSelector
          value="belongsTo"
          onChange={vi.fn()}
          recommendedType="hasMany"
        />
      );

      const warning = screen.getByTestId('type-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('Selected type doesn\'t match path pattern');
      expect(warning).toHaveTextContent('Recommended: hasMany');
    });

    it('does not show warning when selected type matches recommendation', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
          recommendedType="hasMany"
        />
      );

      expect(screen.queryByTestId('type-warning')).not.toBeInTheDocument();
    });

    it('does not show warning when no recommendation is provided', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId('type-warning')).not.toBeInTheDocument();
    });

    it('warning has proper ARIA role', () => {
      render(
        <TypeSelector
          value="belongsTo"
          onChange={vi.fn()}
          recommendedType="hasMany"
        />
      );

      const warning = screen.getByTestId('type-warning');
      expect(warning).toHaveAttribute('role', 'alert');
    });
  });

  // Subtask 4.5: Add help icon with tooltip
  describe('Help icon and tooltip', () => {
    it('renders help icon', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-selector-help')).toBeInTheDocument();
      expect(screen.getByLabelText('Help: Relationship types')).toBeInTheDocument();
    });

    it('shows tooltip when help icon is clicked', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId('type-selector-help-tooltip')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('type-selector-help'));

      expect(screen.getByTestId('type-selector-help-tooltip')).toBeInTheDocument();
    });

    it('hides tooltip when help icon is clicked again', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');

      fireEvent.click(helpButton);
      expect(screen.getByTestId('type-selector-help-tooltip')).toBeInTheDocument();

      fireEvent.click(helpButton);
      expect(screen.queryByTestId('type-selector-help-tooltip')).not.toBeInTheDocument();
    });

    it('tooltip contains all three type descriptions', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('type-selector-help'));

      const tooltip = screen.getByTestId('type-selector-help-tooltip');
      
      expect(tooltip).toHaveTextContent('Has Many');
      expect(tooltip).toHaveTextContent('Source resource has multiple target resources (one-to-many)');
      
      expect(tooltip).toHaveTextContent('Belongs To');
      expect(tooltip).toHaveTextContent('Source resource belongs to a single target resource (many-to-one)');
      
      expect(tooltip).toHaveTextContent('Many to Many');
      expect(tooltip).toHaveTextContent('Source and target resources can have multiple of each other');
    });

    it('tooltip has proper ARIA attributes', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      expect(helpButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(helpButton);

      expect(helpButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('type-selector-help-tooltip')).toHaveAttribute('role', 'tooltip');
    });
  });

  // Subtask 4.6: Ensure keyboard accessibility (tab, arrow keys, enter)
  describe('Keyboard accessibility', () => {
    it('dropdown is keyboard accessible with tab', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      
      dropdown.focus();
      expect(document.activeElement).toBe(dropdown);
    });

    it('help icon is keyboard accessible', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      
      helpButton.focus();
      expect(document.activeElement).toBe(helpButton);
    });

    it('opens tooltip with Enter key on help icon', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      
      fireEvent.keyDown(helpButton, { key: 'Enter' });
      expect(screen.getByTestId('type-selector-help-tooltip')).toBeInTheDocument();
    });

    it('opens tooltip with Space key on help icon', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      
      fireEvent.keyDown(helpButton, { key: ' ' });
      expect(screen.getByTestId('type-selector-help-tooltip')).toBeInTheDocument();
    });

    it('closes tooltip with Escape key', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      
      fireEvent.keyDown(helpButton, { key: 'Enter' });
      expect(screen.getByTestId('type-selector-help-tooltip')).toBeInTheDocument();

      fireEvent.keyDown(helpButton, { key: 'Escape' });
      expect(screen.queryByTestId('type-selector-help-tooltip')).not.toBeInTheDocument();
    });

    it('dropdown has focus ring styles', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      expect(dropdown.className).toContain('focus:ring');
    });

    it('help button has focus ring styles', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const helpButton = screen.getByTestId('type-selector-help');
      expect(helpButton.className).toContain('focus:ring');
    });
  });

  // Additional tests for component behavior
  describe('Component behavior', () => {
    it('calls onChange when type is selected', () => {
      const onChange = vi.fn();

      render(
        <TypeSelector
          value="hasMany"
          onChange={onChange}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      fireEvent.change(dropdown, { target: { value: 'belongsTo' } });

      expect(onChange).toHaveBeenCalledWith('belongsTo');
    });

    it('displays the current value correctly', () => {
      render(
        <TypeSelector
          value="manyToMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
      expect(dropdown.value).toBe('manyToMany');
    });

    it('can be disabled', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      expect(dropdown).toBeDisabled();
    });

    it('is enabled by default', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      expect(dropdown).not.toBeDisabled();
    });

    it('applies disabled styles when disabled', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const dropdown = screen.getByTestId('type-selector-dropdown');
      expect(dropdown.className).toContain('disabled:opacity-50');
      expect(dropdown.className).toContain('disabled:cursor-not-allowed');
    });
  });

  // Test all three type values
  describe('All type values', () => {
    it('works with hasMany type', () => {
      render(
        <TypeSelector
          value="hasMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source resource has multiple target resources (one-to-many)'
      );
    });

    it('works with belongsTo type', () => {
      render(
        <TypeSelector
          value="belongsTo"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source resource belongs to a single target resource (many-to-one)'
      );
    });

    it('works with manyToMany type', () => {
      render(
        <TypeSelector
          value="manyToMany"
          onChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('type-description')).toHaveTextContent(
        'Source and target resources can have multiple of each other'
      );
    });
  });
});
