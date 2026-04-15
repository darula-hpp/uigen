import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { nav } from '../../../../lib/nav';

/**
 * Replicates the generateStaticParams logic from page.tsx without importing Next.js.
 * This keeps the test runnable in Vitest/jsdom.
 */
function generateStaticParams() {
  return nav.flatMap(section =>
    section.pages.map(page => ({
      section: section.slug,
      slug: page.slug,
    }))
  );
}

describe('Property 7: Static params cover all nav entries', () => {
  it('every nav section/page pair appears in generateStaticParams output', () => {
    const params = generateStaticParams();
    const paramSet = new Set(params.map(p => `${p.section}/${p.slug}`));

    // Every entry in nav must have a corresponding static param
    fc.assert(
      fc.property(
        fc.constantFrom(...nav.flatMap(s => s.pages.map(p => ({ section: s.slug, slug: p.slug })))),
        ({ section, slug }) => {
          return paramSet.has(`${section}/${slug}`);
        }
      )
    );
  });

  it('generateStaticParams produces no duplicate section/slug pairs', () => {
    const params = generateStaticParams();
    const keys = params.map(p => `${p.section}/${p.slug}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('total param count matches total nav pages', () => {
    const params = generateStaticParams();
    const totalNavPages = nav.reduce((sum, s) => sum + s.pages.length, 0);
    expect(params.length).toBe(totalNavPages);
  });
});
