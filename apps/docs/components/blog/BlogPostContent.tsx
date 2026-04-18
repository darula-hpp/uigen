interface BlogPostContentProps {
  contentHtml: string;
}

export function BlogPostContent({ contentHtml }: BlogPostContentProps) {
  return (
    <article
      className="prose prose-gray dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
