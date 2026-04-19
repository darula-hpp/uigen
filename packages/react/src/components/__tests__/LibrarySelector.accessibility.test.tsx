/**
 * Accessibility tests for LibrarySelector
 * Implements Requirements 4.3, 4.4 (keyboard navigation, ARIA, focus management)
 * Task 11.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibrarySelector } from '../LibrarySelector';
import type { Resource } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

const mockTemplateResource: Resource = {
  name: 'Template',
  slug: 'templates',
  uigenId: 'templates',
  operations: [
    {
      id: 'listTemplates',
      uigenId: 'templates.list',
      method: 'GET',
      path: '/templates',
      viewHint: 'list',
      parameters: [],
      responses: {},
    },
    {
      id: 'createTemplate',
      uigenId: 'templates.create',
      method: 'POST',
      path: '/templates',
      viewHint: 'create',
      parameters: [],
      responses: {},
    },
  ],
  schema: {
    type: 'object',
    key: 'template',
    label: 'Template',
    required: false,
    children: [],
  },
  relationships: [],
};

const mockItems = [
  { id: '1', name: 'Weekly Standup', description: 'Standard weekly meeting' },
  { id: '2', name: 'Retrospective', description: 'Sprint retrospective' },
  { id: '3', name: 'One-on-One', description: 'Manager check-in' },
];

function renderSelector(props?: Partial<React.ComponentProps<typeof LibrarySelector>>) {
  const onSelect = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  const result = render(
    <BrowserRouter>
      <LibrarySelector
        libraryResource={mockTemplateResource}
        onSelect={onSelect}
        onCancel={onCancel}
        {...props}
      />
    </BrowserRouter>
  );

  return { ...result, onSelect, onCancel };
}

describe('LibrarySelector - Accessibility', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: mockItems,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);
  });

  /**
   * Requirement 11.2: dialog role and aria-modal
   */
  it('should have dialog role and aria-modal attribute', () => {
    renderSelector();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  /**
   * Requirement 11.2: dialog has accessible label
   */
  it('should have an accessible label on the dialog', () => {
    renderSelector();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Select Template');
  });

  /**
   * Requirement 11.2: search input has ARIA label
   */
  it('should have ARIA label on search input', () => {
    renderSelector();
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('aria-label', 'Search Template');
  });

  /**
   * Requirement 11.2: listbox role for item list
   */
  it('should render items in a listbox with correct role', () => {
    renderSelector();
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveAttribute('aria-label', 'Template options');
  });

  /**
   * Requirement 11.2: each item has option role and aria-selected
   */
  it('should render items with option role and aria-selected=false by default', () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    options.forEach(option => {
      expect(option).toHaveAttribute('aria-selected', 'false');
    });
  });

  /**
   * Requirement 11.2: selected item has aria-selected=true
   */
  it('should set aria-selected=true on the selected item', async () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    await waitFor(() => {
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });
  });

  /**
   * Requirement 11.2: close button has descriptive aria-label
   */
  it('should have descriptive aria-label on close button', () => {
    renderSelector();
    const closeBtn = screen.getByLabelText('Close Template selector');
    expect(closeBtn).toBeInTheDocument();
  });

  /**
   * Requirement 11.2: result count has aria-live
   */
  it('should announce result count with aria-live', () => {
    renderSelector();
    const countEl = screen.getByText(/Showing 3 template/i);
    expect(countEl).toHaveAttribute('aria-live', 'polite');
    expect(countEl).toHaveAttribute('aria-atomic', 'true');
  });

  /**
   * Requirement 11.1: Escape key closes the selector
   */
  it('should close on Escape key', () => {
    const { onCancel } = renderSelector();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * Requirement 11.1: ArrowDown moves focus from search into list
   */
  it('should move focus to first list item on ArrowDown from search input', async () => {
    renderSelector();
    const searchInput = screen.getByRole('searchbox');
    searchInput.focus();

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(document.activeElement).toBe(options[0]);
    });
  });

  /**
   * Requirement 11.1: ArrowDown navigates through list items
   */
  it('should navigate down through list items with ArrowDown', async () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    const searchInput = screen.getByRole('searchbox');

    // Navigate from search to first item
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).toBe(options[0]);
    });

    // Navigate from first to second item via listbox keydown
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).toBe(options[1]);
    });
  });

  /**
   * Requirement 11.1: ArrowUp from first item returns focus to search
   */
  it('should return focus to search input on ArrowUp from first item', async () => {
    renderSelector();
    const searchInput = screen.getByRole('searchbox');
    const listbox = screen.getByRole('listbox');

    // Navigate to first item first
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).not.toBe(searchInput);
    });

    // Now ArrowUp from first item should return to search
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });
  });

  /**
   * Requirement 11.1: ArrowUp navigates up through list items
   */
  it('should navigate up through list items with ArrowUp', async () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    const searchInput = screen.getByRole('searchbox');
    const listbox = screen.getByRole('listbox');

    // Navigate to first item, then second
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(options[0]));

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(options[1]));

    // Now ArrowUp should go back to first
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    await waitFor(() => {
      expect(document.activeElement).toBe(options[0]);
    });
  });

  /**
   * Requirement 11.1: Enter key selects the focused item
   */
  it('should select focused item on Enter key', async () => {
    renderSelector();
    const options = screen.getAllByRole('option');
    const listbox = screen.getByRole('listbox');
    const searchInput = screen.getByRole('searchbox');

    // Navigate to first item
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).toBe(options[0]);
    });

    fireEvent.keyDown(listbox, { key: 'Enter' });

    await waitFor(() => {
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });
  });

  /**
   * Requirement 11.1: Focus trap - Tab wraps within dialog
   */
  it('should trap focus within the dialog on Tab', async () => {
    const user = userEvent.setup();
    renderSelector();

    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href]'
    );
    expect(focusable.length).toBeGreaterThan(0);

    // Focus last focusable element and Tab - should wrap to first
    const last = focusable[focusable.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    await user.tab();
    // Focus should have wrapped to first focusable element
    expect(document.activeElement).toBe(focusable[0]);
  });

  /**
   * Requirement 11.1: Focus is set on search input when dialog opens
   */
  it('should focus search input on mount', async () => {
    renderSelector();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    });
  });

  /**
   * Requirement 11.2: loading state has role=status and aria-live
   */
  it('should announce loading state to screen readers', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: false,
    } as any);

    renderSelector();
    // Find the loading container specifically (has aria-label for loading)
    const loadingEl = screen.getByLabelText(/Loading template/i);
    expect(loadingEl).toHaveAttribute('role', 'status');
    expect(loadingEl).toHaveAttribute('aria-live', 'polite');
  });

  /**
   * Requirement 11.2: error state has role=alert
   */
  it('should announce errors with role=alert', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
      isError: true,
      isSuccess: false,
    } as any);

    renderSelector();
    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeInTheDocument();
    expect(alertEl).toHaveTextContent('Network error');
  });

  /**
   * Requirement 11.2: empty state has aria-live
   */
  it('should announce empty state to screen readers', async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    renderSelector();
    const emptyEl = screen.getByRole('status');
    expect(emptyEl).toHaveAttribute('aria-live', 'polite');
  });
});
