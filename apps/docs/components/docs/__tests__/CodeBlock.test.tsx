import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'navigator', {
      value: {
        ...window.navigator,
        clipboard: { writeText: writeTextSpy },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clicking copy button calls navigator.clipboard.writeText with raw code', async () => {
    render(<CodeBlock html="<pre><code>const x = 1;</code></pre>" language="typescript" rawCode="const x = 1;" />);
    const copyBtn = screen.getByRole('button', { name: /copy code/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeTextSpy).toHaveBeenCalledWith('const x = 1;');
  });

  it('shows "Copied!" after click and reverts after 2s', async () => {
    vi.useFakeTimers();
    render(<CodeBlock html="<pre><code>hello</code></pre>" language="bash" rawCode="hello" />);
    const copyBtn = screen.getByRole('button', { name: /copy code/i });
    await act(async () => {
      fireEvent.click(copyBtn);
      // Allow the async clipboard call to resolve
      await Promise.resolve();
    });
    expect(screen.getByText('Copied!')).toBeDefined();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByText('Copy')).toBeDefined();
    vi.useRealTimers();
  });
});
