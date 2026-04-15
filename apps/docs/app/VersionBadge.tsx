import { getLatestRelease } from '../lib/changelog';

/**
 * Server component — reads the changelog at build time, renders a minimal
 * version badge. No client JS, no hydration.
 */
export function VersionBadge() {
  const release = getLatestRelease();
  if (!release) return null;

  return (
    <a
      href="https://github.com/darula-hpp/uigen/blob/main/CHANGELOG.md"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-[var(--primary)] transition-colors"
    >
      <span className="font-mono">v{release.version}</span>
      <span className="text-gray-300 dark:text-gray-700">·</span>
      <span>{release.date}</span>
    </a>
  );
}
