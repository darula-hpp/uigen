/**
 * Search and Filter Utilities
 * 
 * Provides functions for searching and filtering elements in the Visual Editor.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import type { IgnoreState } from './ignore-state-calculator.js';

export interface SearchableElement {
  path: string;
  name: string;
  type: string;
  ignoreState: IgnoreState;
}

/**
 * Search elements by name, path, or annotation state
 * 
 * Matches against:
 * - Element name (case-insensitive)
 * - Element path (case-insensitive)
 * - Annotation state keywords: "ignored", "active", "override", "inherited", "explicit"
 * 
 * Requirements: 17.1, 17.4
 * 
 * @param elements - Array of searchable elements
 * @param query - Search query string
 * @returns Filtered array of elements matching the query
 */
export function searchElements(
  elements: SearchableElement[],
  query: string
): SearchableElement[] {
  if (!query.trim()) {
    return elements;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return elements.filter(element => {
    // Match against name
    if (element.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Match against path
    if (element.path.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Match against annotation state keywords
    const stateKeywords: string[] = [];
    
    if (element.ignoreState.effective) {
      stateKeywords.push('ignored');
    } else {
      stateKeywords.push('active', 'included');
    }

    if (element.ignoreState.source === 'inherited') {
      stateKeywords.push('inherited');
    } else if (element.ignoreState.source === 'explicit') {
      stateKeywords.push('explicit');
    }

    if (element.ignoreState.isOverride) {
      stateKeywords.push('override');
    }

    return stateKeywords.some(keyword => keyword.includes(normalizedQuery));
  });
}

export type FilterOption = 'all' | 'ignored' | 'active' | 'overrides';

/**
 * Filter elements by annotation state
 * 
 * Filter options:
 * - 'all': Show all elements
 * - 'ignored': Show only ignored elements (effective = true)
 * - 'active': Show only active elements (effective = false)
 * - 'overrides': Show only elements with override annotations
 * 
 * Requirements: 17.2, 17.3, 17.5
 * 
 * @param elements - Array of searchable elements
 * @param filterOption - Filter option to apply
 * @returns Filtered array of elements matching the filter
 */
export function filterElements(
  elements: SearchableElement[],
  filterOption: FilterOption
): SearchableElement[] {
  switch (filterOption) {
    case 'all':
      return elements;
    
    case 'ignored':
      return elements.filter(element => element.ignoreState.effective === true);
    
    case 'active':
      return elements.filter(element => element.ignoreState.effective === false);
    
    case 'overrides':
      return elements.filter(element => element.ignoreState.isOverride === true);
    
    default:
      return elements;
  }
}

/**
 * Apply both search and filter to elements
 * 
 * Requirements: 17.1-17.5
 * 
 * @param elements - Array of searchable elements
 * @param searchQuery - Search query string
 * @param filterOption - Filter option to apply
 * @returns Filtered and searched array of elements
 */
export function searchAndFilter(
  elements: SearchableElement[],
  searchQuery: string,
  filterOption: FilterOption
): SearchableElement[] {
  // Apply filter first
  let result = filterElements(elements, filterOption);
  
  // Then apply search
  result = searchElements(result, searchQuery);
  
  return result;
}

/**
 * Check if an element matches the current search and filter criteria
 * 
 * This is useful for highlighting or showing/hiding individual elements
 * without recomputing the entire filtered list.
 * 
 * @param element - The element to check
 * @param searchQuery - Search query string
 * @param filterOption - Filter option to apply
 * @returns True if the element matches the criteria
 */
export function matchesSearchAndFilter(
  element: SearchableElement,
  searchQuery: string,
  filterOption: FilterOption
): boolean {
  // Check filter first
  const matchesFilter = filterElements([element], filterOption).length > 0;
  if (!matchesFilter) {
    return false;
  }

  // Check search
  const matchesSearch = searchElements([element], searchQuery).length > 0;
  return matchesSearch;
}
