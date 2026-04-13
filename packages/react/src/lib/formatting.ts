/**
 * Date and number formatting utilities
 * Implements Requirements 48.1-48.5, 49.1-49.4
 */

/**
 * Parse ISO 8601 date string to Date object
 * Requirement 48.1
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Format date as "MMM DD, YYYY"
 * Requirement 48.2
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return '';

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date-time with timezone
 * Requirement 48.3
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return '';

  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format date for input (YYYY-MM-DD)
 * Supports local timezone input - Requirement 48.4
 */
export function formatDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format date-time for input (YYYY-MM-DDTHH:mm)
 * Supports local timezone - Requirement 48.5
 */
export function formatDateTimeForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return '';

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format number with thousand separators
 * Requirement 49.1
 */
export function formatNumber(value: number, decimals?: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency
 * Requirement 49.2
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  if (typeof value !== 'number' || isNaN(value)) return '';

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency,
  });
}

/**
 * Format percentage
 * Requirement 49.3
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  if (typeof value !== 'number' || isNaN(value)) return '';

  return value.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
