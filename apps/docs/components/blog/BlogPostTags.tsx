interface BlogPostTagsProps {
  tags: string[];
}

export function BlogPostTags({ tags }: BlogPostTagsProps) {
  const sorted = [...tags].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap gap-2" aria-label="Tags">
      {sorted.map(tag => (
        <span
          key={tag}
          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/30 text-[var(--primary)] border border-teal-200 dark:border-teal-800"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
