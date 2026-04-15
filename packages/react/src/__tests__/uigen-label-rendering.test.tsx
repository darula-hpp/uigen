/**
 * Tests that x-uigen-label values actually render in the DOM.
 *
 * The core adapter tests prove the IR is correct. These tests prove the
 * React renderer reads SchemaNode.label and puts it in the right place:
 *
 * - ListView: column headers and filter placeholders
 * - FormView: <Label> elements
 * - DetailView: <dt> elements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListView } from '../components/views/ListView';
import { FormView } from '../components/views/FormView';
import { DetailView } from '../components/views/DetailView';
import type { Resource } from '@uigen-dev/core';
import * as useApiCallModule from '@/hooks/useApiCall';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useApiMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false, isError: false })),
}));

vi.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderInRouter(element: React.ReactElement, path = '/') {
  const router = createMemoryRouter(
    [{ path: '*', element }],
    { initialEntries: [path] }
  );
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

/** Build a Resource whose schema fields use custom x-uigen-label values. */
function makeResourceWithLabels(): Resource {
  return {
    name: 'Services',
    slug: 'services',
    uigenId: 'services',
    description: undefined,
    relationships: [],
    pagination: undefined,
    schema: {
      type: 'object',
      key: 'root',
      label: 'Services',
      required: false,
      children: [
        { type: 'string',  key: 'sid',           label: 'SID',                    required: false },
        { type: 'string',  key: 'friendly_name', label: 'Display Name',           required: true  },
        { type: 'string',  key: 'account_sid',   label: 'Account SID',            required: false },
        { type: 'boolean', key: 'mms_converter', label: 'MMS Converter',          required: false },
        { type: 'integer', key: 'validity_period', label: 'Validity Period (seconds)', required: false },
        { type: 'string',  key: 'status_callback', label: 'Status Callback URL',  required: false },
      ],
    },
    operations: [
      {
        id: 'listServices',
        uigenId: 'listServices',
        method: 'GET',
        path: '/services',
        summary: 'List Services',
        parameters: [],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'array',
              key: 'services',
              label: 'Services',
              required: false,
            },
          },
        },
        viewHint: 'list',
      },
      {
        id: 'getService',
        uigenId: 'getService',
        method: 'GET',
        path: '/services/{sid}',
        summary: 'Get Service',
        parameters: [
          { name: 'sid', in: 'path', required: true, schema: { type: 'string', key: 'sid', label: 'SID', required: true } },
        ],
        responses: {
          '200': {
            description: 'OK',
            schema: {
              type: 'object',
              key: 'service',
              label: 'Service',
              required: false,
              children: [
                { type: 'string',  key: 'sid',           label: 'SID',                    required: false },
                { type: 'string',  key: 'friendly_name', label: 'Display Name',           required: false },
                { type: 'string',  key: 'account_sid',   label: 'Account SID',            required: false },
                { type: 'boolean', key: 'mms_converter', label: 'MMS Converter',          required: false },
                { type: 'integer', key: 'validity_period', label: 'Validity Period (seconds)', required: false },
              ],
            },
          },
        },
        viewHint: 'detail',
      },
      {
        id: 'createService',
        uigenId: 'createService',
        method: 'POST',
        path: '/services',
        summary: 'Create Service',
        parameters: [],
        requestBody: {
          type: 'object',
          key: 'body',
          label: 'Body',
          required: true,
          children: [
            { type: 'string',  key: 'friendly_name',   label: 'Display Name',           required: true  },
            { type: 'boolean', key: 'mms_converter',   label: 'MMS Converter',          required: false },
            { type: 'integer', key: 'validity_period', label: 'Validity Period (seconds)', required: false },
            { type: 'string',  key: 'status_callback', label: 'Status Callback URL',    required: false },
          ],
        },
        responses: { '201': { description: 'Created' } },
        viewHint: 'create',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// ListView — column headers and filter placeholders
// ---------------------------------------------------------------------------

describe('ListView — x-uigen-label rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders x-uigen-label values as table column headers', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<ListView resource={resource} />);

    await waitFor(() => {
      // These are the x-uigen-label values — NOT the humanized key names
      expect(screen.getByText('SID')).toBeInTheDocument();
      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getByText('Account SID')).toBeInTheDocument();
      expect(screen.getByText('MMS Converter')).toBeInTheDocument();
    });
  });

  it('does NOT render the raw humanized key names as column headers', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<ListView resource={resource} />);

    await waitFor(() => {
      // humanize('friendly_name') → 'Friendly Name' — should NOT appear
      expect(screen.queryByText('Friendly Name')).not.toBeInTheDocument();
      // humanize('account_sid') → 'Account Sid' — should NOT appear
      expect(screen.queryByText('Account Sid')).not.toBeInTheDocument();
      // humanize('mms_converter') → 'Mms Converter' — should NOT appear
      expect(screen.queryByText('Mms Converter')).not.toBeInTheDocument();
    });
  });

  it('uses x-uigen-label in filter input placeholders', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<ListView resource={resource} />);

    await waitFor(() => {
      // Filter placeholders use col.label — should show overridden labels
      expect(screen.getByPlaceholderText('Filter SID...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter Display Name...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter Account SID...')).toBeInTheDocument();
    });
  });

  it('does NOT use humanized key names in filter placeholders', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<ListView resource={resource} />);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Filter Friendly Name...')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Filter Account Sid...')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// FormView — <Label> elements
// ---------------------------------------------------------------------------

describe('FormView — x-uigen-label rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders x-uigen-label values as form field labels', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<FormView resource={resource} mode="create" />);

    await waitFor(() => {
      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getByText('MMS Converter')).toBeInTheDocument();
      expect(screen.getByText('Validity Period (seconds)')).toBeInTheDocument();
      expect(screen.getByText('Status Callback URL')).toBeInTheDocument();
    });
  });

  it('does NOT render humanized key names as form labels', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<FormView resource={resource} mode="create" />);

    await waitFor(() => {
      // humanize('friendly_name') → 'Friendly Name'
      expect(screen.queryByText('Friendly Name')).not.toBeInTheDocument();
      // humanize('mms_converter') → 'Mms Converter'
      expect(screen.queryByText('Mms Converter')).not.toBeInTheDocument();
      // humanize('validity_period') → 'Validity Period'
      expect(screen.queryByText('Validity Period')).not.toBeInTheDocument();
      // humanize('status_callback') → 'Status Callback'
      expect(screen.queryByText('Status Callback')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// DetailView — <dt> elements
// ---------------------------------------------------------------------------

describe('DetailView — x-uigen-label rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide mock data so the detail view renders fields
    vi.mocked(useApiCallModule.useApiCall).mockReturnValue({
      data: {
        sid: 'MG123',
        friendly_name: 'My Service',
        account_sid: 'AC456',
        mms_converter: true,
        validity_period: 3600,
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders x-uigen-label values as detail field labels', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<DetailView resource={resource} />, '/services/MG123');

    await waitFor(() => {
      expect(screen.getByText('SID')).toBeInTheDocument();
      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getByText('Account SID')).toBeInTheDocument();
      expect(screen.getByText('MMS Converter')).toBeInTheDocument();
      expect(screen.getByText('Validity Period (seconds)')).toBeInTheDocument();
    });
  });

  it('does NOT render humanized key names as detail labels', async () => {
    const resource = makeResourceWithLabels();
    renderInRouter(<DetailView resource={resource} />, '/services/MG123');

    await waitFor(() => {
      expect(screen.queryByText('Friendly Name')).not.toBeInTheDocument();
      expect(screen.queryByText('Account Sid')).not.toBeInTheDocument();
      expect(screen.queryByText('Mms Converter')).not.toBeInTheDocument();
      expect(screen.queryByText('Validity Period')).not.toBeInTheDocument();
    });
  });
});
