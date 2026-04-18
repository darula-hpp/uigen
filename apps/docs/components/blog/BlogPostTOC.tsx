import type { Heading } from '../../lib/blog';

interface BlogPostTOCProps {
  headings: Heading[];
}

export function BlogPostTOC({ headings }: BlogPostTOCProps) {
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="hidden lg:block sticky top-20 self-start"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
        On this page
      </p>
      <ul className="space-y-1.5">
        {headings.map(heading => (
          <li
            key={heading.id}
            style={{ paddingLeft: heading.level === 3 ? '0.75rem' : '0' }}
          >
            <a
              href={`#${heading.id}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--primary)] transition-colors block leading-snug"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
