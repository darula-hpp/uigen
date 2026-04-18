/**
 * Integration tests for search, filter, and export features
 * 
 * Tests the complete workflow of searching, filtering, and exporting ignore configurations.
 * 
 * Requirements: 17.1-17.5, 18.1-18.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchElements,
  filterElements,
  searchAndFilter,
  type SearchableElement
} from '../../../lib/search-filter-utils.js';
import {
  generateIgnoreSummaryMarkdown,
  extractIgnoredElements,
  downloadIgnoreSummary
} from '../../../lib/export-ignore-summary.js';
import type { IgnoreState } from '../../../lib/ignore-state-calculator.js';

describe('Search, Filter, and Export Integration', () => {
  // Mock elements representing a typical spec structure
  const mockElements: SearchableElement[] = [
    {
      path: 'components.schemas.User',
      name: 'User',
      type: 'schema',
      ignoreState: {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      }
    },
    {
      path: 'components.schemas.User.properties.email',
      name: 'email',
      type: 'property',
      ignoreState: {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      }
    },
    {
      path: 'components.schemas.User.properties.name',
      name: 'name',
      type: 'property',
      ignoreState: {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true,
        inheritedFrom: 'components.schemas.User'
      }
    },
    {
      path: 'components.schemas.Product',
      name: 'Product',
      type: 'schema',
      ignoreState: {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      }
    },
    {
      path: 'components.schemas.Product.properties.price',
      name: 'price',
      type: 'property',
      ignoreState: {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      }
    },
    {
      path: 'paths./users.get',
      name: 'GET /users',
      type: 'operation',
      ignoreState: {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      }
    }
  ];

  describe('Search and Filter Workflow', () => {
    it('should filter ignored elements and then search by name', () => {
      // Step 1: Filter for ignored elements
      const ignoredElements = filterElements(mockElements, 'ignored');
      expect(ignoredElements).toHaveLength(3); // User schema, email property, price property
      
      // Step 2: Search for "email" within ignored elements
      const searchResults = searchElements(ignoredElements, 'email');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('email');
    });

    it('should search first and then filter', () => {
      // Step 1: Search for "User" (matches User schema, email, name, and paths containing User)
      const searchResults = searchElements(mockElements, 'User');
      expect(searchResults.length).toBeGreaterThanOrEqual(3); // At least User schema, email, name
      
      // Step 2: Filter for ignored elements
      const ignoredResults = filterElements(searchResults, 'ignored');
      expect(ignoredResults).toHaveLength(2); // User schema and email property
    });

    it('should use combined search and filter', () => {
      // Search for "User" and filter for ignored
      const results = searchAndFilter(mockElements, 'User', 'ignored');
      expect(results).toHaveLength(2); // User schema and email property
      expect(results.map(e => e.name)).toEqual(['User', 'email']);
    });

    it('should filter for overrides only', () => {
      const results = filterElements(mockElements, 'overrides');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('name');
      expect(results[0].ignoreState.isOverride).toBe(true);
    });

    it('should filter for active elements only', () => {
      const results = filterElements(mockElements, 'active');
      expect(results).toHaveLength(3); // name, Product, GET /users
      expect(results.every(e => e.ignoreState.effective === false)).toBe(true);
    });

    it('should search by annotation state keywords', () => {
      // Search for "inherited"
      const inheritedResults = searchElements(mockElements, 'inherited');
      expect(inheritedResults).toHaveLength(1);
      expect(inheritedResults[0].name).toBe('email');
      
      // Search for "override"
      const overrideResults = searchElements(mockElements, 'override');
      expect(overrideResults).toHaveLength(1);
      expect(overrideResults[0].name).toBe('name');
    });
  });

  describe('Export Workflow', () => {
    it('should extract ignored elements and generate markdown summary', () => {
      // Step 1: Extract ignored elements
      const ignoredElements = extractIgnoredElements(
        mockElements.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      expect(ignoredElements).toHaveLength(3);
      
      // Step 2: Generate markdown summary
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements, 'test-spec.yaml');
      
      // Verify markdown content
      expect(markdown).toContain('# Ignore Configuration Summary');
      expect(markdown).toContain('**Spec:** test-spec.yaml');
      expect(markdown).toContain('**Total Ignored Elements:** 3');
      expect(markdown).toContain('## Ignored Schemas');
      expect(markdown).toContain('## Ignored Properties');
      expect(markdown).toContain('| User |');
      expect(markdown).toContain('| email |');
      expect(markdown).toContain('| price |');
    });

    it('should export only filtered elements', () => {
      // Filter for ignored elements with "User" in path
      const filtered = searchAndFilter(mockElements, 'User', 'ignored');
      
      // Extract and export
      const ignoredElements = extractIgnoredElements(
        filtered.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements);
      
      expect(markdown).toContain('**Total Ignored Elements:** 2');
      expect(markdown).toContain('| User |');
      expect(markdown).toContain('| email |');
      expect(markdown).not.toContain('| price |');
    });

    it('should include inheritance information in export', () => {
      const ignoredElements = extractIgnoredElements(
        mockElements.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements);
      
      // Check that inherited elements show their source
      expect(markdown).toContain('| email |');
      expect(markdown).toContain('| inherited |');
      expect(markdown).toContain('components.schemas.User');
    });

    it('should group elements by type in export', () => {
      const ignoredElements = extractIgnoredElements(
        mockElements.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements);
      
      // Verify sections are in correct order
      const schemasIndex = markdown.indexOf('## Ignored Schemas');
      const propertiesIndex = markdown.indexOf('## Ignored Properties');
      
      expect(schemasIndex).toBeGreaterThan(0);
      expect(propertiesIndex).toBeGreaterThan(schemasIndex);
    });
  });

  describe('Complete User Workflow', () => {
    it('should support the complete workflow: search -> filter -> export', () => {
      // User searches for "User"
      let results = searchElements(mockElements, 'User');
      expect(results.length).toBeGreaterThanOrEqual(3); // At least User schema, email, name
      
      // User filters for ignored only
      results = filterElements(results, 'ignored');
      expect(results).toHaveLength(2);
      
      // User exports the filtered results
      const ignoredElements = extractIgnoredElements(
        results.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements, 'user-spec.yaml');
      
      // Verify export contains only the filtered results
      expect(markdown).toContain('**Total Ignored Elements:** 2');
      expect(markdown).toContain('**Spec:** user-spec.yaml');
      expect(markdown).toContain('| User |');
      expect(markdown).toContain('| email |');
      expect(markdown).not.toContain('| price |');
      expect(markdown).not.toContain('| Product |');
    });

    it('should support exporting all ignored elements without filters', () => {
      // User clicks "Export Summary" without any search or filter
      const ignoredElements = extractIgnoredElements(
        mockElements.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements);
      
      // Should include all ignored elements
      expect(markdown).toContain('**Total Ignored Elements:** 3');
      expect(markdown).toContain('| User |');
      expect(markdown).toContain('| email |');
      expect(markdown).toContain('| price |');
    });

    it('should handle empty results gracefully', () => {
      // Search for something that doesn't exist
      const results = searchAndFilter(mockElements, 'nonexistent', 'all');
      expect(results).toHaveLength(0);
      
      // Export empty results
      const ignoredElements = extractIgnoredElements(
        results.map(e => ({
          ...e,
          type: e.type as any
        }))
      );
      
      const markdown = generateIgnoreSummaryMarkdown(ignoredElements);
      
      expect(markdown).toContain('**Total Ignored Elements:** 0');
      expect(markdown).not.toContain('## Ignored Schemas');
      expect(markdown).not.toContain('## Ignored Properties');
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      // Mock URL methods
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock DOM methods
      document.createElement = vi.fn().mockReturnValue({
        href: '',
        download: '',
        click: vi.fn()
      });
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('should trigger download with correct filename', () => {
      const markdown = '# Test Summary';
      const mockLink = { href: '', download: '', click: vi.fn() };
      (document.createElement as any).mockReturnValue(mockLink);
      
      downloadIgnoreSummary(markdown, 'my-summary.md');
      
      expect(mockLink.download).toBe('my-summary.md');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
