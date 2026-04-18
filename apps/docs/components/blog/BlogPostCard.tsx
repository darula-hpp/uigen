import Link from 'next/link';
import type { BlogPost } from '../../lib/blog';
import { formatDate } from '../../lib/blog';
import { BlogPostTags } from './BlogPostTags';

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col border border-[var(--border)] rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200 bg-[var(--background)]"
    >
      {post.featured_image && (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        <h2 className="text-lg font-semibold mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
          {post.title}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>{post.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime} min read</span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 flex-1 line-clamp-3">
          {post.excerpt}
        </p>

        {post.tags.length > 0 && <BlogPostTags tags={post.tags} />}
      </div>
    </Link>
  );
}
