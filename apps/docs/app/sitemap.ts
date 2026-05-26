import type { MetadataRoute } from 'next';
import { getAllBlogPosts } from '../lib/blog';
import { nav } from '../lib/nav';
import { absoluteUrl } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docEntries: MetadataRoute.Sitemap = nav.flatMap(section =>
    section.pages.map(page => ({
      url: absoluteUrl(`/docs/${section.slug}/${page.slug}`),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  );

  const posts = await getAllBlogPosts();
  const blogEntries: MetadataRoute.Sitemap = posts.map(post => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updated_date ?? post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: absoluteUrl(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/blog'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...docEntries,
    ...blogEntries,
  ];
}
