/**
 * Test that simulates the exact Twilio search scenario that causes the crash
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SearchView } from '../components/views/SearchView';
import { App } from '../App';
import type { Resource, UIGenApp } from '@uigen-dev/core';

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

// Simulate Twilio Services resource
const twilioServicesResource: Resource = {
  name: 'Services',
  slug: 'services',
  uigenId: 'services',
  description: 'Messaging Services',
  schema: {
    type: 'object',
    key: 'service',
    label: 'Service',
    required: false,
    children: [
      { type: 'string', key: 'sid', label: 'SID', required: true },
      { type: 'string', key: 'friendly_name', label: 'Friendly Name', required: true },
      { type: 'string', key: 'date_created', label: 'Date Created', required: false },
    ],
  },
  operations: [
    {
      id: 'list-services',
      method: 'GET',
      path: '/v1/Services',
      viewHint: 'list',
      parameters: [],
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
              },
            ],
          },
        },
      },
    },
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

describe('Twilio Search Crash Scenario', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should not crash when data loads and component re-renders', async () => {
    let callCount = 0;
    (global.fetch as any).mockImplementation(async () => {
      callCount++;
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        ok: true,
        json: async () => ({
          services: [
            { sid: 'MG123', friendly_name: 'Test Service 1', date_created: '2024-01-01' },
            { sid: 'MG456', friendly_name: 'Test Service 2', date_created: '2024-01-02' },
          ],
        }),
      };
    });

    const { rerender } = render(
      <Wrapper>
        <SearchView resource={twilioServicesResource} />
      </Wrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Test Service 1/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Force multiple re-renders after data loads (simulates React's behavior)
    for (let i = 0; i < 5; i++) {
      rerender(
        <Wrapper>
          <SearchView resource={twilioServicesResource} />
        </Wrapper>
      );
    }

    // Should still show the data without crashing
    expect(screen.getByText(/Test Service 1/i)).toBeInTheDocument();
  });

  it('should handle rapid filter changes without crashing', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        services: [
          { sid: 'MG123', friendly_name: 'Test Service', date_created: '2024-01-01' },
        ],
      }),
    });

    render(
      <Wrapper>
        <SearchView resource={twilioServicesResource} />
      </Wrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find filter input
    const filterInput = screen.getByPlaceholderText(/Enter friendly name/i);

    // Simulate rapid typing (causes rapid re-renders)
    const text = 'Test';
    for (const char of text) {
      fireEvent.change(filterInput, { target: { value: char } });
      // Small delay to simulate typing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Should not crash
    expect(filterInput).toHaveValue('t'); // Last character
  });

  it('should handle transition from loading to loaded state', async () => {
    let resolveData: any;
    const dataPromise = new Promise(resolve => {
      resolveData = resolve;
    });

    (global.fetch as any).mockImplementation(async () => {
      await dataPromise;
      return {
        ok: true,
        json: async () => ({
          services: [
            { sid: 'MG123', friendly_name: 'Test Service', date_created: '2024-01-01' },
          ],
        }),
      };
    });

    render(
      <Wrapper>
        <SearchView resource={twilioServicesResource} />
      </Wrapper>
    );

    // Component is in loading state
    // Now resolve the data
    resolveData();

    // Wait for transition to loaded state
    await waitFor(() => {
      expect(screen.queryByText(/Test Service/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should not crash during state transition
    expect(true).toBe(true);
  });

  it('should handle empty results without crashing', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        services: [],
      }),
    });

    render(
      <Wrapper>
        <SearchView resource={twilioServicesResource} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });

    // Should not crash with empty results
    expect(true).toBe(true);
  });

  it('should handle data structure variations without crashing', async () => {
    const testCases = [
      // Direct array
      [{ sid: 'MG123', friendly_name: 'Test' }],
      // Wrapped in services key
      { services: [{ sid: 'MG123', friendly_name: 'Test' }] },
      // Wrapped in items key
      { items: [{ sid: 'MG123', friendly_name: 'Test' }] },
      // Wrapped in data key
      { data: [{ sid: 'MG123', friendly_name: 'Test' }] },
    ];

    for (const testData of testCases) {
      queryClient.clear();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => testData,
      });

      const { unmount } = render(
        <Wrapper>
          <SearchView resource={twilioServicesResource} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      unmount();
    }

    // Should handle all data structures without crashing
    expect(true).toBe(true);
  });
});
