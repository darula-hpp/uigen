import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibraryAssociationManager } from '../LibraryAssociationManager';
import type { Resource, Relationship } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn()
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

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

describe('LibraryAssociationManager', () => {
  const mockConsumerResource: Resource = {
    name: 'Meeting',
    slug: 'meetings',
    uigenId: 'meetings',
    schemaName: 'Meeting',
    operations: [
      {
        id: 'listMeetingTemplates',
        uigenId: 'meetings.templates.list',
        method: 'GET',
        path: '/meetings/{meetingId}/templates',
        viewHint: 'list',
        parameters: [],
        responses: {}
      },
      {
        id: 'createMeetingTemplate',
        uigenId: 'meetings.templates.create',
        method: 'POST',
        path: '/meetings/{meetingId}/templates',
        viewHint: 'create',
        parameters: [],
        responses: {}
      },
      {
        id: 'deleteMeetingTemplate',
        uigenId: 'meetings.templates.delete',
        method: 'DELETE',
        path: '/meetings/{meetingId}/templates/{templateId}',
        viewHint: 'delete',
        parameters: [],
        responses: {}
      }
    ],
    schema: {
      type: 'object',
      key: 'meeting',
      label: 'Meeting',
      required: false,
      children: []
    },
    relationships: []
  };

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

  const mockRelationship: Relationship = {
    target: 'templates',
    type: 'manyToMany',
    path: '/meetings/{meetingId}/templates',
    isReadOnly: false
  };

  const mockMutateAsync = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useApiMutation
    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false
    } as any);
  });

  describe('Requirement 4.1: Fetch currently associated library resources', () => {
    it('should fetch associations on mount', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup', description: 'Standard weekly meeting' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(useApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: mockConsumerResource.operations[0],
          pathParams: { meetingId: 'meeting-123' }
        })
      );
    });
  });

  describe('Requirement 4.2: Display associated resources in a list', () => {
    it('should display associated resources', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup', description: 'Standard weekly meeting' },
        { id: '2', name: 'Retrospective', description: 'Sprint retrospective' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.getByText('Weekly Standup')).toBeDefined();
      expect(screen.getByText('Retrospective')).toBeDefined();
    });

    it('should display empty state when no associations exist', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.getByText(/No template associated yet/i)).toBeDefined();
    });
  });

  describe('Requirement 4.4: Remove action for each associated resource', () => {
    it('should display remove button for each association', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      const removeButton = screen.getByLabelText(/Remove Weekly Standup/i);
      expect(removeButton).toBeDefined();
    });

    it('should call delete mutation when remove button is clicked', async () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      mockMutateAsync.mockResolvedValue({});

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      const removeButton = screen.getByLabelText(/Remove Weekly Standup/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            pathParams: {
              meetingId: 'meeting-123',
              templateId: '1'
            }
          })
        );
      });
    });
  });

  describe('Requirement 4.6: Render LibrarySelector when Add button is clicked', () => {
    it('should display Add button', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      const addButton = screen.getByText('+ Add Template');
      expect(addButton).toBeDefined();
    });

    it('should open LibrarySelector when Add button is clicked', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      const addButton = screen.getByText('+ Add Template');
      fireEvent.click(addButton);

      expect(screen.getByText('Select Template')).toBeDefined();
    });
  });

  describe('Requirement 4.7: Display loading states and error messages', () => {
    it('should display loading spinner while fetching', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.getByLabelText(/Loading associated template/i)).toBeDefined();
    });

    it('should display error message when fetch fails', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch associations'),
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.getByText('Error loading associations')).toBeDefined();
      expect(screen.getByText('Failed to fetch associations')).toBeDefined();
    });
  });

  describe('Requirement 4.8: Handle read-only associations', () => {
    it('should hide Add button for read-only associations', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      const readOnlyRelationship: Relationship = {
        ...mockRelationship,
        isReadOnly: true
      };

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={readOnlyRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.queryByText('+ Add Template')).toBeNull();
      expect(screen.getByText('This association is read-only.')).toBeDefined();
    });

    it('should hide remove buttons for read-only associations', () => {
      const mockData = [
        { id: '1', name: 'Weekly Standup' }
      ];

      vi.mocked(useApiCall).mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      const readOnlyRelationship: Relationship = {
        ...mockRelationship,
        isReadOnly: true
      };

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={readOnlyRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.queryByLabelText(/Remove Weekly Standup/i)).toBeNull();
    });
  });

  describe('Requirement 8.5: Integration with DetailView', () => {
    it('should display header with library resource name', () => {
      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch
      } as any);

      renderWithProviders(
        <LibraryAssociationManager
          consumerResource={mockConsumerResource}
          consumerId="meeting-123"
          relationship={mockRelationship}
          libraryResource={mockLibraryResource}
        />
      );

      expect(screen.getByText('Associated Template')).toBeDefined();
    });
  });
});
