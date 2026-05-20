import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { UIGenApp } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';
import { AppShell } from '../AppShell';

const mockConfig: UIGenApp = {
  meta: {
    title: 'Test App',
    version: '1.0.0',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      operations: [],
      schema: { type: 'object', key: 'User', label: 'User', required: false },
      relationships: [],
    },
  ],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {},
  servers: [{ url: 'https://api.example.com' }],
};

const renderAppShell = (sidebarWidth = 256) => {
  return render(
    <BrowserRouter>
      <AppProvider config={mockConfig}>
        <AppShell sidebarWidth={sidebarWidth}>
          <div data-testid="main-content">Main Content</div>
        </AppShell>
      </AppProvider>
    </BrowserRouter>
  );
};

describe('AppShell', () => {
  it('renders sidebar, top bar, breadcrumb, and main content', () => {
    const { container } = renderAppShell();

    expect(container.querySelector('aside')).toBeInTheDocument();
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('uses a width-constrained sidebar panel wrapper instead of fixed aside', () => {
    const { container } = renderAppShell(260);

    const panel = container.querySelector('.app-shell-sidebar-panel');
    const sidebar = container.querySelector('aside');

    expect(panel).toBeInTheDocument();
    expect(sidebar).toBeInTheDocument();
    expect(sidebar?.className).not.toContain('fixed');
    expect(panel?.className).toContain('is-mobile-closed');

    const root = container.querySelector('.flex.h-screen.overflow-hidden') as HTMLElement;
    expect(root.style.getPropertyValue('--app-shell-sidebar-width')).toBe('260px');
  });

  it('keeps main content in a flex-1 min-w-0 column', () => {
    const { container } = renderAppShell();

    const main = container.querySelector('main');
    expect(main?.className).toContain('flex-1');
    expect(main?.className).toContain('min-w-0');

    const contentColumn = container.querySelector('.flex.min-w-0.flex-1.flex-col.overflow-hidden');
    expect(contentColumn).toBeInTheDocument();
  });

  it('opens and closes the mobile sidebar drawer', () => {
    renderAppShell();

    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    fireEvent.click(menuButton);

    expect(screen.getByText('Navigation menu opened')).toBeInTheDocument();
    expect(document.querySelector('.app-shell-sidebar-panel')?.className).not.toContain('is-mobile-closed');

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    fireEvent.click(closeButton);

    expect(document.querySelector('.app-shell-sidebar-panel')?.className).toContain('is-mobile-closed');
  });

  it('closes the mobile drawer when the overlay is clicked', () => {
    const { container } = renderAppShell();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(container.querySelector('.app-shell-sidebar-panel')?.className).toContain('is-mobile-closed');
  });
});
