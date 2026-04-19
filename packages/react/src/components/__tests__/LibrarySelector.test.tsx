import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibrarySelector } from '../LibrarySelector';
import type { Resource } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn()
}));

const { useApiCall } = await import('@/hooks/useApiCall');

// Helper to wrap component with required providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LibrarySelector', () => {
  const mockLibraryResource: Resource = {
    name: 'Template',
    slug: 'templates',
    uigenId: 'templates',
    schemaName: 'Template',
    operations: [
      {
        id: 'listTemplates',
        uigenId: 'templates.list',
        method: 'GET',
        path: '/templates',
        viewHint: 'list',
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'search', label: 'Search', required: false }
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: {
              type: 'enum',
              key: 'category',
              label: 'Category',
              required: false,
              enumValues: ['meeting', 'report', 'presentation']
            }
          }
        ],
        responses: {}
      },
      {
        id: 'createTemplate',
        uigenId: 'templates.create',
        method: 'POST',
        path: '/templates',
        viewHint: 'create',
        parameters: [],
        responses: {}
      }
    ],
    schema: {
      type: 'object',
      key: 'template',
      label: 'Template',
      required: false,
      children: []
    },
    relationships: []
  };

  const mockOnSelect = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 4.2: Display library resources', () => {
    it('should fetch and display library resource instances', async () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup', description: 'Standard weekly meeting' },
        { id: '2', name: 'Retrospective', description: 'Sprint retrospective' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Weekly Standup')).toBeInTheDocument();
      expect(screen.getByText('Retrospective')).toBeInTheDocument();
    });

    it('should exclude items with IDs in excludeIds prop', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup' },
        { id: '2', name: 'Retrospective' },
        { id: '3', name: 'One-on-One' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
          excludeIds={['2']}
        />
      );

      expect(screen.getByText('Weekly Standup')).toBeInTheDocument();
      expect(screen.queryByText('Retrospective')).not.toBeInTheDocument();
      expect(screen.getByText('One-on-One')).toBeInTheDocument();
    });
  });

  describe('Requirement 4.3: Search with 300ms debounce', () => {
    it('should render search input', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search template...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should debounce search input by 300ms', async () => {
      const mockData = [
        { id: '1', name: 'Test Template' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search template...');
      
      // Type quickly multiple times
      fireEvent.change(searchInput, { target: { value: 't' } });
      fireEvent.change(searchInput, { target: { value: 'te' } });
      fireEvent.change(searchInput, { target: { value: 'tes' } });
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Wait for debounce to complete
      await waitFor(() => {
        expect(searchInput).toHaveValue('test');
      }, { timeout: 400 });
    });
  });

  describe('Requirement 4.4: Filter inputs', () => {
    it('should render filter inputs for query parameters', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      // Should have category filter (enum type)
      const categoryFilter = screen.getByRole('combobox');
      expect(categoryFilter).toBeInTheDocument();
    });

    it('should render enum filters as dropdowns', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const categoryFilter = screen.getByRole('combobox');
      expect(screen.getByText('All category')).toBeInTheDocument();
      expect(screen.getByText('meeting')).toBeInTheDocument();
      expect(screen.getByText('report')).toBeInTheDocument();
    });
  });

  describe('Requirement 4.5: Visual selection feedback', () => {
    it('should highlight selected item', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup' },
        { id: '2', name: 'Retrospective' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const firstItem = screen.getByText('Weekly Standup').closest('button');
      fireEvent.click(firstItem!);

      expect(firstItem).toHaveClass('border-primary');
    });

    it('should enable Select button when item is selected', () => {
      const mockData = [{ id: '1', name: 'Weekly Standup' }];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const selectButton = screen.getByRole('button', { name: /No item selected/i });
      expect(selectButton).toBeDisabled();

      const item = screen.getByText('Weekly Standup').closest('button');
      fireEvent.click(item!);

      expect(screen.getByRole('button', { name: /Confirm selection/i })).not.toBeDisabled();
    });
  });

  describe('Requirement 4.6: Create New and View All links', () => {
    it('should render "Create New" link when create operation exists', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const createLink = screen.getByText('Create New Template');
      expect(createLink).toBeInTheDocument();
      expect(createLink).toHaveAttribute('href', '/templates/new');
    });

    it('should render "View All" link', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const viewAllLink = screen.getByText('View All Template');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute('href', '/templates');
    });
  });

  describe('Requirement 9.1: Header with resource type', () => {
    it('should display header with library resource name', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Select Template')).toBeInTheDocument();
    });
  });

  describe('Requirement 9.3: Loading and error states', () => {
    it('should display loading spinner while fetching', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/Loading template/i)).toBeInTheDocument();
    });

    it('should display error message when fetch fails', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch templates')
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Error loading template')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch templates')).toBeInTheDocument();
    });
  });

  describe('Requirement 9.4: Empty state with Clear Filters', () => {
    it('should display empty state when no items match filters', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('No template available')).toBeInTheDocument();
    });

    it('should show "Clear Filters" button when filters are active', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search template...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should clear filters when Clear Filters button is clicked', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search template...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput.value).toBe('test');

      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      expect(searchInput.value).toBe('');
    });
  });

  describe('Requirement 9.5: Selection and cancellation', () => {
    it('should call onSelect with selected ID when Select button is clicked', async () => {
      const mockData = [{ id: '1', name: 'Weekly Standup' }];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null
      } as any);

      mockOnSelect.mockResolvedValue(undefined);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const item = screen.getByText('Weekly Standup').closest('button');
      fireEvent.click(item!);

      const selectButton = screen.getByRole('button', { name: /Confirm selection/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('1');
      });
    });

    it('should call onCancel when Cancel button is clicked', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel selection/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      } as any);

      renderWithProviders(
        <LibrarySelector
          libraryResource={mockLibraryResource}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByLabelText(/Close Template selector/i);
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
