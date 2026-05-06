'use client';

import { Star } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';

export function GitHubCTA() {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.capture('github_star_click', {
      source: 'blog_cta',
      location: window.location.pathname,
    });
  };

  return (
    <div className="my-12 p-6 rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--primary)]/10">
            <Star className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              UIGen is open source
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Star us on GitHub to follow development
            </p>
          </div>
        </div>
        <a
          href="https://github.com/darula-hpp/uigen"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-md hover:bg-[var(--accent)] transition-colors"
        >
          <Star className="w-4 h-4" />
          Star
        </a>
      </div>
    </div>
  );
}
