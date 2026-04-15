import fs from 'fs';
import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { extractToc, type TocEntry } from './toc';

export type { TocEntry };

export interface ParsedPage {
  title: string;         // from frontmatter, fallback to first h1
  description?: string;  // from frontmatter
  contentHtml: string;   // full rendered HTML
  headings: TocEntry[];  // extracted h2/h3 for TOC
}

/**
 * Extracts the text of the first <h1> element from an HTML string.
 * Used as a fallback title when frontmatter title is absent.
 */
function extractFirstH1(html: string): string {
  const match = /<h1[^>]*>(.*?)<\/h1>/i.exec(html);
  if (!match) return '';
  // Strip inner HTML tags to get plain text
  return match[1].replace(/<[^>]+>/g, '').trim();
}

/**
 * Parses a raw Markdown string through the unified pipeline and returns a ParsedPage.
 * Frontmatter is extracted with gray-matter before passing content to unified.
 */
export async function parseMarkdownContent(content: string): Promise<ParsedPage> {
  try {
    // Parse frontmatter
    const { data: frontmatter, content: markdownBody } = matter(content);

    // Run unified pipeline: remark-parse → remark-gfm → remark-rehype → rehype-slug → rehype-highlight → rehype-stringify
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeStringify)
      .process(markdownBody);

    const contentHtml = String(result);

    // Resolve title: frontmatter.title → first h1 → empty string
    const title: string =
      typeof frontmatter.title === 'string' && frontmatter.title.length > 0
        ? frontmatter.title
        : extractFirstH1(contentHtml) || '';

    const description: string | undefined =
      typeof frontmatter.description === 'string' ? frontmatter.description : undefined;

    const headings = extractToc(contentHtml);

    return { title, description, contentHtml, headings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      title: '',
      contentHtml: `<p>Error rendering content: ${message}</p>`,
      headings: [],
    };
  }
}

/**
 * Reads a Markdown file from disk and parses it.
 * Calls notFound() if the file does not exist.
 */
export async function parseMarkdownFile(filePath: string): Promise<ParsedPage> {
  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parseMarkdownContent(content);
}
