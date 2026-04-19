/**
 * End-to-End Integration Test: Many-to-Many Library Pattern
 *
 * Tests the full pipeline:
 * 1. Parse OpenAPI spec with many-to-many pattern
 * 2. Verify IR contains correct relationships and isLibrary flags
 * 3. Render DetailView for consumer resource
 * 4. Verify LibraryAssociationManager appears
 * 5. Open LibrarySelector
 * 6. Search and select library resource
 * 7. Verify association creation API call
 * 8. Verify UI updates to show new association
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5,
 *               4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5
 * Task 13.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpenAPI3Adapter } from '@uigen-dev/core';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp } from '@uigen-dev/core';
import { DetailView } from '../components/views/DetailView';
import { AppProvider } from '../contexts/AppContext';
import { ToastProvider } from '../components/Toast';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'meeting-123' }),
  };
});

// ---------------------------------------------------------------------------
// Real OpenAPI spec with meetings/templates many-to-many pattern
// ---------------------------------------------------------------------------

const meetingTemplatesSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Meeting Minutes API', version: '1.0.0' },
  paths: {
    '/meetings': {
      get: {
        operationId: 'listMeetings',
        summary: 'List meetings',
        parameters: [],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Meeting' },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createMeeting',
        summary: 'Create meeting',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Meeting' },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/meetings/{id}': {
      get: {
        operationId: 'getMeeting',
        summary: 'Get meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Meeting' },
              },
            },
          },
        },
      },
      put: {
        operationId: 'updateMeeting',
        summary: 'Update meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Meeting' },
            },
          },
        },
        responses: { '200': { description: 'Success' } },
      },
      delete: {
        operationId: 'deleteMeeting',
        summary: 'Delete meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '204': { description: 'No Content' } },
      },
    },
    '/meetings/{id}/templates': {
      get: {
        operationId: 'listMeetingTemplates',
        summary: 'List templates for a meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Template' },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'addTemplateToMeeting',
        summary: 'Add template to meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { templateId: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/meetings/{id}/templates/{templateId}': {
      delete: {
        operationId: 'removeTemplateFromMeeting',
        summary: 'Remove template from meeting',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'templateId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '204': { description: 'No Content' } },
      },
    },
    '/templates': {
      get: {
        operationId: 'listTemplates',
        summary: 'List templates',
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Template' },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createTemplate',
        summary: 'Create template',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Template' },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/templates/{id}': {
      get: {
        operationId: 'getTemplate',
        summary: 'Get template',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Template' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Meeting: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      Template: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfig(spec: OpenAPIV3.Document): UIGenApp {
  const adapter = new OpenAPI3Adapter(spec);
  return adapter.adapt();
}

function renderDetailView(config: UIGenApp, resourceSlug: string) {
  const resource = config.resources.find(r => r.slug === resourceSlug)!;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider config={config}>
          <ToastProvider>
            <DetailView resource={resource} />
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Many-to-Many E2E: meetings/templates pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Phase 1: IR verification
  // -------------------------------------------------------------------------

  describe('Phase 1: OpenAPI spec parsing produces correct IR', () => {
    it('should detect manyToMany relationship on meetings resource', () => {
      const config = buildConfig(meetingTemplatesSpec);
      const meetings = config.resources.find(r => r.slug === 'meetings');

      expect(meetings).toBeDefined();
      const rel = meetings!.relationships.find(r => r.type === 'manyToMany');
      expect(rel).toBeDefined();
      expect(rel!.target).toBe('templates');
      expect(rel!.path).toBe('/meetings/{id}/templates');
      expect(rel!.isReadOnly).toBe(false);
    });

    it('should mark templates resource as isLibrary=true', () => {
      const config = buildConfig(meetingTemplatesSpec);
      const templates = config.resources.find(r => r.slug === 'templates');

      expect(templates).toBeDefined();
      expect(templates!.isLibrary).toBe(true);
    });

    it('should not mark meetings resource as isLibrary', () => {
      const config = buildConfig(meetingTemplatesSpec);
      const meetings = config.resources.find(r => r.slug === 'meetings');

      expect(meetings!.isLibrary).toBeFalsy();
    });

    it('should include both resources in the config', () => {
      const config = buildConfig(meetingTemplatesSpec);
      const slugs = config.resources.map(r => r.slug);

      expect(slugs).toContain('meetings');
      expect(slugs).toContain('templates');
    });
  });

  // -------------------------------------------------------------------------
  // Phase 2: DetailView renders LibraryAssociationManager
  // -------------------------------------------------------------------------

  describe('Phase 2: DetailView renders association management UI', () => {
    beforeEach(async () => {
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: { id: 'meeting-123', title: 'Team Standup', date: '2024-01-15T10:00:00Z' },
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
    });

    it('should render "Manage Associations" section for meetings with manyToMany relationships', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByText('Manage Associations')).toBeInTheDocument();
      });
    });

    it('should render LibraryAssociationManager for the templates relationship', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByText('Associated Templates')).toBeInTheDocument();
      });
    });

    it('should render "Add Templates" button', async () => {
      const config = buildConfig(meetingTemplatesSpec);

      // Mock associations as empty
      const { useApiCall } = await import('@/hooks/useApiCall');
      vi.mocked(useApiCall).mockImplementation(({ operation }: any) => {
        if (operation?.path?.includes('/templates') && !operation?.path?.includes('{id}')) {
          return { data: [], isLoading: false, error: null, refetch: vi.fn() } as any;
        }
        return {
          data: { id: 'meeting-123', title: 'Team Standup' },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        } as any;
      });

      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByText(/\+ Add Templates/i)).toBeInTheDocument();
      });
    });

    it('should not render "Manage Associations" for templates resource (library, not consumer)', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      renderDetailView(config, 'templates');

      await waitFor(() => {
        expect(screen.queryByText('Manage Associations')).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Phase 3: LibrarySelector opens and allows selection
  // -------------------------------------------------------------------------

  describe('Phase 3: LibrarySelector interaction', () => {
    it('should open LibrarySelector when Add button is clicked', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: [],
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

      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByLabelText(/Add Templates/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/Add Templates/i));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Select Templates')).toBeInTheDocument();
      });
    });

    it('should display available templates in LibrarySelector', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      const availableTemplates = [
        { id: 'tmpl-1', name: 'Weekly Standup', description: 'Standard weekly meeting' },
        { id: 'tmpl-2', name: 'Retrospective', description: 'Sprint retrospective' },
      ];

      // Mock useApiCall to return appropriate data based on operation
      vi.mocked(useApiCall).mockImplementation((params: any) => {
        const { operation } = params;
        
        // Return templates for the library selector fetch (standalone list/search)
        // The operation has viewHint='search' because it has a search parameter
        if (operation?.path === '/templates' && (operation?.viewHint === 'list' || operation?.viewHint === 'search')) {
          return {
            data: availableTemplates,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          } as any;
        }
        // Return empty associations for the manager (association path)
        if (operation?.path === '/meetings/{id}/templates') {
          return { data: [], isLoading: false, error: null, refetch: vi.fn() } as any;
        }
        // Return meeting detail
        return {
          data: { id: 'meeting-123', title: 'Team Standup' },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        } as any;
      });

      vi.mocked(useApiMutation).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      renderDetailView(config, 'meetings');

      // Wait for the Add button to appear
      const addButton = await screen.findByLabelText(/Add Templates/i);
      expect(addButton).toBeInTheDocument();

      // Click to open selector
      fireEvent.click(addButton);

      // Wait for dialog
      const dialog = await screen.findByRole('dialog', {}, { timeout: 2000 });
      expect(dialog).toBeInTheDocument();

      // Wait for templates to load
      const weeklyStandup = await screen.findByText('Weekly Standup', {}, { timeout: 2000 });
      expect(weeklyStandup).toBeInTheDocument();
      expect(screen.getByText('Retrospective')).toBeInTheDocument();
    });

    it('should call association creation API when template is selected', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      const mockMutateAsync = vi.fn().mockResolvedValue({});
      const mockRefetch = vi.fn();

      vi.mocked(useApiCall).mockImplementation(({ operation }: any) => {
        // Match on viewHint='list' or 'search' and path='/templates' for the selector
        if (operation?.path === '/templates' && (operation?.viewHint === 'list' || operation?.viewHint === 'search')) {
          return {
            data: [{ id: 'tmpl-1', name: 'Weekly Standup' }],
            isLoading: false,
            error: null,
            refetch: mockRefetch,
          } as any;
        }
        // Return empty associations for the manager
        if (operation?.path === '/meetings/{id}/templates') {
          return { data: [], isLoading: false, error: null, refetch: mockRefetch } as any;
        }
        // Return meeting detail
        return {
          data: { id: 'meeting-123', title: 'Team Standup' },
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        } as any;
      });

      vi.mocked(useApiMutation).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderDetailView(config, 'meetings');

      // Open selector
      await waitFor(() => {
        expect(screen.getByLabelText(/Add Templates/i)).toBeInTheDocument();
      });
      
      const addButton = screen.getByLabelText(/Add Templates/i);
      fireEvent.click(addButton);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select a template
      await waitFor(() => {
        expect(screen.getByText('Weekly Standup')).toBeInTheDocument();
      });

      const templateButton = screen.getByText('Weekly Standup').closest('button');
      fireEvent.click(templateButton!);

      // Click Select button
      const selectBtn = screen.getByRole('button', { name: /Confirm selection/i });
      fireEvent.click(selectBtn);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            pathParams: expect.objectContaining({ id: 'meeting-123' }),
            body: expect.objectContaining({ templatesId: 'tmpl-1' }),
          })
        );
      });
    });

    it('should close LibrarySelector on cancel', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useApiMutation).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByLabelText(/Add Templates/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText(/Add Templates/i));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close via Escape key
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Phase 4: Existing associations display
  // -------------------------------------------------------------------------

  describe('Phase 4: Existing associations are displayed', () => {
    it('should display currently associated templates', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      const existingAssociations = [
        { id: 'tmpl-1', name: 'Weekly Standup', description: 'Standard weekly meeting' },
      ];

      vi.mocked(useApiCall).mockImplementation(({ operation }: any) => {
        if (operation?.path?.includes('/meetings/') && operation?.path?.includes('/templates')) {
          return {
            data: existingAssociations,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          } as any;
        }
        return {
          data: { id: 'meeting-123', title: 'Team Standup' },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        } as any;
      });

      vi.mocked(useApiMutation).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByText('Weekly Standup')).toBeInTheDocument();
        expect(screen.getByText('Standard weekly meeting')).toBeInTheDocument();
      });
    });

    it('should display remove button for each associated template', async () => {
      const config = buildConfig(meetingTemplatesSpec);
      const { useApiCall, useApiMutation } = await import('@/hooks/useApiCall');

      vi.mocked(useApiCall).mockImplementation(({ operation }: any) => {
        if (operation?.path?.includes('/meetings/') && operation?.path?.includes('/templates')) {
          return {
            data: [{ id: 'tmpl-1', name: 'Weekly Standup' }],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          } as any;
        }
        return {
          data: { id: 'meeting-123', title: 'Team Standup' },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        } as any;
      });

      vi.mocked(useApiMutation).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      renderDetailView(config, 'meetings');

      await waitFor(() => {
        expect(screen.getByLabelText(/Remove Weekly Standup/i)).toBeInTheDocument();
      });
    });
  });
});
