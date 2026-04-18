import { describe, it, expect } from 'vitest';
import { calculateReadingTime } from '../reading-time';
import {
  formatDate,
  validateFrontmatter,
  extractHeadings,
} from '../blog';

// ---------------------------------------------------------------------------
// calculateReadingTime
// ---------------------------------------------------------------------------
describe('calculateReadingTime', () => {
  it('returns 1 for empty content', () => {
    expect(calculateReadingTime('')).toBe(1);
  });

  it('returns 1 for very short content', () => {
    expect(calculateReadingTime('Hello world')).toBe(1);
  });

  it('calculates correctly for 200 words (1 min)', () => {
    const content = Array(200).fill('word').join(' ');
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('calculates correctly for 400 words (2 min)', () => {
    const content = Array(400).fill('word').join(' ');
    expect(calculateReadingTime(content)).toBe(2);
  });

  it('strips fenced code blocks before counting', () => {
    // 200 words in code block should not count
    const codeBlock = '```\n' + Array(200).fill('word').join(' ') + '\n```';
    expect(calculateReadingTime(codeBlock)).toBe(1);
  });

  it('strips inline code before counting', () => {
    const content = '`' + Array(200).fill('word').join(' ') + '`';
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips markdown symbols', () => {
    const content = '# ' + Array(200).fill('word').join(' ');
    // The '#' is stripped, leaving 200 words
    expect(calculateReadingTime(content)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a date string as Month DD, YYYY', () => {
    expect(formatDate('2026-04-18')).toBe('April 18, 2026');
  });

  it('formats January correctly', () => {
    expect(formatDate('2024-01-01')).toBe('January 1, 2024');
  });

  it('formats December correctly', () => {
    expect(formatDate('2023-12-31')).toBe('December 31, 2023');
  });

  it('handles leap year date', () => {
    expect(formatDate('2024-02-29')).toBe('February 29, 2024');
  });
});

// ---------------------------------------------------------------------------
// validateFrontmatter
// ---------------------------------------------------------------------------
describe('validateFrontmatter', () => {
  const validData = {
    title: 'Test Post',
    author: 'Test Author',
    date: '2026-04-18',
    excerpt: 'A short excerpt.',
  };

  it('does not throw for valid frontmatter', () => {
    expect(() => validateFrontmatter(validData, 'test-post')).not.toThrow();
  });

  it('throws when title is missing', () => {
    const data = { ...validData, title: undefined };
    expect(() => validateFrontmatter(data as any, 'test-post')).toThrow(/title/);
  });

  it('throws when author is missing', () => {
    const data = { ...validData, author: undefined };
    expect(() => validateFrontmatter(data as any, 'test-post')).toThrow(/author/);
  });

  it('throws when date is missing', () => {
    const data = { ...validData, date: undefined };
    expect(() => validateFrontmatter(data as any, 'test-post')).toThrow(/date/);
  });

  it('throws when excerpt is missing', () => {
    const data = { ...validData, excerpt: undefined };
    expect(() => validateFrontmatter(data as any, 'test-post')).toThrow(/excerpt/);
  });

  it('throws for invalid date format (not YYYY-MM-DD)', () => {
    const data = { ...validData, date: '18-04-2026' };
    expect(() => validateFrontmatter(data, 'test-post')).toThrow(/date format/i);
  });

  it('throws for date with wrong separator', () => {
    const data = { ...validData, date: '2026/04/18' };
    expect(() => validateFrontmatter(data, 'test-post')).toThrow(/date format/i);
  });

  it('throws for slug with uppercase letters', () => {
    expect(() => validateFrontmatter(validData, 'Test-Post')).toThrow(/slug/i);
  });

  it('throws for slug with special characters', () => {
    expect(() => validateFrontmatter(validData, 'test_post!')).toThrow(/slug/i);
  });

  it('accepts slug with hyphens and numbers', () => {
    expect(() => validateFrontmatter(validData, 'test-post-123')).not.toThrow();
  });

  it('error message includes the filename', () => {
    const data = { ...validData, title: undefined };
    expect(() => validateFrontmatter(data as any, 'my-post')).toThrow(/my-post\.md/);
  });
});

// ---------------------------------------------------------------------------
// extractHeadings
// ---------------------------------------------------------------------------
describe('extractHeadings', () => {
  it('extracts H2 headings', () => {
    const md = '## Introduction\n\nSome text.';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Introduction');
    expect(headings[0].level).toBe(2);
    expect(headings[0].id).toBe('introduction');
  });

  it('extracts H3 headings', () => {
    const md = '### Sub Section\n\nSome text.';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Sub Section');
    expect(headings[0].level).toBe(3);
  });

  it('does not extract H1 headings', () => {
    const md = '# Title\n\n## Section';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].level).toBe(2);
  });

  it('does not extract H4+ headings', () => {
    const md = '#### Deep\n\n## Section';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].level).toBe(2);
  });

  it('returns empty array for content with no headings', () => {
    const md = 'Just some paragraph text.';
    expect(extractHeadings(md)).toHaveLength(0);
  });

  it('generates unique slugged IDs for duplicate headings', () => {
    const md = '## Section\n\n## Section';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0].id).toBe('section');
    expect(headings[1].id).toBe('section-1');
  });

  it('extracts multiple headings in order', () => {
    const md = '## First\n\n### Sub\n\n## Second';
    const headings = extractHeadings(md);
    expect(headings.map(h => h.text)).toEqual(['First', 'Sub', 'Second']);
  });
});

// ---------------------------------------------------------------------------
// getAllBlogPosts / getBlogPost (using the real blog post on disk)
// ---------------------------------------------------------------------------
describe('getAllBlogPosts and getBlogPost', () => {
  it('getAllBlogPosts returns at least one post', async () => {
    const { getAllBlogPosts } = await import('../blog');
    const posts = await getAllBlogPosts();
    expect(posts.length).toBeGreaterThan(0);
  });

  it('getAllBlogPosts returns posts sorted by date descending', async () => {
    const { getAllBlogPosts } = await import('../blog');
    const posts = await getAllBlogPosts();
    for (let i = 0; i < posts.length - 1; i++) {
      expect(new Date(posts[i].date).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[i + 1].date).getTime()
      );
    }
  });

  it('getBlogPost returns the uigen-architecture post', async () => {
    const { getBlogPost } = await import('../blog');
    const post = await getBlogPost('uigen-architecture');
    expect(post.slug).toBe('uigen-architecture');
    expect(post.title).toBe('UIGen Architecture: A Deep Dive');
    expect(post.author).toBe('UIGen Team');
    expect(post.date).toBe('2026-04-18');
    expect(post.tags).toContain('architecture');
  });

  it('getBlogPost includes readingTime >= 1', async () => {
    const { getBlogPost } = await import('../blog');
    const post = await getBlogPost('uigen-architecture');
    expect(post.readingTime).toBeGreaterThanOrEqual(1);
  });

  it('getBlogPost includes headings extracted from content', async () => {
    const { getBlogPost } = await import('../blog');
    const post = await getBlogPost('uigen-architecture');
    expect(post.headings.length).toBeGreaterThan(0);
    // The post has an "Introduction" H2
    const intro = post.headings.find(h => h.text === 'Introduction');
    expect(intro).toBeDefined();
    expect(intro?.level).toBe(2);
  });

  it('getBlogPost includes rendered contentHtml', async () => {
    const { getBlogPost } = await import('../blog');
    const post = await getBlogPost('uigen-architecture');
    expect(post.contentHtml).toContain('<h2');
  });

  it('getBlogPost throws notFound for non-existent slug', async () => {
    const { getBlogPost } = await import('../blog');
    await expect(getBlogPost('does-not-exist')).rejects.toThrow();
  });
});
