import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { parseMarkdownContent } from '../markdown';
import { extractToc } from '../toc';

/**
 * Property 5: TOC extraction matches document headings
 * Validates: Requirements 6.1
 *
 * For any Markdown string composed of h2/h3 headings, the headings extracted
 * by extractToc should correspond exactly — in order and level — to the h2/h3
 * elements present in the rendered HTML.
 */
describe('Property 5: TOC extraction matches document headings', () => {
  it('extracted TOC entries match h2/h3 headings in rendered HTML', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            level: fc.constantFrom(2 as const, 3 as const),
            text: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9 ]+$/.test(s)),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (headings) => {
          const md = headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n\n');
          const result = await parseMarkdownContent(md);
          const toc = extractToc(result.contentHtml);
          return toc.length === headings.length &&
            toc.every((entry, i) => entry.level === headings[i].level);
        }
      ),
      { numRuns: 50 }
    );
  });
});
