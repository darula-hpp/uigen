const GITHUB_REPO = 'darula-hpp/uigen';

export async function getGitHubStarCount(): Promise<number | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'uigen-docs',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: { stargazers_count?: unknown } = await response.json();
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

export function formatStarCount(count: number): string {
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (count >= 1_000) {
    const value = count / 1_000;
    return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, '')}k`;
  }

  return count.toLocaleString('en-US');
}
