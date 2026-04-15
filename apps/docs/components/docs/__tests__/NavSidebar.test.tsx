import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavSidebarClient } from '../NavSidebarClient';
import { nav } from '../../../lib/nav';

describe('NavSidebarClient', () => {
  it('renders sections in the order defined in nav.ts', () => {
    render(<NavSidebarClient sections={nav} currentPath="/docs/getting-started/introduction" />);
    const sectionButtons = screen.getAllByRole('button', { name: /Getting Started|Core Concepts|Supported Specs/i });
    // First section button should be "Getting Started"
    expect(sectionButtons[0].textContent).toContain('Getting Started');
  });

  it('highlights the active link matching currentPath', () => {
    render(<NavSidebarClient sections={nav} currentPath="/docs/getting-started/introduction" />);
    // Component renders both mobile and desktop sidebars — get all matching links
    const activeLinks = screen.getAllByRole('link', { name: /Introduction — Getting Started/i });
    // All matching links should have the active class
    expect(activeLinks.length).toBeGreaterThan(0);
    activeLinks.forEach(link => {
      expect(link.className).toContain('text-[var(--primary)]');
    });
  });
});
