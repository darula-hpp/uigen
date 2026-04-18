'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BlogNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/blog' || pathname.startsWith('/blog/');

  return (
    <Link
      href="/blog"
      className={`text-sm transition-colors ${
        isActive
          ? 'text-[var(--primary)] font-medium'
          : 'text-gray-500 dark:text-gray-400 hover:text-[var(--primary)]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      Blog
    </Link>
  );
}
