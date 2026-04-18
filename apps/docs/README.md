This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Blog Feature

The docs site includes a blog at `/blog` for publishing technical articles, architecture deep-dives, and announcements.

### Adding a New Blog Post

1. Create a new markdown file in `apps/docs/content/blog/`:

```bash
touch apps/docs/content/blog/my-new-post.md
```

2. Add the required frontmatter at the top of the file:

```yaml
---
title: "My Post Title"
author: "Author Name"
date: "2026-05-01"
excerpt: "A short summary of the post (shown on the index page and in SEO meta tags)."
tags: ["tag1", "tag2"]
---
```

3. Write the post content in Markdown below the frontmatter. All standard Markdown features are supported: headings, lists, code blocks with syntax highlighting, tables, images, and links.

### Frontmatter Schema

| Field | Required | Type | Description |
|---|---|---|---|
| `title` | Yes | string | Post title |
| `author` | Yes | string | Author name |
| `date` | Yes | string | Publication date in `YYYY-MM-DD` format |
| `excerpt` | Yes | string | Short summary (max 300 chars), used in cards and SEO |
| `tags` | No | string[] | Array of tag strings, displayed as pills |
| `featured_image` | No | string | Path to hero image (used in card and og:image) |
| `updated_date` | No | string | Last updated date in `YYYY-MM-DD` format |

### Slug

The slug is derived from the filename. For example, `my-new-post.md` becomes `/blog/my-new-post`. Slugs must use only lowercase letters, numbers, and hyphens.

### Reading Time

Reading time is calculated automatically from the word count (200 words per minute, minimum 1 minute). Markdown syntax is stripped before counting.

### Table of Contents

H2 and H3 headings are automatically extracted and displayed in a sticky sidebar TOC on desktop. The TOC is hidden on mobile.

### Build Process

Blog posts are statically generated at build time (`generateStaticParams`). All posts in `content/blog/` are pre-rendered as static HTML pages. The build will fail with a clear error message if any post has invalid or missing frontmatter.
