import { ThemeToggle } from '../app/ThemeToggle';
import { VersionBadge } from '../app/VersionBadge';
import { SearchDialog } from './docs/SearchDialog';

interface SiteHeaderProps {
  variant: 'marketing' | 'docs';
}

export function SiteHeader({ variant }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="flex items-center gap-3 px-6 h-14">
        {/* Left: logo + badge — always present */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight hover:text-[var(--primary)] transition-colors"
          >
            UIGen
          </a>
          <VersionBadge />
        </div>

        {/* Center: search bar (docs only) */}
        {variant === 'docs' && (
          <div className="flex-1 max-w-xl mx-auto">
            <SearchDialog />
          </div>
        )}

        {/* Spacer for marketing variant so right items stay right */}
        {variant === 'marketing' && <div className="flex-1" />}

        {/* Right: nav links + theme toggle */}
        <div className="flex items-center gap-4 shrink-0">
          {variant === 'marketing' && (
            <a
              href="/docs"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--primary)] transition-colors"
            >
              Docs
            </a>
          )}
          <a
            href="https://github.com/darula-hpp/uigen"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--primary)] transition-colors"
          >
            GitHub →
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
