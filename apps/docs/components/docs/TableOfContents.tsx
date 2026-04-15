'use client';

import { useEffect, useRef, useState } from 'react';
import type { TocEntry } from '../../lib/toc';

interface TableOfContentsProps {
  entries: TocEntry[];
}

export function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (entries.length < 2) return;

    observerRef.current = new IntersectionObserver(
      (observedEntries) => {
        for (const entry of observedEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const { id } of entries) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
        On this page
      </p>
      <ul className="space-y-1">
        {entries.map(entry => (
          <li key={entry.id} style={{ paddingLeft: entry.level === 3 ? '0.75rem' : '0' }}>
            <a
              href={`#${entry.id}`}
              className={`block text-sm py-0.5 transition-colors ${
                activeId === entry.id
                  ? 'text-[var(--primary)] font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-[var(--primary)]'
              }`}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
