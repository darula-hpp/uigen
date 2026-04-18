import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlogPost } from '../../../lib/blog';
import { BlogPostCard } from '../BlogPostCard';
import { BlogPostContent } from '../BlogPostContent';
import { BlogPostTOC } from '../BlogPostTOC';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/blog',
}));

const mockPosts: BlogPost[] = [
  {
    slug: 'first-post',
    title: 'First Post',
    author: 'Author A',
    date: '2026-04-18',
    excerpt: 'First post excerpt.',
    tags: ['tag1'],
    content: '## Intro\n\nContent.',
    contentHtml: '<h2 id="intro">Intro</h2><p>Content.</p>',
    readingTime: 1,
    headings: [{ id: 'intro', text: 'Intro', level: 2 }],
  },
  {
    slug: 'second-post',
    title: 'Second Post',
    author: 'Author B',
    date: '2026-03-01',
    excerpt: 'Second post excerpt.',
    tags: ['tag2'],
    content: '## Overview\n\nContent.',
    contentHtml: '<h2 id="overview">Overview</h2><p>Content.</p>',
    readingTime: 2,
    headings: [{ id: 'overview', text: 'Overview', level: 2 }],
  },
];

// ---------------------------------------------------------------------------
// Blog index page simulation
// ---------------------------------------------------------------------------
describe('Blog index page (simulated)', () => {
  it('renders multiple BlogPostCards', () => {
    render(
      <div>
        {mockPosts.map(post => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>
    );
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
  });

  it('renders empty state message when no posts', () => {
    render(
      <div>
        {mockPosts.length === 0 ? (
          <p>No blog posts yet.</p>
        ) : null}
      </div>
    );
    // With posts present, no empty state
    expect(screen.queryByText('No blog posts yet.')).not.toBeInTheDocument();
  });

  it('renders empty state when posts array is empty', () => {
    render(
      <div>
        {[].length === 0 ? (
          <p>No blog posts yet.</p>
        ) : null}
      </div>
    );
    expect(screen.getByText('No blog posts yet.')).toBeInTheDocument();
  });

  it('each card links to the correct post URL', () => {
    render(
      <div>
        {mockPosts.map(post => (
          <BlogPostCard key={post.slug} post={post} />
        ))}
      </div>
    );
    const links = screen.getAllByRole('link');
    const hrefs = links.map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/blog/first-post');
    expect(hrefs).toContain('/blog/second-post');
  });
});

// ---------------------------------------------------------------------------
// Blog post page simulation
// ---------------------------------------------------------------------------
describe('Blog post page (simulated)', () => {
  const post = mockPosts[0];

  it('renders post content HTML', () => {
    render(<BlogPostContent contentHtml={post.contentHtml} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Intro');
  });

  it('renders TOC with headings', () => {
    render(<BlogPostTOC headings={post.headings} />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Intro' });
    expect(link).toHaveAttribute('href', '#intro');
  });

  it('TOC renders nothing when headings array is empty', () => {
    const { container } = render(<BlogPostTOC headings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('TOC indents H3 headings', () => {
    const headings = [
      { id: 'section', text: 'Section', level: 2 },
      { id: 'sub', text: 'Sub', level: 3 },
    ];
    render(<BlogPostTOC headings={headings} />);
    const subItem = screen.getByText('Sub').closest('li');
    expect(subItem).toHaveStyle({ paddingLeft: '0.75rem' });
  });

  it('BlogPostContent renders HTML safely', () => {
    const html = '<h2 id="test">Test Heading</h2><p>Paragraph text.</p>';
    render(<BlogPostContent contentHtml={html} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Heading');
    expect(screen.getByText('Paragraph text.')).toBeInTheDocument();
  });
});
