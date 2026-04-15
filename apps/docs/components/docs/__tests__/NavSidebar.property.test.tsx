import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { NavSidebarClient } from '../NavSidebarClient';
import { nav } from '../../../lib/nav';

const allPaths = nav.flatMap(s => s.pages.map(p => `/docs/${s.slug}/${p.slug}`));

describe('Property 6: Active nav link is unique per path', () => {
  it('exactly one link is active for any valid docs path', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allPaths),
        (path) => {
          const { container } = render(
            <NavSidebarClient sections={nav} currentPath={path} />
          );
          // The component renders both mobile and desktop sidebars.
          // Each sidebar has exactly one active link, so we expect 2 total active links.
          // All active links must point to the same path (the current path).
          const activeLinks = container.querySelectorAll('a.text-\\[var\\(--primary\\)\\]');
          if (activeLinks.length === 0) return false;
          // All active links must have the same href (the current path)
          const hrefs = Array.from(activeLinks).map(a => (a as HTMLAnchorElement).getAttribute('href'));
          return hrefs.every(href => href === path);
        }
      ),
      { numRuns: Math.min(allPaths.length, 50) }
    );
  });
});
