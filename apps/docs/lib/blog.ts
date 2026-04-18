import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import { calculateReadingTime } from './reading-time';
import { parseMarkdownContent } from './markdown';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  author: string;
  date: string;
  updated_date?: string;
  excerpt: string;
  tags: string[];
  featured_image?: string;
  content: string;
  contentHtml: string;
  readingTime: number;
  headings: Heading[];
}

/**
 * Extracts H2 and H3 headings from raw markdown using remark-parse + unist-util-visit.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();

  const tree = unified().use(remarkParse).parse(markdown);

  visit(tree, 'heading', (node: any) => {
    if (node.depth === 2 || node.depth === 3) {
      const text = node.children
        .filter((child: any) => child.type === 'text' || child.type === 'inlineCode')
        .map((child: any) => child.value)
        .join('');

      headings.push({
        id: slugger.slug(text),
        text,
        level: node.depth,
      });
    }
  });

  return headings;
}

/**
 * Validates required frontmatter fields and formats.
 * Throws an error with a descriptive message if validation fails.
 */
export function validateFrontmatter(data: Record<string, unknown>, slug: string): void {
  const required = ['title', 'author', 'date', 'excerpt'] as const;

  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required frontmatter field "${field}" in ${slug}.md`);
    }
  }

  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error(
      `Invalid date format in ${slug}.md. Expected YYYY-MM-DD, got: ${data.date}`
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      `Invalid slug: ${slug}. Only lowercase letters, numbers, and hyphens allowed.`
    );
  }
}

/**
 * Formats a YYYY-MM-DD date string as "Month DD, YYYY".
 */
export function formatDate(dateString: string): string {
  // Parse as UTC to avoid timezone-related off-by-one issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Reads and parses a single blog post by slug.
 * Calls notFound() if the file does not exist.
 */
export async function getBlogPost(slug: string): Promise<BlogPost> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  validateFrontmatter(data as Record<string, unknown>, slug);

  const readingTime = calculateReadingTime(content);
  const headings = extractHeadings(content);
  const parsed = await parseMarkdownContent(fileContent);

  return {
    slug,
    title: data.title as string,
    author: data.author as string,
    date: data.date as string,
    updated_date: data.updated_date as string | undefined,
    excerpt: data.excerpt as string,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    featured_image: data.featured_image as string | undefined,
    content,
    contentHtml: parsed.contentHtml,
    readingTime,
    headings,
  };
}

/**
 * Returns all blog posts sorted by date descending, then title ascending.
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

  const posts = await Promise.all(
    files.map(file => {
      const slug = file.replace(/\.md$/, '');
      return getBlogPost(slug);
    })
  );

  return posts.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.title.localeCompare(b.title);
  });
}
