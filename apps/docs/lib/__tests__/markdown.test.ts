import { describe, it, expect } from 'vitest';
import { parseMarkdownContent } from '../markdown';

describe('parseMarkdownContent', () => {
  it('table in MD produces contentHtml containing <table>', async () => {
    const md = `
| Name | Age |
|------|-----|
| Alice | 30 |
| Bob   | 25 |
`;
    const result = await parseMarkdownContent(md);
    expect(result.contentHtml).toContain('<table');
  });

  it('task list in MD produces contentHtml containing <input type="checkbox"', async () => {
    const md = `
- [x] Done task
- [ ] Pending task
`;
    const result = await parseMarkdownContent(md);
    expect(result.contentHtml).toContain('<input');
    expect(result.contentHtml).toContain('type="checkbox"');
  });

  it('fenced code block produces contentHtml containing <pre>', async () => {
    const md = `
\`\`\`typescript
const x: number = 42;
\`\`\`
`;
    const result = await parseMarkdownContent(md);
    expect(result.contentHtml).toContain('<pre');
  });

  it('empty string input returns without throwing and contentHtml is empty or minimal', async () => {
    await expect(parseMarkdownContent('')).resolves.toBeDefined();
    const result = await parseMarkdownContent('');
    // contentHtml should be an empty string or contain no meaningful content
    expect(result.contentHtml.trim()).toBe('');
  });

  it('missing frontmatter title falls back to first h1', async () => {
    const md = `# My Page Title

Some content here.
`;
    const result = await parseMarkdownContent(md);
    expect(result.title).toBe('My Page Title');
  });

  it('frontmatter title takes precedence over h1', async () => {
    const md = `---
title: Frontmatter Title
---

# H1 Title

Some content.
`;
    const result = await parseMarkdownContent(md);
    expect(result.title).toBe('Frontmatter Title');
  });

  it('frontmatter description is extracted', async () => {
    const md = `---
title: Test
description: A test description
---

Content here.
`;
    const result = await parseMarkdownContent(md);
    expect(result.description).toBe('A test description');
  });

  it('no title anywhere results in empty string title', async () => {
    const md = `Just some paragraph text with no headings.`;
    const result = await parseMarkdownContent(md);
    expect(result.title).toBe('');
  });
});
