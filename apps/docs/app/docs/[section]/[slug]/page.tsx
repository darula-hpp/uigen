import path from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { nav } from '../../../../lib/nav';
import { parseMarkdownFile } from '../../../../lib/markdown';
import { TableOfContents } from '../../../../components/docs/TableOfContents';

interface PageParams {
  section: string;
  slug: string;
}

export async function generateStaticParams(): Promise<PageParams[]> {
  return nav.flatMap(section =>
    section.pages.map(page => ({
      section: section.slug,
      slug: page.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { section, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', section, `${slug}.md`);

  try {
    const { title, description } = await parseMarkdownFile(filePath);
    return {
      title: title ? `${title} — UIGen Docs` : 'UIGen Docs',
      description: description ?? undefined,
    };
  } catch {
    return { title: 'UIGen Docs' };
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { section, slug } = await params;

  // Validate that this section/slug exists in nav
  const navSection = nav.find(s => s.slug === section);
  const navPage = navSection?.pages.find(p => p.slug === slug);
  if (!navSection || !navPage) {
    notFound();
  }

  const filePath = path.join(process.cwd(), 'content', section, `${slug}.md`);
  const { contentHtml, headings } = await parseMarkdownFile(filePath);

  return (
    <div className="flex gap-8 w-full">
      {/* Main article */}
      <article
        className="prose prose-gray dark:prose-invert max-w-none flex-1 min-w-0"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* Right TOC */}
      {headings.length >= 2 && (
        <aside className="hidden xl:block w-52 shrink-0 sticky top-20 self-start" aria-label="On this page">
          <TableOfContents entries={headings} />
        </aside>
      )}
    </div>
  );
}
