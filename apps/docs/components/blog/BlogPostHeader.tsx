import Link from 'next/link';
import type { BlogPost } from '../../lib/blog';
import { formatDate } from '../../lib/blog';

interface BlogPostHeaderProps {
  post: BlogPost;
}

export function BlogPostHeader({ post }: BlogPostHeaderProps) {
  return (
    <header className="mb-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--primary)] transition-colors mb-6"
        aria-label="Back to Blog"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Blog
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-tight">
        {post.title}
      </h1>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-[var(--foreground)]">{post.author}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {post.updated_date && (
          <>
            <span aria-hidden="true">·</span>
            <span>Updated: {formatDate(post.updated_date)}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span>{post.readingTime} min read</span>
      </div>
    </header>
  );
}
