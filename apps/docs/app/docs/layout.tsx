import { headers } from 'next/headers';
import { NavSidebar } from '../../components/docs/NavSidebar';
import { SiteHeader } from '../../components/SiteHeader';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/docs';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <SiteHeader variant="docs" />

      {/* Body: sidebar + content */}
      <div className="flex flex-1">
        {/* Left sidebar */}
        <NavSidebar currentPath={pathname} />

        {/* Main content area - centered with auto margins */}
        <main className="flex-1 min-w-0 px-6 py-8 max-w-4xl mx-auto">
          {children}
        </main>

        {/* Right TOC slot — TableOfContents added in Task 9 */}
        <aside className="hidden xl:block w-56 shrink-0 px-4 py-6" aria-label="On this page">
          {/* TableOfContents will be wired up in Task 9 */}
        </aside>
      </div>
    </div>
  );
}
