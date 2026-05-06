import type { Metadata } from 'next';
import { getAllBlogPosts, getBlogPost } from '../../../lib/blog';
import { BlogPostHeader } from '../../../components/blog/BlogPostHeader';
import { BlogPostContent } from '../../../components/blog/BlogPostContent';
import { BlogPostTags } from '../../../components/blog/BlogPostTags';
import { BlogPostTOC } from '../../../components/blog/BlogPostTOC';
import { GitHubCTA } from '../../../components/blog/GitHubCTA';
import { SocialShare } from '../../../components/blog/SocialShare';
import { SiteHeader } from '../../../components/SiteHeader';

const BASE_URL = 'https://uigen-docs.vercel.app';

interface PageParams {
  slug: string;
}

export async function generateStaticParams(): Promise<PageParams[]> {
  const posts = await getAllBlogPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  return {
    title: `${post.title} | UIGen Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated_date,
      authors: [post.author],
      tags: post.tags,
      url: `${BASE_URL}/blog/${post.slug}`,
      images: post.featured_image
        ? [{ url: post.featured_image, width: 1200, height: 630, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader variant="marketing" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-3xl">
          <BlogPostHeader post={post} />
        </div>

        <div className="flex gap-12 mt-2">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <BlogPostContent contentHtml={post.contentHtml} />

            {/* GitHub CTA */}
            <GitHubCTA />

            <div className="mt-8">
              {post.tags.length > 0 && (
                <div className="mb-4">
                  <BlogPostTags tags={post.tags} />
                </div>
              )}
              <SocialShare post={post} />
            </div>
          </div>

          {/* Sidebar TOC */}
          {post.headings.length >= 2 && (
            <aside className="hidden lg:block w-52 shrink-0" aria-label="On this page">
              <BlogPostTOC headings={post.headings} />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
