import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { searchEntries } from '../search-index';

/**
 * Property 4: Search results are relevant to the query
 * Validates: Requirements 5.3
 */
describe('Property 4: Search results are relevant to the query', () => {
  it('every result contains the query in title or content', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1 }),
            content: fc.string(),
            href: fc.string(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.string({ minLength: 1 }),
        (entries, query) => {
          const results = searchEntries(entries, query);
          return results.every(
            r =>
              r.title.toLowerCase().includes(query.toLowerCase()) ||
              r.content.toLowerCase().includes(query.toLowerCase())
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
