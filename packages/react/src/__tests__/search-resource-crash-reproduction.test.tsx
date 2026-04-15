/**
 * Reproduction test for the search resource crash bug
 * 
 * This test attempts to reproduce the exact crash scenario:
 * React error #300: "Rendered more hooks than during the previous render"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SearchView } from '../components/views/SearchView';
import { overrideRegistry } from '../overrides/registry';
import type { Resource } from '@uigen-dev/core';
import { useState } from 'react';

// Mock fetch
global.fetch = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function createSearchResource(): Resource {
  return {
    name: 'Services',
    slug: 'services',
    uigenId: 'services',
    description: 'Twilio Services',
    schema: {
      type: 'object',
      key: 'service',
      label: 'Service',
      required: false,
      children: [
        { type: 'string', key: 'sid', label: 'SID', required: true },
        { type: 'string', key: 'friendly_name', label: 'Friendly Name', required: true },
      ],
    },
    operations: [
      {
        id: 'search-services',
        method: 'GET',
        path: '/v1/Services',
        viewHint: 'search',
        parameters: [
          {
            name: 'FriendlyName',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'FriendlyName', label: 'Friendly Name', required: false },
          },
        ],
        responses: {
          '200': {
            schema: {
              type: 'object',
              key: 'response',
              label: 'Response',
              required: false,
              children: [
                {
                  type: 'array',
                  key: 'services',
                  label: 'Services',
                  required: false,
                  items: {
                    type: 'object',
                    key: 'service',
                    label: 'Service',
                    required: false,
                    children: [
                      { type: 'string', key: 'sid', label: 'SID', required: true },
                      { type: 'string', key: 'friendly_name', label: 'Friendly Name', required: true },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    ],
    relationships: [],
    pagination: undefined,
  };
}

describe('Search Resource Crash Reproduction', () => {
  beforeEach(() => {
    overrideRegistry.clear();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        services: [
          { sid: 'MG123', friendly_name: 'Test Service' },
        ],
      }),
    });
  });

  it('should not crash when rendering search view', async () => {
    const resource = createSearchResource();

    expect(() => {
      render(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('should not crash when override registry changes between renders', () => {
    const resource = createSearchResource();

    // First render without override
    const { rerender } = render(
      <Wrapper>
        <SearchView resource={resource} />
      </Wrapper>
    );

    // Register an override with useHooks that calls React hooks
    overrideRegistry.register({
      targetId: 'services.search',
      useHooks: () => {
        // This calls a React hook!
        const [count] = useState(0);
        return { count };
      },
    });

    // Re-render - this could cause hook count mismatch if not handled properly
    expect(() => {
      rerender(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }).not.toThrow();
  });

  it('should not crash when OverrideHooksHost is conditionally rendered', () => {
    const resource = createSearchResource();

    // Register override BEFORE first render
    overrideRegistry.register({
      targetId: 'services.search',
      useHooks: () => {
        const [filters] = useState({});
        return { filters };
      },
    });

    // First render with override
    const { rerender } = render(
      <Wrapper>
        <SearchView resource={resource} />
      </Wrapper>
    );

    // Clear override
    overrideRegistry.clear();

    // Re-render without override - this could cause hook count mismatch
    expect(() => {
      rerender(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }).not.toThrow();
  });

  it('should handle filter state changes without crashing', async () => {
    const resource = createSearchResource();

    const { rerender } = render(
      <Wrapper>
        <SearchView resource={resource} />
      </Wrapper>
    );

    // Simulate multiple re-renders (like filter changes)
    for (let i = 0; i < 10; i++) {
      rerender(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('should not crash when useHooks override calls multiple React hooks', () => {
    const resource = createSearchResource();

    overrideRegistry.register({
      targetId: 'services.search',
      useHooks: () => {
        // Multiple React hooks
        const [count] = useState(0);
        const [filters] = useState({});
        const [isOpen] = useState(false);
        return { count, filters, isOpen };
      },
    });

    expect(() => {
      render(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }).not.toThrow();
  });

  it('should maintain consistent hook calls when override exists from the start', () => {
    const resource = createSearchResource();

    // Register override BEFORE any render
    overrideRegistry.register({
      targetId: 'services.search',
      useHooks: () => {
        const [data] = useState({ test: true });
        return data;
      },
    });

    const { rerender } = render(
      <Wrapper>
        <SearchView resource={resource} />
      </Wrapper>
    );

    // Multiple re-renders should not cause issues
    for (let i = 0; i < 5; i++) {
      rerender(
        <Wrapper>
          <SearchView resource={resource} />
        </Wrapper>
      );
    }

    // If we get here without errors, hook calls are consistent
    expect(true).toBe(true);
  });
});
