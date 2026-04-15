'use client';

import { useState } from 'react';

interface CodeBlockProps {
  html: string;
  language: string;
  rawCode: string;
}

export function CodeBlock({ html, language, rawCode }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently ignore
    }
  }

  return (
    <div className="relative group my-4">
      <div
        data-language={language}
        dangerouslySetInnerHTML={{ __html: html }}
        className="overflow-x-auto"
      />
      <button
        onClick={handleCopy}
        aria-label="Copy code to clipboard"
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
