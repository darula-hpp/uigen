/**
 * Tests for MultiSelect component
 * 
 * This test suite verifies all functionality of the MultiSelect component:
 * - Basic rendering with labels, descriptions, and placeholders
 * - Dropdown interaction (open/close, click outside, escape key)
 * - Selection and deselection of options
 * - Chip display and removal
 * - Select All and Clear All actions
 * - Search/filter functionality
 * - Option grouping by category
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Disabled state handling
 * - Accessibility (ARIA attributes, keyboard support)
 * 
 * Requirements: 3.2
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSelect } from '../MultiSelect.js';
import type { MultiSelectOption } from '../../../lib/mime-types.js';

const mockOptions: MultiSelectOption[] = [
  { value: 'image/jpeg', label: 'JPEG', group: 'Images' },
  { value: 'image/png', label: 'PNG', group: 'Images' },
  { value: 'image/gif', label: 'GIF', group: 'Images' },
  { value: 'application/pdf', label: 'PDF', group: 'Documents' },
  { value: 'application/msword', label: 'Word (DOC)', group: 'Documents' },
  { value: 'video/mp4', label: 'MP4', group: 'Video' },
  { value: 'audio/mpeg', label: 'MP3', group: 'Audio' },
];

describe('MultiSelect', () => {
  describe('Basic Rendering', () => {
    it('renders with label and description', () => {
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
          label="File Types"
          description="Select allowed file types"
        />
      );
      
      expect(screen.getByText('File Types')).toBeInTheDocument();
      expect(screen.getByText('Select allowed file types')).toBeInTheDocument();
    });
    
    it('renders placeholder when no items selected', () => {
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
          placeholder="Choose file types..."
        />
      );
      
      expect(screen.getByText('Choose file types...')).toBeInTheDocument();
    });
    
    it('renders selected items as chips', () => {
      render(
        <MultiSelect
          value={['image/jpeg', 'application/pdf']}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      expect(screen.getByText('JPEG')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
    
    it('shows count of selected items', () => {
      render(
        <MultiSelect
          value={['image/jpeg', 'image/png', 'application/pdf']}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });
  
  describe('Dropdown Interaction', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    
    it('closes dropdown on escape key', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
    
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <MultiSelect
            value={[]}
            onChange={vi.fn()}
            options={mockOptions}
          />
          <button>Outside</button>
        </div>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      const outsideButton = screen.getByText('Outside');
      fireEvent.mouseDown(outsideButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });
  
  describe('Selection', () => {
    it('toggles option selection on click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={[]}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const jpegOption = screen.getByText('JPEG');
      await user.click(jpegOption);
      
      expect(onChange).toHaveBeenCalledWith(['image/jpeg']);
    });
    
    it('deselects option when already selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={['image/jpeg', 'image/png']}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      // Use getAllByText and select the one in the dropdown (second occurrence)
      const jpegOptions = screen.getAllByText('JPEG');
      await user.click(jpegOptions[1]); // Click the one in the dropdown, not the chip
      
      expect(onChange).toHaveBeenCalledWith(['image/png']);
    });
    
    it('removes item via chip × button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={['image/jpeg', 'image/png']}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const removeButton = screen.getByLabelText('Remove JPEG');
      await user.click(removeButton);
      
      expect(onChange).toHaveBeenCalledWith(['image/png']);
    });
  });
  
  describe('Select All / Clear All', () => {
    it('selects all filtered options', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={[]}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'video/mp4',
          'audio/mpeg'
        ])
      );
    });
    
    it('clears all selections', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={['image/jpeg', 'image/png', 'application/pdf']}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const clearAllButton = screen.getByText('Clear All');
      await user.click(clearAllButton);
      
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });
  
  describe('Search/Filter', () => {
    it('filters options based on search query', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'image');
      
      expect(screen.getByText('JPEG')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('GIF')).toBeInTheDocument();
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });
    
    it('shows "No options found" when search has no results', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No options found')).toBeInTheDocument();
    });
    
    it('filters by label, value, and description', async () => {
      const user = userEvent.setup();
      const optionsWithDescription: MultiSelectOption[] = [
        { value: 'image/*', label: 'All Images', group: 'Images', description: 'Any image type' },
        { value: 'image/jpeg', label: 'JPEG', group: 'Images' },
      ];
      
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={optionsWithDescription}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'any');
      
      expect(screen.getByText('All Images')).toBeInTheDocument();
      expect(screen.queryByText('JPEG')).not.toBeInTheDocument();
    });
  });
  
  describe('Grouping', () => {
    it('displays options grouped by category', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });
    
    it('groups ungrouped options under "Other"', async () => {
      const user = userEvent.setup();
      const optionsWithoutGroup: MultiSelectOption[] = [
        { value: 'test1', label: 'Test 1' },
        { value: 'test2', label: 'Test 2' },
      ];
      
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={optionsWithoutGroup}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });
  
  describe('Keyboard Navigation', () => {
    it('opens dropdown on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    it('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      // Arrow down should focus first option (index 0)
      await user.keyboard('{ArrowDown}');
      
      // Wait for the state to update
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveClass('bg-blue-50');
      });
    });
    
    it('selects focused option on Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={[]}
          onChange={onChange}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      // Focus moves to search input, need to navigate from there
      await user.keyboard('{ArrowDown}'); // Focus first option
      await user.keyboard('{Enter}'); // Select it
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(['image/jpeg']);
      });
    });
  });
  
  describe('Disabled State', () => {
    it('does not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
          disabled={true}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    
    it('applies disabled styling', () => {
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
          disabled={true}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
    
    it('cannot remove chips when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={['image/jpeg']}
          onChange={onChange}
          options={mockOptions}
          disabled={true}
        />
      );
      
      const removeButton = screen.getByLabelText('Remove JPEG');
      expect(removeButton).toBeDisabled();
    });
  });
  
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
          id="test-select"
        />
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-controls', 'test-select-listbox');
    });
    
    it('updates aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    
    it('marks options as selected with aria-selected', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={['image/jpeg']}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      const jpegOption = screen.getByRole('option', { name: /JPEG/ });
      expect(jpegOption).toHaveAttribute('aria-selected', 'true');
    });
    
    it('has accessible remove buttons', () => {
      render(
        <MultiSelect
          value={['image/jpeg', 'application/pdf']}
          onChange={vi.fn()}
          options={mockOptions}
        />
      );
      
      expect(screen.getByLabelText('Remove JPEG')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove PDF')).toBeInTheDocument();
    });
  });
});
