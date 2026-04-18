import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlogPost } from '../../../lib/blog';
import { BlogPostCard } from '../BlogPostCard';
import { BlogPostHeader } from '../BlogPostHeader';
import { BlogPostTags } from '../BlogPostTags';
import { SocialShare } from '../SocialShare';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation for SocialShare (uses usePathname indirectly via BlogNavLink)
vi.mock('next/navigation', () => ({
  usePathname: () => '/blog',
}));

const mockPost: BlogPost = {
  slug: 'test-post',
  title: 'Test Post Title',
  author: 'Test Author',
  date: '2026-04-18',
  excerpt: 'This is a test excerpt for the blog post.',
  tags: ['typescript', 'architecture', 'testing'],
  content: '## Introduction\n\nSome content here.',
  contentHtml: '<h2 id="introduction">Introduction</h2><p>Some content here.</p>',
  readingTime: 3,
  headings: [{ id: 'introduction', text: 'Introduction', level: 2 }],
};

// ---------------------------------------------------------------------------
// BlogPostCard
// ---------------------------------------------------------------------------
describe('BlogPostCard', () => {
  it('renders the post title', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('renders the author', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.getByText('April 18, 2026')).toBeInTheDocument();
  });

  it('renders the reading time', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.getByText('3 min read')).toBeInTheDocument();
  });

  it('renders the excerpt', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.getByText('This is a test excerpt for the blog post.')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<BlogPostCard post={mockPost} />);
    // Tags are sorted alphabetically: architecture, testing, typescript
    expect(screen.getByText('architecture')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('links to the correct blog post URL', () => {
    render(<BlogPostCard post={mockPost} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/blog/test-post');
  });

  it('does not render featured image when not provided', () => {
    render(<BlogPostCard post={mockPost} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders featured image when provided', () => {
    const postWithImage = { ...mockPost, featured_image: '/images/hero.png' };
    render(<BlogPostCard post={postWithImage} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/images/hero.png');
    expect(img).toHaveAttribute('alt', 'Test Post Title');
  });
});

// ---------------------------------------------------------------------------
// BlogPostHeader
// ---------------------------------------------------------------------------
describe('BlogPostHeader', () => {
  it('renders the post title', () => {
    render(<BlogPostHeader post={mockPost} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Post Title');
  });

  it('renders the author', () => {
    render(<BlogPostHeader post={mockPost} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<BlogPostHeader post={mockPost} />);
    expect(screen.getByText('April 18, 2026')).toBeInTheDocument();
  });

  it('renders the reading time', () => {
    render(<BlogPostHeader post={mockPost} />);
    expect(screen.getByText('3 min read')).toBeInTheDocument();
  });

  it('renders Back to Blog link', () => {
    render(<BlogPostHeader post={mockPost} />);
    const link = screen.getByRole('link', { name: /back to blog/i });
    expect(link).toHaveAttribute('href', '/blog');
  });

  it('does not render updated date when not provided', () => {
    render(<BlogPostHeader post={mockPost} />);
    expect(screen.queryByText(/updated:/i)).not.toBeInTheDocument();
  });

  it('renders updated date when provided', () => {
    const postWithUpdate = { ...mockPost, updated_date: '2026-05-01' };
    render(<BlogPostHeader post={postWithUpdate} />);
    expect(screen.getByText(/updated:/i)).toBeInTheDocument();
    expect(screen.getByText(/May 1, 2026/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BlogPostTags
// ---------------------------------------------------------------------------
describe('BlogPostTags', () => {
  it('renders all tags', () => {
    render(<BlogPostTags tags={['typescript', 'architecture', 'testing']} />);
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });

  it('renders tags in alphabetical order', () => {
    render(<BlogPostTags tags={['typescript', 'architecture', 'testing']} />);
    const tags = screen.getAllByText(/typescript|architecture|testing/);
    const tagTexts = tags.map(t => t.textContent);
    expect(tagTexts).toEqual(['architecture', 'testing', 'typescript']);
  });

  it('renders nothing when tags array is empty', () => {
    const { container } = render(<BlogPostTags tags={[]} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('renders a single tag', () => {
    render(<BlogPostTags tags={['single']} />);
    expect(screen.getByText('single')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SocialShare
// ---------------------------------------------------------------------------
describe('SocialShare', () => {
  it('renders Twitter share button', () => {
    render(<SocialShare post={mockPost} />);
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    expect(twitterLink).toBeInTheDocument();
    expect(twitterLink.getAttribute('href')).toContain('twitter.com/intent/tweet');
  });

  it('Twitter share URL includes post title', () => {
    render(<SocialShare post={mockPost} />);
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    expect(twitterLink.getAttribute('href')).toContain(encodeURIComponent('Test Post Title'));
  });

  it('Twitter share URL includes post URL', () => {
    render(<SocialShare post={mockPost} />);
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    expect(twitterLink.getAttribute('href')).toContain(encodeURIComponent('/blog/test-post'));
  });

  it('renders LinkedIn share button', () => {
    render(<SocialShare post={mockPost} />);
    const linkedInLink = screen.getByRole('link', { name: /linkedin/i });
    expect(linkedInLink).toBeInTheDocument();
    expect(linkedInLink.getAttribute('href')).toContain('linkedin.com/sharing');
  });

  it('LinkedIn share URL includes post URL', () => {
    render(<SocialShare post={mockPost} />);
    const linkedInLink = screen.getByRole('link', { name: /linkedin/i });
    expect(linkedInLink.getAttribute('href')).toContain(encodeURIComponent('/blog/test-post'));
  });

  it('renders Copy Link button', () => {
    render(<SocialShare post={mockPost} />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('share links open in new tab', () => {
    render(<SocialShare post={mockPost} />);
    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    const linkedInLink = screen.getByRole('link', { name: /linkedin/i });
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(linkedInLink).toHaveAttribute('target', '_blank');
  });
});
