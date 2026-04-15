import { nav } from './nav';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SearchIndexEntry {
  title: string;
  section: string;
  slug: string;
  href: string;       // "/docs/{section}/{slug}"
  content: string;    // plain text, stripped of MD syntax
}

// Strips Markdown syntax to plain text
function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/m, '')        // remove frontmatter
    .replace(/```[\s\S]*?```/g, '')          // remove code blocks
    .replace(/`[^`]+`/g, '')                 // remove inline code
    .replace(/#{1,6}\s+/g, '')               // remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // bold
    .replace(/\*([^*]+)\*/g, '$1')           // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')  // images
    .replace(/^\s*[-*+]\s+/gm, '')           // list items
    .replace(/^\s*\d+\.\s+/gm, '')           // ordered list items
    .replace(/\|[^\n]+\|/g, '')              // tables
    .replace(/\n{2,}/g, '\n')               // collapse blank lines
    .trim();
}

/**
 * Builds the search index from all nav pages.
 * Reads MD files from apps/docs/content/{section}/{slug}.md
 * Skips unreadable files with console.warn.
 */
export async function buildSearchIndex(): Promise<SearchIndexEntry[]> {
  const entries: SearchIndexEntry[] = [];
  const contentDir = join(process.cwd(), 'content');

  for (const section of nav) {
    for (const page of section.pages) {
      const filePath = join(contentDir, section.slug, `${page.slug}.md`);
      try {
        if (!existsSync(filePath)) {
          console.warn(`[search-index] Missing: ${filePath}`);
          continue;
        }
        const raw = readFileSync(filePath, 'utf-8');
        const content = stripMarkdown(raw);
        entries.push({
          title: page.title,
          section: section.title,
          slug: page.slug,
          href: `/docs/${section.slug}/${page.slug}`,
          content,
        });
      } catch (err) {
        console.warn(`[search-index] Could not read ${filePath}:`, err);
      }
    }
  }

  return entries;
}

/**
 * Pure helper for testing — builds search index from mock page data without filesystem I/O.
 */
export function buildSearchIndexFromEntries(
  entries: Array<{ section: string; slug: string; title: string; content: string }>
): SearchIndexEntry[] {
  return entries.map(e => ({
    title: e.title,
    section: e.section,
    slug: e.slug,
    href: `/docs/${e.section}/${e.slug}`,
    content: e.content,
  }));
}

/**
 * Pure Fuse.js wrapper for testing — searches entries without filesystem.
 */
export function searchEntries(
  entries: Array<{ title: string; content: string; href: string }>,
  query: string
): Array<{ title: string; content: string; href: string }> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return entries.filter(
    e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q)
  );
}
