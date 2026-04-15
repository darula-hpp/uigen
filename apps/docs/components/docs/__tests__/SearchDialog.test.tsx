import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchDialog } from '../SearchDialog';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch for search index
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      { title: 'Introduction', section: 'Getting Started', slug: 'introduction', href: '/docs/getting-started/introduction', content: 'Welcome to UIGen' },
      { title: 'Quick Start', section: 'Getting Started', slug: 'quick-start', href: '/docs/getting-started/quick-start', content: 'Run the CLI' },
    ],
  } as Response);
});

describe('SearchDialog', () => {
  it('opens the dialog when ⌘K is pressed', async () => {
    render(<SearchDialog />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /search documentation/i })).toBeDefined();
    });
  });

  it('closes the dialog when Escape is pressed', async () => {
    render(<SearchDialog />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await waitFor(() => screen.getByRole('dialog'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('closes the dialog when clicking outside the panel', async () => {
    render(<SearchDialog />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await waitFor(() => screen.getByRole('dialog'));
    // Click the backdrop overlay (the dialog container itself)
    await userEvent.click(screen.getByRole('dialog'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('shows search results when typing a query', async () => {
    render(<SearchDialog />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await waitFor(() => screen.getByRole('dialog'));
    const input = screen.getByRole('textbox', { name: /search query/i });
    await userEvent.type(input, 'Introduction');
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeDefined();
    });
  });
});
