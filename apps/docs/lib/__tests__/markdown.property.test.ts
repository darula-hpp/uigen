import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { parseMarkdownContent } from '../markdown';

/**
 * Property 1: Markdown parsing produces valid HTML
 * Validates: Requirements 1.4
 *
 * For any Markdown string, parseMarkdownContent should never throw and should
 * always return a ParsedPage with a string contentHtml (possibly empty for
 * whitespace-only input) and a string title.
 */
describe('Property 1: Markdown parsing produces valid HTML', () => {
  it('never throws and always returns a ParsedPage for any markdown string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (md) => {
          const result = await parseMarkdownContent(md);
          return (
            typeof result.contentHtml === 'string' &&
            typeof result.title === 'string' &&
            Array.isArray(result.headings)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces non-empty contentHtml for markdown with actual content', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings that contain at least one non-whitespace character
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        async (md) => {
          const result = await parseMarkdownContent(md);
          return result.contentHtml.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Code block syntax highlighting preserves content
 * Validates: Requirements 4.1, 4.2
 *
 * For any fenced code block with a supported language identifier,
 * the rendered HTML should contain the hljs class indicating highlighting was applied.
 */
describe('Property 2: Code block syntax highlighting preserves content', () => {
  it('renders fenced code blocks with hljs class for supported languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('bash', 'typescript', 'javascript', 'yaml', 'json'),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (lang, code) => {
          const md = `\`\`\`${lang}\n${code}\n\`\`\``;
          const result = await parseMarkdownContent(md);
          return result.contentHtml.includes('hljs');
        }
      ),
      { numRuns: 100 }
    );
  });
});
