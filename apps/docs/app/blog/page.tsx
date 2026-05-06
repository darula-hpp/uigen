import type { Metadata } from 'next';
import { getAllBlogPosts } from '../../lib/blog';
import { BlogPostCard } from '../../components/blog/BlogPostCard';
import { GitHubCTA } from '../../components/blog/GitHubCTA';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'Blog | UIGen',
  description: 'Technical articles about UIGen architecture, features, and best practices.',
  openGraph: {
    title: 'Blog | UIGen',
    description: 'Technical articles about UIGen architecture, features, and best practices.',
    type: 'website',
    url: 'https://uigen-docs.vercel.app/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | UIGen',
    description: 'Technical articles about UIGen architecture, features, and best practices.',
  },
  alternates: {
    canonical: 'https://uigen-docs.vercel.app/blog',
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader variant="marketing" />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center pb-10 mb-10 border-b border-[var(--border)]">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Blog</h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Technical articles, architecture deep-dives, and announcements from the UIGen team.
          </p>
        </div>

        {/* GitHub CTA */}
        <GitHubCTA />

        {/* Posts grid */}
        {posts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-16">
            No blog posts yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
