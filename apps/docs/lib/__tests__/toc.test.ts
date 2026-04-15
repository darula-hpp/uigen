import { describe, it, expect } from 'vitest';
import { extractToc } from '../toc';

describe('extractToc', () => {
  it('returns two entries for HTML with one h2 and one h3', () => {
    const html = `
      <h2 id="installation">Installation</h2>
      <p>Some content</p>
      <h3 id="quick-start">Quick Start</h3>
      <p>More content</p>
    `;
    const toc = extractToc(html);
    expect(toc).toHaveLength(2);
    expect(toc[0]).toEqual({ id: 'installation', text: 'Installation', level: 2 });
    expect(toc[1]).toEqual({ id: 'quick-start', text: 'Quick Start', level: 3 });
  });

  it('returns empty array when only one heading', () => {
    const html = `
      <h2 id="only-heading">Only Heading</h2>
      <p>Some content</p>
    `;
    const toc = extractToc(html);
    expect(toc).toEqual([]);
  });

  it('returns empty array for h1 and h4 only', () => {
    const html = `
      <h1 id="title">Title</h1>
      <p>Some content</p>
      <h4 id="sub-sub">Sub Sub</h4>
    `;
    const toc = extractToc(html);
    expect(toc).toEqual([]);
  });

  it('strips inner HTML tags from heading text', () => {
    const html = `
      <h2 id="first">First <code>heading</code></h2>
      <h3 id="second">Second <em>heading</em></h3>
    `;
    const toc = extractToc(html);
    expect(toc).toHaveLength(2);
    expect(toc[0].text).toBe('First heading');
    expect(toc[1].text).toBe('Second heading');
  });

  it('returns entries in document order', () => {
    const html = `
      <h2 id="alpha">Alpha</h2>
      <h3 id="beta">Beta</h3>
      <h2 id="gamma">Gamma</h2>
      <h3 id="delta">Delta</h3>
    `;
    const toc = extractToc(html);
    expect(toc).toHaveLength(4);
    expect(toc.map(e => e.id)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('returns empty array for empty HTML', () => {
    expect(extractToc('')).toEqual([]);
  });
});
