export interface TocEntry {
  id: string;    // heading anchor id, e.g. "quick-start"
  text: string;  // heading display text
  level: 2 | 3;
}

/**
 * Extracts h2 and h3 headings from rendered HTML for use in the Table of Contents.
 * Returns an empty array if fewer than 2 headings are found.
 *
 * Full implementation is in Task 4. This stub is used by markdown.ts.
 */
export function extractToc(contentHtml: string): TocEntry[] {
  const entries: TocEntry[] = [];

  // Match <h2 id="...">...</h2> and <h3 id="...">...</h3>
  const headingRegex = /<h([23])[^>]*\sid="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(contentHtml)) !== null) {
    const level = parseInt(match[1], 10) as 2 | 3;
    const id = match[2];
    // Strip any inner HTML tags to get plain text
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    entries.push({ id, text, level });
  }

  // Return empty array if fewer than 2 headings found
  if (entries.length < 2) {
    return [];
  }

  return entries;
}
