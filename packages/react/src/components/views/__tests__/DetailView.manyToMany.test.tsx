import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DetailView } from '../DetailView';
import type { Resource, UIGenApp } from '@uigen-dev/core';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';
import { AppProvider } from '@/contexts/AppContext';

// Mock the hooks
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '123' }),
  };
});

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

const mockMeetingResource: Resource = {
  name: 'Meeting',
  slug: 'meetings',
  uigenId: 'meetings',
  operations: [
    {
      id: 'getMeeting',
      uigenId: 'meetings.detail',
      method: 'GET',
      path: '/meetings/{id}',
      viewHint: 'detail',
      parameters: [],
      responses: {
        '200': {
          description: 'Success',
          schema: {
            type: 'object',
            key: 'meeting',
            label: 'Meeting',
            required: false,
            children: [
              { type: 'string', key: 'id', label: 'ID', required: true },
              { type: 'string', key: 'title', label: 'Title', required: true },
            ],
          },
        },
      },
    },
    {
      id: 'listMeetingTemplates',
      uigenId: 'meetings.templates.list',
      method: 'GET',
      path: '/meetings/{id}/templates',
      viewHint: 'action',
      parameters: [],
      responses: {},
    },
    {
      id: 'addMeetingTemplate',
      uigenId: 'meetings.templates.create',
      method: 'POST',
      path: '/meetings/{id}/templates',
      viewHint: 'action',
      parameters: [],
      responses: {},
    },
  ],
  schema: {
    type: 'object',
    key: 'meeting',
    label: 'Meeting',
    required: false,
    children: [],
  },
  relationships: [
    {
      target: 'templates',
      type: 'manyToMany',
      path: '/meetings/{id}/templates',
    },
  ],
};

const mockConfig: UIGenApp = {
  meta: {
    title: 'Test App',
    version: '1.0.0',
  },
  resources: [mockMeetingResource, mockTemplateResource],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {
    enabled: false,
    widgets: [],
  },
  servers: [],
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AppProvider config={mockConfig}>
        <ToastProvider>
          {ui}
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

describe('DetailView - Many-to-Many Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Render LibraryAssociationManager for many-to-many relationships
   * Validates Requirements 4.1, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  it('should render LibraryAssociationManager for many-to-many relationships', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', title: 'Team Standup' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders(<DetailView resource={mockMeetingResource} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    // Verify "Manage Associations" section is rendered
    expect(screen.getByText('Manage Associations')).toBeInTheDocument();

    // Verify "Associated Template" heading is rendered
    expect(screen.getByText('Associated Template')).toBeInTheDocument();
  });

  /**
   * Test: Filter out many-to-many relationships from Related Resources section
   */
  it('should not display many-to-many relationships in Related Resources section', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', title: 'Team Standup' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders(<DetailView resource={mockMeetingResource} />);

    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    // The "Related Resources" section should not be rendered since we only have manyToMany relationships
    expect(screen.queryByText('Related Resources')).not.toBeInTheDocument();
  });

  /**
   * Test: Handle missing library resource gracefully
   */
  it('should handle missing library resource gracefully', async () => {
    const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');
    
    vi.mocked(useApiCall).mockReturnValue({
      data: { id: '123', title: 'Team Standup' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useApiMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    // Config without the template resource
    const configWithoutTemplate: UIGenApp = {
      ...mockConfig,
      resources: [mockMeetingResource],
    };

    render(
      <BrowserRouter>
        <AppProvider config={configWithoutTemplate}>
          <ToastProvider>
            <DetailView resource={mockMeetingResource} />
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument();
    });

    // "Manage Associations" section should still render
    expect(screen.getByText('Manage Associations')).toBeInTheDocument();

    // But the LibraryAssociationManager should not render since the library resource is missing
    expect(screen.queryByText('Associated Template')).not.toBeInTheDocument();
  });
});
