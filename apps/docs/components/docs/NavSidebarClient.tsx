'use client';

import { useState } from 'react';
import type { NavSection } from '../../lib/nav';

interface NavSidebarClientProps {
  sections: NavSection[];
  currentPath: string;
}

export function NavSidebarClient({ sections, currentPath }: NavSidebarClientProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sections.map(s => [s.slug, true]))
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSection(slug: string) {
    setExpandedSections(prev => ({ ...prev, [slug]: !prev[slug] }));
  }

  const sidebarContent = (
    <nav aria-label="Documentation navigation" className="w-full">
      {sections.map(section => {
        const isExpanded = expandedSections[section.slug];
        return (
          <div key={section.slug} className="mb-2">
            <button
              onClick={() => toggleSection(section.slug)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-[var(--primary)] transition-colors py-1.5 px-1 rounded"
            >
              <span>{section.title}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isExpanded && (
              <ul className="mt-0.5 mb-1 space-y-0.5">
                {section.pages.map(page => {
                  const href = `/docs/${section.slug}/${page.slug}`;
                  const isActive = currentPath === href;
                  return (
                    <li key={page.slug}>
                      <a
                        href={href}
                        aria-label={`${page.title} - ${section.title}`}
                        className={`block px-2 py-1.5 text-sm rounded transition-colors ${
                          isActive
                            ? 'text-[var(--primary)] bg-teal-50 dark:bg-teal-900/20 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-[var(--primary)] hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {page.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed bottom-4 right-4 z-50 w-12 h-12 bg-[var(--primary)] text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--background)] border-r border-[var(--border)] px-4 py-6 overflow-y-auto transform transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="mb-4 text-gray-500 hover:text-[var(--primary)]"
        >
          ✕ Close
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r border-[var(--border)] px-4 py-6 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
        {sidebarContent}
      </aside>
    </>
  );
}
