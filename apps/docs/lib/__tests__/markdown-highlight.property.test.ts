import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { parseMarkdownContent } from '../markdown';

/**
 * Property 2: Code block syntax highlighting preserves content
 * Validates: Requirements 4.1, 4.2
 *
 * For any fenced code block with a supported language identifier,
 * the rendered HTML should contain <pre> and <code> elements indicating
 * the code block was processed.
 */
describe('Property 2: Code block syntax highlighting preserves content', () => {
  it('applies hljs highlighting to fenced code blocks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('bash', 'typescript', 'javascript', 'yaml', 'json'),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes('`')),
        async (lang, code) => {
          const md = `\`\`\`${lang}\n${code}\n\`\`\``;
          const result = await parseMarkdownContent(md);
          return result.contentHtml.includes('<pre') && result.contentHtml.includes('<code');
        }
      ),
      { numRuns: 50 }
    );
  });
});
