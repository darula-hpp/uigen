'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  section: string;
  slug: string;
  href: string;
  content: string;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const searchIndexRef = useRef<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load search index on first open
  const loadIndex = useCallback(async () => {
    if (indexLoaded) return;
    try {
      const res = await fetch('/search-index.json');
      if (res.ok) {
        searchIndexRef.current = await res.json();
        setIndexLoaded(true);
      }
    } catch {
      // Search index unavailable — silently ignore
    }
  }, [indexLoaded]);

  // Open on ⌘K / Ctrl+K, close on Escape — both handled at window level
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      loadIndex();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open, loadIndex]);

  // Search on query change
  useEffect(() => {
    if (!query.trim() || !indexLoaded) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = searchIndexRef.current.filter(
      e => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
    ).slice(0, 10);
    setResults(filtered);
    setSelectedIndex(0);
  }, [query, indexLoaded]);

  function handleResultKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/60 border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="hidden sm:inline text-xs bg-white dark:bg-gray-700 border border-[var(--border)] px-1.5 py-0.5 rounded font-sans">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Search documentation"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => setOpen(false)}
      onKeyDown={handleResultKeyDown}
    >
      {/* Dialog panel — stop propagation so clicks inside don't close */}
      <div
        className="relative mx-auto mt-20 w-full max-w-xl bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documentation..."
            aria-label="Search query"
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
          />
          <button onClick={() => setOpen(false)} aria-label="Close search" className="text-gray-400 hover:text-[var(--primary)] text-xs">
            ESC
          </button>
        </div>
        <ul role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
          {results.map((result, i) => (
            <li key={result.href} role="option" aria-selected={i === selectedIndex}>
              <a
                href={result.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm transition-colors ${
                  i === selectedIndex
                    ? 'bg-teal-50 dark:bg-teal-900/20 text-[var(--primary)]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="font-medium">{result.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{result.section}</div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
