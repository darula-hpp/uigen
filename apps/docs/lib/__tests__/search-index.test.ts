import { describe, it, expect } from 'vitest';
import { buildSearchIndexFromEntries, searchEntries } from '../search-index';

describe('buildSearchIndexFromEntries', () => {
  it('builds index with correct href for each entry', () => {
    const mockPages = [
      { section: 'getting-started', slug: 'introduction', title: 'Introduction', content: 'Welcome to UIGen' },
      { section: 'core-concepts', slug: 'how-it-works', title: 'How It Works', content: 'UIGen parses OpenAPI specs' },
    ];
    const index = buildSearchIndexFromEntries(mockPages);
    expect(index).toHaveLength(2);
    expect(index[0].href).toBe('/docs/getting-started/introduction');
    expect(index[1].href).toBe('/docs/core-concepts/how-it-works');
  });

  it('each entry has non-empty title and content', () => {
    const mockPages = [
      { section: 'auth', slug: 'overview', title: 'Auth Overview', content: 'Auth content' },
    ];
    const index = buildSearchIndexFromEntries(mockPages);
    expect(index[0].title).toBe('Auth Overview');
    expect(index[0].content).toBe('Auth content');
  });
});

describe('searchEntries', () => {
  const entries = [
    { title: 'Introduction', content: 'Welcome to UIGen documentation', href: '/docs/getting-started/introduction' },
    { title: 'Quick Start', content: 'Run npx @uigen-dev/cli serve', href: '/docs/getting-started/quick-start' },
    { title: 'Authentication', content: 'Bearer token and API key support', href: '/docs/authentication/overview' },
  ];

  it('returns entries matching query in title', () => {
    const results = searchEntries(entries, 'Quick');
    expect(results).toHaveLength(1);
    expect(results[0].href).toBe('/docs/getting-started/quick-start');
  });

  it('returns entries matching query in content', () => {
    const results = searchEntries(entries, 'Bearer');
    expect(results).toHaveLength(1);
    expect(results[0].href).toBe('/docs/authentication/overview');
  });

  it('returns empty array for empty query', () => {
    expect(searchEntries(entries, '')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const results = searchEntries(entries, 'UIGEN');
    expect(results.length).toBeGreaterThan(0);
  });
});
