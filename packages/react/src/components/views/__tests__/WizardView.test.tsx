import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WizardView } from '../WizardView';
import type { Resource } from '@uigen/core';

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useApiCall', () => ({
  useApiMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
  useApiCall: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/auth', () => ({
  getAuthHeaders: () => ({}),
  clearAuthCredentials: vi.fn(),
}));

vi.mock('@/lib/server', () => ({
  getSelectedServer: () => null,
}));

const makeResource = (fieldCount: number): Resource => ({
  name: 'Service',
  slug: 'Services',
  operations: [
    {
      id: 'CreateService',
      method: 'POST',
      path: '/v1/Services',
      viewHint: 'wizard',
      parameters: [],
      requestBody: {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: Array.from({ length: fieldCount }, (_, i) => ({
          type: 'string' as const,
          key: `Field${i + 1}`,
          label: `Field ${i + 1}`,
          required: false,
          readOnly: false,
        })),
      },
      responses: {},
    },
  ],
  schema: { type: 'object', key: 'service', label: 'Service', required: false, children: [] },
  relationships: [],
});

function renderWizard(resource: Resource, mode: 'create' | 'edit' = 'create') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/Services/new']}>
        <Routes>
          <Route path="/Services/new" element={<WizardView resource={resource} mode={mode} />} />
          <Route path="/Services" element={<div data-testid="list-page">List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('WizardView', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it('renders step 1 initially', () => {
    renderWizard(makeResource(10));
    expect(screen.getByText('Field 1')).toBeInTheDocument();
    expect(screen.queryByText('Field 6')).not.toBeInTheDocument();
  });

  it('does NOT submit when clicking Next on non-last step', async () => {
    renderWizard(makeResource(10));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(mockMutateAsync).not.toHaveBeenCalled());
  });

  it('shows step 2 fields after clicking Next', async () => {
    renderWizard(makeResource(10));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByText('Field 6')).toBeInTheDocument());
  });

  it('shows Submit button only on last step', async () => {
    renderWizard(makeResource(10));
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });

  it('only submits when Submit button is explicitly clicked', async () => {
    renderWizard(makeResource(6));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument());

    expect(mockMutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('does not submit when pressing Enter in an input field', async () => {
    renderWizard(makeResource(6));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument());

    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[0], { key: 'Enter', code: 'Enter' });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not auto-submit when navigating between steps', async () => {
    renderWizard(makeResource(15));

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText('Field 6'));

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText('Field 11'));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
