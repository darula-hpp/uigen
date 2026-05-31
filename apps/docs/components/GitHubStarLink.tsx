import { Star } from 'lucide-react';
import { formatStarCount } from '../lib/github-stars';

interface GitHubStarLinkProps {
  starCount: number | null;
  className?: string;
  label?: string;
}

export function GitHubStarLink({
  starCount,
  className,
  label = 'GitHub',
}: GitHubStarLinkProps) {
  return (
    <a
      href="https://github.com/darula-hpp/uigen"
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'inline-flex items-center gap-2 px-6 py-2.5 border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg font-medium transition-colors text-sm'
      }
    >
      <span>{label}</span>
      {starCount !== null && (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {formatStarCount(starCount)}
        </span>
      )}
    </a>
  );
}
