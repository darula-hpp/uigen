import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { buildSearchIndexFromEntries } from '../search-index';

/**
 * Property 3: Search index contains all nav pages
 * Validates: Requirements 5.2
 */
describe('Property 3: Search index contains all nav pages', () => {
  it('index has one entry per input page with correct href', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            section: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z0-9-]+$/.test(s)),
            slug: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-z0-9-]+$/.test(s)),
            title: fc.string({ minLength: 1 }),
            content: fc.string(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (mockPages) => {
          const index = buildSearchIndexFromEntries(mockPages);
          return (
            index.length === mockPages.length &&
            mockPages.every(p =>
              index.some(e => e.href === `/docs/${p.section}/${p.slug}`)
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
