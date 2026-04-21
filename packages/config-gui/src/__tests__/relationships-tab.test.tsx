import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App.js';
import { AppProvider } from '../contexts/AppContext.js';

// ResizeObserver stub for jsdom
beforeAll(() => {
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

describe('Relationships tab', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Relationships tab button in the nav bar', () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>
    );

    const tab = screen.getByTestId('relationships-tab');
    expect(tab).toBeDefined();
    expect(tab.textContent).toBe('Relationships');
  });

  it('Relationships tab is disabled when specStructure is null', () => {
    render(
      <AppProvider specStructure={null}>
        <App />
      </AppProvider>
    );

    const tab = screen.getByTestId('relationships-tab') as HTMLButtonElement;
    expect(tab.disabled).toBe(true);
  });

  it('Relationships tab is enabled when specStructure is provided', () => {
    const mockStructure = {
      resources: [
        {
          name: 'Users',
          slug: 'users',
          uigenId: 'users',
          operations: [],
          fields: [],
          annotations: {},
        },
      ],
    };

    render(
      <AppProvider specStructure={mockStructure}>
        <App />
      </AppProvider>
    );

    const tab = screen.getByTestId('relationships-tab') as HTMLButtonElement;
    expect(tab.disabled).toBe(false);
  });
});
