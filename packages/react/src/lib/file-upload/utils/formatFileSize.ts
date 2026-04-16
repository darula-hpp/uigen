/**
 * Format file size in bytes to human-readable string
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "5.2 MB", "1.5 KB", "234 B")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  // Format with 1 decimal place for values >= 1KB, no decimals for bytes
  const formatted = i === 0 ? size.toString() : size.toFixed(1);
  
  return `${formatted} ${units[i]}`;
}
