const WORDS_PER_MINUTE = 200;

/**
 * Calculates estimated reading time in minutes for markdown content.
 * Strips markdown syntax before counting words.
 * Returns a minimum of 1 minute.
 */
export function calculateReadingTime(content: string): number {
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove fenced code blocks
    .replace(/`[^`]+`/g, '')        // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '')  // Remove links (keep text)
    .replace(/[#*_~`>]/g, '')        // Remove markdown symbols
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return 1;

  const words = plainText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / WORDS_PER_MINUTE);

  return Math.max(1, minutes);
}
